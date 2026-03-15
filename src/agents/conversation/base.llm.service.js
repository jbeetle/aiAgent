import {SessionChat} from '../models/chat.session.js';
import {createLogger} from '../utils/logger.js';

/**
 * BaseLLMService - 基础 LLM 对话服务层
 *
 * 核心职责（新架构）：
 * 1. 封装 SessionChat，管理跨对话上下文（滑动窗口、压缩、token 估算）
 * 2. 基于对话历史理解用户真实意图，处理指代消解和省略补充
 * 3. 生成完整、明确的问题描述，交给 ReActAgent 全权处理
 *
 * 架构分层：
 * - 基础对话层：BaseLLMService (有状态，管理上下文 + 意图理解)
 * - 任务执行层：ReActAgent (无状态，自主决策是否使用工具)
 */
export class BaseLLMService {
    #log;
    #reactAgent = null;
    #tools = [];
    #skills = [];

    /**
     * 创建 BaseLLMService 实例
     * @param {Object} llmClient - LLM 客户端实例 (如 LLMClient)
     * @param {Object} config - 配置选项
     * @param {string} [config.systemPrompt] - 自定义系统提示
     * @param {number} [config.maxMessages=20] - 最大消息数量
     * @param {number} [config.tokenLimit=65536] - token 限制
     * @param {boolean} [config.verbose=false] - 启用详细日志
     * @param {boolean} [config.enableRefinement=true] - 是否启用问题完善（指代消解、省略补充）
     * @param {string} [config.language] - 语言 ('cn' | 'en')
     */
    constructor(llmClient, config = {}) {
        this.config = {
            maxMessages: 20,
            tokenLimit: 1024 * 64,
            compressThreshold: 15,
            verbose: false,
            systemPrompt: null,
            enableRefinement: true,  // 是否启用问题完善
            language: process.env.PROMPTS_LANG || 'cn',
            ...config
        };

        this.#log = createLogger('BaseLLMService', this.config.verbose);
        this.llmClient = llmClient;
        this.model = llmClient.model;

        // 创建 SessionChat 管理对话上下文
        const systemRole = this.#createSystemPrompt();
        this.sessionChat = new SessionChat(llmClient, systemRole, {
            maxMessages: this.config.maxMessages,
            tokenLimit: this.config.tokenLimit,
            compressThreshold: this.config.compressThreshold,
            verbose: this.config.verbose
        });

        this.#log('BaseLLMService 初始化完成');
    }

    /**
     * 设置 ReActAgent 作为任务执行器
     * @param {ReActAgent} agent - ReActAgent 实例
     */
    setReActAgent(agent) {
        this.#reactAgent = agent;
        this.#log('ReActAgent 已关联');
    }

    /**
     * 注册可用工具
     * @param {Array} tools - 工具数组
     */
    registerTools(tools) {
        this.#tools = tools || [];
        this.#log(`已注册 ${this.#tools.length} 个工具`);
    }

    /**
     * 注册可用技能
     * @param {Array} skills - 技能数组
     */
    registerSkills(skills) {
        this.#skills = skills || [];
        this.#log(`已注册 ${this.#skills.length} 个技能`);
    }

    /**
     * 主入口：对话处理
     * 新架构：简单查询直接由 SessionChat 处理，复杂查询交给 ReActAgent
     *
     * @param {string} input - 用户输入
     * @returns {Promise<Object>} - 响应结果
     */
    async chat(input) {
        try {
            this.#log('处理用户输入:', input);

            // 快速路径：简单问候语直接由 SessionChat 处理
            if (this.#isSimpleGreeting(input)) {
                this.#log('检测到简单问候，直接响应');
                const response = await this.sessionChat.chat(input);
                return {
                    success: true,
                    answer: response,
                    type: 'direct'
                };
            }

            // 1. 基于对话历史理解用户意图，完善问题描述
            const analysis = await this.analyzeIntent(input);
            this.#log('意图分析结果:', analysis);

            // 2. 交给 ReActAgent 全权处理（ReActAgent 自主决定是否使用工具）
            return await this.#executeWithTools(analysis.refinedQuery, analysis);
        } catch (error) {
            this.#log('对话处理错误:', error);
            return {
                success: false,
                error: error.message,
                answer: '处理您的请求时发生错误。'
            };
        }
    }

    /**
     * 判断是否为简单问候语（可直接由 SessionChat 处理）
     * @private
     */
    #isSimpleGreeting(input) {
        const simplePatterns = [
            // 问候语
            /^(你好|您好|嗨|hello|hi|hey)[!！.]?$/i,
            // 询问身份
            /^(你是谁|你叫什么|what's your name|who are you)[?？]?$/i,
            // 感谢
            /^(谢谢|感谢|thanks|thank you)[!！.]?$/i,
            // 告别
            /^(再见|拜拜|bye|goodbye)[!！.]?$/i,
            // 简单确认
            /^(好的|ok|okay|yes|no)[!！.]?$/i
        ];

        return simplePatterns.some(pattern => pattern.test(input.trim()));
    }

    /**
     * 流式对话处理
     * 新架构：简单查询直接由 SessionChat 处理，复杂查询交给 ReActAgent
     *
     * @param {string} input - 用户输入
     * @param {Function} onChunk - 流式回调函数
     * @returns {Promise<Object>} - 最终响应结果
     */
    async streamChat(input, onChunk = null) {
        try {
            this.#log('开始流式处理:', input);

            // 快速路径：简单问候语直接由 SessionChat 处理
            if (this.#isSimpleGreeting(input)) {
                this.#log('检测到简单问候，直接响应');
                return await this.#streamDirectChat(input, onChunk);
            }

            // 1. 基于对话历史理解用户意图，完善问题描述
            const analysis = await this.analyzeIntent(input);
            this.#log('意图分析结果:', analysis);

            // 2. 交给 ReActAgent 全权处理（ReActAgent 自主决定是否使用工具）
            return await this.#executeWithToolsStream(analysis.refinedQuery, analysis, onChunk);
        } catch (error) {
            this.#log('流式对话错误:', error);
            if (onChunk) {
                onChunk({
                    type: 'error',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
            return {
                success: false,
                error: error.message,
                answer: '处理您的请求时发生错误。'
            };
        }
    }

    /**
     * 基于对话历史理解用户意图，生成完整、明确的问题描述
     *
     * 核心职责：
     * 1. 基于对话历史理解用户真实意图
     * 2. 处理指代消解（"它"指的是什么）
     * 3. 补充省略的上下文
     * 4. 生成完整、明确的问题描述
     *
     * @param {string} input - 用户当前输入
     * @returns {Promise<Object>} - 意图分析结果
     *   - refinedQuery: 完善后的问题描述
     *   - needsRefinement: 是否进行了完善
     *   - originalInput: 原始输入
     */
    async analyzeIntent(input) {
        this.#log('分析用户意图:', input);

        // 获取对话历史（排除系统消息）
        const history = this.sessionChat.getHistory().filter(msg => msg.role !== 'system');

        // 快速路径：第一轮对话或非常明确的输入，直接返回
        if (this.#shouldSkipRefinement(input, history)) {
            this.#log('跳过意图完善，直接返回原输入');
            return {
                refinedQuery: input,
                needsRefinement: false,
                originalInput: input
            };
        }

        // 如果禁用了问题完善功能，直接返回原输入
        if (!this.config.enableRefinement) {
            return {
                refinedQuery: input,
                needsRefinement: false,
                originalInput: input
            };
        }

        try {
            // 基于历史对话理解用户意图
            const prompt = this.#createIntentAnalysisPrompt(input, history);

            const response = await this.llmClient.getRawClient().chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: this.config.language === 'cn'
                            ? '你是一个专业的意图理解助手。基于对话历史，理解用户的真实意图并生成完整的问题描述。'
                            : 'You are a professional intent understanding assistant. Based on conversation history, understand the user\'s true intent and generate a complete, clear problem description.'
                    },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 500,
                temperature: 0.1
            });

            const refinedQuery = response.choices[0].message.content.trim();

            // 如果完善后的结果与原输入相同或为空，使用原输入
            if (!refinedQuery || refinedQuery === input) {
                return {
                    refinedQuery: input,
                    needsRefinement: false,
                    originalInput: input
                };
            }

            this.#log('意图完善结果:', refinedQuery);

            return {
                refinedQuery,
                needsRefinement: true,
                originalInput: input
            };

        } catch (error) {
            this.#log('意图分析失败，使用原输入:', error.message);
            // 出错时返回原输入
            return {
                refinedQuery: input,
                needsRefinement: false,
                originalInput: input,
                error: error.message
            };
        }
    }

    /**
     * 判断是否跳过意图完善
     * @private
     */
    #shouldSkipRefinement(input, history) {
        // 第一轮对话，不需要完善
        if (history.length === 0) {
            return true;
        }

        // 只有一条消息（系统消息），不需要完善
        const nonSystemMessages = history.filter(msg => msg.role !== 'system');
        if (nonSystemMessages.length === 0) {
            return true;
        }

        const lowerInput = input.toLowerCase().trim();

        // 非常明确的查询，不需要完善
        const explicitPatterns = [
            // 数学表达式
            /^[\d\s\+\-\*\/\(\)\.]+$/,
            // 明确的命令
            /^(计算|算一下|求解|查询|获取|执行|运行)\s+/i,
            // 完整的句子（较长）
            /^.{30,}$/
        ];

        for (const pattern of explicitPatterns) {
            if (pattern.test(input)) {
                return true;
            }
        }

        // 不包含可能的指代词，且输入较长，可能不需要完善
        const anaphoraWords = ['它', '这个', '那个', '他', '她', '它们', '这些', '那些',
            'it', 'this', 'that', 'they', 'them', 'these', 'those'];
        const hasAnaphora = anaphoraWords.some(word => lowerInput.includes(word.toLowerCase()));

        // 不包含省略迹象（如问句不完整）
        const omissionPatterns = ['多少钱', '多少', '呢', '怎么样', '好吗', '可以吗'];
        const hasOmission = omissionPatterns.some(p => lowerInput.includes(p));

        if (!hasAnaphora && !hasOmission && input.length > 10) {
            return true;
        }

        return false;
    }

    /**
     * 创建意图分析提示词
     * @private
     */
    #createIntentAnalysisPrompt(input, history) {
        const isCN = this.config.language === 'cn';

        // 格式化历史对话
        const formattedHistory = history.slice(-6).map(msg => {
            const role = msg.role === 'user' ? (isCN ? '用户' : 'User') : (isCN ? '助手' : 'Assistant');
            return `${role}: ${msg.content}`;
        }).join('\n');

        if (isCN) {
            return `基于以下对话历史，理解用户的真实意图并生成完整、明确的问题描述。

任务说明：
1. 处理指代消解：将"它"、"这个"、"那个"等指代词替换为具体对象
2. 补充省略的上下文：根据历史对话补全省略的信息
3. 生成完整的问题描述，使其不依赖历史也能被理解

对话历史：
${formattedHistory}

当前输入："${input}"

请生成一个完整、明确的问题描述。如果输入已经很清晰，直接返回原样。
只返回完善后的问题描述，不要添加任何解释。`;
        } else {
            return `Based on the following conversation history, understand the user's true intent and generate a complete, clear problem description.

Task:
1. Resolve anaphora: Replace pronouns like "it", "this", "that" with specific references
2. Supplement omitted context: Add missing information based on conversation history
3. Generate a complete question description that can be understood without history

Conversation History:
${formattedHistory}

Current Input: "${input}"

Please generate a complete, clear problem description. If the input is already clear, return it as is.
Return only the refined question, no explanations.`;
        }
    }

    /**
     * 使用工具执行任务（非流式）
     * @private
     */
    async #executeWithTools(refinedQuery, analysis) {
        if (!this.#reactAgent) {
            throw new Error('ReActAgent 未设置，无法执行工具调用');
        }

        // 获取当前上下文
        const contextMessages = this.sessionChat.getHistory();

        // 调用 ReActAgent 执行任务（传递完善后的问题）
        const taskConfig = {
            query: refinedQuery,
            contextMessages: contextMessages,
            tools: this.#tools,
            suggestedTools: analysis.suggestedTools || []
        };

        const result = await this.#reactAgent.executeTask(taskConfig);

        // 将结果整合回 SessionChat（使用原始输入保存历史）
        if (result.success) {
            this.sessionChat.addMessage('user', analysis.originalInput);
            this.sessionChat.addMessage('assistant', result.answer);
        }

        return {
            ...result,
            type: 'execution',
            analysis: analysis
        };
    }

    /**
     * 使用工具执行任务（流式）
     * @private
     */
    async #executeWithToolsStream(refinedQuery, analysis, onChunk) {
        if (!this.#reactAgent) {
            throw new Error('ReActAgent 未设置，无法执行工具调用');
        }

        // 发送开始事件
        if (onChunk) {
            onChunk({
                type: 'start',
                message: '开始处理任务...',
                timestamp: new Date().toISOString()
            });

            // 如果进行了问题完善，通知用户
            if (analysis.needsRefinement) {
                onChunk({
                    type: 'intent_refined',
                    original: analysis.originalInput,
                    refined: refinedQuery,
                    message: `意图理解: "${analysis.originalInput}" → "${refinedQuery}"`,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // 获取当前上下文
        const contextMessages = this.sessionChat.getHistory();

        // 调用 ReActAgent 执行流式任务（传递完善后的问题）
        const taskConfig = {
            query: refinedQuery,
            contextMessages: contextMessages,
            tools: this.#tools,
            suggestedTools: analysis.suggestedTools || []
        };

        let finalAnswer = '';

        const result = await this.#reactAgent.executeTaskStream(taskConfig, (chunk) => {
            // 转发事件
            if (onChunk) {
                onChunk(chunk);
            }

            // 收集最终答案
            if (chunk.type === 'final_answer') {
                finalAnswer = chunk.message;
            }
        });

        // 将结果整合回 SessionChat（使用原始输入保存历史）
        if (result.success && finalAnswer) {
            this.sessionChat.addMessage('user', analysis.originalInput);
            this.sessionChat.addMessage('assistant', finalAnswer);
        }

        return {
            ...result,
            type: 'execution',
            analysis: analysis
        };
    }

    /**
     * 直接流式对话（用于简单问候语的快速路径）
     * @private
     */
    async #streamDirectChat(input, onChunk) {
        let finalContent = '';

        await this.sessionChat.streamChat(
            input,
            (chunk, isReasoning, isDone) => {
                if (isDone) {
                    finalContent = chunk;
                    if (onChunk) {
                        onChunk({
                            type: 'final_answer',
                            message: finalContent,
                            timestamp: new Date().toISOString()
                        });
                        onChunk({
                            type: 'complete',
                            result: { success: true, answer: finalContent },
                            timestamp: new Date().toISOString()
                        });
                    }
                } else {
                    if (!isReasoning && onChunk) {
                        onChunk({
                            type: 'thinking',
                            content: chunk,
                            accumulated: finalContent,
                            timestamp: new Date().toISOString()
                        });
                    }
                    finalContent += chunk;
                }
            }
        );

        return {
            success: true,
            answer: finalContent,
            type: 'direct'
        };
    }

    /**
     * 创建系统提示
     * @private
     */
    #createSystemPrompt() {
        if (this.config.systemPrompt) {
            return this.config.systemPrompt;
        }

        const isCN = this.config.language === 'cn';

        if (isCN) {
            return `你是一个 helpful AI 助手。你可以：
1. 进行自然对话，回答一般性问题
2. 在需要时调用工具来执行特定任务

请保持友好、专业的态度，并尽可能提供准确有用的信息。`;
        } else {
            return `You are a helpful AI assistant. You can:
1. Have natural conversations and answer general questions
2. Call tools when needed to perform specific tasks

Please be friendly, professional, and provide accurate and useful information.`;
        }
    }

    /**
     * 获取对话统计信息
     * @returns {Object} - 统计信息
     */
    getStats() {
        return {
            ...this.sessionChat.getStats(),
            toolsCount: this.#tools.length,
            skillsCount: this.#skills.length,
            hasReActAgent: !!this.#reactAgent
        };
    }

    /**
     * 获取对话历史
     * @returns {Array} - 消息历史
     */
    getHistory() {
        return this.sessionChat.getHistory();
    }

    /**
     * 清除对话历史
     */
    clearHistory() {
        this.sessionChat.clearHistory();
        this.#log('对话历史已清除');
    }

    /**
     * 获取 Token 状态
     * @returns {Object} - Token 状态
     */
    getTokenStatus() {
        return this.sessionChat.getTokenStatus();
    }

}

export default BaseLLMService;
