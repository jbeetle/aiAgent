# 外挂式 Kafka 日志客户端：从能用到敢用的性能与健壮性实践

> 基于 coqi-claw 项目 `src/utils/kfk/` 消息客户端的真实实现与一次系统性的健壮性 review。
> 项目技术栈：Node.js 22（纯 ESM）+ KafkaJS ^2.2.4。

## 1. 背景：日志也要「外挂」

在 AI Agent 项目中，我们需要把关键业务事件（会话开始、技能调用、安全告警等）发送到 Kafka 消息服务器，供运营侧做行为分析。但这类日志发送有一个天然定位：**它是外挂式的**——Kafka 服务器不在我们的故障域内，它宕机了，我们的主程序不能跟着遭殃。

需求非常明确：

- **可以丢消息**（日志类数据允许丢失）；
- **不能挂起**（调用方不能阻塞在发送上）；
- **不能非正常退出**（Kafka 故障不能成为进程崩溃的理由）；
- **不能内存泄漏**（消息堆积不能拖垮程序）；
- **不能日志刷屏**（故障期间不能把日志系统变成噪声发生器）。

围绕这五条，我们设计并打磨了一个不到 500 行的消息客户端。本文分享它的设计亮点、健壮性改造过程，以及 KafkaJS 集成中的踩坑经验。

## 2. 架构概览

```
业务调用方（会话、技能、审计）
        │  sendMessage() / sendBatch()  同步入队即返回
        ▼
┌─────────────────────────────────────────────┐
│ index.js  开关 → 配置校验 → 攒批队列          │
│           ├─ batchSize 达阈值 → 立即发送      │
│           ├─ batchFlushMs 时间窗 → 定时发送   │
│           ├─ queueLimit 满 → 丢弃 + 计数     │
│           └─ flush()/close() 带超时          │
└─────────────────────┬───────────────────────┘
                      ▼
┌─────────────────────────────────────────────┐
│ produce.js  共享 producer 单例               │
│             懒初始化 · 失败重置 · 5s 退避      │
│             消息组装（event_id/logTime/ip）  │
└─────────────────────┬───────────────────────┘
                      ▼
┌─────────────────────────────────────────────┐
│ kafka.js  KafkaJS 实例（TLS + SASL SCRAM）   │
│ config.js 惰性读取 .env（适配启动时序）       │
└─────────────────────────────────────────────┘
```

三个核心原则贯穿始终：**调用方零阻塞、故障有界、可观测**。

## 3. 设计亮点

### 3.1 双保险：环境变量开关 + 运行时切换

```js
let manualEnabled = null; // null=跟随环境变量；true/false=手动覆盖

export function setEnabled(enabled) { manualEnabled = enabled; }

function isEnabled() {
  if (manualEnabled !== null) return manualEnabled;
  return ["1", "true"].includes(
    (process.env.KAFKA_ENABLE_SEND ?? "false").toLowerCase(),
  );
}
```

- **默认关闭**：未配置 `KAFKA_ENABLE_SEND` 时视为 `false`——没有 Kafka 的环境零成本、零报错；
- **运行时热切换**：`setEnabled()` 可在程序运行中动态开关，配合运营控制台做熔断；
- 开关在**最外层**，关闭时连配置校验都不做，路径最短。

### 3.2 异步攒批：用吞吐换延迟

```js
function enqueue(fields) {
  if (!fields || typeof fields !== "object") { /* 无效消息直接拒绝 */ }
  const { batchSize, queueLimit } = getConfig();
  if (queue.length >= queueLimit) { /* 队列满：丢弃 + 计数 + 告警 */ }
  queue.push(fields);
  if (queue.length >= batchSize) {
    drainQueue();      // 达阈值：立即触发批量发送
  } else {
    scheduleFlush();   // 未达阈值：时间窗口兜底
  }
}
```

- **双触发**：`batchSize`（条数阈值，默认 50）或 `batchFlushMs`（时间窗口，默认 15s），谁先到谁触发；
- **背压策略是「丢弃」**：`queueLimit`（默认 1000）满则丢新消息。日志类消息可容忍丢失，丢弃比阻塞和堆积都更健康；
- **并发安全**：`drainQueue()` 共享同一个 drain promise，并发调用不会重复发送。

### 3.3 共享 Producer 单例：拒绝每消息建连

```js
function getProducer() {
  if (!producerPromise) {
    producerPromise = (async () => {
      const kafka = createProducerKafka();
      const producer = kafka.producer();
      await producer.connect();
      return producer;
    })().catch((error) => {
      producerPromise = null;   // 失败重置，允许下次重试
      throw error;
    });
  }
  return producerPromise;
}
```

Kafka 建连是 TCP + TLS + SASL 三步握手，高频场景下每条消息都建连是不可接受的。共享单例 + 懒初始化 + 失败重置，是「连接池」的最小可行实现。

### 3.4 配置惰性读取：适配复杂的启动时序

```js
export function getConfig() {
  return {
    bootstrapServers: process.env.KAFKA_BOOTSTRAP_SERVERS ?? "192.168.x.x:9092,...",
    topic: process.env.KAFKA_TOPIC ?? "eagent.runtime.log.v1",
    acks: Number(process.env.KAFKA_ACKS ?? 0),
    // ...
  };
}
```

项目里 `.env` 由 BootstrapManager 分阶段加载（`.env` → 解密 → overlay → CLI 覆盖），**任何模块如果在启动早期读取配置就会拿到过期值**。方案是：每次调用实时读 `process.env`，不做模块级缓存。代价是每次 `getConfig()` 重建对象，对日志发送频率来说可以忽略。

### 3.5 业务时间：绕开消费端时钟偏差

```js
logTime: fields.logTime ?? formatLogTime(),
```

消费端从不同机器取日志时，用「服务器收到时间」会引入时钟偏差。设计上 `logTime` 由调用方按业务发生时间传入，客户端只做兜底。这个细节让日志时间线在跨机消费时依然可信。

### 3.6 出口 IP 探测：一个不发包的网络技巧

```js
const socket = createSocket("udp4");
socket.connect(53, "8.8.8.8", () => socket.localAddress);
// connect 仅触发路由选择、不发送任何数据包
```

UDP `connect()` 不产生真实流量，却能拿到本机对外通信的实际出口 IP。2 秒超时兜底，失败只输出主机名。这是「用系统调用换信息」的典型技巧。

### 3.7 统计指标：故障期的可观测性底座

`getStats()` 输出 `queued / sent / failed / bad / dropped / skipped / batches / 平均耗时`。故障期间每类消息去了哪里（失败、丢弃、跳过），一个快照全说清楚，这是后续日志节流设计的基础。

## 4. 性能考量：外挂发送的低开销哲学

日志发送是高频低价值的操作，性能目标不是「最快」，而是「足够快且开销可控」——既不影响业务主链路，也不在故障期放大问题。逐层拆解一条消息的完整成本，每一层都有对应的优化杠杆：

### 4.1 网络层：攒批是最大的杠杆

不攒批时，N 条消息 = N 次网络往返 + N 次 Produce 请求。攒批后（默认 50 条/批）：

- 网络往返从 N 次降到 N/50 次；
- KafkaJS 对已缓存的 topic 元数据不会重复查询 Metadata；
- broker 端 segment 追加是顺序 IO，批量越大分摊的固定开销越少。

1000 条消息 = 20 次 RPC，而不是 1000 次。这是整个模块最值钱的一行设计（`batchSize` 阈值触发 + `batchFlushMs` 时间窗兑底，见 3.2）。

### 4.2 连接层：共享单例省掉的是「毫秒 × N」的建连

一次 Kafka 建连 = TCP 三次握手 + TLS 握手 + SASL SCRAM-SHA-512 认证（2~3 个协议往返）。局域网约 5~10ms，跨机房可能 50ms 以上。共享 producer 单例后这笔成本全进程只付一次；失败时重置单例，但配合退避窗口，故障期也不会反复支付（代码注释里原话：*TCP+TLS+SASL 开销巨大*）。

### 4.3 协议层：acks=0 让发送变成 fire-and-forget

`acks=0` 时 broker 不返回确认，省掉至少 1 个 RTT + leader 落盘等待。日志类消息允许丢失，这是「用可靠性换延迟」的典型取舍。注意 `acks=0` 时 `send()` 返回的 metadata 是空数组，代码必须判空（见踩坑清单第 3 条）。

### 4.4 进程内：一切可缓存的东西只取一次

- **主机名**：`hostname()` 是系统调用，模块加载时缓存一次（`const localHostname = hostname()`）；
- **出口 IP**：UDP connect 探测一次后缓存整个进程生命周期，不重复探测；
- **event_id** 用 Node 内置 `randomUUID()`（高性能），每条消息只做一次 `JSON.stringify`（消息体很小，序列化成本可以忽略）。

### 4.5 日志路径：成功日志必须零成本

所有成功路径日志都是 `logger.debug` 级别——默认 info 级别下完全不打。这一点和 5.4 的日志节流互为表里：**打日志本身有序列化 + 磁盘 I/O 成本**，刷屏的日志在故障期会变成新的瓶颈，所以成功路径要静音、故障路径要节流。

### 4.6 内存维度：队列上限 = 内存上限

`queueLimit=1000` 条 × 平均 ~1KB/条 ≈ 1MB 上限，攒批缓冲的内存占用是可控常量，不随消息速率增长——这正是「丢弃式背压」的性能意义：内存成本有上限，吞吐不受影响。

### 4.7 性能与健壮性的权衡（诚实说明）

- **退避窗口**牺牲了故障期的「尽力重试」，换来不风暴、快速失败、5s 后自愈；
- **flush/close 超时**牺牲了「全部发送完成」，换来进程退出有界；
- **配置惰性读取**每次重建对象（约几微秒），是与启动时序正确性交换的极小代价，对日志频率可忽略。

一句话总结：**性能设计的目标是让每条消息的边际成本趋近于零**——攒批摊薄网络开销、共享连接摊薄建连开销、进程内缓存摊薄系统调用、debug 日志摊薄 I/O，剩下的就是一次 `JSON.stringify` + 一次内存拷贝。

## 5. 健壮性改造：从「能用」到「敢用」

这一节是 review 后的重头戏。原始实现满足基本功能，但在「Kafka 完全不可用」的极端场景下有四个真实风险：

### 5.1 风险一：连接重试风暴 → 退避窗口

**问题**：broker 不可达时，KafkaJS 每次 `connect()` 都要走完内部完整重试（实测约 10 秒）。队列里 N 个批次会串行触发 N 次完整重试——1000 条消息、每批 50 条，就是 20 × 10s ≈ 200 秒的阻塞，且对故障中的集群持续发起连接风暴。

**方案**：连接失败后进入 5 秒退避窗口，窗口内直接快速失败：

```js
const CONNECT_RETRY_DELAY_MS = 5000;
let lastConnectErrorAt = 0;

function getProducer() {
  if (!producerPromise) {
    const sinceLastError = Date.now() - lastConnectErrorAt;
    if (sinceLastError < CONNECT_RETRY_DELAY_MS) {
      const err = new Error(`Kafka 连接退避中（...）`);
      err.code = "KAFKA_BACKOFF";   // 供日志层识别为「预期内节流」
      return Promise.reject(err);
    }
    // ...发起真正的连接
  }
}
```

**同样的问题存在于 `send` 阶段**：连接建立后 broker 挂掉，`producer.send()` 同样会走完 KafkaJS 重试。修复是 `markProducerFailed()`——send 失败时异步断开旧实例（防止 socket 泄漏）、重置单例、写入退避时间戳。

**效果**（实测）：6 批消息全部失败的耗时从 ~60s 降到 ~10s（仅首批走完整重试，后续 5 批毫秒级快速失败）。

### 5.2 风险二：进程退出被挂起 → flush/close 超时

**问题**：`close()` → `flush()` → `drainQueue()` 会等待**所有**批次发完（含 KafkaJS 内部重试）才返回。broker 宕机时退出流程可能挂几分钟。

**方案**：`withTimeout()` 辅助函数 + 全局超时配置：

```js
function withTimeout(promise, ms, onTimeout) {
  if (!ms || ms <= 0) return promise;
  // Promise.race：超时后执行 onTimeout 并 resolve（不 reject，退出路径不允许抛错）
}

export function flush() {
  return withTimeout(drainQueue(), flushTimeoutMs, () => {
    // 超时：放弃剩余队列（计入 dropped 并告警），in-flight 批次自行收尾
  });
}

export async function close() {
  await flush();                              // 自带超时
  await withTimeout(closeProducer(), flushTimeoutMs);  // disconnect 同样兜底
}
```

**效果**（实测）：broker 不可达时 `flush()` 823ms 返回（超时 800ms 准时触发），`close()` 1.6s 返回——进程退出永远有界。

### 5.3 风险三：单条脏数据拖垮整批 → 序列化隔离

**问题**：`JSON.stringify(payload)` 在 `map` 阶段同步执行，任何一条数据异常（`null`、`request`/`response` 字段循环引用、BigInt）会让**整批 50 条**全部发送失败。

**方案**：逐条 try/catch，坏消息跳过并计数：

```js
for (const fields of fieldsList) {
  try {
    const payload = makeMessage(fields);
    messages.push({ key: payload.event_id, value: JSON.stringify(payload) });
  } catch (error) {
    badCount += 1;   // 坏消息跳过，不拖垮整批
  }
}
if (messages.length === 0) return { sent: 0, bad: badCount }; // 全坏批次不建连
```

两个容易被忽视的细节：

- **坏消息计数要能穿透异常**：send 失败时返回值不可达，需要在 `catch` 里把 `error.badCount = badCount` 附加到错误上，否则坏消息会被误计入 `failed`；
- **全坏批次不触发建连**：序列化在 `getProducer()` 之前完成，纯数据问题不该浪费一次连接尝试。

顺带修掉一个隐藏 bug：`enqueue` 曾直接修改调用方对象（`fields.logTime = ...`），调用方复用对象会导致第二条消息带上第一条的时间——日志发送组件必须是无副作用的。

### 5.4 风险四：故障期日志刷屏 → 三级节流

**问题**：一次完整故障周期（约 90 秒），日志输出高达 15+ 条带完整堆栈的 ERROR：

| 来源 | 数量 |
|------|------|
| KafkaJS 内部 `[Connection]` / `[BrokerPool]` 错误 | 10+ 条 |
| 本模块每批失败日志（带 20 行堆栈） | 每批 1 条 |
| 退避期快速失败 | 每批 1 条 |

**方案**（三层组合）：

1. **关闭 KafkaJS 内部日志**——`logLevel: logLevel.NOTHING`。连接错误由我们捕获的 `KafkaJSNonRetriableError` 等价承载，它自己打 10 条纯属噪音；
2. **退避错误降级**——`KAFKA_BACKOFF` 标记的错误只打 debug（这是预期内的节流行为，不是新故障）；
3. **同根因窗口去重 + 汇总**——60 秒窗口内同一根因最多打 1 条完整 ERROR，其余只计数；窗口过期时打 1 条汇总（条数/批数/累计 failed/根因）；成功发送后打 1 条恢复 INFO（记录故障期间丢失条数）。

**效果**（实测）：一次故障周期从 **15+ 条带堆栈 ERROR** 降为 **1 条 ERROR + 1 条汇总 WARN**（恢复后 +1 条 INFO），且 `getStats()` 计数一条不丢。

### 5.5 拒绝一切的底线：unhandled rejection 治理

Node.js 15+ 默认对 unhandled rejection 直接**崩溃退出**。审计了整条链路的每一个 rejection 消费点：

- `drainQueue` 循环内每个 `await` 都有 try/catch；
- `getProducer()` 失败重置后 rethrow，由调用方消费；
- `producer.disconnect().catch(() => {})` 吞掉退出路径的异常；
- 退避窗口的 `Promise.reject` 永远被 `produceBatch` 的 await 消费。

**效果**（实测）：8 轮故障循环，`unhandled rejections: 0`。

## 6. 实测数据汇总

以下数据均来自 broker 完全不可达（`127.0.0.1:1`）的故障注入测试：

| 场景 | 修复前 | 修复后 |
|------|--------|--------|
| 6 批消息全部失败 | ~60s（每批完整重试） | ~10s（首批重试 + 退避快速失败） |
| `flush()` 返回 | 无界 | 823ms（超时 800ms） |
| `close()` 返回 | 无界 | 1.6s |
| 故障周期日志 | 15+ 条带堆栈 ERROR | 1 ERROR + 1 WARN |
| 8 轮故障循环内存 | — | heapUsed 稳定 8.8~9.1MB |
| 活动句柄（socket/timer） | — | 恒为 2，无泄漏 |
| unhandled rejection | — | 0 |

计数精确性：150 条消息、5 种结局（成功/失败/坏数据/丢弃/跳过），`getStats()` 分毫不差。

## 7. KafkaJS 集成踩坑清单

1. **`logLevel.NOTHING` 是噪音救星**：KafkaJS 默认把连接/重试错误打成自己的 pino 日志，故障时一次重试 2 条，5 次重试 10+ 条。自己捕获错误统一打日志，既省噪音又保留诊断；
2. **`rejectUnauthorized: false` 是「双关」**：它同时关闭证书链校验和主机名校验，没有只关一个的选项。`KAFKA_DISABLE_HOSTNAME_VERIFICATION` 这个变量名很容易误导人；
3. **`acks: 0` 时 `metadata` 是空数组**：`producer.send()` 返回的 metadata 直接 `[0]` 访问会拿到 `undefined`，必须判空；
4. **KafkaJS 内部重试是「有界但很长」的**：默认指数退避重试链约 10 秒。这个时长是「程序不挂起」的敌人——不能依赖它，要在外面自己加退避和超时；
5. **`connect()` 成功后 broker 挂掉，`send()` 照样重试 10 秒**：退避逻辑要覆盖 connect 失败和 send 失败两条路径，只处理一条会在另一个场景原形毕露；
6. **弃用的 producer 实例要 `disconnect()`**：直接丢引用，其内部 socket 不会自动关闭，反复失败会泄漏句柄；
7. **CA 文件缺失时 `readFileSync` 抛 ENOENT**：默认 CA 路径指向项目 `config/ca-cert.crt`，但该文件不在仓库里——任何未配置 `KAFKA_CA_FILE=` 的环境所有发送必然失败，且错误信息完全看不出原因（这一项仍在待修复清单里，先写进博客作为教训）；
8. **环境变量布尔值解析要统一**：`"true"`/`"1"`/大小写，两处解析不一致就会踩 `TRUE` 不生效的坑。

## 8. 设计原则总结

1. **外挂组件的第一职责是「不拖累宿主」**：调用方零阻塞、故障有界、退出不被挂起；
2. **丢弃是合法的背压策略**：日志类数据场景，显式的丢弃 + 计数远好于隐式的堆积 + OOM；
3. **日志节流 ≠ 丢失诊断**：保留一条完整根因，重复的汇总成一条，计数永远进 stats；
4. **可观测性是故障设计的另一半**：没有 `getStats()`，所有「丢消息」的决定都是盲目的；
5. **坏数据隔离是防御性编程的必修课**：任何接受外部输入（包括自己业务方）的组件，都要假设输入是坏的。

## 9. 配置速查

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `KAFKA_ENABLE_SEND` | `false` | 总开关（可运行时 `setEnabled()` 切换） |
| `KAFKA_BOOTSTRAP_SERVERS` | 内网集群 | Broker 地址，逗号分隔 |
| `KAFKA_TOPIC` | `eagent.runtime.log.v1` | 发送目标 topic |
| `KAFKA_PRODUCER_USERNAME/PASSWORD` | 用户名有默认，密码必填 | SASL SCRAM-SHA-512 认证 |
| `KAFKA_ACKS` | `0` | 0/1/-1，日志类默认不等待确认 |
| `KAFKA_BATCH_SIZE` | `50` | 攒批条数阈值 |
| `KAFKA_BATCH_FLUSH_MS` | `15000` | 攒批时间窗口 |
| `KAFKA_QUEUE_LIMIT` | `1000` | 队列上限，满则丢弃 |
| `KAFKA_CA_FILE` | `config/ca-cert.crt` | CA 证书，空值跳过校验 |
| `KAFKA_FLUSH_TIMEOUT_MS` | `15000` | flush/close 超时，0=不超时 |

完整代码：`src/utils/kfk/`（`config.js` / `kafka.js` / `produce.js` / `index.js`，约 450 行）。

---

*本文记录的是真实项目中的一次完整健壮性 review 与改造过程。故障注入测试是验证「敢用」的唯一方式——没有故障演练过的降级设计，都只是假设。*
