import dotenv from 'dotenv';
import {createLogger} from '../utils/logger.js';

dotenv.config();

/**
 * ## 类功能概述
 *
 * [SessionChat] 类是一个用于管理对话会话的类，它提供了智能的消息管理、历史压缩和对话功能。
 *
 * ## 主要特性
 *
 * - **智能消息管理**：
 *   - 自动跟踪对话历史
 *   - 支持滑动窗口机制，防止消息过多
 *   - 消息重要性评分机制
 *
 * - **历史压缩优化**：
 *   - 当消息数量超过阈值时自动压缩历史
 *   - 保留重要消息，生成对话摘要
 *   - 支持多语言摘要（中英文）
 *
 * - **对话功能**：
 *   - 支持普通对话和流式对话
 *   - 自动管理消息历史
 *   - 错误处理和异常捕获
 *
 * ## 核心方法
 *
 * ### 消息管理
 * - [addMessage(role, content)]：添加消息并触发压缩检查
 * - [applySlidingWindow()]：应用滑动窗口机制清理历史消息
 * - [calculateImportance(message, index)]：计算消息重要性评分
 *
 * ### 历史压缩
 * - [compressHistory()]：智能压缩对话历史
 * - [generateSummary(messages)]：生成对话摘要
 * - `#compressWord(txt)` 和 `#summaryWord(txt)`：处理多语言提示词
 *
 * ### 对话交互
 * - [chat(input, opts)]：进行普通对话
 * - `streamChat(input, callback, opts)`：进行流式对话
 *
 * ### 系统管理
 * - [clearHistory()]：清除对话历史
 * - [updateSystemRole(newSystemRole)]：更新系统角色
 * - [getStats()]：获取统计信息
 *
 * ## 配置参数
 *
 * - `maxMessages`：最大消息数量（默认20）大于这个阈值，则触发滑动窗口机制
 * - `tokenLimit`：token限制（默认64K）
 * - `compressThreshold`：触发压缩的阈值（默认15）
 * - `importanceThreshold`：消息重要性阈值（默认0.3）
 */
export class SessionChat {
    #log;

    /**
     * 创建 SessionChat 实例
     * @param {LLMClient} client - LLM 客户端实例
     * @param {String} systemRole - 系统角色
     * @param {Object} config - 配置选项
     */
    constructor(client, systemRole, config = {}) {
        this.client = client; // 保存整个client实例而不是只是getRawClient()
        this.model = client.model;
        this.systemRole = systemRole;

        // 配置参数
        this.maxMessages = config.maxMessages || 20; // 最大消息数量
        this.tokenLimit = config.tokenLimit || 1024 * 64; // token限制
        this.compressThreshold = config.compressThreshold || 15; // 触发压缩的阈值
        this.importanceThreshold = config.importanceThreshold || 0.3; // 重要性阈值
        this.verbose = config.verbose || false;
        this.manualOperation = config.manualOperation || false; // 是否手动操作上下文，默认为智能模式

        // 初始化消息历史，包含系统角色
        this.messages = [
            {role: 'system', content: systemRole}
        ];
        this.messageScores = new Map(); // 消息重要性评分
        this.lastCompression = 0; // 上次压缩时的消息数量
        //
        this.tokenCache = new Map();      // Token缓存
        this.totalTokens = 0;             // 总Token数
        this.tokenVersion = 0;            // Token版本号
        this.lastMessageCount = 0;        // 上次消息数量

        // 创建日志函数（在消息初始化之后）
        this.#log = createLogger('SessionChat', this.verbose);

        if (this.manualOperation) {
            this.#log('手动管理上下文模式');
        } else {
            this.#log('智能管理上下文模式');
        }
    }

    /**
     * 智能添加消息
     * @param {string} role - 消息角色
     * @param {string} content - 消息内容
     */
    addMessage(role, content) {
        this.messages.push({role, content});
        if (this.manualOperation) {
            return;
        }
        // 检查当前token数量是否超过限制
        const currentTokens = this.estimateTokens();
        if (currentTokens > this.tokenLimit) {
            this.#log(`Token limit exceeded: ${currentTokens} > ${this.tokenLimit}, triggering compression`);
            this.compressHistory().catch(err => this.#log('Compression failed:', err));
        } else if (this.messages.length > this.compressThreshold &&
            this.messages.length - this.lastCompression > 10) {
            // 检查是否需要压缩（基于消息数量）
            this.compressHistory().catch(err => this.#log('Compression failed:', err));
        }

        // 滑动窗口清理
        if (this.messages.length > this.maxMessages) {
            this.applySlidingWindow();
        }
    }

    /**
     * 计算消息重要性
     * @param {Object} message - 消息对象
     * @param {number} index - 消息索引
     * @returns {number} - 重要性分数
     */
    #calculateImportance(message, index) {
        let score = 0.5; // 基础分

        // 位置权重（越新的消息越重要）
        score += (index / this.messages.length) * 0.3;

        // 内容长度权重（过长的消息降低重要性）
        const length = message.content.length;
        if (length > 1000) score -= 0.2;
        if (length < 50) score += 0.1;

        // 关键词权重（包含关键信息的消息更重要）
        const keywords = ['important', 'remember', 'key', 'summary', 'conclusion', 'crucial', '重要', '关键', '记住'];
        const hasKeywords = keywords.some(kw =>
            message.content.toLowerCase().includes(kw.toLowerCase())
        );
        if (hasKeywords) score += 0.2;

        return Math.min(1.0, Math.max(0.0, score));
    }

    /**
     * 滑动窗口机制
     */
    applySlidingWindow() {
        const systemMsg = this.messages[0];
        const recentMsgs = this.messages.slice(-(this.maxMessages - 1));

        // 保留重要消息
        const importantMsgs = this.messages.slice(1, -recentMsgs.length)
            .filter((msg, idx) => {
                const score = this.#calculateImportance(msg, idx + 1);
                return score >= this.importanceThreshold;
            });

        this.messages = [systemMsg, ...importantMsgs, ...recentMsgs];
    }

    /**
     * 只保留最新的N个消息上下文（手动管理）
     * 保留最新的N条user角色消息，删除其他历史记录，实现短记忆对话，特别针对用户一个问题拆开来问的场景
     * @param {number} count - 要保留的user消息数量，默认为5
     * @param {number} assistantTxtLimitSize - 删除的assistant消息内容长度阈值，默认为250，
     * 为负数，不对LLM响应消息大小处理
     * 对于报告型回答时，报告已经针对问句做了详细专业描述，预估此问题已结束，删除assistant消息内容，免得影响上下文大小
     */
    keepLatestUserMessages(count = 5, assistantTxtLimitSize = 250) {
        const systemMsg = this.messages[0];

        // 筛选出所有user角色的消息
        const userMessages = this.messages.filter(msg => msg.role === 'user');

        // 如果user消息数量不超过指定数量，则保留所有user消息
        if (userMessages.length <= count) {
            // 找出所有user和assistant的交替对话对
            const conversationPairs = [];
            let userIndex = 1; // 从第一个非系统消息开始

            while (userIndex < this.messages.length) {
                if (this.messages[userIndex].role === 'user') {
                    const userMsg = this.messages[userIndex];
                    const assistantMsg = (userIndex + 1 < this.messages.length &&
                        this.messages[userIndex + 1].role === 'assistant') ?
                        this.messages[userIndex + 1] : null;
                    if (assistantMsg) {
                        if (assistantTxtLimitSize > 0 && assistantMsg.content.length > assistantTxtLimitSize) {
                            // 删除assistant消息内容
                            assistantMsg.content = '';
                        }
                        conversationPairs.push([userMsg, assistantMsg]);
                        userIndex += 2; // 跳过user和assistant两条消息
                    } else {
                        conversationPairs.push([userMsg]);
                        userIndex += 1;
                    }
                } else {
                    userIndex += 1;
                }
            }

            // 保留所有对话对
            const newMessages = [systemMsg];
            conversationPairs.forEach(pair => {
                newMessages.push(...pair);
            });

            this.messages = newMessages;
        } else {
            // 只保留最新的count条user消息及对应的assistant回复
            const latestUserMessages = userMessages.slice(-count);
            const newMessages = [systemMsg];

            // 遍历原始消息，只保留最新的user消息及其对应的assistant回复
            for (let i = 1; i < this.messages.length; i++) {
                if (this.messages[i].role === 'user' &&
                    latestUserMessages.includes(this.messages[i])) {

                    newMessages.push(this.messages[i]);

                    // 如果下一条消息是assistant的回复，则也保留
                    if (i + 1 < this.messages.length &&
                        this.messages[i + 1].role === 'assistant') {
                        const assistantMsg = this.messages[i + 1];
                        if (assistantTxtLimitSize > 0 && assistantMsg.content.length > assistantTxtLimitSize) {
                            assistantMsg.content = '';
                        }
                        newMessages.push(assistantMsg);
                        i++; // 跳过已处理的assistant消息
                    }
                }
            }
            this.messages = newMessages;
        }

        // 重置压缩状态
        this.lastCompression = this.messages.length;
        this.messageScores.clear();
    }

    /**
     * 手工设置上下文消息数组（替换当前会话消息历史），结合manualOperation参数使用，用户自行控制上下文管理
     * 允许用户完全自定义管理上下文
     * @param {Array} messages - 新的消息数组，必须包含系统消息
     * @throws {Error} 当消息格式不正确时抛出错误
     */
    manualSetMessages(messages) {
        if (!Array.isArray(messages)) {
            throw new Error('Messages must be an array');
        }

        if (messages.length === 0) {
            throw new Error('Messages array cannot be empty');
        }

        if (messages[0].role !== 'system') {
            throw new Error('First message must be a system role message');
        }

        // 验证每条消息的格式
        for (const msg of messages) {
            if (!msg.role || !msg.content) {
                throw new Error('Each message must have role and content properties');
            }
        }

        this.messages = [...messages];  // 创建副本避免外部引用
        this.tokenVersion++;            // 更新token缓存版本
        this.lastMessageCount = 0;      // 重置token计算状态
        this.messageScores.clear();     // 清除旧的重要性评分

        this.#log('Messages history updated by user');
    }

    #compressWord(txt) {
        const compressPrompt_cn = `先前的对话摘要：\n\n${txt}`;
        const compressPrompt_en = `Previous conversation summary:\n\n${txt}`;
        const lang = process.env.PROMPTS_LANG;
        if (lang) {
            return lang === 'cn' ? compressPrompt_cn : compressPrompt_en;
        } else {
            return compressPrompt_cn;
        }
    }

    /**
     * 智能压缩历史
     */
    async compressHistory() {
        if (this.messages.length < 10) return;

        const systemMsg = this.messages[0];
        const conversation = this.messages.slice(1, -3); // 排除最近3条

        try {
            const summary = await this.generateSummary(conversation);

            this.messages = [
                systemMsg,
                {role: 'system', content: this.#compressWord(summary)},
                ...this.messages.slice(-3)
            ];

            this.lastCompression = this.messages.length;
            this.messageScores.clear();

        } catch (error) {
            console.error('History compression failed:', error);
        }
    }

    #summaryWord(txt) {
        const summaryPrompt_cn = `请简要总结此对话（最多100个词），重点是关键信息和决策：\n\n${txt}`;
        const summaryPrompt_en = `Briefly summarize this conversation (max 100 words), focusing on key information and decisions:\n\n${txt}`;
        const lang = process.env.PROMPTS_LANG;
        if (lang) {
            return lang === 'cn' ? summaryPrompt_cn : summaryPrompt_en;
        } else {
            return summaryPrompt_cn;
        }
    }

    /**
     * 生成摘要
     * @param {Array} messages - 消息数组
     * @returns {Promise<string>} - 摘要内容
     */
    async generateSummary(messages) {
        const conversationText = messages
            .map(m => `${m.role}: ${m.content.substring(0, 200)}`)
            .join('\n');

        //const summaryPrompt = `Briefly summarize this conversation (max 100 words), focusing on key information and decisions:\n\n${conversationText}`;

        const response = await this.client.getRawClient().chat.completions.create({
            model: this.model,
            messages: [{role: 'user', content: this.#summaryWord(conversationText)}],
            max_tokens: 150,
            temperature: 0.3
        });

        return response.choices[0].message.content;
    }

    /**
     * 进行对话
     * @param {string} input - 用户输入
     * @param {Object} opts - 其他选项
     * @returns {Promise<string>} - AI 回复
     */
    async chat(input, opts = {}) {
        // 使用智能消息添加
        this.addMessage('user', input);

        try {
            // 在发送前检查token数量，如果超过限制则进行压缩
            const currentTokens = this.estimateTokens();
            if (currentTokens > this.tokenLimit * 0.9) { // 90%阈值时触发压缩
                this.#log(`Approaching token limit: ${currentTokens}/${this.tokenLimit}, compressing before request`);
                await this.compressHistory();
            }

            // 使用 OpenAI SDK 发送请求
            const response = await this.client.getRawClient().chat.completions.create({
                model: this.model,
                messages: this.messages,
                ...opts
            });

            // 获取 AI 回复
            const aiMessage = response.choices[0].message.content;

            // 使用智能消息添加
            this.addMessage('assistant', aiMessage);

            return aiMessage;
        } catch (error) {
            console.error('聊天过程中发生错误:', error);
            throw error;
        }
    }

    /**
     * 进行流式对话
     * @param {string} input - 用户输入
     * @param callback - 结果回调函数，参数：文本片段，是否为推理结果，是否为结束
     * @param {Object} opts - 其他选项
     * @returns
     */
    async streamChat(input, callback, opts = {}) {
        // 使用智能消息添加
        this.addMessage('user', input);

        // 在流式对话前检查token数量
        const currentTokens = this.estimateTokens();
        if (currentTokens > this.tokenLimit * 0.9) { // 90%阈值时触发压缩
            this.#log(`Approaching token limit: ${currentTokens}/${this.tokenLimit}, compressing before stream`);
            await this.compressHistory();
        }

        let extractedContent = '';
        try {
            // 使用 client 的 stream 方法获取 OpenAI 流
            const stream = await this.client.stream(this.messages, opts);
            for await (const chunk of stream) {
                //console.log(textPart.choices[0]?.delta?.content || '');
                const reason = chunk.choices[0]?.delta?.reasoning_content || '';
                if (reason.length > 0) {
                    callback(reason, true, false);
                }
                const content = chunk.choices[0]?.delta?.content || '';
                if (content.length > 0) {
                    extractedContent += content;
                    callback(content, false, false);
                }
                if (chunk.choices[0]?.finish_reason) {
                    this.addMessage('assistant', extractedContent);
                    callback(extractedContent, false, true);
                }
            }
            return undefined;
        } catch (error) {
            console.error('流式聊天过程中发生错误:', error);
            throw error;
        }
    }

    /**
     * 获取最新的N条消息记录
     * @param {number} count - 要获取的消息数量，默认为5
     * @returns {Array} - 最新的消息记录数组
     */
    getLatestMessages(count = 5) {
        // 如果消息总数少于等于count条，则返回所有消息（除了系统消息）
        if (this.messages.length <= count + 1) {
            return this.messages.slice(1); // 排除系统消息
        }

        // 返回最新的count条消息（排除系统消息）
        return this.messages.slice(-count);
    }

    /**
     * 获取当前对话历史
     * @returns {Array} - 对话历史记录
     */
    getHistory() {
        //this.messages;
        return [...this.messages]; // 创建副本，避免直接修改原始数据
    }

    /**
     * 清除对话历史（保留系统角色）
     */
    clearHistory() {
        this.messages = [
            {role: 'system', content: this.systemRole}
        ];
        this.messageScores.clear();
        this.lastCompression = 0;
    }

    /**
     * 更新系统角色
     * @param {string} newSystemRole - 新的系统角色
     */
    updateSystemRole(newSystemRole) {
        this.systemRole = newSystemRole;
        // 更新历史记录中的系统角色
        this.messages[0] = {role: 'system', content: newSystemRole};
    }

    /**
     * 获取当前用户会话消息的数量（不包括系统消息）
     * @returns {number} - 用户会话消息数量
     */
    getUserMessageCount() {
        // 减去1是因为第一条是系统消息
        return this.messages.length - 1;
    }

    /**
     * 获取统计信息
     * @returns {Object} - 统计信息
     */
    getStats() {
        return {
            messageCount: this.messages.length,
            lastCompression: this.lastCompression,
            averageMessageLength: this.messages.reduce((sum, m) => sum + m.content.length, 0) / this.messages.length,
            tokenEstimate: this.estimateTokens()
        };
    }

    /**
     * 估算token数量
     * @returns {number} - 估算的token数量
     */
    estimateTokens() {
        // 粗略估算：中文字符 * 1.5 + 英文单词 * 1.3

        // 缓存命中检查（仅当没有新消息且版本匹配时）
        if (this.messages.length === this.lastMessageCount &&
            this.tokenCache.has('total') &&
            this.tokenCache.get('version') === this.tokenVersion) {
            return this.tokenCache.get('total');
        }

        // 检查消息是否被移除（滑动窗口或压缩），如果是则重新计算
        if (this.messages.length < this.lastMessageCount) {
            this.totalTokens = 0;
            this.lastMessageCount = 0;
            // 清理缓存中已不存在消息的条目
            for (const key of this.tokenCache.keys()) {
                if (key !== 'total' && key !== 'version') {
                    const index = parseInt(key, 10);
                    if (index >= this.messages.length) {
                        this.tokenCache.delete(key);
                    }
                }
            }
        }

        // 增量计算：只计算新消息
        for (let i = this.lastMessageCount; i < this.messages.length; i++) {
            const m = this.messages[i];
            const chineseChars = (m.content.match(/[\u4e00-\u9fff]/g) || []).length;
            const englishWords = (m.content.match(/[a-zA-Z]+/g) || []).length;
            this.totalTokens += chineseChars * 1.5 + englishWords * 1.3;
        }

        this.lastMessageCount = this.messages.length;
        this.tokenCache.set('total', this.totalTokens);
        this.tokenCache.set('version', this.tokenVersion);

        return this.totalTokens;
    }

    /**
     * 检查当前token数量并返回状态信息
     * @returns {Object} - Token状态信息
     */
    getTokenStatus() {
        const currentTokens = this.estimateTokens();
        const usagePercentage = (currentTokens / this.tokenLimit) * 100;
        const status = usagePercentage < 70 ? 'safe' :
            usagePercentage < 90 ? 'warning' : 'critical';

        return {
            currentTokens,
            tokenLimit: this.tokenLimit,
            usagePercentage: Math.round(usagePercentage * 100) / 100,
            status,
            messagesCount: this.messages.length
        };
    }
}