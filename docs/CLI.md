# ReAct Agent CLI 使用说明

> 中文 | [English](CLI.en.md)

🤖 基于 ReAct Agent Framework 的交互式命令行工具，支持自然语言对话和动态 Skill 管理。

## 目录

- [安装](#安装)
- [快速开始](#快速开始)
- [命令行参数](#命令行参数)
- [交互式命令](#交互式命令)
- [使用示例](#使用示例)
- [环境配置](#环境配置)
- [故障排除](#故障排除)

## 安装

### 前提条件

- Node.js >= 20.0.0
- npm 或 yarn

### 安装步骤

1. 克隆仓库并安装依赖：

```bash
git clone <repository-url>
cd react-agent-framework
npm install
```

2. 配置环境变量（复制 `.env.example` 为 `.env`）：

```bash
cp .env.example .env
```

3. 编辑 `.env` 文件，添加你的 API 密钥：

```bash
# 至少配置一个 LLM 提供商
DEEPSEEK_API_KEY=sk-...
# 或
OPENAI_API_KEY=sk-...
# 或其他提供商...
```

## 快速开始

### 启动 CLI

```bash
# 使用 npm 脚本
npm run cli

# 或直接运行
node bin/cli.js
```

### 基本使用流程

```bash
$ npm run cli

🤖 ReAct Agent CLI
==================
Provider: DeepSeek
Model:    deepseek-chat
Skills:   0 loaded
Type /help for commands or start chatting!

> /builtin
✓ 成功加载 4 个内置 skills
  • code_review
  • data_analysis
  • doc_generate
  • system_info

> 请分析当前系统信息
🤔 Thinking...
🔧 执行: system_info
✅ 完成: system_info
📊 Final Answer: 系统分析结果如下...

> /exit
👋 再见!
```

## 命令行参数

启动 CLI 时可以指定以下参数：

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--vendor` | `-v` | LLM 提供商 | DeepSeek |
| `--model` | `-m` | 模型名称 | deepseek-chat |
| `--skills-dir` | `-s` | 启动时加载的技能目录 | - |
| `--verbose` | - | 启用详细日志 | false |
| `--help` | `-h` | 显示帮助信息 | - |

### 示例

```bash
# 使用默认配置启动
node bin/cli.js

# 使用 OpenAI GPT-4
node bin/cli.js --vendor OpenAI --model gpt-4

# 启动时加载自定义技能目录
node bin/cli.js -s ./my-skills --verbose

# 使用 Moonshot
node bin/cli.js -v Moonshot -m moonshot-v1-8k
```

## 交互式命令

在 CLI 中，所有命令以 `/` 开头。直接输入文本将与 AI Agent 对话。

### Skill 管理命令

#### `/load <filepath>`
从文件加载单个 Skill。

```
> /load ./skills/my-skill.skill.json
✓ Skill "my_skill" v1.0.0 加载成功
ℹ 描述: 我的自定义技能
```

支持格式：
- `.json` - JSON 格式
- `.yaml` / `.yml` - YAML 格式
- `.js` - JavaScript 模块

#### `/loaddir <dirpath>`
从目录批量加载 Skills。

```
> /loaddir ./skills
✓ 成功加载 3 个 skills:
  • skill_a v1.0.0: 技能A描述
  • skill_b v1.0.0: 技能B描述
  • skill_c v1.0.0: 技能C描述
```

#### `/unload <skillname>`
卸载指定的 Skill。

```
> /unload my_skill
✓ Skill "my_skill" 已卸载
ℹ 来源: /path/to/my-skill.skill.json
```

#### `/reload <skillname>`
重新加载 Skill（修改文件后使用）。

```
> /reload my_skill
✓ Skill "my_skill" 重新加载成功
ℹ 版本: v1.0.0
```

#### `/list` 或 `/ls`
列出所有已加载的 Skills。

```
> /list

📋 已加载 Skills (4):

1. code_review v1.0.0
   对代码文件进行自动化审查，检查代码质量、潜在问题和改进建议
   来源: /path/to/code-review.skill.json

2. data_analysis v1.0.0
   分析数据文件并生成摘要报告，支持CSV、JSON等格式的数据分析
   来源: /path/to/data-analysis.skill.json
```

#### `/builtin`
加载框架内置的 Skills。

内置 Skills 包括：
- **code_review** - 代码审查
- **data_analysis** - 数据分析
- **doc_generate** - 文档生成
- **system_info** - 系统信息收集

### 对话控制命令

#### `/clear`
清除对话历史记录。

```
> /clear
✓ 对话历史已清除
```

#### `/history`
显示当前对话历史。

```
> /history

对话历史:

用户: 请分析当前系统信息
Agent: 系统分析结果如下...

用户: 帮我生成一段代码
Agent: 好的，以下是生成的代码...
```

#### `/model <vendor> <model>`
切换 LLM 模型。

```
> /model OpenAI gpt-4
✓ 已切换到: OpenAI / gpt-4

> /model DeepSeek deepseek-chat
✓ 已切换到: DeepSeek / deepseek-chat
```

### 其他命令

#### `/help` 或 `/h`
显示帮助信息。

#### `/exit`, `/quit` 或 `/q`
退出 CLI 程序。

## 使用示例

### 示例 1：系统信息分析

```bash
> /builtin
✓ 成功加载 4 个内置 skills

> 请帮我查看当前系统状态
🤔 Thinking...
🔧 执行: system_info
✅ 完成: system_info
📊 Final Answer:
# 系统状态报告

## 操作系统
- 名称: Windows 11 Pro
- 版本: 10.0.22621
...
```

### 示例 2：数据分析

```bash
> /load ./skills/custom-analysis.skill.json
✓ Skill "custom_analysis" 加载成功

> 请分析 data.csv 文件中的销售趋势
🤔 Thinking...
🔧 执行: custom_analysis
✅ 完成: custom_analysis
📊 Final Answer: 根据数据分析，本月销售趋势...
```

### 示例 3：代码审查

```bash
> /builtin

> 请审查 src/index.js 文件
🤔 Thinking...
🔧 执行: code_review
✅ 完成: code_review
📊 Final Answer:
## 代码审查报告

### 优点
1. 代码结构清晰...

### 改进建议
1. 建议添加错误处理...
```

### 示例 4：多轮对话

```bash
> 你好，能帮我写一个快速排序算法吗？
📊 Final Answer: 当然，以下是快速排序算法的实现...

> 能把它改写成 TypeScript 吗？
📊 Final Answer: 好的，以下是 TypeScript 版本...

> 解释一下这段代码的时间复杂度
📊 Final Answer: 这段代码的时间复杂度是 O(n log n)...
```

## 环境配置

### 支持的 LLM 提供商

| 提供商 | 环境变量 | 说明 |
|--------|----------|------|
| DeepSeek | `DEEPSEEK_API_KEY` | 默认推荐 |
| OpenAI | `OPENAI_API_KEY` | GPT 系列 |
| Moonshot | `MOONSHOT_API_KEY` | 月之暗面 |
| Bailian | `BAILIAN_API_KEY` | 阿里百炼 |
| CoresHub | `CORESHUB_API_KEY` | - |
| Volcano | `VOLC_API_KEY` | 字节火山 |
| Ollama | - | 本地模型 |

### 可选配置

```bash
# 提示词语言 (cn/en)
PROMPTS_LANG=cn

# 自定义 API 基础 URL
BAILIAN_BASE_URL=https://...
CORESHUB_BASE_URL=https://...
VOLC_BASE_URL=https://...
```

## 故障排除

### 问题：无法启动 CLI

**错误信息：**
```
Error: Cannot find module
```

**解决方案：**
```bash
# 确保已安装依赖
npm install

# 检查 Node.js 版本
node --version  # 需要 >= 20.0.0
```

### 问题：API Key 错误

**错误信息：**
```
Authentication failed: Invalid API key
```

**解决方案：**
1. 检查 `.env` 文件是否存在
2. 确认 API Key 正确且未过期
3. 重新加载配置：
```bash
source .env
npm run cli
```

### 问题：无法加载 Skill

**错误信息：**
```
✗ 加载失败: Skill file not found
```

**解决方案：**
1. 检查文件路径是否正确（支持相对路径和绝对路径）
2. 确认文件格式正确（JSON/YAML/JS）
3. 使用 `--verbose` 查看详细错误信息：
```bash
node bin/cli.js --verbose
```

### 问题：模型响应缓慢

**解决方案：**
1. 检查网络连接
2. 切换至响应更快的模型：
```bash
# DeepSeek 推荐用于中文
node bin/cli.js -v DeepSeek -m deepseek-chat

# 或使用轻量级模型
node bin/cli.js -v OpenAI -m gpt-3.5-turbo
```

### 问题：内存不足

**解决方案：**
```bash
# 清除对话历史
> /clear

# 或使用更小的上下文窗口
node bin/cli.js --max-tokens 512
```

## 高级用法

### 创建自定义 Skill

1. 使用框架提供的模板创建 Skill：

```javascript
import { Skills } from './src/index.js';

const template = Skills.createSkillTemplate({
  name: 'my_custom_skill',
  description: '我的自定义技能',
  version: '1.0.0'
});

console.log(JSON.stringify(template, null, 2));
```

2. 保存为 `.skill.json` 文件并通过 CLI 加载：

```bash
> /load ./my-custom.skill.json
```

### 批量部署 Skills

在项目根目录创建 `skills` 文件夹：

```
project/
├── skills/
│   ├── team-skill-a.skill.json
│   ├── team-skill-b.skill.json
│   └── shared/
│       └── common.skill.json
└── package.json
```

启动时自动加载：

```bash
node bin/cli.js -s ./skills
```

## 更新日志

### v2.0.1
- ✨ 新增交互式 CLI 工具
- ✨ 支持动态 Skill 加载/卸载/重载
- ✨ 支持流式响应显示
- ✨ 支持多模型切换

## 许可证

MIT License
