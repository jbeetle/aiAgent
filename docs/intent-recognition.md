# BaseLLMService 意图识别与路由

## 概述

`BaseLLMService` 整合了 `IntentRecognizer` 模块，实现了完整的意图识别和路由决策功能。新架构清晰分离了不同职责：

- **BaseLLMService**：负责意图识别 + 问题完善 + 路由决策
- **ReActAgent**：负责执行工具调用
- **SessionChat**：负责简单对话

## 架构流程

```
用户输入
    │
    ▼
┌────────────────────────────────────────────┐
│           BaseLLMService                    │
│  ┌──────────────────────────────────────┐  │
│  │ 1. IntentRecognizer.recognize()      │  │
│  │    - 判断是否需要工具                 │  │
│  │    - 返回 suggestedTools              │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ 2. 问题完善（指代消解）               │  │
│  │    - refinedQuery                    │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ 3. 路由决策                          │  │
│  │    - needsTools=true → ReActAgent   │  │
│  │    - needsTools=false → SessionChat │  │
│  └──────────────────────────────────────┘  │
└────────────────────┬───────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────┐
│              ReActAgent                      │
│  - 接收完善后的问题 + 工具列表             │
│  - 执行 ReAct 循环                         │
│  - 返回 finalAnswer                        │
└────────────────────────────────────────────┘
```

## 主要改进

### 1. 意图识别 (IntentRecognizer)

- 基于工具描述的动态关键词生成
- 语义相似度计算
- 支持 Skills 的意图识别
- 可配置的识别策略（激进/保守/平衡）

### 2. 问题完善（指代消解）

- 基于对话历史理解用户真实意图
- 处理指代消解（"它"指的是什么）
- 补充省略的上下文

### 3. 智能路由决策

根据 `needsTools` 和 `confidence` 两个维度决定路由目标：

| needsTools | confidence | 路由目标 | 说明 |
|-----------|------------|----------|------|
| true | high | ReActAgent | 明确需要工具，直接执行 |
| true | medium | ReActAgent | 可能需要工具，交给 Agent 决定 |
| true | low | ReActAgent | 模糊，但有工具倾向 |
| false | high | SessionChat | 明确闲聊，直接对话 |
| false | medium | SessionChat | 可能闲聊，对话为主 |
| false | low | 根据 intentMode | 模糊情况 |

### 4. 工具预筛选

根据意图识别结果的 `suggestedTools` 预筛选工具，减少不必要的工具传递。

## 配置选项

### 创建 BaseLLMService 时配置

```javascript
import { Models } from 'react-agent-framework';

const service = new Models.BaseLLMService(llmClient, {
    // 基本配置
    maxMessages: 20,
    tokenLimit: 65536,
    verbose: false,

    // 意图识别配置
    intentMode: 'balanced',           // 'aggressive' | 'conservative' | 'balanced'
    enableToolFiltering: true,        // 是否启用工具预筛选
    enableRefinement: true            // 是否启用问题完善（指代消解）
});
```

### 模式说明

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| `aggressive` | 模糊输入默认使用工具 | 希望最大化工具使用率 |
| `balanced` | 平衡策略（默认） | 大多数场景 |
| `conservative` | 只有高置信度才使用工具 | 减少误触发 |

## 识别结果

意图识别返回以下结构：

```javascript
{
    needsTools: true/false,              // 是否需要使用工具
    confidence: 'high'/'medium'/'low',   // 置信度
    reason: 'time_query',               // 判断理由
    suggestedTools: ['get_current_time'], // 建议的工具列表
    toolAnalysis: [                      // 工具分析详情
        {
            tool: 'get_current_time',
            relevance: 0.85,
            reason: 'name_match: time'
        }
    ],
    refinedQuery: '现在是几点',          // 完善后的问题
    needsRefinement: false,             // 是否进行了完善
    originalInput: '现在是几点'         // 原始输入
}
```

## 路由事件

流式响应会发送以下新事件类型：

### intent_recognized

```javascript
onChunk({
    type: 'intent_recognized',
    needsTools: true,
    confidence: 'high',
    reason: 'time_query',
    suggestedTools: ['get_current_time'],
    needsRefinement: false,
    originalInput: '现在是几点',
    refinedQuery: '现在是几点',
    timestamp: '2024-01-01T00:00:00.000Z'
});
```

### routing

```javascript
onChunk({
    type: 'routing',
    needsTools: true,
    confidence: 'high',
    mode: 'balanced',
    target: 'reactAgent',
    reason: 'needsTools=true',
    timestamp: '2024-01-01T00:00:00.000Z'
});
```

## 使用示例

### 基本使用

```javascript
import { Models, Tools } from 'react-agent-framework';

// 创建 LLM 客户端
const llmClient = Models.createModel('DeepSeek', 'deepseek-chat');

// 创建 ReActAgent
const reactAgent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', []);

// 创建 BaseLLMService
const service = new Models.BaseLLMService(llmClient, {
    intentMode: 'balanced',
    enableToolFiltering: true,
    enableRefinement: true,
    verbose: true
});

// 注册工具
const tools = Tools.getBuiltInTools();
service.registerTools(tools);
service.setReActAgent(reactAgent);

// 对话 - 自动路由
const result = await service.chat('现在是几点');
// result.type === 'execution' → ReActAgent 处理
// result.type === 'direct' → SessionChat 处理
```

### 流式对话

```javascript
await service.streamChat('25*4等于多少', (chunk) => {
    switch (chunk.type) {
        case 'intent_recognized':
            console.log('意图识别:', chunk.needsTools, chunk.confidence);
            break;
        case 'routing':
            console.log('路由决策:', chunk.target, chunk.reason);
            break;
        case 'intent_refined':
            console.log('问题完善:', chunk.original, '→', chunk.refined);
            break;
        case 'tool_start':
            console.log('执行工具:', chunk.tool);
            break;
        case 'final_answer':
            console.log('最终答案:', chunk.message);
            break;
    }
});
```

## 时间查询优化

时间查询现在被正确识别为需要工具的场景：

| 用户输入 | 识别结果 | 路由目标 |
|----------|----------|----------|
| "现在是几点" | needsTools: true, time_query | ReActAgent |
| "今天是几号" | needsTools: true, time_query | ReActAgent |
| "几点了" | needsTools: true, time_query | ReActAgent |

## 调试和日志

启用详细日志查看完整流程：

```javascript
const service = new Models.BaseLLMService(llmClient, {
    verbose: true
});
```

日志输出示例：
```
[IntentRecognizer] 开始意图识别: 25*4等于多少
[IntentRecognizer] 高置信度关键词匹配: { needsTools: true, confidence: 'high', reason: 'math_question', ... }
[BaseLLMService] 路由决策: needsTools=true, confidence=high, mode=balanced
[BaseLLMService] 路由: ReActAgent (needsTools=true)
```

## 获取统计信息

```javascript
const stats = service.getStats();
// {
//     messagesCount: 10,
//     tokensUsed: 1500,
//     toolsCount: 5,
//     skillsCount: 3,
//     hasReActAgent: true,
//     intentMode: 'balanced',
//     enableToolFiltering: true,
//     enableRefinement: true
// }
```
