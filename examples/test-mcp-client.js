#!/usr/bin/env node
/**
 * MCP 客户端集成测试
 * 演示如何使用官方的 @modelcontextprotocol/sdk 连接 MCP 服务器
 * 绕过 OpenAI 的 Responses API 限制
 */

import {McpClient} from '../src/agents/models/mcp.client.js';
import dotenv from 'dotenv';

dotenv.config();

// 创建 MCP 增强版 LLM 客户端
const llmMcpClient = new McpClient(
    process.env.DEEPSEEK_API_KEY,
    'https://api.deepseek.com/v1',
    'deepseek-chat'
);

/**
 * 测试 MCP-ECharts 服务器
 */
async function testMcpEcharts() {
    console.log('🎯 MCP 客户端集成测试\n');
    console.log('='.repeat(60));

    try {
        // 1. 连接 MCP-ECharts 服务器
        //https://www.modelscope.cn/mcp/servers/hustcc/MCP-ECharts
        console.log('🔌 步骤 1: 连接 MCP-ECharts 服务器');
        const connectResult = await llmMcpClient.connectMcpServer({
            name: 'MCP-ECharts',
            type: 'http',
            url: 'https://mcp.api-inference.modelscope.net/88e13a6c54a94c/mcp',
            description: 'MCP ECharts 图表生成服务器'
        });

        if (!connectResult) {
            console.log('❌ 无法连接 MCP 服务器，测试终止');
            return;
        }

        console.log('✅ MCP 服务器连接成功\n');

        // 2. 获取可用工具列表
        console.log('🔍 步骤 2: 获取可用工具列表');
        const tools = await llmMcpClient.listMcpTools('MCP-ECharts');
        console.log('工具列表响应:', JSON.stringify(tools, null, 2));

        if (tools && tools.tools && Array.isArray(tools.tools)) {
            console.log('可用工具:');
            tools.tools.forEach(tool => {
                console.log(`  - ${tool.name}: ${tool.description}`);
            });
        } else {
            console.log('未获取到工具列表或格式不符');
        }
        console.log('');

        // 3. 准备图表数据
        console.log('📊 步骤 3: 准备图表数据');
        const chartData = {
            title: '月度支出分析',
            categories: [
                { name: '房租', value: 3000, color: '#FF6B6B' },
                { name: '餐饮', value: 1500, color: '#4ECDC4' },
                { name: '交通', value: 800, color: '#45B7D1' },
                { name: '娱乐', value: 1200, color: '#96CEB4' },
                { name: '其他', value: 500, color: '#FFEAA7' }
            ]
        };

        console.log('数据准备完成');
        console.log('');

        // 4. 直接调用 MCP 工具
        console.log('🔧 步骤 4: 直接调用 MCP 工具');

        // 尝试调用 generate_chart 工具
        try {
            const toolResult = await llmMcpClient.callMcpTool('MCP-ECharts', 'generate_chart', {
                chart_type: 'pie',
                title: chartData.title,
                data: chartData.categories,
                show_legend: true,
                responsive: true
            });

            console.log('✅ MCP 工具调用成功！');
            console.log('生成的图表代码:');
            console.log('='.repeat(60));
            console.log(JSON.stringify(toolResult, null, 2));
            console.log('='.repeat(60));
            console.log('');

        } catch (toolError) {
            console.log('❌ 工具调用失败:', toolError.message);
            console.log('🔄 尝试其他工具...\n');

            // 尝试其他可能的工具名称
            const possibleTools = ['create_chart', 'build_chart', 'echarts', 'pie_chart'];

            for (const toolName of possibleTools) {
                try {
                    console.log(`尝试工具: ${toolName}`);
                    const result = await llmMcpClient.callMcpTool('MCP-ECharts', toolName, {
                        type: 'pie',
                        title: chartData.title,
                        data: chartData.categories
                    });

                    console.log(`✅ 工具 ${toolName} 调用成功！`);
                    console.log('结果:', JSON.stringify(result, null, 2));
                    break;
                } catch (e) {
                    console.log(`❌ 工具 ${toolName} 不可用`);
                }
            }
        }

        // 5. 使用增强版聊天方法
        console.log('💬 步骤 5: 使用增强版聊天方法');
        const messages = [
            {
                role: 'user',
                content: `请帮我生成一个饼图展示以下数据：\n${chartData.categories.map(cat =>
                    `${cat.name}: ${cat.value}元`
                ).join('\n')}\n\n图表标题："${chartData.title}"\n要求：显示百分比，有图例，支持悬停效果`
            }
        ];

        try {
            const response = await llmMcpClient.chatWithMcpTools(messages, {
                temperature: 0.7,
                max_tokens: 2000
            });

            console.log('✅ 增强版聊天调用成功！');
            console.log('回复内容:');
            console.log(response.choices[0].message.content);
            console.log('');

        } catch (chatError) {
            console.log('❌ 增强版聊天失败:', chatError.message);
            console.log('🔄 使用标准聊天模式...');

            const standardResponse = await llmMcpClient.chat(messages, {
                temperature: 0.7,
                max_tokens: 2000
            });

            console.log('标准聊天回复:');
            console.log(standardResponse.choices[0].message.content);
        }

        // 6. 获取服务器状态
        console.log('📊 步骤 6: 获取服务器状态');
        const status = llmMcpClient.getMcpServerStatus();
        console.log('MCP 服务器状态:', JSON.stringify(status, null, 2));
        console.log('');

        console.log('🎉 MCP 客户端集成测试完成！');

    } catch (error) {
        console.error('❌ 测试失败:', error);
    } finally {
        // 断开所有 MCP 连接
        console.log('\n🔌 断开 MCP 连接...');
        await llmMcpClient.disconnectAllMcpServers();
        console.log('✅ 清理完成');
    }
}

/**
 * 测试多个 MCP 服务器
 */
async function testMultipleMcpServers() {
    console.log('🎯 多 MCP 服务器测试\n');
    console.log('='.repeat(60));

    // 配置多个 MCP 服务器
    const serverConfigs = [
        {
            name: 'MCP-ECharts',
            type: 'http',
            url: 'https://mcp.api-inference.modelscope.net/88e13a6c54a94c/mcp',
            description: 'ECharts 图表生成'
        },
        {
            name: 'MCP-Weather',
            type: 'http',
            url: 'https://mcp.api-inference.modelscope.net/weather/mcp',
            description: '天气查询服务'
        }
    ];

    try {
        // 连接所有 MCP 服务器
        console.log('🔌 连接多个 MCP 服务器...');
        const results = await llmMcpClient.connectMcpServers(serverConfigs);

        results.forEach(result => {
            console.log(`${result.name}: ${result.success ? '✅ 成功' : '❌ 失败'}`);
        });

        // 测试多服务器对话
        const messages = [
            {
                role: 'user',
                content: '请帮我生成一个天气数据的图表，显示本周的气温变化。'
            }
        ];

        const response = await llmMcpClient.chatWithMcpTools(messages);
        console.log('\n💬 多服务器对话结果:');
        console.log(response.choices[0].message.content);

    } catch (error) {
        console.error('❌ 多服务器测试失败:', error);
    } finally {
        await llmMcpClient.disconnectAllMcpServers();
    }
}

/**
 * 测试 stdio 传输方式的 MCP 服务器
 */
async function testStdioMcpServer() {
    console.log('🎯 Stdio MCP 服务器测试\n');
    console.log('='.repeat(60));

    try {
        // 连接本地的 stdio MCP 服务器
        console.log('🔌 连接本地 Stdio MCP 服务器...');
        const connectResult = await llmMcpClient.connectMcpServer({
            name: 'Local-Echo',
            type: 'stdio',
            command: 'node',
            args: ['echo-server.js'], // 假设有一个 echo MCP 服务器
            description: '本地 Echo MCP 服务器'
        });

        if (connectResult) {
            console.log('✅ Stdio MCP 服务器连接成功');

            // 测试 echo 工具
            const echoResult = await llmMcpClient.callMcpTool('Local-Echo', 'echo', {
                message: 'Hello MCP!'
            });

            console.log('Echo 结果:', echoResult);
        }

    } catch (error) {
        console.log('❌ Stdio MCP 服务器测试失败:', error.message);
        console.log('💡 提示: 需要先启动本地的 MCP 服务器');
    }
}

// 主函数
async function main() {
    console.log('🚀 MCP 客户端集成测试开始\n');

    // 运行不同的测试
    await testMcpEcharts();

    console.log('\n' + '='.repeat(60) + '\n');

    // 可选：测试多服务器
    // await testMultipleMcpServers();

    // 可选：测试 stdio 服务器
    // await testStdioMcpServer();

    console.log('\n🏁 所有测试完成！');
}

// 运行测试
main().catch(console.error);