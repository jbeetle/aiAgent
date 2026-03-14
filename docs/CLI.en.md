# ReAct Agent CLI Documentation

> English | [中文](CLI.md)

🤖 An interactive command-line tool based on the ReAct Agent Framework, supporting natural language conversations and dynamic Skill management.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Command Line Arguments](#command-line-arguments)
- [Interactive Commands](#interactive-commands)
- [Usage Examples](#usage-examples)
- [Environment Configuration](#environment-configuration)
- [Troubleshooting](#troubleshooting)

## Installation

### Prerequisites

- Node.js >= 20.0.0
- npm or yarn

### Installation Steps

1. Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd react-agent-framework
npm install
```

2. Configure environment variables (copy `.env.example` to `.env`):

```bash
cp .env.example .env
```

3. Edit `.env` file and add your API keys:

```bash
# Configure at least one LLM provider
DEEPSEEK_API_KEY=sk-...
# or
OPENAI_API_KEY=sk-...
# or other providers...
```

## Quick Start

### Start the CLI

```bash
# Using npm script
npm run cli

# Or run directly
node bin/cli.js
```

### Basic Usage Flow

```bash
$ npm run cli

🤖 ReAct Agent CLI
==================
Provider: DeepSeek
Model:    deepseek-chat
Skills:   0 loaded
Context:  0 messages

Type /help for commands or start chatting!

> /builtin
✓ Successfully loaded 4 built-in skills
  • code_review
  • data_analysis
  • doc_generate
  • system_info

> Please analyze my system information
🤔 Thinking...
🔧 Executing: system_info
✅ Completed: system_info
📊 Final Answer: Here is the system analysis...

> /exit
👋 Goodbye!
```

## Command Line Arguments

The following arguments can be specified when starting the CLI:

| Argument | Short | Description | Default |
|----------|-------|-------------|---------|
| `--vendor` | `-v` | LLM provider | DeepSeek |
| `--model` | `-m` | Model name | deepseek-chat |
| `--skills-dir` | `-s` | Skills directory to load at startup | - |
| `--verbose` | - | Enable verbose logging | false |
| `--help` | `-h` | Show help information | - |

### Examples

```bash
# Start with default configuration
node bin/cli.js

# Use OpenAI GPT-4
node bin/cli.js --vendor OpenAI --model gpt-4

# Load custom skills directory at startup
node bin/cli.js -s ./my-skills --verbose

# Use Moonshot
node bin/cli.js -v Moonshot -m moonshot-v1-8k
```

## Interactive Commands

In the CLI, all commands start with `/`. Type text directly to chat with the AI Agent.

### Skill Management Commands

#### `/load <filepath>`
Load a single Skill from file.

```
> /load ./skills/my-skill.skill.json
✓ Skill "my_skill" v1.0.0 loaded successfully
ℹ Description: My custom skill
```

Supported formats:
- `.json` - JSON format
- `.yaml` / `.yml` - YAML format
- `.js` - JavaScript module

#### `/loaddir <dirpath>`
Batch load Skills from a directory.

```
> /loaddir ./skills
✓ Successfully loaded 3 skills:
  • skill_a v1.0.0: Skill A description
  • skill_b v1.0.0: Skill B description
  • skill_c v1.0.0: Skill C description
```

#### `/unload <skillname>`
Unload a specified Skill.

```
> /unload my_skill
✓ Skill "my_skill" unloaded
ℹ Source: /path/to/my-skill.skill.json
```

#### `/reload <skillname>`
Reload a Skill (use after modifying the file).

```
> /reload my_skill
✓ Skill "my_skill" reloaded successfully
ℹ Version: v1.0.0
```

#### `/list` or `/ls`
List all loaded Skills.

```
> /list

📋 Loaded Skills (4):

1. code_review v1.0.0
   Automated code review to check code quality, potential issues and improvement suggestions
   Source: /path/to/code-review.skill.json

2. data_analysis v1.0.0
   Analyze data files and generate summary reports, supporting CSV, JSON and other formats
   Source: /path/to/data-analysis.skill.json
```

#### `/builtin`
Load built-in Skills from the framework.

Built-in Skills include:
- **code_review** - Code review
- **data_analysis** - Data analysis
- **doc_generate** - Documentation generation
- **system_info** - System information collection

### Conversation Control Commands

#### `/clear`
Clear conversation history.

```
> /clear
✓ Conversation history cleared
```

#### `/history`
Show current conversation history with message statistics and token usage status.

```
> /history

Conversation History:
Messages: 4 | Token Estimate: 245 | Status: safe

User: Please analyze my system information
Agent: Here is the system analysis...

User: Help me generate some code
Agent: Sure, here is the generated code...
```

**Status Description:**
- `safe` - Token usage normal (< 70%)
- `warning` - High token usage (70-90%)
- `critical` - Token usage critical (> 90%), consider `/clear` to reset history

#### `/model <vendor> <model>`
Switch LLM model.

```
> /model OpenAI gpt-4
✓ Switched to: OpenAI / gpt-4

> /model DeepSeek deepseek-chat
✓ Switched to: DeepSeek / deepseek-chat
```

### Other Commands

#### `/help` or `/h`
Show help information.

#### `/exit`, `/quit` or `/q`
Exit the CLI program.

## Usage Examples

### Example 1: System Information Analysis

```bash
> /builtin
✓ Successfully loaded 4 built-in skills

> Please check my current system status
🤔 Thinking...
🔧 Executing: system_info
✅ Completed: system_info
📊 Final Answer:
# System Status Report

## Operating System
- Name: Windows 11 Pro
- Version: 10.0.22621
...
```

### Example 2: Data Analysis

```bash
> /load ./skills/custom-analysis.skill.json
✓ Skill "custom_analysis" loaded successfully

> Please analyze the sales trends in data.csv
🤔 Thinking...
🔧 Executing: custom_analysis
✅ Completed: custom_analysis
📊 Final Answer: Based on the data analysis, this month's sales trend...
```

### Example 3: Code Review

```bash
> /builtin

> Please review the src/index.js file
🤔 Thinking...
🔧 Executing: code_review
✅ Completed: code_review
📊 Final Answer:
## Code Review Report

### Strengths
1. Clear code structure...

### Improvement Suggestions
1. Consider adding error handling...
```

### Example 4: Multi-turn Conversation

```bash
> Hello, can you write a quicksort algorithm for me?
📊 Final Answer: Sure, here is the quicksort algorithm implementation...

> Can you rewrite it in TypeScript?
📊 Final Answer: Sure, here is the TypeScript version...

> Explain the time complexity of this code
📊 Final Answer: The time complexity of this code is O(n log n)...
```

### Example 5: Context Preservation

The CLI automatically preserves context across conversations:

```bash
> My name is John
📊 Final Answer: Hello John! Nice to meet you!

> What's my name?
📊 Final Answer: You just told me your name is **John**!

> Calculate 123 * 456
🔧 Executing: calculator
✅ Completed: calculator
📊 Final Answer: 123 * 456 = 56088

> What was the result of the calculation?
📊 Final Answer: The result of the calculation was 56088
```

## CLI Architecture

### Layered Architecture Design

The CLI adopts a layered architecture that separates the conversation management layer from the task execution layer:

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Interface Layer                      │
│                   (bin/cli.js)                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              BaseLLMService (Conversation Layer)            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Responsibilities:                                     ││
│  │  • Cross-conversation context management (SessionChat) ││
│  │  • Intent recognition (keyword + LLM hybrid strategy)  ││
│  │  • Smart routing (direct chat ↔ tool execution)        ││
│  │  • Token estimation and history compression            ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐      ┌──────────────────────────────┐
│   Direct Chat (no tools) │      │   Tool Execution (ReActAgent)│
│   SessionChat.chat()    │      │  • executeTask()              │
│                         │      │  • executeTaskStream()        │
│  Fast response for chat │      │  Stateless task executor      │
└─────────────────────────┘      └──────────────────────────────┘
```

### Context Management

- **Sliding Window**: Automatically keeps the most recent 20 messages
- **Token Compression**: Automatically compresses history when threshold exceeded
- **Intent Recognition**: Automatically determines if tools need to be called

### Intent Recognition Strategy

1. **Keyword Quick Match** (high confidence)
   - calculate/query/get → needs tools
   - hello/thanks/goodbye → direct chat

2. **LLM Confirmation** (low confidence)
   - LLM determines if tools are needed for ambiguous inputs

## Environment Configuration

### Supported LLM Providers

| Provider | Environment Variable | Description |
|----------|---------------------|-------------|
| DeepSeek | `DEEPSEEK_API_KEY` | Recommended default |
| OpenAI | `OPENAI_API_KEY` | GPT series |
| Moonshot | `MOONSHOT_API_KEY` | Moonshot AI |
| Bailian | `BAILIAN_API_KEY` | Alibaba Bailian |
| CoresHub | `CORESHUB_API_KEY` | - |
| Volcano | `VOLC_API_KEY` | ByteDance Volcano |
| Ollama | - | Local models |

### Optional Configuration

```bash
# Prompt language (cn/en)
PROMPTS_LANG=cn

# Custom API base URL
BAILIAN_BASE_URL=https://...
CORESHUB_BASE_URL=https://...
VOLC_BASE_URL=https://...
```

## Troubleshooting

### Issue: Cannot Start CLI

**Error Message:**
```
Error: Cannot find module
```

**Solution:**
```bash
# Ensure dependencies are installed
npm install

# Check Node.js version
node --version  # Requires >= 20.0.0
```

### Issue: API Key Error

**Error Message:**
```
Authentication failed: Invalid API key
```

**Solution:**
1. Check if `.env` file exists
2. Verify the API key is correct and not expired
3. Reload configuration:
```bash
source .env
npm run cli
```

### Issue: Cannot Load Skill

**Error Message:**
```
✗ Loading failed: Skill file not found
```

**Solution:**
1. Check if the file path is correct (supports relative and absolute paths)
2. Verify the file format is correct (JSON/YAML/JS)
3. Use `--verbose` to see detailed error information:
```bash
node bin/cli.js --verbose
```

### Issue: Slow Model Response

**Solution:**
1. Check network connection
2. Switch to a faster-responding model:
```bash
# DeepSeek recommended for Chinese
node bin/cli.js -v DeepSeek -m deepseek-chat

# Or use a lightweight model
node bin/cli.js -v OpenAI -m gpt-3.5-turbo
```

### Issue: Out of Memory

**Solution:**
```bash
# Clear conversation history
> /clear

# Or use a smaller context window
node bin/cli.js --max-tokens 512
```

## Advanced Usage

### Create Custom Skill

1. Create a Skill using the framework's template:

```javascript
import { Skills } from './src/index.js';

const template = Skills.createSkillTemplate({
  name: 'my_custom_skill',
  description: 'My custom skill',
  version: '1.0.0'
});

console.log(JSON.stringify(template, null, 2));
```

2. Save as `.skill.json` file and load via CLI:

```bash
> /load ./my-custom.skill.json
```

### Batch Deploy Skills

Create a `skills` folder in the project root:

```
project/
├── skills/
│   ├── team-skill-a.skill.json
│   ├── team-skill-b.skill.json
│   └── shared/
│       └── common.skill.json
└── package.json
```

Auto-load at startup:

```bash
node bin/cli.js -s ./skills
```

## Changelog

### v2.1.0
- ✨ Architecture upgrade: Separated conversation layer and task execution layer
- ✨ Added BaseLLMService for cross-conversation context management
- ✨ Smart intent recognition (keyword + LLM hybrid strategy)
- ✨ Enhanced `/history` command with token usage statistics
- ✨ Context preservation: Automatic memory across tool invocations
- ✨ Added `executeTask()` / `executeTaskStream()` methods

### v2.0.1
- ✨ Added interactive CLI tool
- ✨ Support for dynamic Skill loading/unloading/reloading
- ✨ Support for streaming response display
- ✨ Support for multi-model switching

## License

MIT License
