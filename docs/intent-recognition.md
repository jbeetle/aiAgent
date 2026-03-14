# BaseLLMService 意图识别增强

## 概述

`BaseLLMService` 现在使用增强的 `IntentRecognizer` 模块进行意图识别，提供更智能的工具调用决策能力。

## 主要改进

### 1. 基于工具描述的动态关键词生成

- 从每个工具的 `description` 中提取关键词
- 支持工具名称、描述和参数的语义匹配
- 自动识别代码、数学、文件处理等模式

### 2. 语义相似度计算

```javascript
// 工具相关度计算考虑以下因素：
// - 工具名称匹配（权重 0.4）
// - 工具描述匹配（权重最高 0.4）
// - 参数描述匹配（权重最高 0.2）
// - 特殊模式匹配（如数学表达式、代码片段）
```

### 3. 支持 Skills 的意图识别

- 将 Skill 描述纳入意图识别
- 支持基于技能的意图路由
- 通过配置启用/禁用

### 4. 可配置的识别策略

三种识别模式：

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| `aggressive` | 模糊输入默认使用工具 | 希望最大化工具使用率 |
| `balanced` | 平衡策略（默认） | 大多数场景 |
| `conservative` | 只有高置信度才使用工具 | 减少误触发 |

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
    intentRecognition: {
        mode: 'balanced',                    // 'aggressive' | 'conservative' | 'balanced'
        useToolDescriptions: true,           // 是否使用工具描述
        useSkillDescriptions: true,          // 是否使用 Skill 描述
        llmConfirmationThreshold: 'medium',  // LLM 确认阈值: 'low' | 'medium' | 'high'
        enableSemanticMatching: true,        // 是否启用语义匹配
        minToolRelevanceScore: 0.3,          // 最小工具相关度分数
        maxToolsInPrompt: 10                 // 提示词中包含的最大工具数量
    }
});
```

### 运行时更新配置

```javascript
// 更新意图识别配置
service.updateIntentRecognitionConfig({
    mode: 'aggressive',
    useToolDescriptions: true
});

// 快速切换模式
service.setIntentRecognitionMode('conservative');

// 获取当前配置
const config = service.getIntentRecognitionConfig();
```

## 意图识别流程

```
用户输入
    ↓
[阶段1: 快速关键词匹配]
    ↓
高置信度匹配 ──→ 直接决策 (needsTools: true/false)
    ↓
低置信度/无匹配
    ↓
[阶段2: 语义匹配]（如果启用）
    ↓
计算工具相关度分数
    ↓
高相关度 ──→ 需要工具
    ↓
中低相关度
    ↓
[阶段3: LLM 确认]（根据阈值）
    ↓
构建详细提示词（含工具描述、Skill 描述）
    ↓
LLM 分析
    ↓
决策结果
```

## 识别结果

意图识别返回以下结构：

```javascript
{
    needsTools: true/false,              // 是否需要使用工具
    confidence: 'high'/'medium'/'low',   // 置信度
    reason: 'math_calculation',          // 判断理由
    suggestedTools: ['calculator'],      // 建议的工具列表
    toolAnalysis: [                      // 工具分析详情
        {
            tool: 'calculator',
            relevance: 0.85,
            reason: 'name_match: calc'
        }
    ],
    intentSummary: '用户想要计算...'      // 意图摘要（LLM 确认时）
}
```

## 使用示例

### 基本使用

```javascript
import { Models, Tools } from 'react-agent-framework';

// 创建 LLM 客户端
const llmClient = Models.createModel('DeepSeek', 'deepseek-chat');

// 创建 BaseLLMService
const service = new Models.BaseLLMService(llmClient, {
    intentRecognition: {
        mode: 'balanced',
        useToolDescriptions: true
    }
});

// 注册工具
const tools = Tools.getBuiltInTools();
service.registerTools(tools);

// 对话
const result = await service.chat('帮我计算 25 乘以 4');
console.log(result);
// {
//     success: true,
//     answer: '25 乘以 4 等于 100',
//     type: 'tool_execution',
//     intent: { needsTools: true, confidence: 'high', ... }
// }
```

### 使用 IntentRecognizer 直接

```javascript
import { Models } from 'react-agent-framework';

const recognizer = new Models.IntentRecognizer(llmClient, 'model-name', {
    mode: 'aggressive',
    minToolRelevanceScore: 0.5
});

// 注册工具
recognizer.registerTools(tools);

// 识别意图
const result = await recognizer.recognize('帮我生成一段代码');
console.log(result);
```

### 不同模式的对比

```javascript
// 激进模式 - 最大化工具使用
service.setIntentRecognitionMode('aggressive');
await service.chat('帮我看看这个'); // 可能触发工具调用

// 保守模式 - 减少误触发
service.setIntentRecognitionMode('conservative');
await service.chat('你好'); // 不会触发工具调用

// 平衡模式（默认）
service.setIntentRecognitionMode('balanced');
```

## 回退策略

当意图识别系统出现问题时：

1. **禁用意图识别**：所有输入都交给 ReActAgent 处理
   ```javascript
   const service = new Models.BaseLLMService(llmClient, {
       useIntentRecognition: false
   });
   ```

2. **失败时默认行为**：
   - `aggressive` 模式：默认使用工具
   - `conservative` 模式：默认不使用工具
   - `balanced` 模式：交给 ReActAgent 决定

## 调试和日志

启用详细日志查看意图识别过程：

```javascript
const service = new Models.BaseLLMService(llmClient, {
    verbose: true
});
```

日志输出示例：
```
[IntentRecognizer] 开始意图识别: 帮我计算 25 乘以 4
[IntentRecognizer] 高置信度关键词匹配: { needsTools: true, confidence: 'high', ... }
[BaseLLMService] 意图识别结果: { ... }
```

## 性能优化建议

1. **减少 LLM 调用**：提高 `llmConfirmationThreshold` 到 `'high'`，只在必要时使用 LLM 确认
2. **限制工具数量**：减小 `maxToolsInPrompt` 以减少提示词长度
3. **禁用语义匹配**：设置 `enableSemanticMatching: false` 以跳过语义分析
4. **使用关键词匹配**：对于确定性场景，可以设置 `mode: 'aggressive'` 并禁用 LLM 确认

## 测试

运行意图识别测试：

```bash
node examples/test-intent-recognition.js
```
