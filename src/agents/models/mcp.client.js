/**
 * LLM-MCP 客户端集成
 * 集成官方 @modelcontextprotocol/sdk 的增强版 LLM 客户端
 * 支持直接连接 MCP 服务器
 */

import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {StreamableHTTPClientTransport} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {StdioClientTransport} from "@modelcontextprotocol/sdk/client/stdio.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * MCP 增强版 LLM 客户端
 * 支持直接连接 MCP 服务器，不依赖 OpenAI 的 Responses API
 */
export class McpClient {
    /**
     * 创建 MCP 增强版 LLM 客户端
     * @param {LLMClient} llmClient - LLMClient类实例
     */
    constructor(llmClient) {
        this.llm = llmClient;
        // MCP 服务器连接存储
        this.mcpServers = new Map(); // 存储多个 MCP 服务器连接
    }

    /**
     * 连接 MCP 服务器
     * @param {Object} serverConfig - MCP 服务器配置
     * @param {string} serverConfig.name - 服务器名称
     * @param {string} serverConfig.url - 服务器 URL (用于 HTTP)
     * @param {string} serverConfig.command - 命令 (用于 stdio)
     * @param {Array} serverConfig.args - 命令参数 (用于 stdio)
     * @param {string} serverConfig.type - 传输类型 ('http' 或 'stdio')
     */
    async connectMcpServer(serverConfig) {
        try {
            const {name, type = 'http', url, command, args = []} = serverConfig;

            console.log(`🔌 正在连接 MCP 服务器: ${name}`);

            // 创建 MCP 客户端
            const client = new Client({
                name: "LLM-MCP-Client",
                version: "1.0.0"
            });

            // 创建传输层
            let transport;
            if (type === 'http') {
                transport = new StreamableHTTPClientTransport(new URL(url));
            } else if (type === 'stdio') {
                transport = new StdioClientTransport({command, args});
            } else {
                throw new Error(`不支持的 MCP 传输类型: ${type}`);
            }

            // 连接服务器
            await client.connect(transport);

            // 存储连接信息
            this.mcpServers.set(name, {
                client,
                transport,
                config: serverConfig,
                connected: true
            });

            console.log(`✅ MCP 服务器连接成功: ${name}`);
            return true;

        } catch (error) {
            console.error(`❌ MCP 服务器连接失败: ${serverConfig.name}`, error);
            return false;
        }
    }

    /**
     * 连接多个 MCP 服务器
     * @param {Array} serverConfigs - MCP 服务器配置数组
     */
    async connectMcpServers(serverConfigs) {
        const promises = serverConfigs.map(async (config) => {
            const success = await this.connectMcpServer(config);
            return {name: config.name, success};
        });
        return await Promise.all(promises);
    }

    /**
     * 获取 MCP 工具列表
     * @param {string} serverName - MCP 服务器名称
     */
    async listMcpTools(serverName) {
        const server = this.mcpServers.get(serverName);
        if (!server || !server.connected) {
            throw new Error(`MCP 服务器未连接: ${serverName}`);
        }

        try {
            return await server.client.listTools();
        } catch (error) {
            console.error(`获取工具列表失败: ${serverName}`, error);
            throw error;
        }
    }

    /**
     * 调用 MCP 工具
     * @param {string} serverName - MCP 服务器名称
     * @param {string} toolName - 工具名称
     * @param {Object} toolArgs - 工具参数
     */
    async callMcpTool(serverName, toolName, toolArgs = {}) {
        const server = this.mcpServers.get(serverName);
        if (!server || !server.connected) {
            throw new Error(`MCP 服务器未连接: ${serverName}`);
        }

        try {
            console.log(`🔧 调用 MCP 工具: ${serverName}.${toolName}`);
            const result = await server.client.callTool({
                name: toolName,
                arguments: toolArgs
            });

            console.log(`✅ MCP 工具调用成功: ${serverName}.${toolName}`);
            return result;
        } catch (error) {
            console.error(`MCP 工具调用失败: ${serverName}.${toolName}`, error);
            throw error;
        }
    }

    /**
     * 生成 MCP 服务器列表描述
     * @private
     * @returns {Promise<string>} 格式化的服务器列表
     */
    async #generateMcpServerList() {
        if (this.mcpServers.size === 0) {
            return '当前没有可用的 MCP 服务器';
        }

        // 并行获取所有服务器的工具列表
        const serverEntries = Array.from(this.mcpServers.entries());
        const serverInfos = await Promise.all(
            serverEntries.map(async ([name, server]) => {
                const description = server.config.description || 'MCP 服务器';
                const tools = await this.listMcpTools(name);
                return `- ${name}: ${description} \n- tools:${JSON.stringify(tools)}`;
            })
        );
        return serverInfos.join('\n');
    }

    /**
     * 生成分析用户意图的提示词
     * @private
     * @returns {Object} 系统提示词对象
     */
    async #generateAnalysisPrompt() {
        const serverList = await this.#generateMcpServerList();

        return {
            role: 'system',
            content: `你是一个智能助手，能够分析用户请求并确定是否需要使用 MCP 工具。

可用的 MCP 服务器和工具：
${serverList}

请分析用户的请求，如果需要用 MCP 工具，请严格按照以下格式回复：
NEED_MCP: {server_name}.{tool_name}
参数: {json_parameters}

如果不需要工具，请直接回复用户的问题。`
        };
    }

    /**
     * 解析 LLM 的分析结果
     * @private
     * @param {string} content - LLM 回复内容
     * @returns {Object|null} 解析结果或 null
     */
    #parseAnalysisResult(content) {
        // 更宽松的正则表达式，支持各种空白字符
        const mcpMatch = content.match(/NEED_MCP:\s*([\w-]+)\.([\w_]+)\s*[\r\n]+参数:\s*({[\s\S]*})/);
        if (!mcpMatch) {
            return null;
        }
        const [, serverName, toolName, paramStr] = mcpMatch;
        try {
            const toolArgs = JSON.parse(paramStr);
            return {serverName, toolName, toolArgs};
        } catch (e) {
            console.error('解析工具参数失败:', e);
            return null;
        }
    }

    /**
     * 构建工具调用后的增强消息
     * @private
     * @param {Array} originalMessages - 原始消息
     * @param {string} serverName - 服务器名称
     * @param {string} toolName - 工具名称
     * @param {Object} toolResult - 工具调用结果
     * @returns {Array} 增强后的消息数组
     */
    #buildEnhancedMessages(originalMessages, serverName, toolName, toolResult) {
        return [
            ...originalMessages,
            {
                role: 'assistant',
                content: `我将使用 ${serverName} 的 ${toolName} 工具来帮助您。`
            },
            {
                role: 'assistant',
                content: [{type: 'text', text: '工具执行结果：'}, {type: 'text', text: JSON.stringify(toolResult)}]
            }
        ];
    }

    /**
     * 与 LLM 和 MCP 工具交互的高级方法
     * @param {Array} messages - 消息数组
     * @param {boolean}summary - 要不要让LLM进行总结，默认为true
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 响应内容 choices:[...](为了兼容性，将字符串响应包装成 OpenAI 格式)
     */
    async chatWithMcpTools(messages, summary = true, options = {}) {
        // 1. 首先用 LLM 分析用户意图和需要的工具
        const analysisPrompt = await this.#generateAnalysisPrompt();
        const analysisMessages = [analysisPrompt, ...messages];
        const analysisContent = await this.llm.chat(analysisMessages, {
            stream: false,
            ...options
        });
        // 为了兼容性，将字符串响应包装成 OpenAI 格式
        const analysis = {
            choices: [{
                message: {
                    content: analysisContent,
                    role: 'assistant'
                }
            }]
        };
        // 2. 解析分析结果
        const mcpRequest = this.#parseAnalysisResult(analysisContent);
        if (mcpRequest) {
            const {serverName, toolName, toolArgs} = mcpRequest;
            try {
                // 工具参数已经在 #parseAnalysisResult 中解析过了，直接使用
                // 3. 调用 MCP 工具
                const toolResult = await this.callMcpTool(serverName, toolName, toolArgs);
                const resultMessage = {
                    message: {
                        content: toolResult,
                        role: 'assistant'
                    }
                };
                if (!summary) {
                    return {
                        choices: [resultMessage]
                    };
                }

                // 4. 构建增强消息并生成最终回复
                const enhancedMessages = this.#buildEnhancedMessages(messages, serverName, toolName, toolResult);
                //console.log(JSON.stringify(enhancedMessages));
                const finalResponse = await this.llm.chat(enhancedMessages, {
                    stream: false,
                    ...options
                });
                // 返回符合 OpenAI 响应格式的对象
                return {
                    choices: [resultMessage, {
                        message: {
                            content: finalResponse,
                            role: 'assistant'
                        }
                    }]
                };
            } catch (toolError) {
                console.error('MCP 工具调用失败:', toolError);
                throw toolError;
            }
        }
        // 不需要 MCP 工具，直接返回分析结果
        return analysis;
    }


    /**
     * 获取所有已连接的 MCP 服务器状态
     */
    getMcpServerStatus() {
        const status = {};
        for (const [name, server] of this.mcpServers) {
            status[name] = {
                connected: server.connected,
                config: server.config
            };
        }
        return status;
    }

    /**
     * 断开 MCP 服务器连接
     * @param {string} serverName - 服务器名称
     */
    async disconnectMcpServer(serverName) {
        const server = this.mcpServers.get(serverName);
        if (server) {
            try {
                await server.client.close();
                server.connected = false;
                this.mcpServers.delete(serverName);
                console.log(`🔌 MCP 服务器已断开: ${serverName}`);
            } catch (error) {
                console.error(`断开 MCP 服务器失败: ${serverName}`, error);
            }
        }
    }

    /**
     * 断开所有 MCP 服务器
     */
    async disconnectAllMcpServers() {
        const disconnectPromises = [];
        for (const [name] of this.mcpServers) {
            disconnectPromises.push(this.disconnectMcpServer(name));
        }
        await Promise.all(disconnectPromises);
    }
}

export default McpClient;