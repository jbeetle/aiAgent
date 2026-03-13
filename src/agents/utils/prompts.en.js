/**
 * Create the ReAct prompt template for the agent
 * @param {Array} tools - Array of available tools
 * @param {Array} skills - Array of available skills
 * @returns {string} - Formatted ReAct prompt
 */
export function createReActPrompt(tools, skills = []) {
    const toolDescriptions = tools.map(tool => {
        const params = tool.parameters ? JSON.stringify(tool.parameters, null, 2) : '{}';
        return `${tool.name}: ${tool.description}
Parameters: ${params}`;
    }).join('\n\n');

    const skillDescriptions = skills.map(skill => {
        const params = skill.parameters ? JSON.stringify(skill.parameters, null, 2) : '{}';
        return `${skill.name} (v${skill.version}): ${skill.description}
Parameters: ${params}`;
    }).join('\n\n');

    let skillsSection = '';
    if (skills.length > 0) {
        skillsSection = `

You can use the following Skills - Skills are multi-step combined tools:

${skillDescriptions}

When you need to use a skill, please use the following format:
Thought: Think about which skill to use
Action: Skill
Action Input: {"skill_name": "skill name", "parameters": {parameter object}}
`;
    }

    return `You are a helpful AI assistant that uses the ReAct (Reasoning and Acting) framework to solve problems step by step.

You have access to the following tools:

${toolDescriptions}${skillsSection}

IMPORTANT: Your response MUST include ReAct format content in the "content" field. Do not put your thinking only in reasoning_content.
Every step you must explicitly output the following format:

Thought: [Your thinking process]
Action: [Tool name]
Action Input: [Parameters in JSON format]

Or when the task is complete:

Thought: [Your thinking process]
Final Answer: [Final answer]

To solve a problem, you will follow this format:

Thought: Think about what you need to do next
Action: The name of the tool to use (or "Final Answer" if you have the answer)
Action Input: The parameters for the tool in JSON format
Observation: The result from the tool (you will receive this)
... (this Thought/Action/Action Input/Observation can repeat N times)
Final Answer: Your final answer to the original question

Rules:
1. Always start with "Thought:" to explain your reasoning
2. Use "Action:" to specify which tool to use, or "Final Answer:" if you're done
3. Use "Action Input:" to provide parameters for the tool in JSON format
4. Only use the tools provided above
5. Provide clear and accurate answers
6. If you cannot solve the problem with the available tools, explain why
7. Always end with "Final Answer:" followed by your response

Example format:
Thought: I need to calculate 15 * 8 + 42
Action: calculator
Action Input: {"operation": "multiply", "a": 15, "b": 8}
Observation: 120
Thought: Now I need to add 42 to the result
Action: calculator
Action Input: {"operation": "add", "a": 120, "b": 42}
Observation: 162
Final Answer: 15 * 8 + 42 = 162

Begin!`;
}

/**
 * Create a system prompt for basic interactions
 * @returns {string} - Basic system prompt
 */
export function createBasicPrompt() {
    return `You are a helpful AI assistant. Answer questions accurately and provide useful information.`;
}

/**
 * Generate tool documentation dynamically
 * @param {Array} tools - Array of tools
 * @returns {string} - Formatted tool documentation
 */
export function generateToolDocumentation(tools) {
    return tools.map(tool => {
        let doc = `## ${tool.name}\n\n`;
        doc += `**Description:** ${tool.description}\n\n`;

        if (tool.parameters) {
            doc += `**Parameters:**\n\n`;
            doc += '```json\n';
            doc += JSON.stringify(tool.parameters, null, 2);
            doc += '\n```\n\n';
        }

        return doc;
    }).join('\n');
}

/**
 * Create a prompt for custom tool creation
 * @param {string} toolName - Name of the custom tool
 * @param {string} description - Description of the tool
 * @returns {string} - Custom tool creation prompt
 */
export function createCustomToolPrompt(toolName, description) {
    return `Create a custom tool named "${toolName}" with the following description: ${description}

The tool should:
1. Have clear parameter validation using JSON Schema
2. Include proper error handling
3. Return meaningful results
4. Include JSDoc documentation

Example structure:
\`\`\`javascript
const ${toolName} = {
  name: '${toolName}',
  description: '${description}',
  parameters: {
    type: 'object',
    properties: {
      // Define your parameters here
    },
    required: [] // List required parameters
  },
  handler: async (args) => {
    // Implement your tool logic here
    return result;
  }
};
\`\`\``;
}