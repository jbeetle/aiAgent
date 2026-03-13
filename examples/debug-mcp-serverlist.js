import {McpClient} from '../src/agents/models/mcp.client.js';
import {Models} from '../src/index.js';
import dotenv from 'dotenv';

dotenv.config();

// 创建 LLM 客户端
const llmClient = Models.createModel('DeepSeek', 'deepseek-chat');

// 创建 MCP 客户端进行调试
const client = new McpClient(llmClient);

async function debugMcpServerList() {
    console.log('🐛 调试 #generateMcpServerList() 方法');
    console.log('='.repeat(60));

    try {
        // 1. 检查初始状态
        console.log('1️⃣ 初始状态:');
        console.log('- mcpServers Map 大小:', client.mcpServers.size);
        console.log('- mcpServers Map 内容:', client.mcpServers);

        // 2. 通过公有方法间接测试私有方法
        console.log('\n2️⃣ 测试生成分析提示词（会调用 #generateMcpServerList）:');
        // 使用 chatWithMcpTools 方法，它会间接调用私有方法
        const testMessages = [
            {
                role: 'user',
                content: '生成一个饼图，数据：产品A:30, 产品B:70'
            }
        ];

        try {
            // 这会触发 analysisPrompt 的生成
            const response = await client.chatWithMcpTools(testMessages, {max_tokens: 1024 * 10});
            console.log('响应内容预览:');
            console.log(response);
        } catch (error) {
            console.log('chatWithMcpTools 错误:', error.message);
        }

        // 3. 连接 MCP 服务器
        console.log('\n3️⃣ 连接 MCP 服务器:');
        //测试先部署，地址：https://www.modelscope.cn/mcp/servers/hustcc/MCP-ECharts
        const connectResult = await client.connectMcpServer({
            name: 'MCP-ECharts',
            type: 'http',
            url: 'https://mcp.api-inference.modelscope.net/5291cb3802254d/mcp',
            description: 'MCP ECharts 图表生成服务器'
        });

        console.log('连接结果:', connectResult);
        console.log('连接后的 mcpServers Map 大小:', client.mcpServers.size);

        // 4. 再次测试 chatWithMcpTools
        console.log('\n4️⃣ 再次测试 chatWithMcpTools:');
        try {
            const response2 = await client.chatWithMcpTools(testMessages, {max_tokens: 100});
            console.log('第二次响应内容预览:');
            console.log(response2.choices[0].message.content.substring(0, 300) + '...');
        } catch (error) {
            console.log('第二次 chatWithMcpTools 错误:', error.message);
        }

    } catch (error) {
        console.error('❌ 调试失败:', error);
    } finally {
        await client.disconnectAllMcpServers();
        console.log('\n✅ 调试完成');
    }
}

// 运行调试
debugMcpServerList().catch(console.error);