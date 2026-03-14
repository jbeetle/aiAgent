import {SessionChat} from '../models/chat.session.js';
import {createLogger, serializeResult} from '../utils/logger.js';
import {promptFactory} from '../utils/prompt.factory.js';

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
     * 意图识别（关键词 + LLM 混合策略）
     * @private
     */
    async #analyzeIntent(input) {
        // 1. 关键词快速匹配（高置信度场景）
        const keywordResult = this.#checkKeywords(input);
        if (keywordResult.confidence === 'high') {
            return keywordResult;
        }

        // 2. 如果没有启用意图识别或没有工具，直接返回不需要工具
        if (!this.config.useIntentRecognition || this.#tools.length === 0) {
            return { needsTools: false, confidence: 'high', reason: 'no_tools_available' };
        }

        // 3. LLM 确认（模糊输入时使用）
        return await this.#llmIntentCheck(input);
    }

    /**
     * 关键词检查
     * @private
     */
    #checkKeywords(input) {
        const lowerInput = input.toLowerCase();

        // 明确的工具调用关键词
        const toolKeywords = [
            '计算', 'calculate', '算一下', '等于几', '多少',
            '执行', 'execute', '运行', 'run',
            '查询', 'query', '搜索', 'search',
            '获取', 'get', 'fetch', '读取', 'read',
            '写入', 'write', '保存', 'save',
            '生成', 'generate', '创建', 'create',
            '分析', 'analyze', '统计', 'statistics'
        ];

        // 明确的聊天关键词（排除工具调用）
        const chatKeywords = [
            '你好', 'hello', 'hi', 'hey',
            '谢谢', 'thanks', 'thank you', '谢了',
            '再见', 'bye', 'goodbye',
            '名字', 'name', '叫什么',
            '帮助', 'help', '怎么用',
            '天气', 'weather',
            '时间', 'time', '日期', 'date'
        ];

        // 检查是否匹配工具关键词
        for (const keyword of toolKeywords) {
            if (lowerInput.includes(keyword.toLowerCase())) {
                // 进一步检查是否包含数字、表达式等
                const hasMathExpr = /[\d+\-*/().]+/.test(input);
                const hasCode = /(function|class|const|let|var|if|for|while)/.test(input);

                if (hasMathExpr || hasCode || lowerInput.includes('计算') || lowerInput.includes('calculate')) {
                    return {
                        needsTools: true,
                        confidence: 'high',
                        reason: 'math_expression',
                        suggestedTools: ['calculator', 'advanced_calculator']
                    };
                }

                return {
                    needsTools: true,
                    confidence: 'medium',
                    reason: 'tool_keyword_match',
                    keyword: keyword
                };
            }
        }

        // 检查是否匹配纯聊天关键词
        for (const keyword of chatKeywords) {
            if (lowerInput.includes(keyword.toLowerCase())) {
                return {
                    needsTools: false,
                    confidence: 'high',
                    reason: 'chat_keyword_match',
                    keyword: keyword
                };
            }
        }

        // 默认返回低置信度，需要 LLM 确认
        return {
            needsTools: false,
            confidence: 'low',
            reason: 'unclear_input'
        };
    }

    /**
     * LLM 意图确认
     * @private
     */
    async #llmIntentCheck(input) {
        try {
            const toolNames = this.#tools.map(t => t.name).join(', ');
            const prompt = this.#createIntentPrompt(input, toolNames);

            const response = await this.llmClient.getRawClient().chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: 'You are an intent classification assistant. Respond with JSON only.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 150,
                temperature: 0.1
            });

            const content = response.choices[0].message.content.trim();

            // 尝试解析 JSON 响应
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                const result = JSON.parse(jsonMatch ? jsonMatch[0] : content);

                return {
                    needsTools: result.needs_tools === true,
                    confidence: result.confidence || 'medium',
                    reason: result.reason || 'llm_classification',
                    suggestedTools: result.suggested_tools || []
                };
            } catch (e) {
                // JSON 解析失败，回退到简单判断
                const needsTools = content.toLowerCase().includes('true') ||
                    content.toLowerCase().includes('yes') ||
                    content.toLowerCase().includes('tool');

                return {
                    needsTools,
                    confidence: 'low',
                    reason: 'fallback_parsing'
                };
            }
        } catch (error) {
            this.#log('LLM 意图识别失败:', error);
            // 失败时默认不使用工具，避免不必要的调用
            return { needsTools: false, confidence: 'low', reason: 'llm_error' };
        }
    }

    /**
     * 创建意图识别提示词
     * @private
     */
    #createIntentPrompt(input, toolNames) {
        const isCN = this.config.language === 'cn';

        if (isCN) {
            return `请分析以下用户输入，判断是否需要使用工具来回答。

可用工具: ${toolNames}

用户输入: "${input}"

请判断：
1. 用户是在进行日常对话（问候、闲聊、询问个人信息等）
2. 用户需要执行具体任务（计算、查询、数据处理等）

请以 JSON 格式回复：
{
  "needs_tools": true/false,
  "confidence": "high/medium/low",
  "reason": "判断理由",
  "suggested_tools": ["可能需要的工具名称"]
}`;
        } else {
            return `Please analyze the following user input and determine if tools are needed to respond.

Available tools: ${toolNames}

User input: "${input}"

Determine:
1. Is the user having a casual conversation (greetings, chat, asking personal info)?
2. Does the user need to perform a specific task (calculation, query, data processing)?

Please respond in JSON format:
{
  "needs_tools": true/false,
  "confidence": "high/medium/low",
  "reason": "reason for judgment",
  "suggested_tools": ["suggested tool names"]
}`;
        }
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
}

export default BaseLLMService;
