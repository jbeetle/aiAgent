import {SessionChat} from '../models/chat.session.js';
import {createLogger} from '../utils/logger.js';
import {IntentRecognizer} from '../utils/intent.recognizer.js';

/**
 * BaseLLMService - 基础 LLM 对话服务层
 *
 * 核心职责：
 * 1. 封装 SessionChat，管理跨对话上下文（滑动窗口、压缩、token 估算）
 * 2. 实现意图识别（关键词 + LLM 混合策略）
 * 3. 协调与 ReActAgent 的交互，作为无状态任务执行器
 *
 * 架构分层：
 * - 基础对话层：BaseLLMService (有状态，管理上下文)
 * - 任务执行层：ReActAgent (无状态，执行工具)
 */
export class BaseLLMService {
    #log;
    #reactAgent = null;
    #tools = [];
    #skills = [];

    #intentRecognizer = null;

    /**
     * 创建 BaseLLMService 实例
     * @param {Object} llmClient - LLM 客户端实例 (如 LLMClient)
     * @param {Object} config - 配置选项
     * @param {string} [config.systemPrompt] - 自定义系统提示
     * @param {number} [config.maxMessages=20] - 最大消息数量
     * @param {number} [config.tokenLimit=65536] - token 限制
     * @param {boolean} [config.verbose=false] - 启用详细日志
     * @param {boolean} [config.useIntentRecognition=true] - 是否使用意图识别
     * @param {string} [config.language] - 语言 ('cn' | 'en')
     * @param {Object} [config.intentRecognition] - 意图识别配置
     * @param {string} [config.intentRecognition.mode='balanced'] - 识别模式: 'aggressive' | 'conservative' | 'balanced'
     * @param {boolean} [config.intentRecognition.useToolDescriptions=true] - 是否使用工具描述
     * @param {boolean} [config.intentRecognition.useSkillDescriptions=true] - 是否使用 Skill 描述
     * @param {string} [config.intentRecognition.llmConfirmationThreshold='medium'] - LLM 确认阈值: 'low' | 'medium' | 'high'
     */
    constructor(llmClient, config = {}) {
        this.config = {
            maxMessages: 20,
            tokenLimit: 1024 * 64,
            compressThreshold: 15,
            verbose: false,
            systemPrompt: null,
            useIntentRecognition: true,
            language: process.env.PROMPTS_LANG || 'cn',
            intentRecognition: {
                mode: 'balanced',
                useToolDescriptions: true,
                useSkillDescriptions: true,
                llmConfirmationThreshold: 'medium',
                enableSemanticMatching: true,
                minToolRelevanceScore: 0.3,
                maxToolsInPrompt: 10,
                ...config.intentRecognition
            },
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

        // 创建 IntentRecognizer
        if (this.config.useIntentRecognition) {
            this.#intentRecognizer = new IntentRecognizer(
                llmClient,
                llmClient.model,
                this.config.intentRecognition,
                this.config.verbose
            );
        }

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

        // 同时注册到 IntentRecognizer
        if (this.#intentRecognizer) {
            this.#intentRecognizer.registerTools(tools);
        }
    }

    /**
     * 注册可用技能
     * @param {Array} skills - 技能数组
     */
    registerSkills(skills) {
        this.#skills = skills || [];
        this.#log(`已注册 ${this.#skills.length} 个技能`);

        // 同时注册到 IntentRecognizer
        if (this.#intentRecognizer) {
            this.#intentRecognizer.registerSkills(skills);
        }
    }

    /**
     * 主入口：对话处理
     * @param {string} input - 用户输入
     * @returns {Promise<Object>} - 响应结果
     */
    async chat(input) {
        try {
            this.#log('处理用户输入:', input);

            // 1. 意图识别
            const intent = await this.#analyzeIntent(input);
            this.#log('意图识别结果:', intent);

            // 2. 根据意图选择处理路径
            if (intent.needsTools) {
                // 需要工具：调用 ReActAgent
                return await this.#executeWithTools(input, intent);
            } else {
                // 直接对话：使用 SessionChat
                const response = await this.sessionChat.chat(input);
                return {
                    success: true,
                    answer: response,
                    type: 'direct',
                    intent: intent
                };
            }
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
     * 流式对话处理
     * @param {string} input - 用户输入
     * @param {Function} onChunk - 流式回调函数
     * @returns {Promise<Object>} - 最终响应结果
     */
    async streamChat(input, onChunk = null) {
        try {
            this.#log('开始流式处理:', input);

            // 1. 意图识别（使用缓存或简单规则避免重复调用）
            const intent = await this.#analyzeIntent(input);
            this.#log('意图识别结果:', intent);

            // 2. 根据意图选择处理路径
            if (intent.needsTools && this.#reactAgent) {
                // 需要工具：调用 ReActAgent
                return await this.#executeWithToolsStream(input, intent, onChunk);
            } else {
                // 直接对话：使用 SessionChat 流式
                return await this.#streamDirectChat(input, onChunk);
            }
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
     * 意图识别（使用 IntentRecognizer）
     * @private
     */
    async #analyzeIntent(input) {
        // 如果没有启用意图识别或没有工具，直接返回不需要工具
        if (!this.config.useIntentRecognition || !this.#intentRecognizer || this.#tools.length === 0) {
            return { needsTools: false, confidence: 'high', reason: 'no_tools_available' };
        }

        // 使用 IntentRecognizer 进行意图识别
        return await this.#intentRecognizer.recognize(input);
    }

    /**
     * 使用工具执行任务（非流式）
     * @private
     */
    async #executeWithTools(input, intent) {
        if (!this.#reactAgent) {
            throw new Error('ReActAgent 未设置，无法执行工具调用');
        }

        // 获取当前上下文
        const contextMessages = this.sessionChat.getHistory();

        // 调用 ReActAgent 执行任务
        const taskConfig = {
            query: input,
            contextMessages: contextMessages,
            tools: this.#tools,
            suggestedTools: intent.suggestedTools || []
        };

        const result = await this.#reactAgent.executeTask(taskConfig);

        // 将结果整合回 SessionChat
        if (result.success) {
            this.sessionChat.addMessage('user', input);
            this.sessionChat.addMessage('assistant', result.answer);
        }

        return {
            ...result,
            type: 'tool_execution',
            intent: intent
        };
    }

    /**
     * 使用工具执行任务（流式）
     * @private
     */
    async #executeWithToolsStream(input, intent, onChunk) {
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
        }

        // 获取当前上下文
        const contextMessages = this.sessionChat.getHistory();

        // 调用 ReActAgent 执行流式任务
        const taskConfig = {
            query: input,
            contextMessages: contextMessages,
            tools: this.#tools,
            suggestedTools: intent.suggestedTools || []
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

        // 将结果整合回 SessionChat
        if (result.success && finalAnswer) {
            this.sessionChat.addMessage('user', input);
            this.sessionChat.addMessage('assistant', finalAnswer);
        }

        return {
            ...result,
            type: 'tool_execution',
            intent: intent
        };
    }

    /**
     * 直接流式对话
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

    /**
     * 获取意图识别配置
     * @returns {Object} - 意图识别配置
     */
    getIntentRecognitionConfig() {
        return this.#intentRecognizer ? this.#intentRecognizer.getConfig() : null;
    }

    /**
     * 更新意图识别配置
     * @param {Object} config - 新的配置选项
     * @param {string} [config.mode] - 识别模式: 'aggressive' | 'conservative' | 'balanced'
     * @param {boolean} [config.useToolDescriptions] - 是否使用工具描述
     * @param {boolean} [config.useSkillDescriptions] - 是否使用 Skill 描述
     * @param {string} [config.llmConfirmationThreshold] - LLM 确认阈值: 'low' | 'medium' | 'high'
     * @param {boolean} [config.enableSemanticMatching] - 是否启用语义匹配
     * @param {number} [config.minToolRelevanceScore] - 最小工具相关度分数
     * @param {number} [config.maxToolsInPrompt] - 提示词中包含的最大工具数量
     */
    updateIntentRecognitionConfig(config) {
        if (this.#intentRecognizer) {
            this.#intentRecognizer.updateConfig(config);
            this.#log('意图识别配置已更新:', config);
        } else {
            this.#log('警告: IntentRecognizer 未初始化，无法更新配置');
        }
    }

    /**
     * 设置意图识别模式
     * @param {string} mode - 'aggressive' | 'conservative' | 'balanced'
     */
    setIntentRecognitionMode(mode) {
        this.updateIntentRecognitionConfig({ mode });
    }
}

export default BaseLLMService;
