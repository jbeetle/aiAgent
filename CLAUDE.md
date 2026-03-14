# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **ReAct Agent Framework** - a JavaScript-based AI agent framework implementing the ReAct (Reasoning + Acting) pattern. It uses the OpenAI JavaScript SDK to interact with multiple LLM providers.

**Key Technologies:**
- JavaScript (ES modules, `"type": "module"`)
- Node.js 20.0.0+
- OpenAI SDK for API calls
- MCP (Model Context Protocol) SDK for external tool servers
- undici for HTTP connection pooling

## Common Commands

```bash
# Install dependencies
npm install

# Run the main entry point
npm start

# Run in watch mode (Node.js --watch)
npm run dev

# Run the interactive CLI
npm run cli

# Run CLI with specific model
node bin/cli.js --vendor OpenAI --model gpt-4

# Run example files
node examples/basic-usage.js
node examples/streaming-usage.js
node examples/custom-tool.js
node examples/test-mcp-client.js

# Run test files
node test/agentTest.js
node test/influencer-joke-agent/index.js
```

## Architecture Overview

The framework exports four main namespaces from `src/index.js`:

### 1. `Agent` Namespace (`src/agents/`)

**ReActAgent** (`react.agent.js`): The core agent implementing the ReAct pattern.
- Uses a loop that alternates between LLM reasoning and tool execution
- Parses LLM responses to extract Thought, Action, Action Input, and Final Answer
- **Legacy methods** (backward compatible): `run()` (non-streaming) and `runStream()` (streaming with callbacks)
- **New stateless methods**: `executeTask()` and `executeTaskStream()` for external context
- Default config: `maxIterations: 5`, `max_tokens: 1042`

**PromptFactory** (`utils/prompt.factory.js`): Manages multilingual prompt templates.
- Supports 'cn' (Chinese) and 'en' (English) via `PROMPTS_LANG` env var
- Creates ReAct prompts dynamically based on available tools
- Reads from `prompts.cn.js` or `prompts.en.js`

### 2. `Conversation` Namespace (`src/agents/conversation/`)

**BaseLLMService** (`base.llm.service.js`): High-level conversation management service.
- Encapsulates SessionChat for cross-conversation context management
- Implements intent recognition (keyword + LLM hybrid strategy)
- Coordinates with ReActAgent for tool execution
- Provides unified `chat()` and `streamChat()` interfaces
- Manages tool registration and routing decisions

### 3. `Models` Namespace (`src/agents/models/`)

**LLMClient** (`llm.client.js`): Unified client for LLM APIs.
- Wraps OpenAI SDK with configurable HTTP connection pooling (undici)
- Key methods: `generateText()`, `streamText()`, `callWithTools()`
- `callWithTools()` automatically executes tool handlers and makes follow-up LLM calls

**Model Factory** (`model.factory.js`): Registry of supported LLM providers.
- Built-in providers: OpenAI, DeepSeek, Moonshot, Bailian (Ali), CoresHub, Volcano, Ollama
- `createModel(vendor, modelName)` creates a configured LLMClient
- `registerVendor()` allows runtime addition of new providers
- API keys read from environment variables

**SessionChat** (`chat.session.js`): Context-aware conversation management.
- Automatically manages message history with token limits
- Implements sliding window and compression when thresholds are exceeded
- Supports both regular `chat()` and streaming `streamChat()` modes

**BaseLLMService** (`conversation/base.llm.service.js`): High-level conversation management layer.
- Encapsulates SessionChat for cross-conversation context management
- Implements intent recognition (keyword + LLM hybrid strategy)
- Smart routing between direct chat and tool execution
- Coordinates with ReActAgent for task execution
- Key methods: `chat()`, `streamChat()`, `setReActAgent()`, `registerTools()`

**McpClient** (`mcp.client.js`): MCP (Model Context Protocol) integration.
- Connects to external MCP servers via HTTP or stdio
- `chatWithMcpTools()` analyzes user intent and automatically invokes appropriate MCP tools
- Manages multiple server connections concurrently

### 4. `Tools` Namespace (`src/agents/tools/`)

**Tool System** (`tool.js`):
- Four built-in tools: calculator, random_number, advanced_calculator, get_current_time
- `createCustomTool()` factory for defining new tools with JSON Schema validation
- `validateParameters()` implements JSON Schema validation for tool inputs

**Tool Structure:**
```javascript
{
  name: 'tool_name',
  description: 'Tool description',
  parameters: { /* JSON Schema */ },
  handler: async (args) => { /* execution */ },
  validate: (input) => { /* validation */ }
}
```

### 5. `Skills` Namespace (`src/skills/`)

**Skill System** provides high-level workflow composition through JSON/YAML definitions:

**SkillEngine** (`skill.engine.js`): Executes multi-step workflows.
- Step types: `tool`, `llm`, `skill` (nested), `condition`
- Variable substitution: `{{parameters.xxx}}`, `{{steps.xxx.output}}`, `{{env.xxx}}`
- Execution depth limit (default: 10) prevents infinite recursion
- Methods: `registerSkill()`, `execute()`, `unregisterSkill()`

**SkillManager** (`skill.manager.js`): Loads skills from files/directories.
- `loadFromFile()` - Load single skill (JSON/YAML/JS)
- `loadFromDirectory()` - Batch load from directory
- `loadBuiltinSkills()` - Load from `src/skills/builtin/`
- `unloadSkill()` - Remove loaded skill
- `reloadSkill()` - Reload from original file path

**Skill Schema** (`skill.schema.js`): JSON Schema validation and template generation.

**Built-in Skills** (`src/skills/builtin/`):
- `code_review` - Automated code review with quality checks
- `data_analysis` - CSV/JSON data analysis and reporting
- `doc_generate` - Documentation generation from code
- `system_info` - System information collection

### 6. CLI Tool (`bin/cli.js`)

Interactive command-line interface for the framework. Uses a layered architecture:

**Architecture:**
- **BaseLLMService**: Primary conversation interface, manages cross-conversation context
- **ReActAgent**: Stateless task executor for tool invocations
- **Context Preservation**: All conversation history maintained in BaseLLMService (not ReActAgent)

**CLI Commands:**
- `/load <filepath>` - Load skill from file
- `/loaddir <dirpath>` - Load skills from directory
- `/unload <skillname>` - Unload skill
- `/reload <skillname>` - Reload skill
- `/list` - List loaded skills
- `/builtin` - Load built-in skills
- `/clear` - Clear conversation history (both services)
- `/history` - Show conversation history with token statistics
- `/model <vendor> <model>` - Switch LLM model (recreates both services)
- `/help` - Show help
- `/exit` - Exit CLI

**CLI Options:**
```bash
node bin/cli.js [options]
  -v, --vendor <name>      LLM provider (default: DeepSeek)
  -m, --model <name>       Model name (default: deepseek-chat)
  -s, --skills-dir <path>  Load skills directory at startup
  --verbose                Enable verbose logging
```

**Context Display:**
The CLI banner shows: `Context: N messages` - indicating the current conversation context size.

## ReAct Pattern Implementation

The ReAct pattern is implemented in `ReActAgent`:

### Core Methods

**`run(query)`**: Legacy method (backward compatible)
- Creates temporary message context with system prompt + query
- Runs ReAct loop and returns final answer
- Maintains internal `conversationHistory` for compatibility

**`runStream(query, onChunk)`**: Legacy streaming method (backward compatible)
- Same as `run()` but with streaming callbacks
- Provides granular events: 'thinking', 'tool_start', 'tool_result', 'final_answer'

**`executeTask(taskConfig, callbacks)`**: New stateless task execution
- Accepts external context via `taskConfig.contextMessages`
- Stateless - does not maintain its own conversation history
- Designed to be called by `BaseLLMService`
- `taskConfig` includes: `query`, `contextMessages`, `tools`, `suggestedTools`

**`executeTaskStream(taskConfig, onChunk)`**: New stateless streaming execution
- Streaming version of `executeTask()`
- Same event types as `runStream()`

### Execution Flow

1. **System Prompt**: Generated by PromptFactory with tool descriptions
2. **Context Building**: `#buildMessagesWithContext()` combines system prompt + external context + query
3. **Iteration Loop**: Up to `maxIterations` cycles of:
   - Send messages to LLM
   - Parse response for Thought/Action/Action Input/Final Answer
   - If Final Answer: return it
   - If Action: execute tool, append observation to messages
4. **Response Parsing** (`#parseResponse()`): Line-based parsing looking for:
   - `Thought:` prefix for reasoning
   - `Action:` prefix for tool name
   - `Action Input:` prefix for arguments (JSON or string)
   - `Final Answer:` prefix for completion

### Architecture Flow (New)

With the new architecture, the typical CLI flow is:

```
User Input
    ↓
BaseLLMService.chat() / streamChat()
    ↓
Intent Recognition (keyword/LLM)
    ↓
┌──────────┴──────────┐
↓                     ↓
Direct Chat       Tool Needed
(SessionChat)         ↓
    ↓           ReActAgent.executeTask()
    ↓                 ↓
    └────────┬────────┘
             ↓
    Integrate result into SessionChat
             ↓
    Return final answer
```

## Skill Execution Flow

Skills are executed by the SkillEngine through the ReActAgent:

1. **Registration**: Skills loaded via `SkillManager.loadFromFile()` are registered to `SkillEngine`
2. **Invocation**: ReActAgent recognizes `Skill` action type and calls `#executeSkill()`
3. **Workflow Execution**: SkillEngine executes steps sequentially:
   - `tool` steps: Call tools from the tools registry
   - `llm` steps: Generate text using LLM client
   - `skill` steps: Recursively execute nested skills
   - `condition` steps: Branch based on evaluated conditions
4. **Variable Resolution**: Template strings are resolved using execution context
5. **Result Return**: Final outputs are returned to the agent

## Environment Configuration

Required environment variables (in `.env` file):

```bash
# At least one LLM provider API key is required
DEEPSEEK_API_KEY=sk-...
OPENAI_API_KEY=sk-...
MOONSHOT_API_KEY=sk-...
BAILIAN_API_KEY=sk-...
CORESHUB_API_KEY=sk-...
VOLC_API_KEY=...

# Optional settings
PROMPTS_LANG=cn        # 'cn' or 'en' for prompt language
BAILIAN_BASE_URL=...   # Custom base URL for Bailian
CORESHUB_BASE_URL=...  # Custom base URL for CoresHub
VOLC_BASE_URL=...      # Custom base URL for Volcano
```

## Key Implementation Details

**HTTP Connection Pooling:**
- LLMClient accepts an `httpPool` config object for undici dispatcher
- Used for connection pooling, HTTP/2, timeouts, and throttling

**Tool Parameter Validation:**
- Custom JSON Schema validator in `validateParameters()`
- Supports type checking, required fields, nested objects, arrays, min/max constraints

**Streaming Architecture:**
- Both LLMClient and ReActAgent support streaming
- ReActAgent's `runStream()` provides granular callbacks: 'thinking', 'tool_start', 'tool_result', 'final_answer', etc.

**MCP Tool Flow:**
1. `chatWithMcpTools()` generates analysis prompt with server list
2. LLM decides if MCP tool is needed (format: `NEED_MCP: server.tool\n参数: {...}`)
3. If needed, McpClient calls the tool and optionally has LLM summarize results
4. Returns OpenAI-compatible response format

**Skill Variable Resolution:**
- `{{parameters.name}}` - Input parameter substitution
- `{{steps.stepId.output}}` - Previous step output reference
- `{{outputs.key}}` - Saved output values
- `{{env.VAR_NAME}}` - Environment variable access

**BaseLLMService Intent Recognition:**
- **Keyword Matching**: Fast path for common patterns (greetings, math expressions, etc.)
  - High confidence patterns: '计算', 'calculate', '查询' → needs tools
  - High confidence patterns: '你好', 'hello', '谢谢' → direct chat
- **LLM Confirmation**: For ambiguous inputs, uses LLM to classify intent
  - Returns JSON: `{needs_tools: boolean, confidence: string, reason: string}`
- **Smart Routing**: Routes to direct chat or ReActAgent based on intent

**Context Management:**
- **Sliding Window**: Keeps recent N messages (default: 20)
- **Token Compression**: Automatically compresses history when token limit exceeded
- **Threshold-based**: Compresses when messages > 15 or tokens > 64K
- **Token Estimation**: Rough estimate: Chinese chars × 1.5 + English words × 1.3
