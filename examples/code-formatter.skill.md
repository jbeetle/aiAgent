---
name: code_formatter
version: "1.0.0"
description: "格式化代码，支持多种编程风格"
author: "ReAct Agent Framework"
parameters:
  type: object
  properties:
    code:
      type: string
      description: "需要格式化的代码"
    language:
      type: string
      description: "编程语言"
      enum: ["javascript", "python", "java", "cpp"]
    style:
      type: string
      description: "格式化风格"
      enum: ["standard", "compact", "readable"]
      default: "standard"
  required: ["code", "language"]
workflow:
  steps:
    - id: format_code
      type: llm
      prompt: |
        请将以下 {{parameters.language}} 代码格式化为 {{parameters.style}} 风格。
        只输出格式化后的代码，不要包含解释。

        ```{{parameters.language}}
        {{parameters.code}}
        ```
      output_key: formatted_code
knowledge:
  examples:
    - input:
        code: "function test(){console.log('hello')}"
        language: "javascript"
        style: "standard"
      description: "格式化 JavaScript 函数"
  best_practices:
    - "确保格式化后的代码保持原有逻辑"
    - "遵循语言的标准编码规范"
---

# Code Formatter Skill

Format code in various programming languages with customizable styles.

## Supported Languages

- JavaScript
- Python
- Java
- C++

## Styles

- **standard**: Standard formatting conventions
- **compact**: Minimized whitespace
- **readable**: Optimized for readability with clear structure
