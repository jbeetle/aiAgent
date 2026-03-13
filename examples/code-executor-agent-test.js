/**
 * Code Executor 工具与 ReActAgent 集成测试
 */

import {Agent, Models, Tools} from '../src/index.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

async function main() {
    console.log('============================================');
    console.log('   Code Executor + ReActAgent 集成测试');
    console.log('============================================');

    // 检查环境变量
    if (!process.env.DEEPSEEK_API_KEY) {
        console.log('请设置 DEEPSEEK_API_KEY 环境变量来运行此测试');
        console.log('示例: set DEEPSEEK_API_KEY=sk-your-key');
        return;
    }

    // 创建工具（包含代码执行工具）
    const tools = Tools.getBuiltInTools();
    console.log('\n可用工具:');
    tools.forEach(t => console.log(`  - ${t.name}: ${t.description.substring(0, 50)}...`));

    // 创建 Agent
    const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', tools, {
        verbose: true,
        maxIterations: 8
    });

    console.log('\n============================================');
    console.log('   测试1：让 Agent 编写代码计算斐波那契数列');
    console.log('============================================\n');

    try {
        const result1 = await agent.run('帮我计算斐波那契数列的前20项，并告诉我其中有多少个偶数');
        console.log('\n最终结果:', result1.answer);
        console.log('迭代次数:', result1.iterations);
    } catch (error) {
        console.error('测试1失败:', error.message);
    }

    console.log('\n============================================');
    console.log('   测试2：让 Agent 处理数据');
    console.log('============================================\n');

    try {
        const result2 = await agent.run('我有一个数字数组：[23, 56, 12, 89, 34, 67, 91, 45, 78, 11]，请帮我计算平均值、中位数、最大值和最小值');
        console.log('\n最终结果:', result2.answer);
        console.log('迭代次数:', result2.iterations);
    } catch (error) {
        console.error('测试2失败:', error.message);
    }

    console.log('\n============================================');
    console.log('   测试完成');
    console.log('============================================');
}

// 运行主函数
main().catch(console.error);
