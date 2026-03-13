# 网红讲笑话Agent 🤣

一个基于ReAct Agent框架的智能网红笑话创作工具，能够随机选择知名网红，分析其背景特征，并创作相关的幽默笑话。

## 功能特色

- 🎭 **智能网红选择**：支持随机选择或按类别筛选网红
- 📊 **背景分析**：深度分析网红的人物特征、专业领域和背景故事
- 🎪 **个性化笑话创作**：根据网红特点创作相关幽默内容
- 🔧 **可扩展工具系统**：易于添加新的网红和工具
- 🌊 **流式输出支持**：实时显示推理过程
- 🎯 **多类别支持**：涵盖美妆、搞笑、带货、游戏等多个领域

## 支持的网红

目前内置了10位知名网红：

| 姓名 | 昵称 | 专业领域 | 平台 |
|------|------|----------|------|
| 李佳琦 | 口红一哥 | 美妆带货 | 淘宝直播 |
| 薇娅 | 淘宝一姐 | 全品类带货 | 淘宝直播 |
| 罗永浩 | 老罗 | 科技产品带货 | 抖音 |
| 辛巴 | 快手一哥 | 农产品带货 | 快手 |
| 李子柒 | 东方美食生活家 | 传统文化传播 | YouTube/B站 |
| papi酱 | 低配版苏菲玛索 | 搞笑短视频 | 抖音/B站 |
| 疯狂小杨哥 | 搞笑一家人 | 搞笑家庭短剧 | 抖音 |
| 散打哥 | 快手土豪 | 娱乐直播 | 快手 |
| 冯提莫 | 斗鱼一姐 | 游戏直播+唱歌 | 斗鱼/抖音 |
| 张大奕 | 淘宝第一网红 | 时尚穿搭 | 淘宝 |

## 快速开始

### 1. 环境要求

- Node.js >= 20.0.0
- 有效的DeepSeek API密钥

### 2. 安装依赖

```bash
npm install
```

### 3. 配置API密钥

在`.env`文件中添加DeepSeek API密钥：

```env
DEEPSEEK_API_KEY=your_api_key_here
PROMPTS_LANG=cn
```

### 4. 运行示例

```bash
# 简单测试
node test/influencer-joke-agent/simple-test.js

# 完整演示
node test/influencer-joke-agent/basic-usage.js
```

## 使用示例

### 基本用法

```javascript
import { createInfluencerJokeAgent } from './influencer-joke-agent.js';

// 创建Agent实例
const agent = createInfluencerJokeAgent('DeepSeek', 'deepseek-chat', {
  maxIterations: 8,
  verbose: true
});

// 随机选择网红讲笑话
const result = await agent.tellJoke();
console.log('笑话内容：', result.joke);
```

### 按类别选择

```javascript
// 选择搞笑类别的网红
const result = await agent.tellJoke('搞笑');
console.log('搞笑网红笑话：', result.joke);

// 选择美妆类别的网红
const result = await agent.tellJoke('美妆');
console.log('美妆网红笑话：', result.joke);
```

### 流式输出

```javascript
// 定义流式输出回调函数
const onChunk = (chunk) => {
  if (chunk.type === 'thought') {
    console.log(`🤔 思考：${chunk.content}`);
  } else if (chunk.type === 'action') {
    console.log(`🛠️ 行动：${chunk.content}`);
  } else if (chunk.type === 'observation') {
    console.log(`👀 观察：${chunk.content}`);
  } else if (chunk.type === 'final_answer') {
    console.log(`🎪 最终答案：${chunk.content}`);
  }
};

// 流式执行
const result = await agent.tellJokeStream(onChunk, '带货');
```

## 可用工具

### 网红选取工具 (`网红选取`)

随机选择一个网红并返回详细信息。

**参数：**
- `category` (可选): 网红类别，可选值：美妆、搞笑、带货、游戏、美食、时尚、科技、农产品、传统文化、不限

**返回：**
```javascript
{
  success: true,
  data: {
    姓名: "网红姓名",
    昵称: "网红昵称",
    平台: "所在平台",
    粉丝数: "粉丝数量",
    专业领域: "专业领域",
    人物性格: "性格特点",
    背景介绍: "背景故事"
  },
  message: "选择成功消息"
}
```

### 网红背景信息工具 (`网红背景信息`)

根据网红姓名获取详细信息。

**参数：**
- `name` (必需): 网红姓名或昵称

**返回：**
```javascript
{
  success: true,
  data: {
    基本信息: { /* 基本信息 */ },
    专业信息: { /* 专业信息 */ }
  },
  message: "查询成功消息"
}
```

### 网红列表工具 (`网红列表`)

获取所有可用的网红列表。

**参数：** 无

**返回：**
```javascript
{
  success: true,
  data: [ /* 网红列表 */ ],
  message: "获取成功消息",
  total: 网红数量
}
```

## 支持的类别

- 🎨 **美妆**: 美妆带货、化妆教程
- 😂 **搞笑**: 搞笑短视频、娱乐内容
- 🛍️ **带货**: 电商直播、产品推销
- 🎮 **游戏**: 游戏直播、电竞内容
- 🍜 **美食**: 美食制作、餐饮推荐
- 👗 **时尚**: 时尚穿搭、潮流资讯
- 💻 **科技**: 科技产品、数码评测
- 🌾 **农产品**: 助农直播、农产品销售
- 🏛️ **传统文化**: 文化传播、传统技艺

## 笑话创作示例

### 李佳琦风格笑话
> 李佳琦走进一家咖啡店，店员问他："先生，您想要什么？"
>
> 李佳琦激动地说："O！买！噶！这个咖啡豆也太好闻了吧！所有女生，听好了！这杯咖啡买它买它买它！"
>
> 店员小声说："先生，这是猫屎咖啡..."
>
> 李佳琦："OMG！连猫都这么努力了，我们还有什么理由不冲！"

### 罗永浩风格笑话
> 罗永浩去相亲，女方问："你有什么优点？"
>
> 罗永浩认真地说："我最大的优点就是有工匠精神，对待感情就像做手机一样，虽然可能会晚点交付，但一定会给你最好的体验。"
>
> 女方："那你的缺点呢？"
>
> 罗永浩："缺点就是...可能有点贵，但绝对物超所值！"

### papi酱风格笑话
> papi酱去参加演讲比赛，主持人说："请用一句话介绍自己。"
>
> papi酱："大家好，我是papi酱，一个集美貌与才华于一身的女子，虽然美貌可能不太明显，但才华绝对够用，毕竟我语速快，思维更快，快到连我自己都跟不上，就像现在这样，我已经说完了，谢谢大家！"

## 配置选项

```javascript
const config = {
  maxIterations: 8,        // 最大推理迭代次数
  verbose: true,           // 是否显示详细日志
  systemPrompt: '自定义系统提示词'  // 自定义系统提示
};

const agent = createInfluencerJokeAgent('DeepSeek', 'deepseek-chat', config);
```

## 错误处理

所有工具和方法都包含完善的错误处理机制：

```javascript
const result = await agent.tellJoke();

if (result.success) {
  console.log('笑话：', result.joke);
} else {
  console.error('执行失败：', result.error);
}
```

## 扩展开发

### 添加新网红

在`influencersDatabase`数组中添加新的网红信息：

```javascript
{
  name: "新网红姓名",
  nickname: "网红昵称",
  platform: "所在平台",
  followers: "粉丝数量",
  specialty: "专业领域",
  personality: "人物性格",
  background: "背景介绍"
}
```

### 创建新工具

使用`Tools.createCustomTool`创建新的工具：

```javascript
import { Tools } from '../../src/index.js';

const newTool = Tools.createCustomTool(
  '工具名称',
  '工具描述',
  {
    type: 'object',
    properties: {
      // 参数定义
    },
    required: ['requiredParam']
  },
  async (args) => {
    // 工具逻辑
    return { success: true, data: result };
  }
);
```

## 性能统计

每次执行都会返回详细的性能统计：

```javascript
{
  success: true,
  joke: "笑话内容",
  reasoning: "推理过程",
  iterations: 6,           // 迭代次数
  executionTime: 8500      // 执行时间（毫秒）
}
```

## 注意事项

1. **API限制**：注意DeepSeek API的调用频率限制
2. **响应时间**：笑话创作可能需要5-15秒，取决于复杂度
3. **内容质量**：笑话质量取决于模型能力和提示词设计
4. **文化敏感性**：避免涉及敏感话题或不当内容

## 故障排除

### 常见问题

1. **API密钥错误**
   ```
   ❌ 请设置DEEPSEEK_API_KEY环境变量
   ```
   解决方案：在`.env`文件中正确配置API密钥

2. **网络超时**
   ```
   ❌ 请求超时
   ```
   解决方案：检查网络连接，或增加超时时间

3. **模型响应异常**
   ```
   ❌ 无法解析模型响应
   ```
   解决方案：检查模型配置，尝试使用不同的模型

## 更新日志

### v1.0.0 (2024-10-16)
- ✨ 初始版本发布
- 🎭 支持10位知名网红
- 🔧 实现3个核心工具
- 🌊 支持流式输出
- 📊 完整的性能统计

## 贡献指南

欢迎提交Issue和Pull Request来改进这个项目！

## 许可证

MIT License

---

**享受网红笑话的乐趣吧！** 🎉