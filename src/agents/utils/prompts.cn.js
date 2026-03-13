/**
 * 为agent创建ReAct提示模板
 * @param {Array} tools - 可用工具数组
 * @param {Array} skills - 可用技能数组
 * @returns {string} - 格式化的ReAct提示
 */
export function createReActPrompt(tools, skills = []) {
    const toolDescriptions = tools.map(tool => {
        const params = tool.parameters ? JSON.stringify(tool.parameters, null, 2) : '{}';
        return `${tool.name}: ${tool.description}
参数: ${params}`;
    }).join('\n\n');

    const skillDescriptions = skills.map(skill => {
        const params = skill.parameters ? JSON.stringify(skill.parameters, null, 2) : '{}';
        return `${skill.name} (v${skill.version}): ${skill.description}
参数: ${params}`;
    }).join('\n\n');

    let skillsSection = '';
    if (skills.length > 0) {
        skillsSection = `

你可以使用以下技能(Skills) - 技能是多步骤组合工具:

${skillDescriptions}

当你需要使用技能时，请使用以下格式:
Thought: 思考需要使用哪个技能
Action: Skill
Action Input: {"skill_name": "技能名称", "parameters": {参数对象}}
`;
    }

    return `你是一个使用ReAct（推理和行动）框架逐步解决问题的有用AI助手。

你可以使用以下工具(Tools):

${toolDescriptions}${skillsSection}

重要提示：你的响应必须在 "content" 字段中包含 ReAct 格式的内容，不要只在 reasoning_content 中思考。
每一步都必须显式输出以下格式：

Thought: [你的思考过程]
Action: [工具名称]
Action Input: [JSON格式的参数]

或者当任务完成时：

Thought: [你的思考过程]
Final Answer: [最终答案]

要解决问题，你将遵循以下格式:

Thought: 思考接下来需要做什么
Action: 要使用的工具名称（如果是最终答案则为"Final Answer"）
Action Input: 以JSON格式提供的工具参数
Observation: 工具返回的结果（你会收到这个结果）
... (这个 Thought/Action/Action Input/Observation 可以重复N次)
Final Answer: 对原始问题的最终答案

规则:
1. 始终以"Thought:"开始来解释你的推理过程
2. 使用"Action:"指定要使用的工具，或者如果已完成则使用"Final Answer:"
3. 使用"Action Input:"以JSON格式提供工具参数
4. 只能使用上面提供的工具
5. 提供清晰准确的答案
6. 如果无法使用可用工具解决问题，请解释原因
7. 始终以"Final Answer:"后跟你的回答结束

示例格式:
Thought: 我需要计算 15 * 8 + 42
Action: calculator
Action Input: {"operation": "multiply", "a": 15, "b": 8}
Observation: 120
Thought: 现在我需要将结果加上42
Action: calculator
Action Input: {"operation": "add", "a": 120, "b": 42}
Observation: 162
Final Answer: 15 * 8 + 42 = 162

开始!`;
}

/**
 * 创建基本交互的系统提示
 * @returns {string} - 基本系统提示
 */
export function createBasicPrompt() {
    return `你是一个有用的AI助手。准确回答问题并提供有用的信息。`;
}

/**
 * 动态生成工具文档
 * @param {Array} tools - 工具数组
 * @returns {string} - 格式化的工具文档
 */
export function generateToolDocumentation(tools) {
    return tools.map(tool => {
        let doc = `## ${tool.name}\n\n`;
        doc += `**描述:** ${tool.description}\n\n`;

        if (tool.parameters) {
            doc += `**参数:**\n\n`;
            doc += '```json\n';
            doc += JSON.stringify(tool.parameters, null, 2);
            doc += '\n```\n\n';
        }

        return doc;
    }).join('\n');
}

/**
 * 创建自定义工具创建提示
 * @param {string} toolName - 自定义工具名称
 * @param {string} description - 工具描述
 * @returns {string} - 自定义工具创建提示
 */
export function createCustomToolPrompt(toolName, description) {
    return `创建一个名为"${toolName}"的自定义工具，描述如下: ${description}

该工具应该:
1. 使用JSON Schema进行清晰的参数验证
2. 包含适当的错误处理
3. 返回有意义的结果
4. 包含JSDoc文档

示例结构:
\`\`\`javascript
const ${toolName} = {
  name: '${toolName}',
  description: '${description}',
  parameters: {
    type: 'object',
    properties: {
      // 在此处定义你的参数
    },
    required: [] // 列出必需的参数
  },
  handler: async (args) => {
    // 在此处实现你的工具逻辑
    return result;
  }
};
\`\`\``;
}