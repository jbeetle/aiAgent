# ReAct Agent Framework

> English | [中文](README.md)

A JavaScript-based AI agent framework implementing the ReAct (Reasoning + Acting) pattern, supporting multiple LLM APIs. This framework enables AI agents to break down complex tasks into reasoning steps and execute external tools/actions to accomplish objectives.

## 🚀 Key Features

- **LLMClient Unified Client**: Clean multi-model access interface supporting text generation, streaming responses, and tool calling
- **SessionChat Smart Conversations**: Advanced context management with intelligent message compression and token optimization
- **ReAct Pattern Implementation**: Follows the ReAct (Reasoning + Acting) framework with iterative reasoning loops
- **Multi-Model Provider Support**: Compatible with OpenAI, DeepSeek, Moonshot (Kimi), Bailian, Volcano Engine, CoresHub, and Ollama
- **Dynamic Model Registration**: Runtime dynamic addition, updating, and removal of model providers
- **Streaming Response Support**: Real-time streaming of reasoning process for better user experience
- **Conversation Compression**: Intelligent conversation summarization based on token count
- **Tool Integration**: Support for external tool calls with parameter validation
- **Async Operations**: Full support for async tools and streaming
- **JSON Schema Validation**: Parameter validation using JSON Schema
- **Multi-language Support**: Chinese and English prompt templates with runtime switching
- **Flexible Configuration**: Customizable models, iteration limits, verbosity, etc.
- **Built-in Tools**: Calculator, random number generator, advanced calculator, current time, file read/write, script execution, etc.
- **Custom Tools**: Easy framework for creating custom tools
- **MCP Client Integration**: Support for connecting and managing multiple MCP servers, enabling intelligent interaction between LLM and external tools
- **Skill System**: Support for defining multi-step workflow skills via JSON/YAML, with dynamic loading and execution
- **Code Execution Tool**: Support for dynamic execution of Node.js and Python code, allowing AI to program solutions for complex problems
- **Interactive CLI**: Built-in command-line tool supporting natural language conversation and dynamic Skill management
- **Comprehensive Logging**: Detailed development and debug logging

## 🏗️ Project Architecture

### Core Components

The project adopts a modular design with the following core components:

- **Agent**: The ReActAgent class implements core reasoning + acting logic, breaking down complex tasks into reasoning steps and executing tool calls
- **Models**: Unified model management module supporting multiple LLM providers with dynamic registration and configuration
- **MCP Client**: Integrates the official @modelcontextprotocol/sdk, supporting connection and management of multiple MCP servers
- **Tools**: Flexible tool system with built-in common tools and support for custom tool extensions with parameter validation
- **Skills**: Advanced workflow system supporting definition of multi-step skills (combining tools, LLM calls, nested skills), dynamically loaded via JSON/YAML files
- **Utils**: Utility functions module including multi-language prompt management and generation

### ReAct Agent Pattern

ReActAgent is the core of the framework, implementing intelligent reasoning through the following workflow:

1. Receive user query tasks
2. Generate system prompts clarifying agent role and available tools
3. Enter reasoning loop, parsing LLM responses to extract Thought, Action, Action Input
4. Execute corresponding tools to obtain observations
5. Repeat reasoning process until final answer is reached
6. Support both streaming and non-streaming response modes

### MCP Client Pattern

MCPClient is a new feature of the framework, implemented by integrating the official @modelcontextprotocol/sdk:

1. Connect and manage multiple MCP servers (supporting HTTP and stdio transports)
2. Retrieve tool lists provided by MCP servers
3. Intelligently analyze user intent and automatically select appropriate MCP tools
4. Execute MCP tool calls and process results
5. Combine with LLM to provide enhanced response generation
6. Support flexible server connection and disconnection management

### Skill System Pattern

The Skill system is an advanced feature of the framework, supporting definition and execution of multi-step workflows:

1. **Workflow Definition**: Define skills via JSON/YAML files containing multiple execution steps
2. **Step Type Support**:
   - `tool` - Call tools
   - `llm` - LLM reasoning generation
   - `skill` - Nested calls to other skills
   - `condition` - Conditional execution
3. **Variable Substitution**: Support template syntax like `{{parameters.xxx}}`, `{{steps.xxx.output}}`
4. **Dynamic Loading**: Batch load skill definitions from files or directories
5. **Agent Integration**: ReActAgent automatically recognizes and uses registered skills

The Skill system is suitable for:
- Complex multi-step tasks (data analysis, code review, document generation)
- Reusable business logic encapsulation
- Domain-specific best practice templates

## 📦 Installation

```bash
npm install
```

## 🔧 Environment Configuration

1. Copy the environment variable template:
```bash
cp .env.example .env
```

2. Add API keys in `.env`:
```bash
OPENAI_API_KEY=your_openai_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
MOONSHOT_API_KEY=your_moonshot_api_key_here
VOLC_API_KEY=your_volcano_engine_api_key_here
CORESHUB_API_KEY=your_coreshub_api_key_here
PROMPTS_LANG=cn  # or en, sets prompt language
```

## 🎯 Quick Start

### 🖥️ CLI Interactive Tool (Recommended for Beginners)

The framework provides an interactive command-line tool for conversing with the AI Agent without writing code:

```bash
# Start CLI
npm run cli

# Or use a specific model
node bin/cli.js --vendor OpenAI --model gpt-4
```

In the CLI, you can:
- Chat directly with AI using natural language
- Use `/builtin` to load built-in skills (code review, data analysis, etc.)
- Use `/load` to load custom skill files
- Use `/list` to view loaded skills
- Type `/help` to see all available commands

**[View Full CLI Documentation →](docs/CLI.en.md)**

### MCP Client Usage (Latest Feature)

Use the MCP client to connect to external tool servers:

```javascript
import {Models} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

// Create LLM client
const llmClient = new Models.LLMClient(
    process.env.DEEPSEEK_API_KEY,
    'https://api.deepseek.com/v1',
    'deepseek-chat'
);

// Create MCP client
const mcpClient = new Models.McpClient(llmClient);

// Connect MCP server
await mcpClient.connectMcpServer({
    name: 'echarts-server',
    type: 'http',
    url: 'https://your-mcp-server.com/mcp',
    description: 'ECharts chart generation server'
});

// Use MCP tools for conversation
const messages = [
    {role: 'user', content: 'Generate a pie chart showing sales data'}
];

const response = await mcpClient.chatWithMcpTools(messages);
console.log('Response:', response.choices[0].message.content);

// Get server status
const status = mcpClient.getMcpServerStatus();
console.log('MCP Server Status:', status);
```

### Skill System Usage

Use the Skill system to define and execute multi-step workflows:

```javascript
import {Agent, Tools, Skills} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

// 1. Use SkillEngine directly
const tools = Tools.getBuiltInTools();
const toolsRegistry = Object.fromEntries(tools.map(t => [t.name, t]));

const skillEngine = new Skills.SkillEngine(toolsRegistry, llmClient, {
    verbose: true
});

// 2. Define a skill (data analysis example)
const dataAnalysisSkill = {
    name: 'data_analysis',
    version: '1.0.0',
    description: 'Analyze data files and generate reports',
    parameters: {
        type: 'object',
        properties: {
            file_path: { type: 'string', description: 'Data file path' },
            analysis_type: {
                type: 'string',
                enum: ['summary', 'trend', 'correlation'],
                description: 'Analysis type'
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
                prompt: 'Analyze the following data and generate a {{parameters.analysis_type}} report:\n{{steps.read_file.output}}',
                output_key: 'report'
            }
        ]
    }
};

// 3. Register and execute skill
skillEngine.registerSkill(dataAnalysisSkill);
const result = await skillEngine.execute('data_analysis', {
    file_path: './data.csv',
    analysis_type: 'summary'
});
console.log('Analysis Report:', result.outputs.report);

// 4. Use SkillManager to load from files
const skillManager = new Skills.SkillManager(skillEngine, { verbose: true });
await skillManager.loadFromFile('./skills/code-review.skill.json');
await skillManager.loadFromDirectory('./skills/builtin', { recursive: true });

// 5. Use skills in ReActAgent
const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', tools, {
    verbose: true
});

// Load skills from file into Agent
await agent.loadSkill('./skills/data-analysis.skill.json');

// Agent automatically recognizes and uses skills
const response = await agent.run('Please analyze the trends in data.csv for me');
console.log('Result:', response.answer);
```

### LLMClient Basic Usage (Recommended for Beginners)

```javascript
import {Models, Tools} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

// Create LLM client
const client = new Models.LLMClient(
    process.env.DEEPSEEK_API_KEY,
    'https://api.deepseek.com/v1',
    'deepseek-chat'
);

// Basic text generation
const result = await client.generateText(
    'You are a science expert',
    'What is artificial intelligence?'
);
console.log('Answer:', result);

// Streaming generation
const stream = await client.streamText(
    'You are a comedian',
    'Tell me a programmer joke'
);

for await (const chunk of stream) {
    process.stdout.write(chunk.choices?.[0]?.delta?.content ?? '');
}

// Tool calling
const response = await client.callWithTools([
    {role: 'user', content: 'What is the current time?'}
], [Tools.getTool('get_current_time')]);
console.log('Current Time:', response.choices[0].message.content);
```

### SessionChat Smart Conversation Usage (Context Management)

Use SessionChat when you need to manage long conversations and optimize token usage:

```javascript
import {Models} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

// Create LLM client
const client = new Models.LLMClient(
    process.env.DEEPSEEK_API_KEY,
    'https://api.deepseek.com/v1',
    'deepseek-chat'
);

// Create smart conversation
const session = new Models.SessionChat(
    client,
    'You are a science expert skilled at explaining complex concepts in plain language',
    {
        maxMessages: 20,
        tokenLimit: 4000,
        verbose: true
    }
);

// Multi-turn conversation with automatic context management
console.log('=== Multi-turn Technical Conversation ===');

// First turn
const response1 = await session.chat('What is machine learning?');
console.log('AI:', response1);

// Second turn (automatically includes context)
const response2 = await session.chat('Can you give a real-world application example?');
console.log('AI:', response2);

// Third turn (continues context)
const response3 = await session.chat('What is the difference between deep learning and this?');
console.log('AI:', response3);

// Check token usage
const tokenStatus = session.getTokenStatus();
console.log('Token Status:', tokenStatus);

// Streaming conversation
console.log('\n=== Streaming Explanation ===');
await session.streamChat('Please explain what neural networks are in detail', (content, isReasoning, isFinished) => {
    if (isReasoning) {
        console.log('🤔 Thinking...');
    } else if (!isFinished) {
        process.stdout.write(content);
    } else {
        console.log('\n✅ Explanation complete');
    }
});
```

### ReActAgent Usage (Advanced Features)

Use ReActAgent when you need complex reasoning and tool calling:

```javascript
import {Agent, Tools} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

// Create agent instance
const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', Tools.getBuiltInTools(), {
    verbose: true, // Enable detailed logs
    maxIterations: 5 // Maximum reasoning steps
});

// Run agent to process task
const result = await agent.run('What is 15 * 8 + 42?');
console.log('Answer:', result.answer); // "15 * 8 + 42 = 162"
```

### Streaming Responses

```javascript
// Streaming, real-time display of reasoning process
await agent.runStream('Calculate (25 * 4) + (100 / 5) - 30', (chunk) => {
    switch (chunk.type) {
        case 'thinking':
            console.log('Thinking:', chunk.content);
            break;
        case 'tool_start':
            console.log('Executing tool:', chunk.tool);
            break;
        case 'final_answer':
            console.log('Final Answer:', chunk.message);
            break;
    }
});
```

### Code Execution (Dynamic Programming)

When existing tools cannot meet requirements, the Agent can write and execute code to solve problems:

```javascript
import {Agent, Tools} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

// Create agent (includes code execution tool)
const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', Tools.getBuiltInTools(), {
    verbose: true,
    maxIterations: 5
});

// Example 1: Data processing
const result1 = await agent.run(
    'Use Python to read /tmp/data.csv and calculate the average of each column'
);
console.log('Analysis Result:', result1.answer);

// Example 2: Complex calculation
const result2 = await agent.run(
    'Use Node.js to calculate all prime numbers within 100'
);
console.log('Calculation Result:', result2.answer);

// Example 3: File format conversion
const result3 = await agent.run(
    'Use Python to convert JSON file to CSV format'
);
console.log('Conversion Result:', result3.answer);
```

**Code Execution Security Mechanisms:**
- Temporary file isolation execution, auto-cleanup after execution
- Code length limit (max 100KB)
- Dangerous operation interception (prohibit system file deletion, disk formatting, etc.)
- Timeout protection (default 30 seconds)
- Prohibit creating child processes

### Custom Tools

```javascript
import {Agent, Tools} from 'react-agent-framework';

// Create custom tool
const weatherTool = Tools.createCustomTool(
    'get_weather',
    'Get weather information for specified city',
    {
        type: 'object',
        properties: {
            city: {type: 'string', description: 'City name'},
            unit: {
                type: 'string',
                enum: ['celsius', 'fahrenheit'],
                description: 'Temperature unit',
                default: 'celsius'
            }
        },
        required: ['city']
    },
    async (args) => {
        // Weather API call logic
        return `Weather in ${args.city}: 22°C, Sunny`;
    }
);

// Create agent using custom tool
const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', [weatherTool]);
const result = await agent.run('How is the weather in Beijing today?');
```

## 📚 API Reference

### Main Export Objects

Three main namespaces are exported from `src/index.js`:

```javascript
import {Agent, Models, Tools} from 'react-agent-framework';
```

#### Agent Namespace
Contains agent-related classes and tools
- `Agent.ReActAgent`: ReAct pattern agent implementation
- `Agent.PromptFactory`: Prompt factory class

#### Models Namespace
Contains model management related functions
- `Models.LLMClient`: Unified language model client
- `Models.SessionChat`: Smart conversation session management
- `Models.McpClient`: MCP client supporting connection to external tool servers
- `Models.registerVendor`: Register new model providers
- `Models.getRegisteredVendors`: Get all registered providers
- `Models.getVendorModels`: Get list of models supported by provider
- `Models.updateVendor`: Update provider configuration
- `Models.createModel`: Create model client instance

#### Tools Namespace
Contains tool system related functions
- `Tools.getTool`: Get specific tool by name
- `Tools.createCustomTool`: Create custom tool
- `Tools.validateParameters`: Validate tool parameters
- `Tools.registerTool`: Register new tool
- `Tools.removeTool`: Remove tool
- `Tools.getBuiltInTools`: Get all built-in tools

#### Skills Namespace
Contains skill system related functions
- `Skills.SkillEngine`: Skill execution engine, responsible for executing skill workflows
- `Skills.SkillManager`: Skill manager, responsible for loading skills from files/directories
- `Skills.skillSchema`: Skill JSON Schema definition
- `Skills.validateSkill`: Function to validate skill definitions
- `Skills.createSkillTemplate`: Function to create skill template files

### LLMClient Class

Unified LLM client class providing a clean interface to access various large language models, supporting text generation, streaming responses, and tool calling functions.

### SessionChat Class

Smart conversation session management class providing advanced context management, supporting intelligent message compression, token optimization, and long conversation management.

#### Constructor

```javascript
new Models.LLMClient(apiKey, baseURL, model, httpPool)
```

**Parameters:**
- `apiKey` (string): API key for authentication
- `baseURL` (string): API base URL
- `model` (string): Model name
- `httpPool` (Object, optional): HTTP connection pool configuration

#### Core Methods

##### `generateText(systemRole, userInputs, opts)`

Generate text content (non-streaming):

```javascript
const client = new Models.LLMClient(apiKey, baseURL, 'deepseek-chat');
const result = await client.generateText('You are a comedian', 'Tell a joke about Luo Yonghao', {
    maxTokens: 250,
    temperature: 1.5
});
console.log(result); // Generated joke content
```

##### `streamText(systemRole, userInputs, opts)`

Streaming text generation:

```javascript
const stream = await client.streamText('You are a comedian', 'Tell a joke about Luo Yonghao', {
    max_tokens: 250,
    temperature: 1.5
});

for await (const chunk of stream) {
    process.stdout.write(chunk.choices?.[0]?.delta?.content ?? '');
}
```

##### `callWithTools(messages, tools, opts)`

Conversation with tool calling:

```javascript
const weatherTool = Tools.createCustomTool('get_weather', 'Get weather information', {
    type: 'object',
    properties: {
        city: {type: 'string', description: 'City name'}
    },
    required: ['city']
}, async (args) => {
    return `Weather in ${args.city}: 22°C, Sunny`;
});

const response = await client.callWithTools([
    {role: 'user', content: 'How is the weather in Beijing today?'}
], [weatherTool], {
    maxTokens: 1024,
    temperature: 1.0
});
```

##### `getRawClient()`

Get the underlying OpenAI client instance:

```javascript
const openaiClient = client.getRawClient();
```

### McpClient Class

MCP client class integrating the official @modelcontextprotocol/sdk, supporting connection and management of multiple MCP servers, enabling intelligent interaction between LLM and external tools.

#### Constructor

```javascript
new Models.McpClient(llmClient)
```

**Parameters:**
- `llmClient` (LLMClient): LLM client instance for interacting with LLM

#### Core Methods

##### `connectMcpServer(serverConfig)`

Connect to a single MCP server:

```javascript
const success = await mcpClient.connectMcpServer({
    name: 'echarts-server',
    type: 'http',
    url: 'https://your-mcp-server.com/mcp',
    description: 'ECharts chart generation server'
});
```

**Parameters:**
- `serverConfig` (Object): Server configuration
  - `name` (string): Server name
  - `type` (string): Transport type ('http' or 'stdio')
  - `url` (string, optional): URL for HTTP transport
  - `command` (string, optional): Command for stdio transport
  - `args` (Array, optional): Command arguments for stdio transport
  - `description` (string, optional): Server description

##### `connectMcpServers(serverConfigs)`

Batch connect multiple MCP servers:

```javascript
const results = await mcpClient.connectMcpServers([
    {
        name: 'echarts-server',
        type: 'http',
        url: 'https://echarts-server.com/mcp',
        description: 'Chart generation server'
    },
    {
        name: 'file-server',
        type: 'stdio',
        command: 'node',
        args: ['file-server.js'],
        description: 'File processing server'
    }
]);
```

##### `listMcpTools(serverName)`

Get tool list from specified MCP server:

```javascript
const tools = await mcpClient.listMcpTools('echarts-server');
console.log('Available tools:', tools);
```

##### `callMcpTool(serverName, toolName, toolArgs)`

Call a tool from specified MCP server:

```javascript
const result = await mcpClient.callMcpTool(
    'echarts-server',
    'generate_pie_chart',
    {
        title: 'Sales Data',
        data: [
            {name: 'Product A', value: 335},
            {name: 'Product B', value: 310}
        ]
    }
);
```

##### `chatWithMcpTools(messages, summary, options)`

Advanced method for interacting with LLM and MCP tools, automatically analyzing user intent and calling appropriate MCP tools:

```javascript
const messages = [
    {role: 'user', content: 'Generate a bar chart showing 2024 sales data'}
];

const response = await mcpClient.chatWithMcpTools(messages);
console.log('Response:', response.choices[0].message.content);
```

**Parameters:**
- `messages` (Array): Message array
- `summary` (boolean, optional): Whether to let LLM summarize, defaults to true
- `options` (Object, optional): Other options passed to LLM call

**Returns:**
- Object in OpenAI response format containing choices array

##### `getMcpServerStatus()`

Get status of all connected MCP servers:

```javascript
const status = mcpClient.getMcpServerStatus();
console.log('Server Status:', status);
// {
//   'echarts-server': {
//     connected: true,
//     config: {name: 'echarts-server', type: 'http', ...}
//   }
// }
```

##### `disconnectMcpServer(serverName)`

Disconnect from specified MCP server:

```javascript
await mcpClient.disconnectMcpServer('echarts-server');
```

##### `disconnectAllMcpServers()`

Disconnect from all MCP servers:

```javascript
await mcpClient.disconnectAllMcpServers();
```

#### Complete Usage Example

```javascript
import {Models} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

async function mcpExample() {
    // 1. Create LLM client
    const llmClient = new Models.LLMClient(
        process.env.DEEPSEEK_API_KEY,
        'https://api.deepseek.com/v1',
        'deepseek-chat'
    );

    // 2. Create MCP client
    const mcpClient = new Models.McpClient(llmClient);

    try {
        // 3. Connect MCP server
        const connected = await mcpClient.connectMcpServer({
            name: 'echarts-server',
            type: 'http',
            url: 'https://your-mcp-server.com/mcp',
            description: 'ECharts chart generation server'
        });

        if (connected) {
            console.log('✅ MCP Server connected successfully');

            // 4. Get available tools
            const tools = await mcpClient.listMcpTools('echarts-server');
            console.log('Available tools:', tools);

            // 5. Use natural language to call MCP tools
            const messages = [
                {role: 'user', content: 'Generate a pie chart showing sales data for Product A and Product B'}
            ];

            const response = await mcpClient.chatWithMcpTools(messages);
            console.log('AI Response:', response.choices[0].message.content);

            // 6. Directly call specific tool
            const chartResult = await mcpClient.callMcpTool(
                'echarts-server',
                'generate_pie_chart',
                {
                    title: 'Monthly Sales Report',
                    data: [
                        {name: 'Product A', value: 450},
                        {name: 'Product B', value: 380},
                        {name: 'Product C', value: 220}
                    ]
                }
            );
            console.log('Chart generation result:', chartResult);

            // 7. Get server status
            const status = mcpClient.getMcpServerStatus();
            console.log('Server Status:', status);
        }

    } catch (error) {
        console.error('MCP operation failed:', error);
    } finally {
        // 8. Disconnect
        await mcpClient.disconnectAllMcpServers();
    }
}

mcpExample().catch(console.error);
```

#### HTTP Connection Pool Configuration

```javascript
const httpPool = {
    connections: 5,              // Number of connections
    allowH2: true,               // Enable HTTP/2
    keepAliveTimeout: 30000,     // Keep-alive timeout
    pipelining: 1,               // Pipeline requests per connection
    connectTimeout: 10000,       // TCP connection timeout
    headersTimeout: 30000,       // Response header timeout
    bodyTimeout: 30000,          // Response body timeout
    maxRedirections: 0,          // Maximum redirects
    maxHeaderSize: 16384         // Maximum response header size
};

const client = new Models.LLMClient(apiKey, baseURL, model, httpPool);
```

#### Complete Usage Example

```javascript
import {Models, Tools} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

// 1. Create LLM client
const client = new Models.LLMClient(
    process.env.DEEPSEEK_API_KEY,
    'https://api.deepseek.com/v1',
    'deepseek-chat'
);

// 2. Basic text generation
async function basicGeneration() {
    const result = await client.generateText(
        'You are a comedian',
        'Tell a joke about Luo Yonghao',
        { maxTokens: 250, temperature: 1.5 }
    );
    console.log('Generated joke:', result);
}

// 3. Streaming text generation
async function streamingGeneration() {
    const stream = await client.streamText(
        'You are a comedian',
        'Tell a joke about Luo Yonghao',
        { max_tokens: 250, temperature: 1.5 }
    );

    console.log('Streaming output:');
    for await (const chunk of stream) {
        process.stdout.write(chunk.choices?.[0]?.delta?.content ?? '');
    }
    console.log(); // Newline
}

// 4. Tool calling
async function toolCalling() {
    // Create weather tool
    const weatherTool = Tools.createCustomTool(
        'get_weather',
        'Get weather information for specified city',
        {
            type: 'object',
            properties: {
                city: {type: 'string', description: 'City name'},
                unit: {
                    type: 'string',
                    enum: ['celsius', 'fahrenheit'],
                    description: 'Temperature unit',
                    default: 'celsius'
                }
            },
            required: ['city']
        },
        async (args) => {
            // Mock weather data
            const mockData = {
                'Beijing': {temp: 25, condition: 'Sunny', humidity: 60},
                'Shanghai': {temp: 28, condition: 'Cloudy', humidity: 70},
                'Guangzhou': {temp: 32, condition: 'Hot', humidity: 80}
            };

            const weather = mockData[args.city];
            if (!weather) return `Weather data for ${args.city} not available`;

            let temp = weather.temp;
            if (args.unit === 'fahrenheit') {
                temp = Math.round((temp * 9 / 5) + 32);
            }

            return `Weather in ${args.city}: ${weather.condition}, ${temp}°${args.unit.toUpperCase().charAt(0)}, Humidity ${weather.humidity}%`;
        }
    );

    const response = await client.callWithTools([
        {role: 'user', content: 'How is the weather in Beijing today?'}
    ], [weatherTool], {
        maxTokens: 1024,
        temperature: 1.0
    });

    console.log('Tool call result:', response.choices[0].message.content);
}

// 5. Current time tool
async function currentTimeTool() {
    const response = await client.callWithTools([
        {role: 'user', content: 'What is the current time?'}
    ], [Tools.getTool('get_current_time')], {
        maxTokens: 1024,
        temperature: 1.0
    });

    console.log('Current Time:', response.choices[0].message.content);
}

// Run examples
async function runExamples() {
    await basicGeneration();
    await streamingGeneration();
    await toolCalling();
    await currentTimeTool();
}

runExamples().catch(console.error);
```

### SessionChat Class

Smart conversation session management class providing advanced context management, supporting intelligent message compression, token optimization, and long conversation management.

#### Constructor

```javascript
new Models.SessionChat(client, systemRole, config)
```

**Parameters:**
- `client` (LLMClient): LLM client instance
- `systemRole` (string): System role prompt
- `config` (Object, optional): Configuration options
  - `maxMessages` (number): Maximum message count (default: 20)
  - `tokenLimit` (number): Token limit (default: 4000)
  - `compressThreshold` (number): Threshold to trigger compression (default: 15)
  - `importanceThreshold` (number): Message importance threshold (default: 0.3)
  - `manualOperation` (boolean): Manual operation mode (default: false)
  - `verbose` (boolean): Enable detailed logs (default: false)

#### Core Methods

##### `chat(input, opts)`

Smart conversation with automatic context management:

```javascript
const session = new Models.SessionChat(client, 'You are a science expert');
const response = await session.chat('What is artificial intelligence?');
console.log(response); // AI's reply content
```

##### `streamChat(input, callback, opts)`

Streaming conversation, real-time response:

```javascript
await session.streamChat('Tell a joke', (content, isReasoning, isFinished) => {
    if (isReasoning) {
        console.log('Reasoning:', content);
    } else if (!isFinished) {
        process.stdout.write(content);
    } else {
        console.log('\nConversation complete');
    }
});
```

##### `addMessage(role, content)`

Manually add message to session:

```javascript
session.addMessage('user', 'Hello, I want to learn about machine learning');
session.addMessage('assistant', 'Machine learning is a branch of artificial intelligence...');
```

##### `compressHistory()`

Manually trigger history compression:

```javascript
await session.compressHistory(); // Compress old messages, generate summary
```

##### `keepLatestUserMessages(count, assistantTxtLimitSize)`

Keep latest user messages (manual mode only):

```javascript
// Keep only recent 5 user messages and corresponding replies
session.keepLatestUserMessages(5, 250);
```

##### `getLatestMessages(count)`

Get latest message records:

```javascript
const recentMessages = session.getLatestMessages(3);
console.log(recentMessages); // Recent 3 messages
```

##### `getTokenStatus()`

Get current token usage status:

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

Clear conversation history (keep system role):

```javascript
session.clearHistory(); // Restart conversation
```

##### `getStats()`

Get session statistics:

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

#### Intelligent Features

##### Automatic Message Management
- **Smart Compression**: Automatically compress when message count exceeds threshold or approaches token limit
- **Importance Scoring**: Calculate message importance based on position, length, keywords
- **Sliding Window**: Automatically clean old messages, retain important content
- **Multi-language Summaries**: Support Chinese and English conversation summaries

##### Token Optimization
- **Incremental Calculation**: Only calculate token count for new messages
- **Caching Mechanism**: Cache token calculation results for better performance
- **Real-time Monitoring**: Track token usage in real-time
- **Smart Alerts**: Auto-trigger optimization when approaching limits

##### Dual Mode Operation
- **Smart Mode** (default): Automatic context management, no manual intervention
- **Manual Mode**: User has full control over message adding and compression timing

#### Complete Usage Example

```javascript
import {Models} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

// 1. Create LLM client and session
const client = new Models.LLMClient(
    process.env.DEEPSEEK_API_KEY,
    'https://api.deepseek.com/v1',
    'deepseek-chat'
);

const session = new Models.SessionChat(
    client,
    'You are a professional AI assistant skilled at technical explanations',
    {
        maxMessages: 25,
        tokenLimit: 5000,
        compressThreshold: 20,
        verbose: true
    }
);

// 2. Multi-turn conversation
async function multiTurnConversation() {
    // First turn
    const response1 = await session.chat('What is machine learning?');
    console.log('AI:', response1);

    // Second turn
    const response2 = await session.chat('Can you give a specific application example?');
    console.log('AI:', response2);

    // Third turn
    const response3 = await session.chat('What is the difference between deep learning and machine learning?');
    console.log('AI:', response3);

    // View statistics
    const stats = session.getStats();
    console.log('Session Stats:', stats);

    // Check token status
    const tokenStatus = session.getTokenStatus();
    console.log('Token Status:', tokenStatus);
}

// 3. Streaming conversation example
async function streamingConversation() {
    console.log('=== Streaming Conversation Example ===');

    await session.streamChat('Please explain neural networks in detail', (content, isReasoning, isFinished) => {
        if (isReasoning) {
            console.log('🤔 Thinking...');
        } else if (!isFinished) {
            process.stdout.write(content);
        } else {
            console.log('\n✅ Answer complete');
        }
    });
}

// 4. Manual mode example
async function manualModeExample() {
    // Create session in manual mode
    const manualSession = new Models.SessionChat(
        client,
        'You are a science expert',
        { manualOperation: true, verbose: true }
    );

    // Manually add messages
    manualSession.addMessage('user', 'What is quantum computing?');

    // Manually trigger compression (if needed)
    if (manualSession.getTokenStatus().usagePercentage > 80) {
        await manualSession.compressHistory();
    }

    // Keep only recent messages
    manualSession.keepLatestUserMessages(3);
}

// Run examples
async function runSessionExamples() {
    await multiTurnConversation();
    await streamingConversation();
    await manualModeExample();
}

runSessionExamples().catch(console.error);
```

#### Configuration Recommendations

```javascript
// Short conversation optimized config
const shortSessionConfig = {
    maxMessages: 10,
    tokenLimit: 2000,
    compressThreshold: 8
};

// Long conversation optimized config
const longSessionConfig = {
    maxMessages: 50,
    tokenLimit: 8000,
    compressThreshold: 30,
    importanceThreshold: 0.4
};

// Manual management mode
const manualConfig = {
    manualOperation: true,
    verbose: true
};
```

### ReActAgent Class

Core AI agent class implementing the ReAct (Reasoning + Acting) pattern.

#### Constructor

```javascript
new Agent.ReActAgent(vendorName, modelName, tools, config)
```

**Parameters:**
- `vendorName` (string): AI provider name ('OpenAI', 'DeepSeek', 'Moonshot', 'Volcano', 'CoresHub', 'Ollama')
- `modelName` (string): Specific model name to use
- `tools` (Array): Array of available tools
- `config` (Object, optional): Configuration options
  - `maxIterations` (number): Maximum reasoning steps (default: 5)
  - `verbose` (boolean): Enable detailed logs (default: false)
  - `systemPrompt` (string): Custom system prompt

#### Core Methods

##### `run(query)`

Execute agent to process user query (non-streaming):

```javascript
const result = await agent.run('Calculate 25 * 4 + 100');
console.log(result);
// {
//   success: true,
//   answer: "25 * 4 + 100 = 200",
//   iterations: 2,
//   history: [...] // Reasoning history
// }
```

##### `runStream(query, onChunk)`

Streaming execution of agent processing user query:

```javascript
await agent.runStream('Calculate 25 * 4 + 100', (chunk) => {
    console.log(chunk.type, chunk);
});
```

Streaming event types:
- `start`: Start processing
- `iteration_start`: New reasoning iteration starts
- `thinking`: Real-time thinking content
- `parsed`: Parsed response components
- `tool_start`: Tool execution starts
- `tool_result`: Tool execution result
- `final_answer`: Final answer
- `complete`: Processing complete
- `error`: Error occurred
- `max_iterations`: Maximum iterations reached

##### `reset()`

Reset agent conversation history:

```javascript
agent.reset(); // Clear all history, prepare for new task
```

##### Skill-related Methods

ReActAgent integrates the Skill system, supporting the following skill operation methods:

##### `registerSkill(skillDefinition)`

Register skill to Agent:

```javascript
const skillDef = {
    name: 'my_skill',
    version: '1.0.0',
    description: 'Skill description',
    parameters: { /* JSON Schema */ },
    workflow: { steps: [ /* workflow steps */ ] }
};

agent.registerSkill(skillDef);
```

##### `loadSkill(filePath)`

Load skill from file (supports .json/.yaml/.js):

```javascript
await agent.loadSkill('./skills/data-analysis.skill.json');
```

##### `loadSkillsFromDirectory(dirPath)`

Batch load skills from directory:

```javascript
await agent.loadSkillsFromDirectory('./skills/builtin');
```

##### `getSkills()`

Get all registered skills:

```javascript
const skills = agent.getSkills();
console.log(skills.map(s => s.name)); // ['skill1', 'skill2']
```

##### `executeSkill(skillName, parameters)`

Directly execute specified skill:

```javascript
const result = await agent.executeSkill('data_analysis', {
    file_path: './data.csv',
    analysis_type: 'summary'
});
console.log(result.outputs);
```

### Skill System API

#### SkillEngine Class

Skill execution engine responsible for executing skill workflows.

##### Constructor

```javascript
new Skills.SkillEngine(toolsRegistry, llmClient, config)
```

**Parameters:**
- `toolsRegistry` (Object): Tool registry in key-value format `{toolName: tool}`
- `llmClient` (Object): LLM client instance
- `config` (Object, optional): Configuration options
  - `verbose` (boolean): Enable detailed logs
  - `maxDepth` (number): Maximum nesting depth (default 10)

##### Core Methods

##### `registerSkill(skillDefinition)`

Register skill definition:

```javascript
skillEngine.registerSkill({
    name: 'example_skill',
    version: '1.0.0',
    description: 'Example skill',
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
                prompt: 'Process: {{parameters.input}}',
                output_key: 'result'
            }
        ]
    }
});
```

##### `execute(skillName, parameters, context)`

Execute skill:

```javascript
const result = await skillEngine.execute('example_skill', {
    input: 'Test data'
}, {
    executionId: 'exec-001' // Optional execution ID
});

console.log(result.outputs); // All step outputs
console.log(result.outputs.result); // Specific output
```

##### `getAllSkills()`

Get all registered skills:

```javascript
const skills = skillEngine.getAllSkills();
```

#### SkillManager Class

Skill manager responsible for loading skills from files and directories.

##### Constructor

```javascript
new Skills.SkillManager(skillEngine, config)
```

**Parameters:**
- `skillEngine` (SkillEngine): Skill engine instance
- `config` (Object, optional): Configuration options
  - `verbose` (boolean): Enable detailed logs
  - `encoding` (string): File encoding (default 'utf-8')

##### Core Methods

##### `loadFromFile(filePath)`

Load skill from file:

```javascript
const skill = await skillManager.loadFromFile('./skills/my-skill.json');
```

Supported formats: `.json`, `.yaml/.yml`, `.js`

##### `loadFromDirectory(dirPath, options)`

Batch load skills from directory:

```javascript
const skills = await skillManager.loadFromDirectory('./skills', {
    recursive: false,      // Whether to recurse subdirectories
    pattern: /\.skill\.json$/  // File matching pattern
});
```

##### `loadBuiltinSkills()`

Load built-in skills:

```javascript
const builtinSkills = await skillManager.loadBuiltinSkills();
```

##### `getSkillSummaries()`

Get summary information of all skills:

```javascript
const summaries = skillManager.getSkillSummaries();
// Returns: [{name, version, description, author, parameters, source}]
```

#### Skill Definition Format

Complete skill definition JSON structure:

```json
{
    "name": "skill_name",
    "version": "1.0.0",
    "description": "Skill description",
    "author": "Author name",
    "parameters": {
        "type": "object",
        "properties": {
            "param1": {
                "type": "string",
                "description": "Parameter description"
            }
        },
        "required": ["param1"]
    },
    "workflow": {
        "steps": [
            {
                "id": "step_id",
                "type": "tool|llm|skill|condition",
                "description": "Step description",
                "condition": "{{parameters.condition}}",
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

**Step Type Descriptions:**

1. **tool step** - Call tools:
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

2. **llm step** - LLM reasoning:
```json
{
    "id": "analyze",
    "type": "llm",
    "prompt": "Analyze the following content:\n{{steps.read_file.output}}",
    "output_key": "analysis_result"
}
```

3. **skill step** - Nested skills:
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

4. **condition step** - Conditional execution:
```json
{
    "id": "check",
    "type": "condition",
    "condition": "{{parameters.should_process}}",
    "then": { /* Execute when condition is true */ },
    "else": { /* Execute when condition is false */ }
}
```

**Variable Substitution Syntax:**
- `{{parameters.xxx}}` - Access input parameters
- `{{steps.xxx.output}}` - Access other step outputs
- `{{outputs.xxx}}` - Access defined outputs
- `{{env.xxx}}` - Access environment variables

### Model Management API

#### `Models.registerVendor(vendorName, vendorConfig)`

Dynamically register new model providers:

```javascript
Models.registerVendor('CustomVendor', {
    apiKey: 'your_api_key_here',
    baseURL: 'https://api.customvendor.com/v1',
    models: ['custom-model-1', 'custom-model-2']
});
```

#### `Models.getRegisteredVendors()`

Get all registered model providers:

```javascript
const vendors = Models.getRegisteredVendors();
console.log(vendors); // ['OpenAI', 'DeepSeek', 'Moonshot', ...]
```

#### `Models.getVendorModels(vendorName)`

Get list of models supported by specified provider:

```javascript
const models = Models.getVendorModels('DeepSeek');
console.log(models); // ['deepseek-chat', 'deepseek-reasoner']
```

#### `Models.createModel(vendorName, modelName)`

Create model client instance (recommended method):

```javascript
// Use DeepSeek
const deepseekClient = Models.createModel('DeepSeek', 'deepseek-chat');

// Use OpenAI
const openaiClient = Models.createModel('OpenAI', 'gpt-4-turbo');

// Use Moonshot (Kimi)
const moonshotClient = Models.createModel('Moonshot', 'kimi-k2-turbo-preview');

// Use Volcano Engine
const volcanoClient = Models.createModel('Volcano', 'doubao-pro-32k');

// Use CoresHub
const coreshubClient = Models.createModel('CoresHub', 'QwQ-32B');

// Use Ollama local model
const ollamaClient = Models.createModel('Ollama', 'llama3');
```

#### Multi-Model Provider Comparison Usage

```javascript
import {Models} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

// Compare responses from different models
async function compareModels() {
    const prompt = 'Explain what AI is in one sentence';
    const systemRole = 'You are a science expert';

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
            console.error(`${name} error:`, error.message);
        }
    }
}

compareModels();
```

#### Dynamic Model Switching

```javascript
// Select the most suitable model based on task type
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

// Usage example
const reasoningClient = getClientForTask('reasoning');
const response = await reasoningClient.generateText(
    'Logic reasoning expert',
    'If all A are B, and all B are C, then are all A C?'
);
```

### Prompt Factory API

Prompt factory is used for managing and generating prompt templates in different languages.

```javascript
import {Agent} from './src/index.js';

// Create prompt factory instance
const promptFactory = new Agent.PromptFactory('cn'); // 'cn' or 'en'

// Generate ReAct prompt
const tools = [...]; // Tool array
const prompt = promptFactory.createReActPrompt(tools);

// Switch language
promptFactory.switchLanguage('en');
```

## 🛠️ Tool System

### Built-in Tools

The framework includes the following built-in tools:

#### Calculator (calculator)
Provides basic math operations (add, subtract, multiply, divide):
```javascript
{
  name: 'calculator',
  description: 'Perform basic arithmetic operations (add, subtract, multiply, divide)',
  handler: async ({ operation, a, b }) => { /* implementation */ }
}
```

#### Random Number Generator (random_number)
Generates random numbers within a specified range:
```javascript
{
  name: 'random_number',
  description: 'Generate a random number within a specified range',
  handler: async ({ min, max }) => { /* implementation */ }
}
```

#### Advanced Calculator (advanced_calculator)
Provides advanced math operations (power, modulo, square root, absolute value):
```javascript
{
  name: 'advanced_calculator',
  description: 'Perform advanced mathematical operations including power, modulo, and square root',
  handler: async ({ operation, a, b }) => { /* implementation */ }
}
```

#### Current Time (get_current_time)
Gets formatted current time string:
```javascript
{
  name: 'get_current_time',
  description: 'Get the current formatted date and time',
  handler: async () => {
    return '2025-01-20 14:30:45'; // Format: YYYY-MM-DD HH:mm:ss
  }
}
```

#### File Reader (file_reader)
Reads file content from specified path:
```javascript
{
  name: 'file_reader',
  description: 'Read file content from specified path, supports text files',
  parameters: {
    path: { type: 'string', description: 'Absolute file path' },
    encoding: { type: 'string', default: 'utf-8' },
    max_size: { type: 'integer', default: 1048576 } // 1MB
  },
  handler: async ({ path, encoding, max_size }) => { /* read file */ }
}
```

#### File Writer (file_writer)
Writes content to file at specified path:
```javascript
{
  name: 'file_writer',
  description: 'Write content to file at specified path, supports auto directory creation',
  parameters: {
    path: { type: 'string', description: 'Absolute file path' },
    content: { type: 'string', description: 'Content to write' },
    encoding: { type: 'string', default: 'utf-8' },
    append: { type: 'boolean', default: false }
  },
  handler: async ({ path, content, encoding, append }) => { /* write file */ }
}
```

#### Script (script)
Executes local script commands (PowerShell on Windows, Bash on Linux/macOS):
```javascript
{
  name: 'script',
  description: 'Execute local script commands',
  parameters: {
    command: { type: 'string', description: 'Command or script content to execute' },
    timeout: { type: 'integer', default: 60000, maximum: 300000 },
    cwd: { type: 'string', description: 'Working directory (optional)' },
    description: { type: 'string', description: 'Command description' }
  },
  handler: async ({ command, timeout, cwd, description }) => { /* execute script */ }
}
```

#### Shell Info (shell_info)
Gets current system shell information:
```javascript
{
  name: 'shell_info',
  description: 'Get current system shell information',
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

#### Code Executor (code_executor)
Dynamically executes Node.js or Python code, allowing AI to program solutions for complex problems:
```javascript
{
  name: 'code_executor',
  description: 'Execute Node.js or Python code. When existing tools cannot meet requirements, AI can write code to complete specific tasks',
  parameters: {
    code: { type: 'string', description: 'Code content to execute' },
    language: { type: 'string', enum: ['nodejs', 'python'], description: 'Programming language' },
    description: { type: 'string', description: 'Brief description of code functionality' },
    timeout: { type: 'integer', default: 30000, description: 'Timeout in milliseconds' },
    inputs: { type: 'object', description: 'Input data passed to code (optional)' }
  },
  handler: async ({ code, language, description, timeout, inputs }) => { /* execute code */ }
}
```

**Usage Example:**
```javascript
// Execute Python code to analyze data
const result = await agent.run('Use Python to calculate the first 10 Fibonacci numbers');

// Agent will auto-generate and execute code:
// Action: code_executor
// Action Input: {
//   "code": "def fibonacci(n):...",
//   "language": "python",
//   "description": "Calculate Fibonacci sequence"
// }
```

#### Code Generator (code_generator)
Generates code templates for common tasks, helping AI quickly write code:
```javascript
{
  name: 'code_generator',
  description: 'Generate code templates for common tasks to help AI quickly write Node.js or Python code',
  parameters: {
    task: {
      type: 'string',
      enum: ['file_read', 'file_write', 'data_transform', 'api_call', 'csv_parse', 'json_process', 'regex_extract', 'math_compute'],
      description: 'Task type'
    },
    language: { type: 'string', enum: ['nodejs', 'python'], description: 'Programming language' },
    requirements: { type: 'string', description: 'Specific requirement description' }
  }
}
```

**Security Features:**
- Code length limit (max 100KB)
- Dangerous operation check (prohibit `rm -rf /`, `format`, infinite loops, etc.)
- Temporary file isolation execution
- Timeout protection (default 30s, max 2 minutes)
- Child process restriction (prohibit `child_process`, `spawn`, `exec`)

### Tool System Architecture

The tool system adopts a modular design, supporting flexible extension:

1. **Built-in Tools**: Framework provides common calculator, random number generator, and other basic tools
2. **Custom Tools**: Easily create custom tools via `createCustomTool` function
3. **Parameter Validation**: JSON Schema-based parameter validation mechanism ensures tool call safety
4. **File System Tools**: Provide file read and write functions, support Skill system file processing
5. **Script Execution Tools**: Support PowerShell/Bash command execution, extend Agent capability to system level
6. **Code Execution Tools**: Support dynamic execution of Node.js and Python code, AI can program solutions for complex problems
7. **Tool Management**: Support tool registration, retrieval, and removal operations

### Get Built-in Tools

```javascript
import {Tools} from 'react-agent-framework';

const tools = Tools.getBuiltInTools(); // Returns array of all built-in tools
```

### Custom Tool Creation

```javascript
import {Tools} from 'react-agent-framework';

const customTool = Tools.createCustomTool(
    'tool_name',
    'Tool description',
    {
        type: 'object',
        properties: {
            param1: {type: 'string', description: 'Parameter 1 description'}
        },
        required: ['param1']
    },
    async (args) => {
        // Tool implementation logic
        return 'Result';
    }
);
```

## 🎯 Skill System

The Skill system is an advanced feature of the framework, used for defining and executing multi-step workflows.

### Built-in Skills

The framework includes the following example skills:

#### Data Analysis (data_analysis)
Analyzes data files and generates summary reports:
```javascript
{
    name: 'data_analysis',
    version: '1.0.0',
    description: 'Analyze data files and generate summary reports',
    parameters: {
        file_path: { type: 'string', description: 'Data file path' },
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

#### Code Review (code_review)
Automated code review for code files:
```javascript
{
    name: 'code_review',
    version: '1.0.0',
    description: 'Automated code review for code files',
    parameters: {
        file_path: { type: 'string' },
        review_focus: { type: 'array', items: { enum: ['security', 'performance', 'readability'] } }
    },
    workflow: { steps: [...] }
}
```

#### Document Generation (doc_generate)
Auto-generate code documentation:
```javascript
{
    name: 'doc_generate',
    version: '1.0.0',
    description: 'Auto-generate code documentation',
    parameters: {
        source_path: { type: 'string' },
        doc_type: { type: 'string', enum: ['api', 'readme', 'inline'] }
    },
    workflow: { steps: [...] }
}
```

#### System Info (system_info)
Collect system information (OS, disk, memory, CPU):
```javascript
{
    name: 'system_info',
    version: '1.0.0',
    description: 'Collect system information',
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

### Skill System Architecture

The skill system adopts a workflow design, supporting complex task orchestration:

1. **Skill Definition**: Define skill metadata, parameters, and workflows via JSON/YAML files
2. **Workflow Steps**: Support tool, llm, skill, condition four step types
3. **Variable Substitution**: Use template syntax for data passing between steps
4. **Dynamic Loading**: SkillManager supports batch loading from files and directories
5. **Agent Integration**: ReActAgent automatically recognizes and uses registered skills

### Get Built-in Skills

```javascript
import {Agent, Tools, Skills} from 'react-agent-framework';

// Create Agent
const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', Tools.getBuiltInTools());

// Load built-in skills
const skillManager = new Skills.SkillManager(agent.skillEngine);
await skillManager.loadBuiltinSkills();
```

### Create Custom Skills

```javascript
import {Skills} from 'react-agent-framework';

// Create skill using template
const skillTemplate = Skills.createSkillTemplate('my_skill', {
    description: 'Custom skill description',
    parameters: {
        input: { type: 'string', description: 'Input parameter' }
    },
    requiredParams: ['input']
});

// Or define directly
const mySkill = {
    name: 'my_skill',
    version: '1.0.0',
    description: 'Custom skill',
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
                prompt: 'Process: {{parameters.input}}',
                output_key: 'result'
            }
        ]
    }
};

// Validate skill definition
const validation = Skills.validateSkill(mySkill);
if (validation.valid) {
    skillEngine.registerSkill(mySkill);
}
```

## 🏃‍♂️ Running Examples

The project includes multiple example files demonstrating different framework usages:

```bash
# Basic usage example
node examples/basic-usage.js

# Simple Agent test (recommended for beginners)
node examples/simple-agent-test.js

# Skill system usage example
node examples/skill-usage.js

# MCP client usage example
node examples/test-mcp-client.js

# Streaming response example
node examples/streaming-usage.js

# Custom tool example
node examples/custom-tool.js

# Other examples
node examples/sample.js
node examples/sample2.js

# LLMClient feature test
node examples/testLLM.js

# Influencer joke generator example
node test/influencer-joke-agent/main.js
```

### Influencer Joke Generator Example

The project includes an innovative **Influencer Joke Generator** example demonstrating the framework's extension capabilities:

```javascript
// Create influencer joke generator agent
const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', [
    ...Tools.getBuiltInTools(),
    influencerDatabaseTool,  // Influencer database tool
    jokeGeneratorTool        // Personalized joke generation tool
]);

// Run personalized joke creation
const result = await agent.run(
    'Create a funny joke about AI for influencer "Zhang" in the tech field, with his professional characteristics'
);
```

**Feature Description:**
- **Influencer Database Management**: Maintain influencer information and persona characteristics across different fields
- **Personalized Content Creation**: Generate customized jokes based on influencer's professional field and style characteristics
- **Persona Analysis**: Intelligent analysis of influencer's professional background, language style, and audience characteristics
- **Domain Professional Matching**: Ensure joke content is highly relevant to influencer's professional field

This example demonstrates how to use the ReAct framework to build complex AI applications, combining multiple tools to achieve personalized content generation.

### Simple Agent Test Example

`simple-agent-test.js` is the best example for getting started with the framework, demonstrating three basic tests:

```javascript
import {Agent, Tools} from 'react-agent-framework';

// Create Agent
const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', Tools.getBuiltInTools(), {
    verbose: true,
    maxIterations: 5
});

// Test 1: Simple calculation
const result1 = await agent.run('What is 123 * 456 + 789?');

// Test 2: Get current time
const result2 = await agent.run('What is the current time?');

// Test 3: Code execution (generate Fibonacci sequence)
const result3 = await agent.run('Generate the first 10 Fibonacci numbers using Python');
```

Run: `node examples/simple-agent-test.js`

### Complete Usage Example

```javascript
import {Agent, Tools} from 'react-agent-framework';
import dotenv from 'dotenv';

dotenv.config();

// Get all built-in tools
const builtInTools = Tools.getBuiltInTools();

// Create influencer joke generator agent
const agent = new Agent.ReActAgent(
    'DeepSeek',
    'deepseek-chat',
    builtInTools,
    {
        verbose: true,
        maxIterations: 8,
        systemPrompt: 'You are a professional influencer content creation assistant, skilled at creating personalized content based on different influencer personas.'
    }
);

// Run complex task
const result = await agent.run(
    'First get the current time, then calculate how many hours until 8 PM tonight, and finally create a tech influencer joke for this time period'
);

console.log('Creation Result:', result.answer);
```

## 📁 Project Structure

```
project/
├── src/
│   ├── agents/
│   │   ├── models/              # Model management and client implementation
│   │   │   ├── model.factory.js # Model factory, multi-vendor support
│   │   │   ├── llm.client.js    # Unified LLM client
│   │   │   ├── mcp.client.js    # MCP client, official SDK integration
│   │   │   ├── http.dispatcher.js # HTTP request dispatcher
│   │   │   └── chat.session.js  # Smart conversation session management (supports context compression and token optimization)
│   │   ├── tools/               # Tool system
│   │   │   ├── calculator.js    # Calculator tool implementation
│   │   │   ├── code.executor.js # Code execution tool (Node.js/Python)
│   │   │   └── tool.js          # Tool system core
│   │   ├── utils/               # Utility functions
│   │   │   ├── prompt.factory.js # Prompt factory
│   │   │   ├── prompts.en.js    # English prompt templates
│   │   │   └── prompts.cn.js    # Chinese prompt templates
│   │   └── react.agent.js       # ReAct agent core implementation
│   ├── skills/                  # Skill system
│   │   ├── builtin/             # Built-in skill examples
│   │   │   ├── code-review.skill.json     # Code review skill
│   │   │   ├── data-analysis.skill.json   # Data analysis skill
│   │   │   └── doc-generate.skill.json    # Document generation skill
│   │   ├── skill.engine.js      # Skill execution engine
│   │   ├── skill.manager.js     # Skill manager
│   │   ├── skill.schema.js      # Skill Schema definition
│   │   └── index.js             # Skill module exports
│   └── index.js                 # Main entry file
├── examples/                    # Example code
│   ├── basic-usage.js           # Basic usage example
│   ├── simple-agent-test.js     # Simple Agent test example (recommended for beginners)
│   ├── skill-usage.js           # Skill system usage example
│   ├── streaming-usage.js       # Streaming response example
│   ├── custom-tool.js           # Custom tool example
│   ├── test-mcp-client.js       # MCP client test example
│   └── debug-mcp-serverlist.js  # MCP server list example
├── test/                        # Test files and example projects
│   ├── influencer-joke-agent/   # Influencer joke generator complete example
│   │   ├── main.js              # Main run file
│   │   ├── agents/              # Custom agents
│   │   ├── data/                # Data files
│   │   └── utils/               # Utility functions
│   └── testLLM.js               # LLM test file
├── .env.example                 # Environment variable template
├── package.json                 # Project dependencies and scripts
├── optimization-suggestions.md  # Project optimization suggestions document
└── README.md                    # Project documentation
```

### Model Management Mechanism

The framework provides unified model management, supporting multiple LLM providers:

1. **Multi-Vendor Support**: Built-in support for OpenAI, DeepSeek, Moonshot, CoresHub, Volcano, Ollama, and other major model providers
2. **Dynamic Registration**: Runtime dynamic addition, update, and removal of model provider configurations
3. **Client Encapsulation**: LLMClient encapsulates interactions with various model APIs, supporting HTTP connection pool configuration
4. **Environment Configuration**: Unified management of API keys and base URLs for all vendors via environment variables

## 🔍 Development Guide

### Environment Requirements
- Node.js 20.0.0 or higher
- npm or yarn package manager

### Dependencies

The project uses the following main dependencies:
- **@modelcontextprotocol/sdk**: Official MCP SDK for MCP client functionality
- **openai**: OpenAI JavaScript SDK for LLM API calls
- **dotenv**: Environment variable management
- **undici**: High-performance HTTP client for connection pool management

### Development Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env file, add required API keys
```

3. Run examples:
```bash
node examples/basic-usage.js
```

## 🔧 Configuration

### Environment Variables

- `OPENAI_API_KEY`: OpenAI API key
- `DEEPSEEK_API_KEY`: DeepSeek API key
- `MOONSHOT_API_KEY`: Moonshot (Kimi) API key
- `VOLC_API_KEY`: Volcano Engine API key
- `CORESHUB_API_KEY`: CoresHub API key
- `CORESHUB_BASE_URL`: Optional, CoresHub API base URL
- `VOLC_BASE_URL`: Optional, Volcano Engine API base URL
- `PROMPTS_LANG`: Prompt language ('cn' Chinese, 'en' English)

### Agent Configuration

The following configurations can be specified when creating an agent:

```javascript
const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', tools, {
    maxIterations: 5,    // Maximum reasoning steps
    verbose: false,      // Enable detailed logs
    systemPrompt: null   // Custom system prompt (optional)
});
```

## 🚀 Supported Model Providers

| Provider | Supported Models | API Base URL |
|---------|-----------------|-------------|
| OpenAI | gpt-3.5-turbo, gpt-4-turbo | https://api.openai.com/v1 |
| DeepSeek | deepseek-chat, deepseek-reasoner | https://api.deepseek.com/v1 |
| Moonshot | kimi-k2-turbo-preview, kimi-k2-0711-preview | https://api.moonshot.cn/v1 |
| Bailian | qwen3-max, qwen-flash, qwen-plus, deepseek-v3.2-exp | https://dashscope.aliyuncs.com/compatible-mode/v1 |
| CoresHub | QwQ-32B, ernie-4.5-turbo-128k, DeepSeek-V3.1-Terminus, Qwen3-32B, Qwen3-30B-A3B, DeepSeek-V3, DeepSeek-R1 | https://openapi.coreshub.cn/v1 |
| Volcano | doubao-seed-1-6-250615 and more models | https://ark.cn-beijing.volces.com/api/v3 |
| Ollama | llama3 (local) | http://localhost:11434/v1 |

## 🆕 Version Changelog

### v2.0.2
- **New Code Execution Tool**: `code_executor` supports dynamic execution of Node.js and Python code
  - AI can write code to solve complex problems that existing tools cannot handle
  - Supports data transformation, file processing, complex calculations, and more scenarios
  - Built-in security checks (dangerous code detection, timeout protection, code length limit)
- **New Code Generator Tool**: `code_generator` provides code templates for common tasks
  - Supports templates for file read/write, CSV parsing, JSON processing, regex extraction, math calculations, etc.
  - Supports both Node.js and Python languages
- **Improved ReAct Parser**: Fixed multi-line JSON parsing issues, using `JSON.parse()` validation instead of brace counting
- **New Simple Agent Test Example**: `simple-agent-test.js` demonstrates basic calculations, time queries, and code execution

### v2.0.1
- **New Skill System**: Support for defining multi-step workflow skills via JSON/YAML
- **Skill Execution Engine**: SkillEngine supports tool, llm, skill, condition four step types
- **Skill Manager**: SkillManager supports batch loading skills from files and directories
- **Variable Substitution System**: Support template syntax like `{{parameters.xxx}}`, `{{steps.xxx.output}}`
- **Agent Integration**: ReActAgent automatically recognizes and uses registered skills
- **Built-in Skill Examples**: Provide 4 example skills for data analysis, code review, document generation, and system info
- **File System Tools**: Added `file_reader` and `file_writer` tools, supporting file operations
- **Script Execution Tools**: Added `script` and `shell_info` tools, supporting PowerShell/Bash command execution
- **New Example Files**: Added skill-usage.js skill system usage example

### v1.2.0
- **New MCP Client Integration**: Integrated official @modelcontextprotocol/sdk, supporting connection and management of multiple MCP servers
- **Intelligent Tool Calling**: Automatically analyze user intent, intelligently select and call MCP tools
- **Multi-Transport Protocol Support**: Support both HTTP and stdio MCP transport methods
- **Enhanced LLM Interaction**: Combine MCP tool results to provide richer response generation
- **Server Status Management**: Complete MCP server connection status monitoring and management
- **New Example Files**: Added MCP client test and usage examples

### v1.1.3
- **Optimized related default parameters**: Adjusted chat session tokenLimit default to 64K; removed hard-coded max_tokens limit in llm.client

### v1.1.2
- **New Bailian Provider**: Added built-in `Bailian` provider, models include qwen3-max, qwen-flash, qwen-plus, deepseek-v3.2-exp, others can be added via updateVendor
- **Add models to specified provider**: Previously adding new models to existing providers required the updateVendor method which was cumbersome, now the addVendorModel method is more intuitive, e.g.: addVendorModel('OpenAI', 'gpt-4'); or addVendorModel('Bailian', ['qwen3-plus', 'qwen3-lite']);

### v1.0.5
- **New Current Time Tool**: Added `get_current_time` tool, supporting formatted time retrieval
- **Influencer Joke Generator Example**: Innovative AI personalized content creation example project
- **Optimized Project Structure**: Improved test directory structure, added example project organization
- **Enhanced Tool System**: Extended built-in tools to 4, improved tool documentation
- **Improved Private Field Syntax**: ReactAgent class uses JavaScript private field syntax
- **Improved Error Handling**: Optimized error handling mechanism for tool calls and parameter validation

### v1.0.4
- **New Streaming Response Support**: Implemented `runStream` method, supporting real-time reasoning process display
- **Conversation Compression Feature**: Intelligent conversation summarization compression based on token count
- **Enhanced Model Factory**: Support for more vendors and model configurations
- **Improved Prompt System**: Support dynamic language switching and multi-language templates
- **New HTTP Dispatcher**: Better network request management and error handling
- **Extended Built-in Tools**: Added advanced calculator tool
- **Enhanced Error Handling**: Improved exception catching and user-friendly error messages
- **New Example Code**: Added streaming processing example and multi-vendor usage example

### v1.0.3
- Extended model support and optimized generation interface
- Implemented token-based compression strategy and status monitoring
- Added multi-language prompt support
- Optimized project structure and documentation

### v1.0.2
- Added conversation summarization compression feature
- Support Chinese and English summary formats
- Improved ReAct prompt templates

### v1.0.1
- Refactored project structure, optimized module organization
- Added unified model factory, supporting multiple model providers
- Implemented dynamic model registration feature
- Optimized prompt factory, supporting Chinese/English prompt switching

### v1.0.0
- Initial version release
- Implemented ReAct pattern core functionality
- Added basic tools and custom tool framework
- Support OpenAI API integration

## 🔒 Extensibility and Maintainability

The framework is designed with full consideration for extensibility and maintainability:

1. **Modular Architecture**: Each functional module has clear responsibilities, decoupled from each other, facilitating independent development and maintenance
2. **Interface Standardization**: Tools and models adopt standardized interface design for easy extension of new features
3. **Configuration Flexibility**: Support for various custom configuration options to adapt to different usage scenarios
4. **Multi-language Support**: Built-in Chinese and English prompt templates, supporting runtime dynamic switching
5. **Error Handling Mechanism**: Complete exception catching and handling mechanism, improving system stability
6. **Documentation Completeness**: Detailed API documentation and usage examples, reducing learning and usage costs

## 🔒 Security Considerations

- **API Key Management**: Use environment variables to store sensitive information
- **Input Validation**: All tool parameters are validated via JSON Schema
- **Error Handling**: Friendly error messages, avoiding leakage of sensitive information
- **Code Execution Security**: Code execution tool has built-in multi-layer security protection
  - Dangerous code pattern detection (prohibit system file deletion, disk formatting, etc.)
  - Code length limit (max 100KB)
  - Timeout protection (default 30s, max 2 minutes)
  - Temporary file isolation execution, auto-cleanup after execution
  - Prohibit creating child processes (`child_process`, `spawn`, `exec`)
- **No File System Access**: Examples do not contain file system operations

## 📈 Performance Optimization

- **Async Operations**: All tools support async execution
- **Streaming Processing**: Reduce user waiting time
- **Configurable Limits**: Control cost and performance via maxIterations
- **Connection Pool Management**: HTTP request optimization
- **Caching Strategy**: Support tool result caching

## 🧪 Testing and Validation

The framework includes built-in validation and testing features:

- **Parameter Validation**: JSON Schema validation for all tool parameters
- **Error Handling**: Graceful handling of API errors, tool failures, and invalid input
- **Logging**: Optional detailed logs for debugging
- **Validation Tools**: Built-in validation tools for custom tools

## 🤝 Contribution Guide

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Update documentation
5. Submit Pull Request

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

For questions and suggestions:
1. Check examples in `/examples`
2. Check API documentation
3. Submit an Issue on GitHub

---

**ReAct Agent Framework** - Making AI agents smarter, more flexible, and easier to use!
