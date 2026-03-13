import OpenAI from 'openai';
import dotenv from 'dotenv';
import {fetch} from "undici";
import {createHttpDispatcher} from './http.dispatcher.js';
import {serializeResult} from '../utils/logger.js';

dotenv.config();

// ---------- 统一客户端 ----------

class LLMClient {
    /**
     * 创建 LLMClient 实例
     * @param {string} apiKey - API 密钥
     * @param {string} baseURL - API 基础 URL
     * @param {string} model - 模型名称
     * @param {object} httpPool - http连接池属性,通过这个配置可以根据需要调整访问大模型网络通信的特性
     */
    constructor(apiKey, baseURL, model, httpPool = {}) {
        this.model = model;
        let opts = {
            apiKey, baseURL,
            timeout: 60 * 1000,
            maxRetries: 3
        };
        if (Object.keys(httpPool).length > 0) {
            const proxy = createHttpDispatcher(httpPool);

            function fetchX(url, options) {
                return fetch(url, {
                    ...options,
                    dispatcher: proxy
                });
            }

            opts = {
                ...opts,
                fetch: fetchX
            };
        }
        this.client = new OpenAI(opts);
    }

    /**
     * 执行同步/异步对话
     * @param {Array} messages - 消息数组
     * @param {Object} opts - 可选参数
     * @param {boolean} opts.stream - 是否使用流式响应
     * @returns {Promise<string|Object>} - 非流式返回消息内容，流式返回完整响应对象
     */
    async chat(messages, opts = {}) {
        const {stream = false, ...rest} = opts;
        const payload = {model: this.model, messages, stream, ...rest};
        const res = await this.client.chat.completions.create(payload);
        return stream ? res : res.choices[0].message.content;
    }

    /**
     * 流式返回 AsyncIterable
     * @param {Array} messages - 消息数组
     * @param {Object} opts - 可选参数
     * @returns  - 流式响应的 AsyncIterable
     */
    async stream(messages, opts = {}) {
        return await this.chat(messages, {...opts, stream: true}); // 直接给调用者 for-await
    }

    /**
     * 工具/函数调用
     * @param {Array} messages - 消息数组
     * @param {Array} tools - 工具数组
     * @param {Object} opts - 可选参数
     * @returns  - API 响应对象
     */
    async callWithTools(messages, tools, opts = {}) {
        const res = await this.client.chat.completions.create({
            model: this.model,
            messages,
            tools: tools.map(t => ({type: 'function', function: t})),
            ...opts,
        });
        // 检查是否有工具调用需要执行
        const choice = res.choices[0];
        const toolCalls = choice.message.tool_calls;
        if (toolCalls && toolCalls.length > 0) {
            // 创建工具映射以便快速查找
            const toolMap = {};
            tools.forEach(tool => {
                toolMap[tool.name] = tool;
            });
            // 执行所有工具调用（并行）
            const toolPromises = toolCalls.map(async (toolCall) => {
                const toolName = toolCall.function.name;
                const tool = toolMap[toolName];
                if (tool && typeof tool.handler === 'function') {
                    try {
                        // 解析工具参数
                        const args = JSON.parse(toolCall.function.arguments);
                        // 执行工具
                        const result = await tool.handler(args);
                        // 返回结果
                        return {
                            tool_call_id: toolCall.id,
                            role: "tool",
                            name: toolName,
                            content: serializeResult(result),
                        };
                    } catch (error) {
                        // 工具执行出错时返回错误信息
                        return {
                            tool_call_id: toolCall.id,
                            role: "tool",
                            name: toolName,
                            content: `Error executing tool: ${error.message}`,
                        };
                    }
                } else {
                    // 工具不存在或没有处理器
                    return {
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: toolName,
                        content: `Tool "${toolName}" not found or doesn't have a handler`,
                    };
                }
            });
            const toolResults = await Promise.all(toolPromises);
            // 将工具执行结果添加到消息历史中
            const newMessages = [...messages, choice.message, ...toolResults];
            // 再次调用LLM，这次带上工具执行结果
            const finalRes = await this.client.chat.completions.create({
                model: this.model,
                messages: newMessages,
                ...opts,
            });
            return finalRes;
        }
        // 如果没有工具调用，直接返回初始响应
        return res;
    }

    /**
     * 构建消息对象
     * @private
     * @param {string} systemRole - 系统角色内容
     * @param {string|Array} userInputs - 用户输入内容
     * @returns {Array} - 构建好的消息数组
     */
    #makeMessage(systemRole, userInputs) {
        const messages = [];
        messages.push({role: 'system', content: systemRole});
        if (userInputs instanceof Array) {
            const content = [];
            userInputs.forEach(input => {
                let txtObj = {type: 'text', text: input}
                content.push(txtObj);
            });
            messages.push({role: 'user', content: content});
        } else {
            messages.push({role: 'user', content: userInputs});
        }
        return messages;
    }

    /**
     * 生成文本内容
     * @param {string} systemRole - 系统角色内容
     * @param {string|Array} userInputs - 用户输入内容
     * @param {Object} opts - 可选参数
     * @returns {Promise<string>} - 生成的文本内容
     */
    async generateText(systemRole, userInputs, opts = {}) {
        const messages = this.#makeMessage(systemRole, userInputs);
        //console.log('messages:', JSON.stringify( messages));
        return await this.chat(messages, opts);
    }

    /**
     * 流式生成文本内容
     * @param {string} systemRole - 系统角色内容
     * @param {string|Array} userInputs - 用户输入内容
     * @param {Object} opts - 可选参数
     * @returns
     */
    async streamText(systemRole, userInputs, opts = {}) {
        const messages = this.#makeMessage(systemRole, userInputs);
        return await this.stream(messages, opts);
    }

    /**
     * 获取原始客户端实例
     * @returns {OpenAI} - OpenAI 客户端实例
     */
    getRawClient() {
        return this.client;
    }
}

export default LLMClient;