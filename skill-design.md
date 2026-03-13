# Skill 系统设计文档

## 概述

为 ReAct Agent Framework 添加 **Skill（技能）系统**，让智能体能够像使用工具一样理解和执行用户引入的技能。

**核心目标：**
- 支持用户通过 JSON/YAML 文件定义技能
- 智能体能够动态理解、推理并使用这些技能
- 实现技能的可复用、可分享

---

## 架构设计

### Skill vs Tool 的区别

| 特性 | Tool（工具） | Skill（技能） |
|------|-------------|--------------|
| **抽象层次** | 底层原子操作 | 高层业务逻辑 |
| **复杂度** | 单一功能 | 多步骤工作流 |
| **定义方式** | JavaScript 代码 | JSON/YAML 配置 |
| **复用性** | 代码级复用 | 配置级复用 |
| **示例** | calculator, file_reader | 数据分析、代码审查 |

```
Skill（技能）层次结构
├── metadata (元数据)
│   ├── name: 技能名称
│   ├── version: 版本
│   ├── description: 描述
│   └── author: 作者
├── parameters (参数定义)
│   └── JSON Schema 格式
├── workflow (工作流)
│   └── steps: 执行步骤序列
└── knowledge (领域知识)
    └── examples, prompts
```

---

## Skill 定义格式

### 示例：数据分析技能

```json
{
  "name": "data_analysis",
  "version": "1.0.0",
  "description": "分析数据文件并生成报告",
  "parameters": {
    "type": "object",
    "properties": {
      "file_path": {
        "type": "string",
        "description": "数据文件路径"
      },
      "analysis_type": {
        "type": "string",
        "enum": ["summary", "trend", "correlation"],
        "description": "分析类型"
      }
    },
    "required": ["file_path"]
  },
  "workflow": {
    "steps": [
      {
        "id": "read_file",
        "type": "tool",
        "tool": "file_reader",
        "input": {
          "path": "{{parameters.file_path}}"
        }
      },
      {
        "id": "analyze",
        "type": "llm",
        "prompt": "分析以下数据，生成{{parameters.analysis_type}}报告:\n{{steps.read_file.output}}",
        "output_key": "report"
      },
      {
        "id": "save",
        "type": "tool",
        "tool": "file_writer",
        "input": {
          "path": "{{parameters.file_path}}.report.md",
          "content": "{{steps.analyze.output}}"
        }
      }
    ]
  },
  "knowledge": {
    "examples": [
      {
        "input": { "file_path": "./sales.csv", "analysis_type": "trend" },
        "description": "分析销售数据的趋势"
      }
    ],
    "best_practices": [
      "确保数据文件存在且格式正确",
      "根据数据类型选择合适的分析方法"
    ]
  }
}
```

### 变量替换语法

- `{{parameters.xxx}}` - 引用输入参数
- `{{steps.xxx.output}}` - 引用前面步骤的输出
- `{{env.xxx}}` - 引用环境变量

---

## 核心组件设计

### 1. Skill 引擎 (SkillEngine)

```javascript
export class SkillEngine {
  constructor(toolsRegistry, llmClient) {
    this.tools = toolsRegistry;
    this.llm = llmClient;
    this.skills = new Map();
    this.context = {}; // 执行上下文
  }

  // 注册技能
  registerSkill(skillDefinition) {
    // 验证技能格式
    this.validateSkill(skillDefinition);
    // 注册到引擎
    this.skills.set(skillDefinition.name, skillDefinition);
  }

  // 执行技能
  async execute(skillName, parameters) {
    const skill = this.skills.get(skillName);
    if (!skill) {
      throw new Error(`Skill not found: ${skillName}`);
    }

    // 初始化执行上下文
    this.context = {
      parameters,
      steps: {},
      outputs: {}
    };

    // 按 workflow.steps 顺序执行
    for (const step of skill.workflow.steps) {
      const result = await this.executeStep(step);
      this.context.steps[step.id] = result;
    }

    return this.context;
  }

  // 执行单个步骤
  async executeStep(step) {
    switch (step.type) {
      case 'tool':
        return await this.executeToolStep(step);
      case 'llm':
        return await this.executeLlmStep(step);
      case 'skill':
        return await this.executeSkillStep(step);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  // 变量替换
  resolveVariables(template) {
    return template
      .replace(/\{\{parameters\.(\w+)\}\}/g, (match, key) => this.context.parameters[key])
      .replace(/\{\{steps\.(\w+)\.output\}\}/g, (match, key) => this.context.steps[key]?.output)
      .replace(/\{\{env\.(\w+)\}\}/g, (match, key) => process.env[key]);
  }
}
```

### 2. 技能管理器 (SkillManager)

```javascript
export class SkillManager {
  constructor(skillEngine) {
    this.engine = skillEngine;
  }

  // 从 JSON 文件加载
  async loadFromFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const skillDef = JSON.parse(content);
    this.engine.registerSkill(skillDef);
    return skillDef;
  }

  // 从目录批量加载
  async loadFromDirectory(dirPath) {
    const files = await fs.readdir(dirPath);
    const skillFiles = files.filter(f => f.endsWith('.skill.json'));

    for (const file of skillFiles) {
      await this.loadFromFile(path.join(dirPath, file));
    }
  }

  // 获取所有技能（用于生成提示词）
  getAllSkills() {
    return Array.from(this.engine.skills.values());
  }
}
```

### 3. 与 ReActAgent 集成

```javascript
export class ReActAgent {
  constructor(vendorName, modelName, tools = [], config = {}) {
    // ... 原有初始化代码 ...

    // 新增：技能引擎
    this.skillEngine = new SkillEngine(tools, this.openai);
    this.skillManager = new SkillManager(this.skillEngine);
  }

  // 注册技能
  registerSkill(skillDefinition) {
    this.skillEngine.registerSkill(skillDefinition);
  }

  // 加载技能文件
  async loadSkill(filePath) {
    return await this.skillManager.loadFromFile(filePath);
  }

  // 创建系统提示词（扩展版，包含技能）
  #createSystemPrompt() {
    const skills = this.skillManager.getAllSkills();
    return promptFactory.createReActPrompt(this.tools, skills);
  }

  // 解析响应（扩展版，识别技能调用）
  #parseResponse(content) {
    // 原有 Thought/Action/Action Input 解析
    // 新增 Skill 调用识别
    const skillMatch = content.match(/Skill:\s*(\w+)/);
    if (skillMatch) {
      return {
        type: 'skill',
        skillName: skillMatch[1],
        parameters: this.extractParameters(content)
      };
    }
    // ... 原有解析逻辑 ...
  }
}
```

---

## 步骤类型定义

### 1. Tool 步骤

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

### 2. LLM 步骤

```json
{
  "id": "analyze",
  "type": "llm",
  "prompt": "分析以下内容：{{steps.read_file.output}}",
  "system_prompt": "你是数据分析专家",
  "output_key": "analysis_result"
}
```

### 3. Skill 步骤（嵌套调用）

```json
{
  "id": "sub_analysis",
  "type": "skill",
  "skill": "text_summary",
  "input": {
    "text": "{{steps.read_file.output}}",
    "max_length": 500
  },
  "output_key": "summary"
}
```

### 4. Condition 步骤（条件分支）

```json
{
  "id": "check_size",
  "type": "condition",
  "condition": "{{steps.read_file.output.length}} > 10000",
  "then": [ { "type": "tool", ... } ],
  "else": [ { "type": "tool", ... } ]
}
```

---

## 文件结构

```
src/
├── skills/
│   ├── index.js              # 模块导出
│   ├── skill.schema.js       # JSON Schema 定义
│   ├── skill.engine.js       # 技能执行引擎
│   ├── skill.manager.js      # 技能管理器
│   └── builtin/              # 内置技能
│       ├── code-review.skill.json
│       ├── data-analysis.skill.json
│       └── doc-generate.skill.json
├── agents/
│   └── react.agent.js        # 修改以集成技能
└── index.js                  # 导出 Skills 命名空间
```

---

## 使用示例

### 示例 1：注册并使用技能

```javascript
import {ReActAgent} from 'react-agent-framework';

// 创建代理
const agent = new ReActAgent('DeepSeek', 'deepseek-chat', tools);

// 加载技能
await agent.loadSkill('./skills/data-analysis.skill.json');

// 使用技能
const result = await agent.run('帮我分析 ./data.csv 文件的趋势');
// Agent 会自动识别需要使用 data_analysis 技能，并执行相应工作流
```

### 示例 2：程序化调用技能

```javascript
// 直接执行技能
const result = await agent.skillEngine.execute('data_analysis', {
  file_path: './data.csv',
  analysis_type: 'trend'
});

console.log('分析报告:', result.steps.analyze.output);
```

### 示例 3：批量加载技能目录

```javascript
// 加载 skills/ 目录下所有技能
await agent.skillManager.loadFromDirectory('./my-skills');

console.log('已加载技能:', agent.skillManager.getAllSkills().map(s => s.name));
```

---

## 内置技能清单

### 1. code-review（代码审查）

```json
{
  "name": "code_review",
  "description": "审查代码并提供改进建议",
  "parameters": {
    "file_path": "代码文件路径",
    "review_focus": ["性能", "安全", "可读性"]
  },
  "workflow": {
    "steps": [
      { "type": "tool", "tool": "file_reader", "input": {...} },
      { "type": "llm", "prompt": "审查以下代码..." },
      { "type": "tool", "tool": "file_writer", "input": {...} }
    ]
  }
}
```

### 2. data-analysis（数据分析）

分析 CSV/JSON 数据文件，生成趋势报告、统计摘要等。

### 3. doc-generate（文档生成）

根据代码注释自动生成 API 文档或 README。

---

## 与现有系统的集成点

### 复用的现有组件

| 组件 | 用途 |
|------|------|
| `tool.js` | Tool 注册和执行机制 |
| `prompt.factory.js` | 提示词模板生成 |
| `llm.client.js` | LLM 调用客户端 |
| `validateParameters()` | 参数验证逻辑 |

### 新增的核心能力

1. **工作流编排** - 多步骤顺序/条件执行
2. **变量替换** - 模板字符串解析
3. **上下文管理** - 步骤间数据传递
4. **动态加载** - JSON/YAML 解析和验证

---

## 扩展计划

### Phase 1: 基础技能系统
- Skill 定义格式
- Skill 引擎（顺序执行）
- 与 ReActAgent 集成

### Phase 2: 高级工作流
- 条件分支 (if/else)
- 循环执行 (forEach)
- 并行步骤 (parallel)

### Phase 3: 技能生态
- 技能市场/仓库
- 技能版本管理
- 技能组合/继承

---

## 注意事项

1. **循环依赖检测** - Skill 调用其他 Skill 时需避免死循环
2. **超时控制** - 长工作流需要设置整体超时
3. **错误处理** - 某一步失败时的回滚/补偿机制
4. **安全限制** - 变量替换时防止命令注入
