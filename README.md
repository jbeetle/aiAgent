# ReAct Agent Framework

> [English](README.en.md) | 中文

基于 JavaScript 的 AI 代理框架，实现了 ReAct（推理+行动）模式，支持多种大语言模型 API。该框架使 AI 代理能够将复杂任务分解为推理步骤，并执行外部工具/操作来完成目标。

## 🚀 主要特性

- **LLMClient 统一客户端**：简洁的多模型访问接口，支持文本生成、流式响应和工具调用
- **SessionChat 智能会话**：高级上下文管理，支持智能消息压缩和 token 优化
- **ReAct 模式实现**：遵循 ReAct（推理+行动）框架，支持迭代推理循环
- **多模型提供商支持**：兼容 OpenAI、DeepSeek、Moonshot（Kimi）、百炼、火山引擎、基石（CoresHub）和 Ollama
- **动态模型注册**：支持运行时动态添加、更新和移除模型提供商
- **流式响应支持**：实时流式传输推理过程，提供更好的用户体验
- **对话压缩功能**：基于 token 数量的智能对话摘要压缩
- **工具集成**：支持带参数验证的外部工具调用
- **异步操作**：全面支持异步工具和流式处理
- **JSON Schema 验证**：使用 JSON Schema 进行参数验证
- **多语言支持**：中英文提示词模板，支持运行时切换
- **灵活配置**：可自定义模型、迭代限制、详细程度等
- **内置工具**：计算器、随机数生成器、高级计算器、当前时间、文件读写、脚本执行等
- **自定义工具**：简易的自定义工具创建框架
- **MCP客户端集成**：支持连接和管理多个MCP服务器，实现LLM与外部工具的智能交互
- **Skill技能系统**：支持通过JSON/YAML定义多步骤工作流技能，动态加载和执行
- **代码执行工具**：支持动态执行 Node.js 和 Python 代码，让 AI 能够编程解决复杂问题
- **全面日志**：详细的开发和调试日志

## 🏗️ 项目架构

### 核心组件

项目采用模块化设计，主要包含以下核心组件：

- **Agent（代理）**：ReActAgent 类实现了核心的推理+行动逻辑，能够将复杂任务分解为推理步骤并执行工具调用
- **Models（模型）**：统一的模型管理模块，支持多种大语言模型提供商，提供动态注册和配置功能
- **MCP Client（MCP客户端）**：集成官方 @modelcontextprotocol/sdk，支持连接和管理多个MCP服务器
- **Tools（工具）**：灵活的工具系统，内置常用工具并支持自定义工具扩展，具备参数验证机制
- **Skills（技能）**：高级工作流系统，支持定义多步骤技能（组合工具、LLM调用、嵌套技能），通过JSON/YAML文件动态加载
- **Utils（工具函数）**：辅助功能模块，包括多语言提示词管理和生成

### ReAct 代理模式

ReActAgent 是框架的核心，它通过以下工作流程实现智能推理：

1. 接收用户查询任务
2. 生成系统提示词，明确代理角色和可用工具
3. 进入推理循环，解析 LLM 响应提取 Thought、Action、Action Input
4. 执行相应工具获取观察结果
5. 重复推理过程直到得出最终答案
6. 支持流式和非流式两种响应模式

### MCP客户端模式

MCPClient 是框架的新增功能，通过集成官方 @modelcontextprotocol/sdk 实现：

1. 连接和管理多个MCP服务器（支持HTTP和stdio传输）
2. 获取MCP服务器提供的工具列表
3. 智能分析用户意图，自动选择合适的MCP工具
4. 执行MCP工具调用并处理结果
5. 与LLM结合，提供增强的响应生成
6. 支持灵活的服务器连接和断开管理

### Skill技能系统模式

Skill系统是框架的高级功能，支持定义和执行多步骤工作流：

1. **工作流定义**：通过JSON/YAML文件定义技能，包含多个执行步骤
2. **步骤类型支持**：
   - `tool` - 调用工具
   - `llm` - LLM推理生成
   - `skill` - 嵌套调用其他技能
   - `condition` - 条件执行
3. **变量替换**：支持 `{{parameters.xxx}}`、`{{steps.xxx.output}}` 等模板语法
4. **动态加载**：从文件或目录批量加载技能定义
5. **与Agent集成**：ReActAgent自动识别并使用已注册技能

技能系统适用于：
- 复杂的多步骤任务（如数据分析、代码审查、文档生成）
- 可复用的业务逻辑封装
- 领域特定的最佳实践模板

## 📦 安装

```bash
npm install
```

## 🔧 环境配置

1. 复制环境变量模板：
```bash
cp .env.example .env
```

2. 在 `.env` 中添加 API 密钥：
```bash
OPENAI_API_KEY=your_openai_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
MOONSHOT_API_KEY=your_moonshot_api_key_here
VOLC_API_KEY=your_volcano_engine_api_key_here
CORESHUB_API_KEY=your_coreshub_api_key_here
PROMPTS_LANG=cn  # 或 en，设置提示词语言
```

## 🎯 快速开始

### MCP客户端使用（最新功能）

使用MCP客户端连接外部工具服务器：

```javascript
import {Models} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

// 创建 LLM 客户端
const llmClient = new Models.LLMClient(
    process.env.DEEPSEEK_API_KEY,
    'https://api.deepseek.com/v1',
    'deepseek-chat'
);

// 创建 MCP 客户端
const mcpClient = new Models.McpClient(llmClient);

// 连接 MCP 服务器
await mcpClient.connectMcpServer({
    name: 'echarts-server',
    type: 'http',
    url: 'https://your-mcp-server.com/mcp',
    description: 'ECharts 图表生成服务器'
});

// 使用 MCP 工具进行对话
const messages = [
    {role: 'user', content: '生成一个展示销售数据的饼图'}
];

const response = await mcpClient.chatWithMcpTools(messages);
console.log('响应:', response.choices[0].message.content);

// 获取服务器状态
const status = mcpClient.getMcpServerStatus();
console.log('MCP服务器状态:', status);
```

### Skill技能系统使用

使用Skill系统定义和执行多步骤工作流：

```javascript
import {Agent, Tools, Skills} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

// 1. 直接使用 SkillEngine
const tools = Tools.getBuiltInTools();
const toolsRegistry = Object.fromEntries(tools.map(t => [t.name, t]));

const skillEngine = new Skills.SkillEngine(toolsRegistry, llmClient, {
    verbose: true
});

// 2. 定义技能（数据分析示例）
const dataAnalysisSkill = {
    name: 'data_analysis',
    version: '1.0.0',
    description: '分析数据文件并生成报告',
    parameters: {
        type: 'object',
        properties: {
            file_path: { type: 'string', description: '数据文件路径' },
            analysis_type: {
                type: 'string',
                enum: ['summary', 'trend', 'correlation'],
                description: '分析类型'
            }
        },
        required: ['file_path']
    },
    workflow: {
        steps: [
            {
                id: 'read_file',
                type: 'tool',
                tool: 'file_reader',
                input: { path: '{{parameters.file_path}}' }
            },
            {
                id: 'analyze',
                type: 'llm',
                prompt: '分析以下数据，生成{{parameters.analysis_type}}报告:\n{{steps.read_file.output}}',
                output_key: 'report'
            }
        ]
    }
};

// 3. 注册并执行技能
skillEngine.registerSkill(dataAnalysisSkill);
const result = await skillEngine.execute('data_analysis', {
    file_path: './data.csv',
    analysis_type: 'summary'
});
console.log('分析报告:', result.outputs.report);

// 4. 使用 SkillManager 从文件加载
const skillManager = new Skills.SkillManager(skillEngine, { verbose: true });
await skillManager.loadFromFile('./skills/code-review.skill.json');
await skillManager.loadFromDirectory('./skills/builtin', { recursive: true });

// 5. 在 ReActAgent 中使用技能
const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', tools, {
    verbose: true
});

// 从文件加载技能到 Agent
await agent.loadSkill('./skills/data-analysis.skill.json');

// Agent 会自动识别并使用技能
const response = await agent.run('请帮我分析一下 data.csv 文件的趋势');
console.log('结果:', response.answer);
```

### LLMClient 基础使用（推荐新手入门）

```javascript
import {Models, Tools} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

// 创建 LLM 客户端
const client = new Models.LLMClient(
    process.env.DEEPSEEK_API_KEY,
    'https://api.deepseek.com/v1',
    'deepseek-chat'
);

// 基础文本生成
const result = await client.generateText(
    '你是一位科学专家',
    '什么是人工智能？'
);
console.log('回答:', result);

// 流式生成
const stream = await client.streamText(
    '你是个段子手',
    '讲个程序员的笑话'
);

for await (const chunk of stream) {
    process.stdout.write(chunk.choices?.[0]?.delta?.content ?? '');
}

// 工具调用
const response = await client.callWithTools([
    {role: 'user', content: '当前时间是多少？'}
], [Tools.getTool('get_current_time')]);
console.log('当前时间:', response.choices[0].message.content);
```

### SessionChat 智能会话使用（上下文管理）

当需要管理长对话和优化 token 使用时，使用 SessionChat：

```javascript
import {Models} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

// 创建 LLM 客户端
const client = new Models.LLMClient(
    process.env.DEEPSEEK_API_KEY,
    'https://api.deepseek.com/v1',
    'deepseek-chat'
);

// 创建智能会话
const session = new Models.SessionChat(
    client,
    '你是一位科学专家，擅长用通俗易懂的语言解释复杂概念',
    {
        maxMessages: 20,
        tokenLimit: 4000,
        verbose: true
    }
);

// 多轮对话，自动管理上下文
console.log('=== 多轮技术对话 ===');

// 第一轮
const response1 = await session.chat('什么是机器学习？');
console.log('AI:', response1);

// 第二轮（自动包含上下文）
const response2 = await session.chat('能举个实际应用的例子吗？');
console.log('AI:', response2);

// 第三轮（继续上下文）
const response3 = await session.chat('深度学习与这有什么区别？');
console.log('AI:', response3);

// 查看 token 使用情况
const tokenStatus = session.getTokenStatus();
console.log('Token 状态:', tokenStatus);

// 流式对话
console.log('\n=== 流式解释 ===');
await session.streamChat('请详细解释什么是神经网络', (content, isReasoning, isFinished) => {
    if (isReasoning) {
        console.log('🤔 思考中...');
    } else if (!isFinished) {
        process.stdout.write(content);
    } else {
        console.log('\n✅ 解释完成');
    }
});
```

### ReActAgent 智能体使用（高级功能）

当需要复杂推理和工具调用时，使用 ReActAgent：

```javascript
import {Agent, Tools} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

// 创建代理实例
const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', Tools.getBuiltInTools(), {
    verbose: true, // 启用详细日志
    maxIterations: 5 // 最大推理步骤
});

// 运行代理处理任务
const result = await agent.run('15 * 8 + 42 是多少？');
console.log('答案:', result.answer); // "15 * 8 + 42 = 162"
```

### 流式响应

```javascript
// 流式处理，实时显示推理过程
await agent.runStream('计算 (25 * 4) + (100 / 5) - 30', (chunk) => {
    switch (chunk.type) {
        case 'thinking':
            console.log('思考中:', chunk.content);
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

### 代码执行（动态编程）

当现有工具无法满足需求时，Agent 可以编写并执行代码来解决问题：

```javascript
import {Agent, Tools} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

// 创建代理（包含代码执行工具）
const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', Tools.getBuiltInTools(), {
    verbose: true,
    maxIterations: 5
});

// 示例1：数据处理
const result1 = await agent.run(
    '用 Python 读取 /tmp/data.csv，计算每列的平均值'
);
console.log('分析结果:', result1.answer);

// 示例2：复杂计算
const result2 = await agent.run(
    '用 Node.js 计算 100 以内的所有素数'
);
console.log('计算结果:', result2.answer);

// 示例3：文件格式转换
const result3 = await agent.run(
    '用 Python 将 JSON 文件转换为 CSV 格式'
);
console.log('转换结果:', result3.answer);
```

**代码执行的安全机制：**
- 临时文件隔离执行，执行后自动清理
- 代码长度限制（最大 100KB）
- 危险操作拦截（禁止删除系统文件、格式化磁盘等）
- 超时保护（默认 30 秒）
- 禁止创建子进程

### 自定义工具

```javascript
import {Agent, Tools} from 'react-agent-framework';

// 创建自定义工具
const weatherTool = Tools.createCustomTool(
    'get_weather',
    '获取指定城市的天气信息',
    {
        type: 'object',
        properties: {
            city: {type: 'string', description: '城市名称'},
            unit: {
                type: 'string',
                enum: ['celsius', 'fahrenheit'],
                description: '温度单位',
                default: 'celsius'
            }
        },
        required: ['city']
    },
    async (args) => {
        // 天气 API 调用逻辑
        return `${args.city} 的天气: 22°C, 晴朗`;
    }
);

// 使用自定义工具创建代理
const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', [weatherTool]);
const result = await agent.run('北京今天的天气怎么样？');
```

## 📚 API 参考

### 主要导出对象

从 `src/index.js` 导出三个主要命名空间：

```javascript
import {Agent, Models, Tools} from 'react-agent-framework';
```

#### Agent 命名空间
包含代理相关的类和工具
- `Agent.ReActAgent`: ReAct 模式代理实现
- `Agent.PromptFactory`: 提示词工厂类

#### Models 命名空间
包含模型管理相关的功能
- `Models.LLMClient`: 统一语言模型客户端
- `Models.SessionChat`: 智能对话会话管理
- `Models.McpClient`: MCP客户端，支持连接外部工具服务器
- `Models.registerVendor`: 注册新模型提供商
- `Models.getRegisteredVendors`: 获取所有注册的提供商
- `Models.getVendorModels`: 获取提供商支持的模型列表
- `Models.updateVendor`: 更新提供商配置
- `Models.createModel`: 创建模型客户端实例

#### Tools 命名空间
包含工具系统相关的功能
- `Tools.getTool`: 根据名称获取特定工具
- `Tools.createCustomTool`: 创建自定义工具
- `Tools.validateParameters`: 验证工具参数
- `Tools.registerTool`: 注册新工具
- `Tools.removeTool`: 移除工具
- `Tools.getBuiltInTools`: 获取所有内置工具

#### Skills 命名空间
包含技能系统相关的功能
- `Skills.SkillEngine`: 技能执行引擎，负责执行技能工作流
- `Skills.SkillManager`: 技能管理器，负责从文件/目录加载技能
- `Skills.skillSchema`: 技能JSON Schema定义
- `Skills.validateSkill`: 验证技能定义的函数
- `Skills.createSkillTemplate`: 创建技能模板文件的函数

### LLMClient 类

统一的 LLM 客户端类，提供简洁的接口访问多种大语言模型，支持文本生成、流式响应和工具调用功能。

### SessionChat 类

智能对话会话管理类，提供高级的上下文管理功能，支持智能消息压缩、token 优化和长对话管理。

#### 构造函数

```javascript
new Models.LLMClient(apiKey, baseURL, model, httpPool)
```

**参数：**
- `apiKey` (string): API 密钥用于认证
- `baseURL` (string): API 基础 URL
- `model` (string): 模型名称
- `httpPool` (Object, 可选): HTTP 连接池配置

#### 核心方法

##### `generateText(systemRole, userInputs, opts)`

生成文本内容（非流式）：

```javascript
const client = new Models.LLMClient(apiKey, baseURL, 'deepseek-chat');
const result = await client.generateText('你是个段子手', '讲个罗永浩的笑话', {
    maxTokens: 250,
    temperature: 1.5
});
console.log(result); // 生成的笑话内容
```

##### `streamText(systemRole, userInputs, opts)`

流式文本生成：

```javascript
const stream = await client.streamText('你是个段子手', '讲个罗永浩的笑话', {
    max_tokens: 250,
    temperature: 1.5
});

for await (const chunk of stream) {
    process.stdout.write(chunk.choices?.[0]?.delta?.content ?? '');
}
```

##### `callWithTools(messages, tools, opts)`

带工具调用的对话：

```javascript
const weatherTool = Tools.createCustomTool('get_weather', '获取天气信息', {
    type: 'object',
    properties: {
        city: {type: 'string', description: '城市名称'}
    },
    required: ['city']
}, async (args) => {
    return `${args.city} 的天气: 22°C, 晴朗`;
});

const response = await client.callWithTools([
    {role: 'user', content: '北京今天的天气怎么样？'}
], [weatherTool], {
    maxTokens: 1024,
    temperature: 1.0
});
```

##### `getRawClient()`

获取底层的 OpenAI 客户端实例：

```javascript
const openaiClient = client.getRawClient();
```

### McpClient 类

MCP客户端类，集成官方 @modelcontextprotocol/sdk，支持连接和管理多个MCP服务器，实现LLM与外部工具的智能交互。

#### 构造函数

```javascript
new Models.McpClient(llmClient)
```

**参数：**
- `llmClient` (LLMClient): LLM客户端实例，用于与LLM进行交互

#### 核心方法

##### `connectMcpServer(serverConfig)`

连接单个MCP服务器：

```javascript
const success = await mcpClient.connectMcpServer({
    name: 'echarts-server',
    type: 'http',
    url: 'https://your-mcp-server.com/mcp',
    description: 'ECharts图表生成服务器'
});
```

**参数：**
- `serverConfig` (Object): 服务器配置
  - `name` (string): 服务器名称
  - `type` (string): 传输类型 ('http' 或 'stdio')
  - `url` (string, 可选): HTTP传输的URL
  - `command` (string, 可选): stdio传输的命令
  - `args` (Array, 可选): stdio传输的命令参数
  - `description` (string, 可选): 服务器描述

##### `connectMcpServers(serverConfigs)`

批量连接多个MCP服务器：

```javascript
const results = await mcpClient.connectMcpServers([
    {
        name: 'echarts-server',
        type: 'http',
        url: 'https://echarts-server.com/mcp',
        description: '图表生成服务器'
    },
    {
        name: 'file-server',
        type: 'stdio',
        command: 'node',
        args: ['file-server.js'],
        description: '文件处理服务器'
    }
]);
```

##### `listMcpTools(serverName)`

获取指定MCP服务器的工具列表：

```javascript
const tools = await mcpClient.listMcpTools('echarts-server');
console.log('可用工具:', tools);
```

##### `callMcpTool(serverName, toolName, toolArgs)`

调用指定MCP服务器的工具：

```javascript
const result = await mcpClient.callMcpTool(
    'echarts-server',
    'generate_pie_chart',
    {
        title: '销售数据',
        data: [
            {name: '产品A', value: 335},
            {name: '产品B', value: 310}
        ]
    }
);
```

##### `chatWithMcpTools(messages, summary, options)`

与LLM和MCP工具交互的高级方法，自动分析用户意图并调用合适的MCP工具：

```javascript
const messages = [
    {role: 'user', content: '生成一个展示2024年销售数据的柱状图'}
];

const response = await mcpClient.chatWithMcpTools(messages);
console.log('响应:', response.choices[0].message.content);
```

**参数：**
- `messages` (Array): 消息数组
- `summary` (boolean, 可选): 是否让LLM进行总结，默认为true
- `options` (Object, 可选): 其他选项，会传递给LLM调用

**返回：**
- 符合OpenAI响应格式的对象，包含choices数组

##### `getMcpServerStatus()`

获取所有已连接的MCP服务器状态：

```javascript
const status = mcpClient.getMcpServerStatus();
console.log('服务器状态:', status);
// {
//   'echarts-server': {
//     connected: true,
//     config: {name: 'echarts-server', type: 'http', ...}
//   }
// }
```

##### `disconnectMcpServer(serverName)`

断开指定MCP服务器的连接：

```javascript
await mcpClient.disconnectMcpServer('echarts-server');
```

##### `disconnectAllMcpServers()`

断开所有MCP服务器的连接：

```javascript
await mcpClient.disconnectAllMcpServers();
```

#### 完整使用示例

```javascript
import {Models} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

async function mcpExample() {
    // 1. 创建 LLM 客户端
    const llmClient = new Models.LLMClient(
        process.env.DEEPSEEK_API_KEY,
        'https://api.deepseek.com/v1',
        'deepseek-chat'
    );

    // 2. 创建 MCP 客户端
    const mcpClient = new Models.McpClient(llmClient);

    try {
        // 3. 连接 MCP 服务器
        const connected = await mcpClient.connectMcpServer({
            name: 'echarts-server',
            type: 'http',
            url: 'https://your-mcp-server.com/mcp',
            description: 'ECharts 图表生成服务器'
        });

        if (connected) {
            console.log('✅ MCP 服务器连接成功');

            // 4. 获取可用工具
            const tools = await mcpClient.listMcpTools('echarts-server');
            console.log('可用工具:', tools);

            // 5. 使用自然语言调用 MCP 工具
            const messages = [
                {role: 'user', content: '生成一个展示销售数据的饼图，包含产品A和产品B的数据'}
            ];

            const response = await mcpClient.chatWithMcpTools(messages);
            console.log('AI 响应:', response.choices[0].message.content);

            // 6. 直接调用特定工具
            const chartResult = await mcpClient.callMcpTool(
                'echarts-server',
                'generate_pie_chart',
                {
                    title: '月度销售报告',
                    data: [
                        {name: '产品A', value: 450},
                        {name: '产品B', value: 380},
                        {name: '产品C', value: 220}
                    ]
                }
            );
            console.log('图表生成结果:', chartResult);

            // 7. 获取服务器状态
            const status = mcpClient.getMcpServerStatus();
            console.log('服务器状态:', status);
        }

    } catch (error) {
        console.error('MCP 操作失败:', error);
    } finally {
        // 8. 断开连接
        await mcpClient.disconnectAllMcpServers();
    }
}

mcpExample().catch(console.error);
```

#### HTTP 连接池配置

```javascript
const httpPool = {
    connections: 5,              // 连接数
    allowH2: true,               // 启用 HTTP/2
    keepAliveTimeout: 30000,     // 连接保持时间
    pipelining: 1,               // 每个连接的管道请求数
    connectTimeout: 10000,       // TCP 连接超时
    headersTimeout: 30000,       // 响应头超时
    bodyTimeout: 30000,          // 响应体超时
    maxRedirections: 0,          // 最大重定向次数
    maxHeaderSize: 16384         // 最大响应头大小
};

const client = new Models.LLMClient(apiKey, baseURL, model, httpPool);
```

#### 完整使用示例

```javascript
import {Models, Tools} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

// 1. 创建 LLM 客户端
const client = new Models.LLMClient(
    process.env.DEEPSEEK_API_KEY,
    'https://api.deepseek.com/v1',
    'deepseek-chat'
);

// 2. 基础文本生成
async function basicGeneration() {
    const result = await client.generateText(
        '你是个段子手',
        '讲个罗永浩的笑话',
        { maxTokens: 250, temperature: 1.5 }
    );
    console.log('生成的笑话:', result);
}

// 3. 流式文本生成
async function streamingGeneration() {
    const stream = await client.streamText(
        '你是个段子手',
        '讲个罗永浩的笑话',
        { max_tokens: 250, temperature: 1.5 }
    );

    console.log('流式输出:');
    for await (const chunk of stream) {
        process.stdout.write(chunk.choices?.[0]?.delta?.content ?? '');
    }
    console.log(); // 换行
}

// 4. 工具调用
async function toolCalling() {
    // 创建天气工具
    const weatherTool = Tools.createCustomTool(
        'get_weather',
        '获取指定城市的天气信息',
        {
            type: 'object',
            properties: {
                city: {type: 'string', description: '城市名称'},
                unit: {
                    type: 'string',
                    enum: ['celsius', 'fahrenheit'],
                    description: '温度单位',
                    default: 'celsius'
                }
            },
            required: ['city']
        },
        async (args) => {
            // 模拟天气数据
            const mockData = {
                '北京': {temp: 25, condition: '晴朗', humidity: 60},
                '上海': {temp: 28, condition: '多云', humidity: 70},
                '广州': {temp: 32, condition: '炎热', humidity: 80}
            };

            const weather = mockData[args.city];
            if (!weather) return `${args.city} 的天气数据不可用`;

            let temp = weather.temp;
            if (args.unit === 'fahrenheit') {
                temp = Math.round((temp * 9 / 5) + 32);
            }

            return `${args.city} 的天气: ${weather.condition}, ${temp}°${args.unit.toUpperCase().charAt(0)}, 湿度 ${weather.humidity}%`;
        }
    );

    const response = await client.callWithTools([
        {role: 'user', content: '北京今天的天气怎么样？'}
    ], [weatherTool], {
        maxTokens: 1024,
        temperature: 1.0
    });

    console.log('工具调用结果:', response.choices[0].message.content);
}

// 5. 当前时间工具
async function currentTimeTool() {
    const response = await client.callWithTools([
        {role: 'user', content: '当前时间是多少？'}
    ], [Tools.getTool('get_current_time')], {
        maxTokens: 1024,
        temperature: 1.0
    });

    console.log('当前时间:', response.choices[0].message.content);
}

// 运行示例
async function runExamples() {
    await basicGeneration();
    await streamingGeneration();
    await toolCalling();
    await currentTimeTool();
}

runExamples().catch(console.error);
```

### SessionChat 类

智能对话会话管理类，提供高级的上下文管理功能，支持智能消息压缩、token 优化和长对话管理。

#### 构造函数

```javascript
new Models.SessionChat(client, systemRole, config)
```

**参数：**
- `client` (LLMClient): LLM 客户端实例
- `systemRole` (string): 系统角色提示词
- `config` (Object, 可选): 配置选项
  - `maxMessages` (number): 最大消息数量 (默认: 20)
  - `tokenLimit` (number): token 限制 (默认: 4000)
  - `compressThreshold` (number): 触发压缩的阈值 (默认: 15)
  - `importanceThreshold` (number): 消息重要性阈值 (默认: 0.3)
  - `manualOperation` (boolean): 手动操作模式 (默认: false)
  - `verbose` (boolean): 启用详细日志 (默认: false)

#### 核心方法

##### `chat(input, opts)`

进行智能对话，自动管理上下文：

```javascript
const session = new Models.SessionChat(client, '你是一位科学专家');
const response = await session.chat('什么是人工智能？');
console.log(response); // AI 的回复内容
```

##### `streamChat(input, callback, opts)`

流式对话，实时获取响应：

```javascript
await session.streamChat('讲个笑话', (content, isReasoning, isFinished) => {
    if (isReasoning) {
        console.log('推理中:', content);
    } else if (!isFinished) {
        process.stdout.write(content);
    } else {
        console.log('\n对话完成');
    }
});
```

##### `addMessage(role, content)`

手动添加消息到会话：

```javascript
session.addMessage('user', '你好，我想了解机器学习');
session.addMessage('assistant', '机器学习是人工智能的一个分支...');
```

##### `compressHistory()`

手动触发历史压缩：

```javascript
await session.compressHistory(); // 压缩旧消息，生成摘要
```

##### `keepLatestUserMessages(count, assistantTxtLimitSize)`

保留最新的用户消息（手动模式专用）：

```javascript
// 只保留最近5条用户消息及对应回复
session.keepLatestUserMessages(5, 250);
```

##### `getLatestMessages(count)`

获取最新的消息记录：

```javascript
const recentMessages = session.getLatestMessages(3);
console.log(recentMessages); // 最近3条消息
```

##### `getTokenStatus()`

获取当前 token 使用状态：

```javascript
const status = session.getTokenStatus();
console.log(status);
// {
//   currentTokens: 1200,
//   tokenLimit: 4000,
//   usagePercentage: 30,
//   status: 'safe', // 'safe' | 'warning' | 'critical'
//   messagesCount: 8
// }
```

##### `clearHistory()`

清除对话历史（保留系统角色）：

```javascript
session.clearHistory(); // 重新开始对话
```

##### `getStats()`

获取会话统计信息：

```javascript
const stats = session.getStats();
console.log(stats);
// {
//   messageCount: 10,
//   lastCompression: 5,
//   averageMessageLength: 45.2,
//   tokenEstimate: 1200
// }
```

#### 智能特性

##### 自动消息管理
- **智能压缩**: 当消息数量超过阈值或接近 token 限制时自动压缩
- **重要性评分**: 基于位置、长度、关键词计算消息重要性
- **滑动窗口**: 自动清理旧消息，保留重要内容
- **多语言摘要**: 支持中英文对话摘要

##### Token 优化
- **增量计算**: 只计算新消息的 token 数量
- **缓存机制**: 缓存 token 计算结果，提高性能
- **实时监控**: 实时跟踪 token 使用情况
- **智能预警**: 接近限制时自动触发优化

##### 双模式操作
- **智能模式** (默认): 自动管理上下文，无需人工干预
- **手动模式**: 用户完全控制消息添加和压缩时机

#### 完整使用示例

```javascript
import {Models} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

// 1. 创建 LLM 客户端和会话
const client = new Models.LLMClient(
    process.env.DEEPSEEK_API_KEY,
    'https://api.deepseek.com/v1',
    'deepseek-chat'
);

const session = new Models.SessionChat(
    client,
    '你是一位专业的 AI 助手，擅长技术解释',
    {
        maxMessages: 25,
        tokenLimit: 5000,
        compressThreshold: 20,
        verbose: true
    }
);

// 2. 进行多轮对话
async function multiTurnConversation() {
    // 第一轮
    const response1 = await session.chat('什么是机器学习？');
    console.log('AI:', response1);

    // 第二轮
    const response2 = await session.chat('能举个具体的应用例子吗？');
    console.log('AI:', response2);

    // 第三轮
    const response3 = await session.chat('深度学习与机器学习有什么区别？');
    console.log('AI:', response3);

    // 查看统计信息
    const stats = session.getStats();
    console.log('会话统计:', stats);

    // 检查 token 状态
    const tokenStatus = session.getTokenStatus();
    console.log('Token 状态:', tokenStatus);
}

// 3. 流式对话示例
async function streamingConversation() {
    console.log('=== 流式对话示例 ===');

    await session.streamChat('请详细解释什么是神经网络', (content, isReasoning, isFinished) => {
        if (isReasoning) {
            console.log('🤔 推理中...');
        } else if (!isFinished) {
            process.stdout.write(content);
        } else {
            console.log('\n✅ 回答完成');
        }
    });
}

// 4. 手动模式示例
async function manualModeExample() {
    // 创建手动模式的会话
    const manualSession = new Models.SessionChat(
        client,
        '你是一位科学专家',
        { manualOperation: true, verbose: true }
    );

    // 手动添加消息
    manualSession.addMessage('user', '什么是量子计算？');

    // 手动触发压缩（如果需要）
    if (manualSession.getTokenStatus().usagePercentage > 80) {
        await manualSession.compressHistory();
    }

    // 只保留最近的消息
    manualSession.keepLatestUserMessages(3);
}

// 运行示例
async function runSessionExamples() {
    await multiTurnConversation();
    await streamingConversation();
    await manualModeExample();
}

runSessionExamples().catch(console.error);
```

#### 配置建议

```javascript
// 短对话优化配置
const shortSessionConfig = {
    maxMessages: 10,
    tokenLimit: 2000,
    compressThreshold: 8
};

// 长对话优化配置
const longSessionConfig = {
    maxMessages: 50,
    tokenLimit: 8000,
    compressThreshold: 30,
    importanceThreshold: 0.4
};

// 手动管理模式
const manualConfig = {
    manualOperation: true,
    verbose: true
};
```

### ReActAgent 类

实现 ReAct（推理+行动）模式的核心 AI 代理类。

#### 构造函数

```javascript
new Agent.ReActAgent(vendorName, modelName, tools, config)
```

**参数：**
- `vendorName` (string): AI 提供商名称 ('OpenAI', 'DeepSeek', 'Moonshot', 'Volcano', 'CoresHub', 'Ollama')
- `modelName` (string): 使用的具体模型名称
- `tools` (Array): 可用工具数组
- `config` (Object, 可选): 配置选项
  - `maxIterations` (number): 最大推理步骤数 (默认: 5)
  - `verbose` (boolean): 启用详细日志 (默认: false)
  - `systemPrompt` (string): 自定义系统提示词

#### 核心方法

##### `run(query)`

执行代理处理用户查询（非流式）：

```javascript
const result = await agent.run('计算 25 * 4 + 100');
console.log(result);
// {
//   success: true,
//   answer: "25 * 4 + 100 = 200",
//   iterations: 2,
//   history: [...] // 推理历史
// }
```

##### `runStream(query, onChunk)`

流式执行代理处理用户查询：

```javascript
await agent.runStream('计算 25 * 4 + 100', (chunk) => {
    console.log(chunk.type, chunk);
});
```

流式事件类型：
- `start`: 开始处理
- `iteration_start`: 新推理迭代开始
- `thinking`: 实时思考内容
- `parsed`: 解析后的响应组件
- `tool_start`: 工具执行开始
- `tool_result`: 工具执行结果
- `final_answer`: 最终答案
- `complete`: 处理完成
- `error`: 错误发生
- `max_iterations`: 达到最大迭代次数

##### `reset()`

重置代理的对话历史：

```javascript
agent.reset(); // 清除所有历史记录，准备处理新任务
```

##### Skill相关方法

ReActAgent已集成Skill系统，支持以下技能操作方法：

##### `registerSkill(skillDefinition)`

注册技能到Agent：

```javascript
const skillDef = {
    name: 'my_skill',
    version: '1.0.0',
    description: '技能描述',
    parameters: { /* JSON Schema */ },
    workflow: { steps: [ /* 工作流步骤 */ ] }
};

agent.registerSkill(skillDef);
```

##### `loadSkill(filePath)`

从文件加载技能（支持.json/.yaml/.js）：

```javascript
await agent.loadSkill('./skills/data-analysis.skill.json');
```

##### `loadSkillsFromDirectory(dirPath)`

从目录批量加载技能：

```javascript
await agent.loadSkillsFromDirectory('./skills/builtin');
```

##### `getSkills()`

获取所有已注册的技能：

```javascript
const skills = agent.getSkills();
console.log(skills.map(s => s.name)); // ['skill1', 'skill2']
```

##### `executeSkill(skillName, parameters)`

直接执行指定技能：

```javascript
const result = await agent.executeSkill('data_analysis', {
    file_path: './data.csv',
    analysis_type: 'summary'
});
console.log(result.outputs);
```

### Skill系统 API

#### SkillEngine 类

技能执行引擎，负责执行技能工作流。

##### 构造函数

```javascript
new Skills.SkillEngine(toolsRegistry, llmClient, config)
```

**参数：**
- `toolsRegistry` (Object): 工具注册表，键值对形式 `{toolName: tool}`
- `llmClient` (Object): LLM客户端实例
- `config` (Object, 可选): 配置选项
  - `verbose` (boolean): 启用详细日志
  - `maxDepth` (number): 最大嵌套深度（默认10）

##### 核心方法

##### `registerSkill(skillDefinition)`

注册技能定义：

```javascript
skillEngine.registerSkill({
    name: 'example_skill',
    version: '1.0.0',
    description: '示例技能',
    parameters: {
        type: 'object',
        properties: {
            input: { type: 'string' }
        },
        required: ['input']
    },
    workflow: {
        steps: [
            {
                id: 'step1',
                type: 'llm',
                prompt: '处理: {{parameters.input}}',
                output_key: 'result'
            }
        ]
    }
});
```

##### `execute(skillName, parameters, context)`

执行技能：

```javascript
const result = await skillEngine.execute('example_skill', {
    input: '测试数据'
}, {
    executionId: 'exec-001' // 可选执行ID
});

console.log(result.outputs); // 所有步骤输出
console.log(result.outputs.result); // 特定输出
```

##### `getAllSkills()`

获取所有已注册的技能：

```javascript
const skills = skillEngine.getAllSkills();
```

#### SkillManager 类

技能管理器，负责从文件和目录加载技能。

##### 构造函数

```javascript
new Skills.SkillManager(skillEngine, config)
```

**参数：**
- `skillEngine` (SkillEngine): 技能引擎实例
- `config` (Object, 可选): 配置选项
  - `verbose` (boolean): 启用详细日志
  - `encoding` (string): 文件编码（默认'utf-8'）

##### 核心方法

##### `loadFromFile(filePath)`

从文件加载技能：

```javascript
const skill = await skillManager.loadFromFile('./skills/my-skill.json');
```

支持格式：`.json`、`.yaml/.yml`、`.js`

##### `loadFromDirectory(dirPath, options)`

从目录批量加载技能：

```javascript
const skills = await skillManager.loadFromDirectory('./skills', {
    recursive: false,      // 是否递归子目录
    pattern: /\.skill\.json$/  // 文件匹配模式
});
```

##### `loadBuiltinSkills()`

加载内置技能：

```javascript
const builtinSkills = await skillManager.loadBuiltinSkills();
```

##### `getSkillSummaries()`

获取所有技能的摘要信息：

```javascript
const summaries = skillManager.getSkillSummaries();
// 返回: [{name, version, description, author, parameters, source}]
```

#### 技能定义格式

完整的技能定义JSON结构：

```json
{
    "name": "skill_name",
    "version": "1.0.0",
    "description": "技能描述",
    "author": "作者名",
    "parameters": {
        "type": "object",
        "properties": {
            "param1": {
                "type": "string",
                "description": "参数描述"
            }
        },
        "required": ["param1"]
    },
    "workflow": {
        "steps": [
            {
                "id": "step_id",
                "type": "tool|llm|skill|condition",
                "description": "步骤描述",
                "condition": "{{parameters.condition}}", // 可选条件
                "output_key": "output_name"
            }
        ]
    },
    "knowledge": {
        "examples": [],
        "best_practices": []
    }
}
```

**步骤类型说明：**

1. **tool 步骤** - 调用工具：
```json
{
    "id": "read_file",
    "type": "tool",
    "tool": "file_reader",
    "input": {
        "path": "{{parameters.file_path}}"
    },
    "output_key": "file_content"
}
```

2. **llm 步骤** - LLM推理：
```json
{
    "id": "analyze",
    "type": "llm",
    "prompt": "分析以下内容：\n{{steps.read_file.output}}",
    "output_key": "analysis_result"
}
```

3. **skill 步骤** - 嵌套技能：
```json
{
    "id": "nested",
    "type": "skill",
    "skill": "another_skill",
    "parameters": {
        "input": "{{parameters.data}}"
    },
    "output_key": "nested_result"
}
```

4. **condition 步骤** - 条件执行：
```json
{
    "id": "check",
    "type": "condition",
    "condition": "{{parameters.should_process}}",
    "then": { /* 条件为真时执行 */ },
    "else": { /* 条件为假时执行 */ }
}
```

**变量替换语法：**
- `{{parameters.xxx}}` - 访问输入参数
- `{{steps.xxx.output}}` - 访问其他步骤输出
- `{{outputs.xxx}}` - 访问已定义的输出
- `{{env.xxx}}` - 访问环境变量

### 模型管理 API

#### `Models.registerVendor(vendorName, vendorConfig)`

动态注册新的模型提供商：

```javascript
Models.registerVendor('CustomVendor', {
    apiKey: 'your_api_key_here',
    baseURL: 'https://api.customvendor.com/v1',
    models: ['custom-model-1', 'custom-model-2']
});
```

#### `Models.getRegisteredVendors()`

获取所有已注册的模型提供商：

```javascript
const vendors = Models.getRegisteredVendors();
console.log(vendors); // ['OpenAI', 'DeepSeek', 'Moonshot', ...]
```

#### `Models.getVendorModels(vendorName)`

获取指定提供商支持的模型列表：

```javascript
const models = Models.getVendorModels('DeepSeek');
console.log(models); // ['deepseek-chat', 'deepseek-reasoner']
```

#### `Models.createModel(vendorName, modelName)`

创建模型客户端实例（推荐方式）：

```javascript
// 使用 DeepSeek
const deepseekClient = Models.createModel('DeepSeek', 'deepseek-chat');

// 使用 OpenAI
const openaiClient = Models.createModel('OpenAI', 'gpt-4-turbo');

// 使用 Moonshot (Kimi)
const moonshotClient = Models.createModel('Moonshot', 'kimi-k2-turbo-preview');

// 使用火山引擎
const volcanoClient = Models.createModel('Volcano', 'doubao-pro-32k');

// 使用基石模型
const coreshubClient = Models.createModel('CoresHub', 'QwQ-32B');

// 使用 Ollama 本地模型
const ollamaClient = Models.createModel('Ollama', 'llama3');
```

#### 多模型提供商对比使用

```javascript
import {Models} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

// 对比不同模型的响应
async function compareModels() {
    const prompt = '用一句话解释什么是人工智能';
    const systemRole = '你是一位科学专家';

    const models = [
        {vendor: 'DeepSeek', model: 'deepseek-chat', name: 'DeepSeek'},
        {vendor: 'OpenAI', model: 'gpt-3.5-turbo', name: 'OpenAI'},
        {vendor: 'Moonshot', model: 'kimi-k2-turbo-preview', name: 'Kimi'}
    ];

    for (const {vendor, model, name} of models) {
        try {
            const client = Models.createModel(vendor, model);
            const response = await client.generateText(systemRole, prompt);
            console.log(`${name}: ${response}`);
        } catch (error) {
            console.error(`${name} 错误:`, error.message);
        }
    }
}

compareModels();
```

#### 动态模型切换

```javascript
// 根据任务类型选择最适合的模型
function getClientForTask(taskType) {
    switch (taskType) {
        case 'reasoning':
            return Models.createModel('DeepSeek', 'deepseek-reasoner');
        case 'creative':
            return Models.createModel('Moonshot', 'kimi-k2-turbo-preview');
        case 'coding':
            return Models.createModel('OpenAI', 'gpt-4-turbo');
        case 'chinese':
            return Models.createModel('CoresHub', 'ernie-4.5-turbo-128k');
        default:
            return Models.createModel('DeepSeek', 'deepseek-chat');
    }
}

// 使用示例
const reasoningClient = getClientForTask('reasoning');
const response = await reasoningClient.generateText(
    '逻辑推理专家',
    '如果所有的A都是B，所有的B都是C，那么所有的A都是C吗？'
);
```

### 提示词工厂 API

提示词工厂用于管理和生成不同语言的提示词模板。

```javascript
import {Agent} from './src/index.js';

// 创建提示词工厂实例
const promptFactory = new Agent.PromptFactory('cn'); // 'cn' 或 'en'

// 生成 ReAct 提示词
const tools = [...]; // 工具数组
const prompt = promptFactory.createReActPrompt(tools);

// 切换语言
promptFactory.switchLanguage('en');
```

## 🛠️ 工具系统

### 内置工具

框架包含以下内置工具：

#### 计算器 (calculator)
提供基本的数学运算（加、减、乘、除）：
```javascript
{
  name: 'calculator',
  description: 'Perform basic arithmetic operations (add, subtract, multiply, divide)',
  handler: async ({ operation, a, b }) => { /* 实现逻辑 */ }
}
```

#### 随机数生成器 (random_number)
生成指定范围内的随机数：
```javascript
{
  name: 'random_number',
  description: 'Generate a random number within a specified range',
  handler: async ({ min, max }) => { /* 实现逻辑 */ }
}
```

#### 高级计算器 (advanced_calculator)
提供高级数学运算（幂运算、取模、平方根、绝对值）：
```javascript
{
  name: 'advanced_calculator',
  description: 'Perform advanced mathematical operations including power, modulo, and square root',
  handler: async ({ operation, a, b }) => { /* 实现逻辑 */ }
}
```

#### 当前时间获取 (get_current_time)
获取格式化的当前时间字符串：
```javascript
{
  name: 'get_current_time',
  description: 'Get the current formatted date and time',
  handler: async () => {
    return '2025-01-20 14:30:45'; // 格式：YYYY-MM-DD HH:mm:ss
  }
}
```

#### 文件读取 (file_reader)
读取指定路径的文件内容：
```javascript
{
  name: 'file_reader',
  description: '读取指定路径的文件内容，支持文本文件',
  parameters: {
    path: { type: 'string', description: '文件的绝对路径' },
    encoding: { type: 'string', default: 'utf-8' },
    max_size: { type: 'integer', default: 1048576 } // 1MB
  },
  handler: async ({ path, encoding, max_size }) => { /* 读取文件 */ }
}
```

#### 文件写入 (file_writer)
将内容写入指定路径的文件：
```javascript
{
  name: 'file_writer',
  description: '将内容写入指定路径的文件，支持自动创建目录',
  parameters: {
    path: { type: 'string', description: '文件的绝对路径' },
    content: { type: 'string', description: '要写入的文件内容' },
    encoding: { type: 'string', default: 'utf-8' },
    append: { type: 'boolean', default: false }
  },
  handler: async ({ path, content, encoding, append }) => { /* 写入文件 */ }
}
```

#### 脚本执行 (script)
执行本地脚本命令（Windows 使用 PowerShell，Linux/macOS 使用 Bash）：
```javascript
{
  name: 'script',
  description: '执行本地脚本命令',
  parameters: {
    command: { type: 'string', description: '要执行的命令或脚本内容' },
    timeout: { type: 'integer', default: 60000, maximum: 300000 },
    cwd: { type: 'string', description: '工作目录（可选）' },
    description: { type: 'string', description: '命令描述' }
  },
  handler: async ({ command, timeout, cwd, description }) => { /* 执行脚本 */ }
}
```

#### Shell 信息 (shell_info)
获取当前系统的 Shell 信息：
```javascript
{
  name: 'shell_info',
  description: '获取当前系统的 shell 信息',
  handler: async () => {
    return {
      platform: 'win32',
      shell: 'powershell.exe',
      shellName: 'PowerShell',
      version: '...'
    };
  }
}
```

#### 代码执行器 (code_executor)
动态执行 Node.js 或 Python 代码，让 AI 能够编程解决复杂问题：
```javascript
{
  name: 'code_executor',
  description: '执行 Node.js 或 Python 代码。当现有工具无法满足需求时，AI 可以编写代码来完成特定任务',
  parameters: {
    code: { type: 'string', description: '要执行的代码内容' },
    language: { type: 'string', enum: ['nodejs', 'python'], description: '编程语言' },
    description: { type: 'string', description: '代码功能的简要描述' },
    timeout: { type: 'integer', default: 30000, description: '超时时间（毫秒）' },
    inputs: { type: 'object', description: '传递给代码的输入数据（可选）' }
  },
  handler: async ({ code, language, description, timeout, inputs }) => { /* 执行代码 */ }
}
```

**使用示例：**
```javascript
// 执行 Python 代码分析数据
const result = await agent.run('用 Python 计算斐波那契数列前10项');

// Agent 会自动生成并执行代码：
// Action: code_executor
// Action Input: {
//   "code": "def fibonacci(n):...",
//   "language": "python",
//   "description": "计算斐波那契数列"
// }
```

#### 代码生成器 (code_generator)
生成常见任务的代码模板，帮助 AI 快速编写代码：
```javascript
{
  name: 'code_generator',
  description: '生成常见任务的代码模板，帮助 AI 快速编写 Node.js 或 Python 代码',
  parameters: {
    task: {
      type: 'string',
      enum: ['file_read', 'file_write', 'data_transform', 'api_call', 'csv_parse', 'json_process', 'regex_extract', 'math_compute'],
      description: '任务类型'
    },
    language: { type: 'string', enum: ['nodejs', 'python'], description: '编程语言' },
    requirements: { type: 'string', description: '具体需求描述' }
  }
}
```

**安全特性：**
- 代码长度限制（最大 100KB）
- 危险操作检查（禁止 `rm -rf /`、`format`、无限循环等）
- 临时文件隔离执行
- 超时保护（默认 30 秒，最大 2 分钟）
- 子进程限制（禁止 `child_process`、`spawn`、`exec`）

### 工具系统架构

工具系统采用模块化设计，支持灵活扩展：

1. **内置工具**：框架提供常用的计算器、随机数生成器等基础工具
2. **自定义工具**：通过 `createCustomTool` 函数可轻松创建自定义工具
3. **参数验证**：基于 JSON Schema 的参数验证机制，确保工具调用的安全性
4. **文件系统工具**：提供文件读取和写入功能，支持 Skill 系统处理文件
5. **脚本执行工具**：支持执行 PowerShell/Bash 命令，扩展 Agent 能力至系统层面
6. **代码执行工具**：支持动态执行 Node.js 和 Python 代码，AI 可编程解决复杂问题
7. **工具管理**：支持工具的注册、获取和移除操作

### 获取内置工具

```javascript
import {Tools} from 'react-agent-framework';

const tools = Tools.getBuiltInTools(); // 返回所有内置工具的数组
```

### 自定义工具创建

```javascript
import {Tools} from 'react-agent-framework';

const customTool = Tools.createCustomTool(
    'tool_name',
    '工具描述',
    {
        type: 'object',
        properties: {
            param1: {type: 'string', description: '参数1描述'}
        },
        required: ['param1']
    },
    async (args) => {
        // 工具实现逻辑
        return '结果';
    }
);
```

## 🎯 技能系统

技能系统（Skills）是框架的高级功能，用于定义和执行多步骤工作流。

### 内置技能

框架包含以下示例技能：

#### 数据分析 (data_analysis)
分析数据文件并生成摘要报告：
```javascript
{
    name: 'data_analysis',
    version: '1.0.0',
    description: '分析数据文件并生成摘要报告',
    parameters: {
        file_path: { type: 'string', description: '数据文件路径' },
        analysis_type: { type: 'string', enum: ['summary', 'trend', 'correlation'] }
    },
    workflow: {
        steps: [
            { id: 'read_file', type: 'tool', tool: 'file_reader', ... },
            { id: 'analyze', type: 'llm', prompt: '...', output_key: 'report' }
        ]
    }
}
```

#### 代码审查 (code_review)
对代码文件进行自动化审查：
```javascript
{
    name: 'code_review',
    version: '1.0.0',
    description: '对代码文件进行自动化审查',
    parameters: {
        file_path: { type: 'string' },
        review_focus: { type: 'array', items: { enum: ['security', 'performance', 'readability'] } }
    },
    workflow: { steps: [...] }
}
```

#### 文档生成 (doc_generate)
自动生成代码文档：
```javascript
{
    name: 'doc_generate',
    version: '1.0.0',
    description: '自动生成代码文档',
    parameters: {
        source_path: { type: 'string' },
        doc_type: { type: 'string', enum: ['api', 'readme', 'inline'] }
    },
    workflow: { steps: [...] }
}
```

#### 系统信息 (system_info)
收集系统信息（OS、磁盘、内存、CPU）：
```javascript
{
    name: 'system_info',
    version: '1.0.0',
    description: '收集系统信息',
    parameters: {
        info_type: { type: 'string', enum: ['basic', 'full'], default: 'basic' }
    },
    workflow: {
        steps: [
            { id: 'get_os_info', type: 'tool', tool: 'script', ... },
            { id: 'get_disk_info', type: 'tool', tool: 'script', ... },
            { id: 'get_memory_info', type: 'tool', tool: 'script', ... },
            { id: 'get_cpu_info', type: 'tool', tool: 'script', ... }
        ]
    }
}
```

### 技能系统架构

技能系统采用工作流设计，支持复杂任务编排：

1. **技能定义**：通过JSON/YAML文件定义技能元数据、参数和工作流
2. **工作流步骤**：支持 tool、llm、skill、condition 四种步骤类型
3. **变量替换**：使用模板语法实现步骤间数据传递
4. **动态加载**：SkillManager支持从文件和目录批量加载
5. **Agent集成**：ReActAgent自动识别并使用已注册技能

### 获取内置技能

```javascript
import {Agent, Tools, Skills} from 'react-agent-framework';

// 创建Agent
const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', Tools.getBuiltInTools());

// 加载内置技能
const skillManager = new Skills.SkillManager(agent.skillEngine);
await skillManager.loadBuiltinSkills();
```

### 创建自定义技能

```javascript
import {Skills} from 'react-agent-framework';

// 使用模板创建技能
const skillTemplate = Skills.createSkillTemplate('my_skill', {
    description: '自定义技能描述',
    parameters: {
        input: { type: 'string', description: '输入参数' }
    },
    requiredParams: ['input']
});

// 或者直接定义
const mySkill = {
    name: 'my_skill',
    version: '1.0.0',
    description: '自定义技能',
    parameters: {
        type: 'object',
        properties: {
            input: { type: 'string' }
        },
        required: ['input']
    },
    workflow: {
        steps: [
            {
                id: 'process',
                type: 'llm',
                prompt: '处理: {{parameters.input}}',
                output_key: 'result'
            }
        ]
    }
};

// 验证技能定义
const validation = Skills.validateSkill(mySkill);
if (validation.valid) {
    skillEngine.registerSkill(mySkill);
}
```

## 🏃‍♂️ 运行示例

项目包含多个示例文件，展示框架的不同用法：

```bash
# 基础用法示例
node examples/basic-usage.js

# 简单 Agent 测试（推荐新手入门）
node examples/simple-agent-test.js

# Skill技能系统使用示例
node examples/skill-usage.js

# MCP客户端使用示例
node examples/test-mcp-client.js

# 流式响应示例
node examples/streaming-usage.js

# 自定义工具示例
node examples/custom-tool.js

# 其他示例
node examples/sample.js
node examples/sample2.js

# LLMClient 功能测试
node examples/testLLM.js

# 网红笑话生成器示例
node test/influencer-joke-agent/main.js
```

### 网红笑话生成器示例

项目包含一个创新的**网红笑话生成器**示例，展示了框架的扩展能力：

```javascript
// 创建网红笑话生成器代理
const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', [
    ...Tools.getBuiltInTools(),
    influencerDatabaseTool,  // 网红数据库工具
    jokeGeneratorTool        // 个性化笑话生成工具
]);

// 运行个性化笑话创作
const result = await agent.run(
    '为科技领域的网红"张同学"创作一个关于AI的搞笑段子，要有他的专业特色'
);
```

**特性说明：**
- **网红数据库管理**：维护不同领域的网红信息和人设特征
- **个性化内容创作**：基于网红的专业领域和风格特征生成定制化笑话
- **人设特征分析**：智能分析网红的专业背景、语言风格和受众特点
- **领域专业匹配**：确保笑话内容与网红的专业领域高度相关

这个示例展示了如何使用ReAct框架构建复杂的AI应用，结合多个工具实现个性化内容生成。

### 简单 Agent 测试示例

`simple-agent-test.js` 是入门框架的最佳示例，展示了三个基础测试：

```javascript
import {Agent, Tools} from 'react-agent-framework';

// 创建 Agent
const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', Tools.getBuiltInTools(), {
    verbose: true,
    maxIterations: 5
});

// 测试1：简单计算
const result1 = await agent.run('What is 123 * 456 + 789?');

// 测试2：获取当前时间
const result2 = await agent.run('What is the current time?');

// 测试3：代码执行（生成斐波那契数列）
const result3 = await agent.run('Generate the first 10 Fibonacci numbers using Python');
```

运行：`node examples/simple-agent-test.js`

### 完整使用示例

```javascript
import {Agent, Tools} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

// 获取所有内置工具
const builtInTools = Tools.getBuiltInTools();

// 创建网红笑话生成器代理
const agent = new Agent.ReActAgent(
    'DeepSeek',
    'deepseek-chat',
    builtInTools,
    {
        verbose: true,
        maxIterations: 8,
        systemPrompt: '你是一个专业的网红内容创作助手，擅长根据不同网红的人设特征创作个性化内容。'
    }
);

// 运行复杂任务
const result = await agent.run(
    '先获取当前时间，然后计算从现在到今晚8点还有多少小时，最后为这个时间段创作一个科技圈的网红笑话'
);

console.log('创作结果:', result.answer);
```

## 📁 项目结构

```
project/
├── src/
│   ├── agents/
│   │   ├── models/              # 模型管理和客户端实现
│   │   │   ├── model.factory.js # 模型工厂，支持多厂商
│   │   │   ├── llm.client.js    # 统一 LLM 客户端
│   │   │   ├── mcp.client.js    # MCP客户端，集成官方SDK
│   │   │   ├── http.dispatcher.js # HTTP 请求分发器
│   │   │   └── chat.session.js  # 智能对话会话管理（支持上下文压缩和Token优化）
│   │   ├── tools/               # 工具系统
│   │   │   ├── calculator.js    # 计算器工具实现
│   │   │   ├── code-executor.js # 代码执行工具（Node.js/Python）
│   │   │   └── tool.js          # 工具系统核心
│   │   ├── utils/               # 工具函数
│   │   │   ├── prompt.factory.js # 提示词工厂
│   │   │   ├── prompts.en.js    # 英文提示词模板
│   │   │   └── prompts.cn.js    # 中文提示词模板
│   │   └── react.agent.js       # ReAct 代理核心实现
│   ├── skills/                  # 技能系统
│   │   ├── builtin/             # 内置技能示例
│   │   │   ├── code-review.skill.json     # 代码审查技能
│   │   │   ├── data-analysis.skill.json   # 数据分析技能
│   │   │   └── doc-generate.skill.json    # 文档生成技能
│   │   ├── skill.engine.js      # 技能执行引擎
│   │   ├── skill.manager.js     # 技能管理器
│   │   ├── skill.schema.js      # 技能Schema定义
│   │   └── index.js             # 技能模块导出
│   └── index.js                 # 主入口文件
├── examples/                    # 示例代码
│   ├── basic-usage.js           # 基础用法示例
│   ├── simple-agent-test.js     # 简单 Agent 测试示例（推荐新手入门）
│   ├── skill-usage.js           # Skill技能系统使用示例
│   ├── streaming-usage.js       # 流式响应示例
│   ├── custom-tool.js           # 自定义工具示例
│   ├── test-mcp-client.js       # MCP客户端测试示例
│   └── debug-mcp-serverlist.js  # MCP服务器列表示例
├── test/                        # 测试文件和示例项目
│   ├── influencer-joke-agent/   # 网红笑话生成器完整示例
│   │   ├── main.js              # 主要运行文件
│   │   ├── agents/              # 自定义智能体
│   │   ├── data/                # 数据文件
│   │   └── utils/               # 工具函数
│   └── testLLM.js               # LLM测试文件
├── .env.example                 # 环境变量模板
├── package.json                 # 项目依赖和脚本
├── 优化建议.md                  # 项目优化建议文档
└── README.md                    # 项目文档
```

### 模型管理机制

框架提供统一的模型管理机制，支持多种大语言模型提供商：

1. **多厂商支持**：内置支持 OpenAI、DeepSeek、Moonshot、CoresHub、Volcano、Ollama 等主流模型提供商
2. **动态注册**：运行时可动态添加、更新、移除模型提供商配置
3. **客户端封装**：LLMClient 封装了与各模型 API 的交互，支持 HTTP 连接池配置
4. **环境配置**：通过环境变量统一管理各厂商的 API 密钥和基础 URL

## 🔍 开发指南

### 环境要求
- Node.js 20.0.0 或更高版本
- npm 或 yarn 包管理器

### 依赖说明

项目使用以下主要依赖：
- **@modelcontextprotocol/sdk**: 官方MCP SDK，用于MCP客户端功能
- **openai**: OpenAI JavaScript SDK，用于LLM API调用
- **dotenv**: 环境变量管理
- **undici**: 高性能HTTP客户端，用于连接池管理

### 开发设置

1. 安装依赖：
```bash
npm install
```

2. 配置环境变量：
```bash
cp .env.example .env
# 编辑 .env 文件，添加所需的 API 密钥
```

3. 运行示例：
```bash
node examples/basic-usage.js
```

## 🔧 配置

### 环境变量

- `OPENAI_API_KEY`: OpenAI API 密钥
- `DEEPSEEK_API_KEY`: DeepSeek API 密钥
- `MOONSHOT_API_KEY`: Moonshot (Kimi) API 密钥
- `VOLC_API_KEY`: 火山引擎 API 密钥
- `CORESHUB_API_KEY`: 基石 API 密钥
- `CORESHUB_BASE_URL`: 可选，基石 API 基础 URL
- `VOLC_BASE_URL`: 可选，火山引擎 API 基础 URL
- `PROMPTS_LANG`: 提示词语言（'cn' 中文，'en' 英文）

### 代理配置

创建代理时可以指定以下配置：

```javascript
const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', tools, {
    maxIterations: 5,    // 最大推理步骤
    verbose: false,      // 启用详细日志
    systemPrompt: null   // 自定义系统提示词（可选）
});
```

## 🚀 支持的模型提供商

| 提供商 | 支持的模型 | API 基础URL |
|-------|------------|------------|
| OpenAI | gpt-3.5-turbo, gpt-4-turbo | https://api.openai.com/v1 |
| DeepSeek | deepseek-chat, deepseek-reasoner | https://api.deepseek.com/v1 |
| Moonshot | kimi-k2-turbo-preview, kimi-k2-0711-preview | https://api.moonshot.cn/v1 |
| Bailian | qwen3-max, qwen-flash, qwen-plus, deepseek-v3.2-exp | https://dashscope.aliyuncs.com/compatible-mode/v1 |
| CoresHub | QwQ-32B, ernie-4.5-turbo-128k, DeepSeek-V3.1-Terminus, Qwen3-32B, Qwen3-30B-A3B, DeepSeek-V3, DeepSeek-R1 | https://openapi.coreshub.cn/v1 |
| Volcano | doubao-seed-1-6-250615等多个模型 | https://ark.cn-beijing.volces.com/api/v3 |
| Ollama | llama3 (本地) | http://localhost:11434/v1 |

## 🆕 版本更新日志
### v2.0.2
- **新增代码执行工具**：`code_executor` 支持动态执行 Node.js 和 Python 代码
  - AI 可以编写代码来解决现有工具无法处理的复杂问题
  - 支持数据转换、文件处理、复杂计算等场景
  - 内置安全检查（危险代码检测、超时保护、代码长度限制）
- **新增代码生成器工具**：`code_generator` 提供常见任务的代码模板
  - 支持文件读写、CSV解析、JSON处理、正则提取、数学计算等模板
  - 支持 Node.js 和 Python 两种语言
- **改进 ReAct 解析器**：修复多行 JSON 解析问题，使用 `JSON.parse()` 验证代替大括号计数
- **新增简单 Agent 测试示例**：`simple-agent-test.js` 演示基础计算、时间查询和代码执行

### v2.0.1
- **新增Skill技能系统**：支持通过JSON/YAML定义多步骤工作流技能
- **技能执行引擎**：SkillEngine支持tool、llm、skill、condition四种步骤类型
- **技能管理器**：SkillManager支持从文件和目录批量加载技能
- **变量替换系统**：支持`{{parameters.xxx}}`、`{{steps.xxx.output}}`等模板语法
- **与Agent集成**：ReActAgent自动识别并使用已注册技能
- **内置技能示例**：提供数据分析、代码审查、文档生成、系统信息4个示例技能
- **文件系统工具**：新增`file_reader`和`file_writer`工具，支持文件操作
- **脚本执行工具**：新增`script`和`shell_info`工具，支持PowerShell/Bash命令执行
- **新增示例文件**：添加skill-usage.js技能系统使用示例

### v1.2.0
- **新增MCP客户端集成**：集成官方 @modelcontextprotocol/sdk，支持连接和管理多个MCP服务器
- **智能工具调用**：自动分析用户意图，智能选择和调用MCP工具
- **多传输协议支持**：支持HTTP和stdio两种MCP传输方式
- **增强的LLM交互**：结合MCP工具结果，提供更丰富的响应生成
- **服务器状态管理**：完善的MCP服务器连接状态监控和管理
- **新增示例文件**：添加MCP客户端测试和使用示例

### v1.1.3
- **优化相关默认参数**：调整聊天会话增加tokenLimit默认值更改为64K;移除llm.client中max_tokens的硬编码限制

### v1.1.2 
- **新增百炼提供商**：添加内置 `Bailian` 提供商，省去通过动态注册的方式支持，模型内置qwen3-max, qwen-flash, qwen-plus, deepseek-v3.2-exp，其它的通过updateVendor添加
- **为指定供应商添加新的模型**：原来为某个现有模型提供商添加新的模型需通过updateVendor方法比较麻烦，现addVendorModel方法比较直观，如：addVendorModel('OpenAi', 'gpt-4');或addVendorModel('Bailian', ['qwen3-plus', 'qwen3-lite']);

### v1.0.5 
- **新增当前时间工具**：添加 `get_current_time` 工具，支持获取格式化时间
- **网红笑话生成器示例**：创新的AI个性化内容创作示例项目
- **优化项目结构**：完善测试目录结构，新增示例项目组织
- **增强工具系统**：扩展内置工具至4个，完善工具文档
- **改进私有字段语法**：ReactAgent类使用JavaScript私有字段语法
- **完善错误处理**：优化工具调用和参数验证的错误处理机制

### v1.0.4
- **新增流式响应支持**：实现 `runStream` 方法，支持实时推理过程展示
- **对话压缩功能**：基于 token 数量的智能对话摘要压缩
- **增强的模型工厂**：支持更多厂商和模型配置
- **改进的提示词系统**：支持动态语言切换和多语言模板
- **新增 HTTP 分发器**：更好的网络请求管理和错误处理
- **扩展的内置工具**：新增高级计算器工具
- **增强的错误处理**：改进的异常捕获和用户友好的错误消息
- **新的示例代码**：添加流式处理示例和多厂商使用示例

### v1.0.3
- 扩展模型支持并优化生成接口
- 实现基于 token 的压缩策略和状态监控
- 添加多语言提示词支持
- 优化项目结构和文档

### v1.0.2
- 添加对话摘要压缩功能
- 支持中文和英文摘要格式
- 改进 ReAct 提示模板

### v1.0.1
- 重构项目结构，优化模块组织
- 添加统一的模型工厂，支持多模型提供商
- 实现动态模型注册功能
- 优化提示词工厂，支持中英文提示词切换

### v1.0.0
- 初始版本发布
- 实现 ReAct 模式核心功能
- 添加基础工具和自定义工具框架
- 支持 OpenAI API 集成

## 🔒 扩展性和可维护性

框架在设计上充分考虑了扩展性和可维护性：

1. **模块化架构**：各功能模块职责清晰，相互解耦，便于独立开发和维护
2. **接口标准化**：工具和模型均采用标准化接口设计，方便扩展新功能
3. **配置灵活性**：支持多种自定义配置选项，适应不同使用场景
4. **多语言支持**：内置中英文提示词模板，支持运行时动态切换
5. **错误处理机制**：完善的异常捕获和处理机制，提高系统稳定性
6. **文档完整性**：详细的 API 文档和使用示例，降低学习和使用成本

## 🔒 安全考虑

- **API 密钥管理**：使用环境变量存储敏感信息
- **输入验证**：所有工具参数都经过 JSON Schema 验证
- **错误处理**：友好的错误消息，避免泄露敏感信息
- **代码执行安全**：代码执行工具内置多层安全防护
  - 危险代码模式检测（禁止删除系统文件、格式化磁盘等）
  - 代码长度限制（最大 100KB）
  - 超时保护（默认 30 秒，最大 2 分钟）
  - 临时文件隔离执行，执行后自动清理
  - 禁止创建子进程（`child_process`、`spawn`、`exec`）
- **无文件系统访问**：示例中不包含文件系统操作

## 📈 性能优化

- **异步操作**：所有工具支持异步执行
- **流式处理**：减少用户等待时间
- **可配置限制**：通过 maxIterations 控制成本和性能
- **连接池管理**：HTTP 请求优化
- **缓存策略**：支持工具结果缓存

## 🧪 测试和验证

框架包含内置的验证和测试功能：

- **参数验证**：JSON Schema 验证所有工具参数
- **错误处理**：优雅的 API 错误、工具失败和无效输入处理
- **日志记录**：可选的详细日志用于调试
- **验证工具**：自定义工具的内置验证工具

## 🤝 贡献指南

1. Fork 仓库
2. 创建功能分支
3. 为新功能添加测试
4. 更新文档
5. 提交 Pull Request

## 📄 许可证

MIT 许可证 - 详见 LICENSE 文件

## 🆘 支持

如有问题和建议：
1. 查看 `/examples` 中的示例
2. 查看 API 文档
3. 在 GitHub 上提交 Issue

---

**ReAct Agent Framework** - 让 AI 代理更智能、更灵活、更易用！