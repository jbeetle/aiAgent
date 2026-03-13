import {createModel} from './models/model.factory.js';
import {promptFactory} from './utils/prompt.factory.js';
import {createLogger, serializeResult} from './utils/logger.js';
import {SkillEngine} from '../skills/skill.engine.js';
import {SkillManager} from '../skills/skill.manager.js';

/**
 * ReactAgent - 实现 ReAct（推理+行动）模式的核心 AI 代理
 *
 * 该代理使用 OpenAI 的 API 将复杂任务分解为推理步骤
 * 并执行外部工具/操作来完成目标。
 */
export class ReActAgent {
    #log;

    /**
     * 创建一个新的 ReactAgent 实例
     * @param {string} vendorName - 厂商名称
     * @param {string} modelName - 模型名称
     * @param {Object[]} tools - 可用工具数组
     * @param {Object} config - 配置选项
     * @param {number} [config.maxIterations=5] - 最大推理步骤数
     * @param {string} [config.systemPrompt] - 自定义系统提示
     * @param {boolean} [config.verbose=false] - 启用详细日志
     */
    constructor(vendorName, modelName, tools = [], config = {}) {
        const LLMClient = createModel(vendorName, modelName);
        this.openai = LLMClient.getRawClient();
        this.tools = tools;
        this.config = {
            model: modelName,
            maxIterations: 5,
            max_tokens: 1042,
            systemPrompt: null,
            verbose: false,
            ...config
        };
        this.conversationHistory = [];
        this.#log = createLogger('ReactAgent', this.config.verbose);

        // 初始化技能系统
        const toolsRegistry = Object.fromEntries(tools.map(t => [t.name, t]));
        this.skillEngine = new SkillEngine(toolsRegistry, this.openai, {
            model: this.config.model,
            verbose: this.config.verbose
        });
        this.skillManager = new SkillManager(this.skillEngine, {
            verbose: this.config.verbose
        });
    }

    /**
     * 运行代理处理用户查询
     * @param {string} query - 用户的查询或任务
     * @returns {Promise<Object>} - 代理的响应，包含最终答案
     */
    async run(query) {
        try {
            this.#log('开始执行 ReAct 代理...');
            const messages = [
                {role: 'system', content: this.#createSystemPrompt()},
                {role: 'user', content: query}
            ];
            //this.log(messages);
            let iterations = 0;
            let finalAnswer = null;
            while (iterations < this.config.maxIterations) {
                this.#log(`迭代 ${iterations + 1}/${this.config.maxIterations}`);
                const response = await this.openai.chat.completions.create({
                    model: this.config.model,
                    messages,
                    tools: this.tools.map(t => ({type: 'function', function: t})),
                    max_tokens: this.config.max_tokens
                });
                const message = response.choices[0].message;
                const content = message.content;
                const reasoningContent = message.reasoning_content;
                // 对于 deepseek-reasoner，如果 content 为空，使用 reasoning_content
                const contentToParse = content || reasoningContent || '';
                this.#log('LLM 响应:', contentToParse);
                const parsed = this.#parseResponse(contentToParse);
                if (parsed.finalAnswer) {
                    finalAnswer = parsed.finalAnswer;
                    break;
                }
                if (parsed.action && parsed.actionInput) {
                    const observation = await this.#executeTool(parsed.action, parsed.actionInput);
                    // 构建 assistant 消息，支持 reasoning_content (deepseek-reasoner)
                    // 如果 content 为空但 reasoningContent 有内容，使用 contentToParse 作为 content
                    const messageContent = content || (reasoningContent ? contentToParse : '');
                    const assistantMessage = {role: 'assistant', content: messageContent};
                    if (reasoningContent) {
                        assistantMessage.reasoning_content = reasoningContent;
                    }
                    messages.push(
                        assistantMessage,
                        {role: 'user', content: `观察结果: ${observation}`}
                    );
                } else {
                    this.#log('未找到有效操作，继续...');
                    const messageContent = content || (reasoningContent ? contentToParse : '');
                    const assistantMessage = {role: 'assistant', content: messageContent};
                    if (reasoningContent) {
                        assistantMessage.reasoning_content = reasoningContent;
                    }
                    messages.push(assistantMessage);
                }
                iterations++;
            }
            if (!finalAnswer) {
                finalAnswer = '抱歉，我无法在允许的迭代次数内找到完整答案。';
            }
            return {
                success: true,
                answer: finalAnswer,
                iterations: iterations + 1,
                history: messages
            };
        } catch (error) {
            this.#log('代理执行错误:', error);
            return {
                success: false,
                error: error.message,
                answer: '处理您的请求时发生错误。',
                history: this.conversationHistory
            };
        }
    }

    /**
     * 创建代理的系统提示
     * @returns {string} - 格式化的系统提示
     */
    #createSystemPrompt() {
        if (this.config.systemPrompt) {
            return this.config.systemPrompt;
        }

        const skills = this.skillEngine.getAllSkills();
        return promptFactory.createReActPrompt(this.tools, promptFactory.getCurrentLanguage(), skills);
    }

    /**
     * 解析 LLM 响应以提取思考、操作和输入
     * @param {string} response - 原始 LLM 响应
     * @returns {Object} - 解析后的响应组件
     */
    #parseResponse(response) {
        const lines = response.split('\n');
        let thought = '';
        let action = '';
        let actionInput = '';
        let finalAnswer = '';
        let inFinalAnswer = false;
        let inActionInput = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            if (trimmed.startsWith('Thought:')) {
                thought = trimmed.substring(8).trim();
                inFinalAnswer = false;
                inActionInput = false;
            } else if (trimmed.startsWith('Action:')) {
                action = trimmed.substring(7).trim();
                inFinalAnswer = false;
                inActionInput = false;
            } else if (trimmed.startsWith('Action Input:')) {
                actionInput = trimmed.substring(13).trim();
                inFinalAnswer = false;
                // 检测是否开始多行JSON
                if (actionInput.startsWith('{')) {
                    inActionInput = true;
                    // 尝试解析，看是否已经是完整JSON
                    if (this.#isValidJSON(actionInput)) {
                        inActionInput = false;
                    }
                }
            } else if (trimmed.startsWith('Final Answer:')) {
                finalAnswer = trimmed.substring(13).trim();
                inFinalAnswer = true;
                inActionInput = false;
            } else if (inFinalAnswer) {
                finalAnswer += '\n' + line;
            } else if (inActionInput) {
                // 收集多行Action Input
                actionInput += '\n' + line;
                // 尝试解析JSON，如果成功则认为JSON完成
                if (this.#isValidJSON(actionInput)) {
                    inActionInput = false;
                }
            }
        }

        // 处理动作输入的 JSON 格式
        if (actionInput && actionInput.startsWith('{') && actionInput.endsWith('}')) {
            try {
                actionInput = JSON.parse(actionInput);
            } catch (e) {
                // JSON 解析失败则保持字符串形式
            }
        }

        return {
            thought,
            action,
            actionInput,
            finalAnswer
        };
    }

    /**
     * 检查字符串是否为有效的完整JSON
     * @param {string} str - 要检查的字符串
     * @returns {boolean} - 是否为有效的JSON
     */
    #isValidJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * 使用给定参数执行工具
     * @param {string} toolName - 要执行的工具名称
     * @param {any} input - 工具参数
     * @returns {Promise<string>} - 工具执行结果
     */
    async #executeTool(toolName, input) {
        // 处理 Skill 类型的特殊动作
        if (toolName === 'Skill') {
            return await this.#executeSkill(input);
        }

        const tool = this.tools.find(t => t.name === toolName);

        if (!tool) {
            return `错误: 未找到工具 "${toolName}"。可用工具: ${this.tools.map(t => t.name).join(', ')}`;
        }

        try {
            this.#log(`执行工具: ${toolName}，输入:`, JSON.stringify(input, null, 2));

            // 如果提供了 JSON Schema，则使用它验证参数
            if (tool.parameters && typeof tool.validate === 'function') {
                const validation = tool.validate(input);
                if (!validation.valid) {
                    return `错误: 参数无效 - ${validation.errors.join(', ')}`;
                }
            }

            const result = await tool.handler(input);
            const resultStr = serializeResult(result);

            this.#log(`工具 ${toolName} 返回:`, resultStr);
            return resultStr;

        } catch (error) {
            this.#log(`执行工具 ${toolName} 时出错:`, error);
            return `执行工具 "${toolName}" 时出错: ${error.message}`;
        }
    }

    /**
     * 执行 Skill
     * @param {Object|string} input - Skill 参数，包含 skill_name 和 parameters
     * @returns {Promise<string>} - Skill 执行结果
     */
    async #executeSkill(input) {
        try {
            // 解析输入参数
            let skillInput = input;
            if (typeof input === 'string') {
                try {
                    skillInput = JSON.parse(input);
                } catch (e) {
                    return `错误: Skill 参数格式无效，无法解析 JSON: ${input}`;
                }
            }

            const {skill_name, parameters} = skillInput;

            if (!skill_name) {
                return '错误: Skill 调用缺少 skill_name 参数';
            }

            this.#log(`执行 Skill: ${skill_name}`, parameters);

            // 检查 Skill 是否存在
            const skill = this.skillEngine.getSkill(skill_name);
            if (!skill) {
                const availableSkills = this.skillEngine.getAllSkills().map(s => s.name).join(', ');
                return `错误: 未找到 Skill "${skill_name}"。可用 Skills: ${availableSkills || '无'}`;
            }

            // 执行 Skill
            const result = await this.skillEngine.execute(skill_name, parameters || {});

            if (result.success) {
                this.#log(`Skill ${skill_name} 执行成功`, result.outputs);
                return JSON.stringify(result.outputs, null, 2);
            } else {
                this.#log(`Skill ${skill_name} 执行失败`, result.error);
                return `Skill 执行失败: ${result.error}`;
            }

        } catch (error) {
            this.#log(`执行 Skill 时出错:`, error);
            return `执行 Skill 时出错: ${error.message}`;
        }
    }

    /**
     * 注册技能
     * @param {Object} skillDefinition - 技能定义对象
     * @returns {boolean} - 是否注册成功
     */
    registerSkill(skillDefinition) {
        return this.skillEngine.registerSkill(skillDefinition);
    }

    /**
     * 从文件加载技能
     * @param {string} filePath - 技能文件路径
     * @returns {Promise<Object>} - 加载的技能定义
     */
    async loadSkill(filePath) {
        return await this.skillManager.loadFromFile(filePath);
    }

    /**
     * 从目录批量加载技能
     * @param {string} dirPath - 技能目录路径
     * @returns {Promise<Array>} - 加载的技能列表
     */
    async loadSkillsFromDirectory(dirPath) {
        return await this.skillManager.loadFromDirectory(dirPath);
    }

    /**
     * 获取所有已注册的技能
     * @returns {Array} - 技能定义列表
     */
    getSkills() {
        return this.skillEngine.getAllSkills();
    }

    /**
     * 执行指定技能
     * @param {string} skillName - 技能名称
     * @param {Object} parameters - 执行参数
     * @returns {Promise<Object>} - 执行结果
     */
    async executeSkill(skillName, parameters) {
        return await this.skillEngine.execute(skillName, parameters);
    }

    /**
     * 重置对话历史
     */
    reset() {
        this.conversationHistory = [];
        this.#log('对话历史已重置');
    }

    /**
     * 流式响应版本的运行方法，实时返回推理过程
     * @param {string} query - 用户的查询或任务
     * @param {Function} onChunk - 处理流式数据块的回调函数
     * @returns {Promise<Object>} - 包含最终答案的响应
     */
    async runStream(query, onChunk = null) {
        try {
            this.#log('开始执行流式 ReAct 代理...');

            const messages = [
                {role: 'system', content: this.#createSystemPrompt()},
                {role: 'user', content: query}
            ];

            let iterations = 0;
            let finalAnswer = null;
            let accumulatedResponse = '';

            // 发送开始事件
            if (onChunk) {
                onChunk({
                    type: 'start',
                    message: '开始处理问题...',
                    iteration: 0,
                    timestamp: new Date().toISOString()
                });
            }

            while (iterations < this.config.maxIterations) {
                this.#log(`迭代 ${iterations + 1}/${this.config.maxIterations}`);

                if (onChunk) {
                    onChunk({
                        type: 'iteration_start',
                        message: `第 ${iterations + 1} 次思考...`,
                        iteration: iterations + 1,
                        maxIterations: this.config.maxIterations,
                        timestamp: new Date().toISOString()
                    });
                }

                // 使用流式 API
                const stream = await this.openai.chat.completions.create({
                    model: this.config.model,
                    messages,
                    tools: this.tools.map(t => ({type: 'function', function: t})),
                    max_tokens: this.config.max_tokens,
                    stream: true
                });

                // 收集完整的响应
                accumulatedResponse = '';

                // 用于收集 reasoning_content (deepseek-reasoner)
                let accumulatedReasoning = '';

                for await (const chunk of stream) {
                    const delta = chunk.choices[0]?.delta;
                    const content = delta?.content || '';
                    const reasoning = delta?.reasoning_content || '';

                    if (content) {
                        accumulatedResponse += content;
                    }
                    if (reasoning) {
                        accumulatedReasoning += reasoning;
                    }

                    // 实时发送思考过程
                    if (onChunk && (content || reasoning)) {
                        onChunk({
                            type: 'thinking',
                            content: content,
                            reasoning: reasoning,
                            accumulated: accumulatedResponse,
                            accumulatedReasoning: accumulatedReasoning,
                            iteration: iterations + 1,
                            timestamp: new Date().toISOString()
                        });
                    }
                }

                this.#log('LLM 流式响应完成:', accumulatedResponse);

                // 对于 deepseek-reasoner，如果 content 为空，使用 reasoning_content
                const contentToParse = accumulatedResponse || accumulatedReasoning || '';
                const parsed = this.#parseResponse(contentToParse);
                //console.log('解析结果--->:', parsed);
                // 发送解析结果
                if (onChunk) {
                    onChunk({
                        type: 'parsed',
                        thought: parsed.thought,
                        action: parsed.action,
                        actionInput: parsed.actionInput,
                        finalAnswer: parsed.finalAnswer,
                        iteration: iterations + 1,
                        timestamp: new Date().toISOString()
                    });
                }

                if (parsed.finalAnswer) {
                    finalAnswer = parsed.finalAnswer;

                    if (onChunk) {
                        onChunk({
                            type: 'final_answer',
                            message: finalAnswer,
                            iteration: iterations + 1,
                            timestamp: new Date().toISOString()
                        });
                    }
                    break;
                }

                if (parsed.action && parsed.actionInput) {
                    if (onChunk) {
                        onChunk({
                            type: 'tool_start',
                            tool: parsed.action,
                            input: parsed.actionInput,
                            message: `执行工具: ${parsed.action}`,
                            iteration: iterations + 1,
                            timestamp: new Date().toISOString()
                        });
                    }

                    const observation = await this.#executeTool(parsed.action, parsed.actionInput);

                    if (onChunk) {
                        onChunk({
                            type: 'tool_result',
                            tool: parsed.action,
                            result: observation,
                            message: `工具 ${parsed.action} 执行完成`,
                            iteration: iterations + 1,
                            timestamp: new Date().toISOString()
                        });
                    }

                    // 构建 assistant 消息，支持 reasoning_content (deepseek-reasoner)
                    // 如果 accumulatedResponse 为空但 accumulatedReasoning 有内容，使用 contentToParse
                    const messageContent = accumulatedResponse || (accumulatedReasoning ? contentToParse : '');
                    const assistantMessage = {role: 'assistant', content: messageContent};
                    if (accumulatedReasoning) {
                        assistantMessage.reasoning_content = accumulatedReasoning;
                    }
                    messages.push(
                        assistantMessage,
                        {role: 'user', content: `观察结果: ${observation}`}
                    );
                } else {
                    this.#log('未找到有效操作，继续...');
                    const messageContent = accumulatedResponse || (accumulatedReasoning ? contentToParse : '');
                    const assistantMessage = {role: 'assistant', content: messageContent};
                    if (accumulatedReasoning) {
                        assistantMessage.reasoning_content = accumulatedReasoning;
                    }
                    messages.push(assistantMessage);

                    if (onChunk) {
                        onChunk({
                            type: 'no_action',
                            message: '未检测到工具调用，继续推理...',
                            iteration: iterations + 1,
                            timestamp: new Date().toISOString()
                        });
                    }
                }

                iterations++;
            }

            if (!finalAnswer) {
                finalAnswer = '抱歉，我无法在允许的迭代次数内找到完整答案。';
                if (onChunk) {
                    onChunk({
                        type: 'max_iterations',
                        message: finalAnswer,
                        iterations: iterations,
                        maxIterations: this.config.maxIterations,
                        timestamp: new Date().toISOString()
                    });
                }
            }

            const result = {
                success: true,
                answer: finalAnswer,
                iterations: iterations,
                history: messages
            };

            if (onChunk) {
                onChunk({
                    type: 'complete',
                    result: result,
                    timestamp: new Date().toISOString()
                });
            }

            return result;

        } catch (error) {
            this.#log('流式代理执行错误:', error);
            const errorResult = {
                success: false,
                error: error.message,
                answer: '处理您的请求时发生错误。',
                history: this.conversationHistory
            };

            if (onChunk) {
                onChunk({
                    type: 'error',
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString()
                });
            }

            return errorResult;
        }
    }
}