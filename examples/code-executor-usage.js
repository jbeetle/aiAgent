/**
 * Code Executor 工具使用示例
 *
 * 本示例展示如何使用代码执行工具让AI智能体动态编写和执行代码
 */

import {Agent, Models, Tools} from '../src/index.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 示例1：直接使用代码执行工具
 */
async function example1_directCodeExecution() {
    console.log('\n=== 示例1：直接执行代码 ===\n');

    // 直接调用代码执行工具
    const code = `
const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const sum = data.reduce((a, b) => a + b, 0);
const avg = sum / data.length;
console.log(JSON.stringify({ sum, avg, count: data.length }, null, 2));
`;

    try {
        const result = await Tools.codeExecutorTool.handler({
            code,
            language: 'nodejs',
            description: '计算数组平均值'
        });
        console.log('执行结果:', result);
    } catch (error) {
        console.error('执行失败:', error.message);
    }
}

/**
 * 示例2：使用代码生成工具获取模板
 */
async function example2_codeGeneration() {
    console.log('\n=== 示例2：生成代码模板 ===\n');

    try {
        const template = await Tools.codeGeneratorTool.handler({
            task: 'math_compute',
            language: 'python',
            requirements: '计算一组数字的统计信息'
        });
        console.log('生成的模板:');
        console.log(template.template);
    } catch (error) {
        console.error('生成失败:', error.message);
    }
}

/**
 * 示例3：使用 inputs 传递数据
 */
async function example3_withInputs() {
    console.log('\n=== 示例3：使用 inputs 传递数据 ===\n');

    const code = `
// 使用 INPUTS 变量访问传入的数据
const numbers = INPUTS.numbers || [];
const multiplier = INPUTS.multiplier || 1;

const result = numbers.map(n => n * multiplier);
console.log('原始数据:', numbers);
console.log('乘以', multiplier, '后:', result);
`;

    try {
        const result = await Tools.codeExecutorTool.handler({
            code,
            language: 'nodejs',
            description: '处理输入数据',
            inputs: {
                numbers: [1, 2, 3, 4, 5],
                multiplier: 10
            }
        });
        console.log('输出:', result.stdout);
    } catch (error) {
        console.error('执行失败:', error.message);
    }
}

/**
 * 示例4：执行 Python 代码
 */
async function example4_pythonCode() {
    console.log('\n=== 示例4：执行 Python 代码 ===\n');

    const code = `
import json
import statistics

# 使用 INPUTS 变量访问传入的数据
data = INPUTS.get('scores', [])

if data:
    result = {
        'count': len(data),
        'sum': sum(data),
        'mean': statistics.mean(data),
        'median': statistics.median(data),
        'stdev': statistics.stdev(data) if len(data) > 1 else 0
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
else:
    print('没有数据')
`;

    try {
        const result = await Tools.codeExecutorTool.handler({
            code,
            language: 'python',
            description: '计算成绩统计信息',
            inputs: {
                scores: [85, 92, 78, 96, 88, 91, 73, 89]
            }
        });
        console.log('输出:');
        console.log(result.stdout);
    } catch (error) {
        console.error('执行失败:', error.message);
    }
}

/**
 * 示例5：在 ReActAgent 中使用代码执行工具
 */
async function example5_agentWithCodeExecutor() {
    console.log('\n=== 示例5：ReActAgent 使用代码执行工具 ===\n');

    if (!process.env.DEEPSEEK_API_KEY) {
        console.log('请设置 DEEPSEEK_API_KEY 环境变量来运行此示例');
        return;
    }

    // 创建工具（包含代码执行工具）
    const tools = Tools.getBuiltInTools();
    console.log('可用工具:', tools.map(t => t.name));

    // 创建 Agent
    const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', tools, {
        verbose: true,
        maxIterations: 5
    });

    console.log('\n运行 Agent...');

    // 让 Agent 自己编写代码来解决问题
    const result = await agent.run('帮我计算斐波那契数列的前20项，并找出其中的偶数有哪些');
    console.log('\n最终答案:', result.answer);
}

/**
 * 示例6：代码安全检查测试
 */
async function example6_securityCheck() {
    console.log('\n=== 示例6：代码安全检查 ===\n');

    const dangerousCode = `
const fs = require('fs');
fs.unlinkSync('/important/file.txt');
`;

    try {
        const result = await Tools.codeExecutorTool.handler({
            code: dangerousCode,
            language: 'nodejs',
            description: '危险操作测试'
        });
        console.log('结果:', result);
    } catch (error) {
        console.log('安全检查生效:', error.message);
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('============================================');
    console.log('   Code Executor 工具使用示例');
    console.log('============================================');

    try {
        // 运行示例
        await example1_directCodeExecution();
        await example2_codeGeneration();
        await example3_withInputs();
        await example4_pythonCode();
        // await example5_agentWithCodeExecutor(); // 需要配置 LLM API Key
        // await example6_securityCheck(); // 安全测试

        console.log('\n============================================');
        console.log('   示例运行完成');
        console.log('============================================');
    } catch (error) {
        console.error('运行示例时发生错误:', error);
    }
}

// 运行主函数
main();

/**
 * 使用说明：
 *
 * 1. 确保已安装依赖: npm install
 * 2. 运行示例: node examples/code-executor-usage.js
 *
 * 智能编码工具核心概念：
 *
 * - code_executor: 动态执行 Node.js 或 Python 代码
 * - code_generator: 生成常见任务的代码模板
 * - inputs: 传递给代码的输入数据（通过 INPUTS 变量访问）
 * - timeout: 执行超时时间（默认30秒，最大2分钟）
 *
 * 安全检查：
 * - 禁止 rm -rf / 等危险命令
 * - 禁止无限循环 (while(true))
 * - 禁止执行系统命令 (child_process)
 * - 代码长度限制 100KB
 */
