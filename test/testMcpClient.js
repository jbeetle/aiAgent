import McpClient from '../src/agents/models/mcp.client.js';
import dotenv from 'dotenv';
import {Models} from "../src/index.js";

dotenv.config();
const llmClient = Models.createModel('DeepSeek', 'deepseek-chat');
// 创建 MCP 增强客户端

const client = new McpClient(llmClient);

// 连接 MCP 服务器
//测试先部署，地址：https://www.modelscope.cn/mcp/servers/hustcc/MCP-ECharts
await client.connectMcpServer({
    name: 'MCP-ECharts',
    type: 'http',
    url: 'https://mcp.api-inference.modelscope.net/5291cb3802254d/mcp'
});
const pieData = {
    data: [
        {category: '房租', value: 3000},
        {category: '餐饮', value: 1500}
    ],
    title: '月度支出分析'
};
//console.log(await client.listMcpTools('MCP-ECharts'));
// 调用图表生成工具
const result = await client.callMcpTool('MCP-ECharts', 'generate_pie_chart', pieData);
console.log(result);
// 使用 chatWithMcpTools
console.log('=========');
const result2 = await client.chatWithMcpTools([{
    role: 'user',
    content: [{type: 'text', text: JSON.stringify(pieData)}, {
        type: 'text',
        text: `'请帮我生成一个饼图，要求如下：\n1. 图表标题为"月度支出分析"\n2. 使用指定的颜色方案\n3. 显示金额和百分比\n4. 添加图例\n5. 支持鼠标悬停显示详细信息\n6. 响应式设计'`
    }]
}]);
console.log(JSON.stringify(result2));
await client.disconnectAllMcpServers();
console.log('done');