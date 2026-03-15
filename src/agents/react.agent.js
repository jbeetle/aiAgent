import {createModel} from './models/model.factory.js';
import {promptFactory} from './utils/prompt.factory.js';
import {createLogger, serializeResult} from './utils/logger.js';
import {SkillEngine} from '../skills/skill.engine.js';
import {SkillManager} from '../skills/skill.manager.js';
import {getBuiltInTools} from './tools/tool.js';

/**
 * ReactAgent - 实现 ReAct（推理+行动）模式的核心 AI 代理
 *
 * 该代理使用 OpenAI 的 API 将复杂任务分解为推理步骤
 * 并执行外部工具/操作来完成目标。
 *
 * 特性：
 * - 默认自动加载所有内置工具
 * - 支持自定义工具覆盖
 */
export class ReActAgent {
    #log;

    /**
     * 创建一个新的 ReactAgent 实例
     * @param {string} vendorName - 厂商名称
     * @param {string} modelName - 模型名称
     * @param {Object[]} [tools] - 可选的自定义工具数组，默认加载所有内置工具
     * @param {Object} config - 配置选项
     * @param {number} [config.maxIterations=5] - 最大推理步骤数
     * @param {string} [config.systemPrompt] - 自定义系统提示
     * @param {boolean} [config.verbose=false] - 启用详细日志
     * @param {boolean} [config.useBuiltInTools=true] - 是否使用内置工具
     */
    constructor(vendorName, modelName, tools = null, config = {}) {
        const LLMClient = createModel(vendorName, modelName);
        this.openai = LLMClient.getRawClient();

        // 加载工具：自定义工具和内置工具可以叠加
        const useBuiltIn = config.useBuiltInTools !== false;
        const customTools = tools && tools.length > 0 ? tools : [];
        const builtInTools = useBuiltIn ? getBuiltInTools() : [];

        // 合并工具：自定义工具优先，同名时覆盖内置工具
        const toolMap = new Map();
        for (const tool of [...builtInTools, ...customTools]) {
            toolMap.set(tool.name, tool);
        }
        this.tools = Array.from(toolMap.values());

        this.config = {
            model: modelName,
            maxIterations: 5,
            max_tokens: 1042,
            systemPrompt: null,
            verbose: false,
            useBuiltInTools: useBuiltIn,
            ...config
        };
        this.conversationHistory = [];
        this.#log = createLogger('ReactAgent', this.config.verbose);

        // 如果有内置工具，打印日志
        if (useBuiltIn && this.tools.length > 0) {
            this.#log(`已加载 ${this.tools.length} 个内置工具: ${this.tools.map(t => t.name).join(', ')}`);
        }

        // 初始化技能系统
        const toolsRegistry = Object.fromEntries(this.tools.map(t => [t.name, t]));
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
        // 为了保持向后兼容，将历史对话作为上下文传递
        const taskConfig = {
            query,
            contextMessages: this.conversationHistory,
            tools: this.tools
        };

        const result = await this.executeTask(taskConfig, {
            onStart: () => this.#log('开始执行 ReAct 代理...'),
            onIterationStart: ({ iteration, maxIterations }) =>
                this.#log(`迭代 ${iteration}/${maxIterations}`)
        });

        // 更新内部历史（向后兼容）
        if (result.success) {
            this.conversationHistory.push({ role: 'user', content: query });
            this.conversationHistory.push({ role: 'assistant', content: result.answer });
        }

        return result;
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
     * 卸载技能
     * @param {string} skillName - 技能名称
     * @returns {Object} - 卸载的技能信息
     */
    unloadSkill(skillName) {
        return this.skillManager.unloadSkill(skillName);
    }

    /**
     * 重新加载技能
     * @param {string} skillName - 技能名称
     * @returns {Promise<Object>} - 重新加载的技能定义
     */
    async reloadSkill(skillName) {
        return await this.skillManager.reloadSkill(skillName);
    }

    /**
     * 获取所有已加载技能的摘要信息
     * @returns {Array} - 技能摘要列表
     */
    getSkillSummaries() {
        return this.skillManager.getSkillSummaries();
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
        // 为了保持向后兼容，将历史对话作为上下文传递
        const taskConfig = {
            query,
            contextMessages: this.conversationHistory,
            tools: this.tools
        };

        const result = await this.executeTaskStream(taskConfig, onChunk);

        // 更新内部历史（向后兼容）
        if (result.success) {
            this.conversationHistory.push({ role: 'user', content: query });
            this.conversationHistory.push({ role: 'assistant', content: result.answer });
        }

        return result;
    }

    /**
     * 执行任务（无状态，接受外部上下文）
     * 这是改造后的核心任务执行方法，用于被 BaseLLMService 调用
     *
     * @param {Object} taskConfig - 任务配置
     * @param {string} taskConfig.query - 用户查询
     * @param {Array} taskConfig.contextMessages - 外部上下文消息（包含历史对话）
     * @param {Array} taskConfig.tools - 本次任务可用的工具
     * @param {Array} [taskConfig.suggestedTools] - 建议使用的工具
     * @param {Object} [callbacks] - 回调函数
     * @returns {Promise<Object>} - 执行结果
     */
    async executeTask(taskConfig, callbacks = {}) {
        const { query, contextMessages = [], tools = this.tools, suggestedTools = [] } = taskConfig;

        try {
            this.#log('开始执行任务:', query);

            // 构建消息数组：系统提示 + 上下文 + 当前查询
            const messages = this.#buildMessagesWithContext(query, contextMessages, tools);

            let iterations = 0;
            let finalAnswer = null;

            // 触发开始回调
            if (callbacks.onStart) {
                callbacks.onStart({ query, timestamp: new Date().toISOString() });
            }

            while (iterations < this.config.maxIterations) {
                this.#log(`任务迭代 ${iterations + 1}/${this.config.maxIterations}`);

                if (callbacks.onIterationStart) {
                    callbacks.onIterationStart({ iteration: iterations + 1, maxIterations: this.config.maxIterations });
                }

                const response = await this.openai.chat.completions.create({
                    model: this.config.model,
                    messages,
                    tools: tools.map(t => ({ type: 'function', function: t })),
                    max_tokens: this.config.max_tokens
                });

                const message = response.choices[0].message;
                const content = message.content;
                const reasoningContent = message.reasoning_content;
                const contentToParse = content || reasoningContent || '';

                this.#log('LLM 响应:', contentToParse);

                if (callbacks.onThinking) {
                    callbacks.onThinking({ content: contentToParse, reasoning: reasoningContent });
                }

                const parsed = this.#parseResponse(contentToParse);

                if (parsed.finalAnswer) {
                    finalAnswer = parsed.finalAnswer;

                    if (callbacks.onFinalAnswer) {
                        callbacks.onFinalAnswer({ answer: finalAnswer });
                    }
                    break;
                }

                if (parsed.action && parsed.actionInput) {
                    if (callbacks.onToolStart) {
                        callbacks.onToolStart({
                            tool: parsed.action,
                            input: parsed.actionInput
                        });
                    }

                    const observation = await this.#executeTool(parsed.action, parsed.actionInput);

                    if (callbacks.onToolResult) {
                        callbacks.onToolResult({
                            tool: parsed.action,
                            result: observation
                        });
                    }

                    // 构建 assistant 消息
                    const messageContent = content || (reasoningContent ? contentToParse : '');
                    const assistantMessage = { role: 'assistant', content: messageContent };
                    if (reasoningContent) {
                        assistantMessage.reasoning_content = reasoningContent;
                    }
                    messages.push(
                        assistantMessage,
                        { role: 'user', content: `观察结果: ${observation}` }
                    );
                } else {
                    // 没有动作但有内容，视为最终答案
                    if (contentToParse.trim()) {
                        finalAnswer = contentToParse.trim();

                        if (callbacks.onFinalAnswer) {
                            callbacks.onFinalAnswer({ answer: finalAnswer });
                        }
                        break;
                    }

                    const messageContent = content || (reasoningContent ? contentToParse : '');
                    const assistantMessage = { role: 'assistant', content: messageContent };
                    if (reasoningContent) {
                        assistantMessage.reasoning_content = reasoningContent;
                    }
                    messages.push(assistantMessage);
                }

                iterations++;
            }

            if (!finalAnswer) {
                finalAnswer = '抱歉，我无法在允许的迭代次数内找到完整答案。';

                if (callbacks.onMaxIterations) {
                    callbacks.onMaxIterations({ maxIterations: this.config.maxIterations });
                }
            }

            const result = {
                success: true,
                answer: finalAnswer,
                iterations: iterations + 1,
                history: messages
            };

            if (callbacks.onComplete) {
                callbacks.onComplete({ result });
            }

            return result;

        } catch (error) {
            this.#log('任务执行错误:', error);

            const errorResult = {
                success: false,
                error: error.message,
                answer: '处理任务时发生错误。'
            };

            if (callbacks.onError) {
                callbacks.onError({ error: error.message, stack: error.stack });
            }

            return errorResult;
        }
    }

    /**
     * 流式执行任务
     *
     * @param {Object} taskConfig - 任务配置（同 executeTask）
     * @param {Function} onChunk - 流式回调函数
     * @returns {Promise<Object>} - 执行结果
     */
    async executeTaskStream(taskConfig, onChunk = null) {
        const { query, contextMessages = [], tools = this.tools, suggestedTools = [] } = taskConfig;

        try {
            this.#log('开始流式执行任务:', query);

            // 构建消息数组
            const messages = this.#buildMessagesWithContext(query, contextMessages, tools);

            let iterations = 0;
            let finalAnswer = null;
            let accumulatedResponse = '';
            let accumulatedReasoning = '';

            // 发送开始事件
            if (onChunk) {
                onChunk({
                    type: 'start',
                    message: '开始处理任务...',
                    iteration: 0,
                    timestamp: new Date().toISOString()
                });
            }

            while (iterations < this.config.maxIterations) {
                this.#log(`流式任务迭代 ${iterations + 1}/${this.config.maxIterations}`);

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
                    tools: tools.map(t => ({ type: 'function', function: t })),
                    max_tokens: this.config.max_tokens,
                    stream: true
                });

                accumulatedResponse = '';
                accumulatedReasoning = '';

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
                this.#log('Reasoning 内容:', accumulatedReasoning);

                // 优先使用 content，其次使用 reasoning
                const contentToParse = accumulatedResponse || accumulatedReasoning || '';
                const parsed = this.#parseResponse(contentToParse);

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

                    const messageContent = accumulatedResponse || (accumulatedReasoning ? contentToParse : '');
                    const assistantMessage = { role: 'assistant', content: messageContent };
                    if (accumulatedReasoning) {
                        assistantMessage.reasoning_content = accumulatedReasoning;
                    }
                    messages.push(
                        assistantMessage,
                        { role: 'user', content: `观察结果: ${observation}` }
                    );
                } else {
                    // 没有动作但有内容，视为最终答案
                    if (contentToParse.trim()) {
                        finalAnswer = contentToParse.trim();

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

                    this.#log('未找到有效操作，继续...');

                    const messageContent = accumulatedResponse || (accumulatedReasoning ? contentToParse : '');
                    const assistantMessage = { role: 'assistant', content: messageContent };
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
            this.#log('流式任务执行错误:', error);

            const errorResult = {
                success: false,
                error: error.message,
                answer: '处理任务时发生错误。'
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

    /**
     * 构建带上下文的消息数组
     * @private
     */
    #buildMessagesWithContext(query, contextMessages, tools) {
        const messages = [];

        // 添加系统提示
        messages.push({
            role: 'system',
            content: this.#createSystemPromptWithTools(tools)
        });

        // 添加上下文（排除系统消息，因为已添加）
        if (contextMessages && contextMessages.length > 0) {
            for (const msg of contextMessages) {
                if (msg.role !== 'system') {
                    messages.push({
                        role: msg.role,
                        content: msg.content,
                        ...(msg.reasoning_content && { reasoning_content: msg.reasoning_content })
                    });
                }
            }
        }

        // 添加当前查询
        messages.push({ role: 'user', content: query });

        return messages;
    }

    /**
     * 创建带工具描述的系统提示
     * @private
     */
    #createSystemPromptWithTools(tools) {
        const skills = this.skillEngine.getAllSkills();
        return promptFactory.createReActPrompt(tools, promptFactory.getCurrentLanguage(), skills);
    }
}