---
{
  "name": "text_summarizer",
  "version": "1.0.0",
  "description": "将长文本总结为简洁的摘要",
  "author": "ReAct Agent Framework",
  "parameters": {
    "type": "object",
    "properties": {
      "text": {
        "type": "string",
        "description": "需要总结的文本内容"
      },
      "max_length": {
        "type": "integer",
        "description": "摘要最大字数",
        "default": 200
      },
      "style": {
        "type": "string",
        "enum": ["concise", "detailed", "bullet_points"],
        "description": "摘要风格",
        "default": "concise"
      }
    },
    "required": ["text"]
  },
  "workflow": {
    "steps": [
      {
        "id": "summarize",
        "type": "llm",
        "prompt": "请将以下文本总结为{{parameters.max_length}}字以内的{{parameters.style}}风格摘要：\n\n{{parameters.text}}",
        "output_key": "summary"
      }
    ]
  },
  "knowledge": {
    "examples": [
      {
        "input": {
          "text": "这是一篇关于人工智能的文章...",
          "max_length": 100,
          "style": "concise"
        },
        "description": "生成简洁的AI文章摘要"
      }
    ],
    "best_practices": [
      "保持摘要的准确性和完整性",
      "根据内容长度调整max_length参数"
    ]
  }
}
---

# Text Summarizer Skill

This skill summarizes long text into concise summaries.

## Usage

You can use this skill to quickly extract key information from articles, reports, or any long text.

## Parameters

- **text** (required): The text to summarize
- **max_length**: Maximum length of the summary (default: 200)
- **style**: Summary style - concise, detailed, or bullet_points

## Example

```javascript
await skillEngine.execute('text_summarizer', {
  text: 'Your long text here...',
  max_length: 150,
  style: 'bullet_points'
});
```
