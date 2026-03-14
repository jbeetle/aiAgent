#!/usr/bin/env node

/**
 * CLI Intent Recognition Demo
 * 非交互式演示意图识别功能
 */

import {Agent, Models, Tools} from '../src/index.js';
import {BaseLLMService} from '../src/agents/conversation/index.js';
import dotenv from 'dotenv';

dotenv.config();

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

function printHeader(title) {
    console.log(`\n${colors.bright}${colors.cyan}=== ${title} ===${colors.reset}\n`);
}

function printResult(input, result, mode) {
    const modeColor = mode === 'aggressive' ? colors.yellow :
                      mode === 'conservative' ? colors.green : colors.blue;

    console.log(`${colors.dim}>${colors.reset} "${input}"`);
    console.log(`  模式: ${modeColor}${mode}${colors.reset}`);
    console.log(`  需要工具: ${result.needsTools ? colors.green + '是' : colors.red + '否'}${colors.reset}`);
    console.log(`  置信度: ${result.confidence}`);
    console.log(`  原因: ${colors.dim}${result.reason}${colors.reset}`);

    if (result.suggestedTools?.length) {
        console.log(`  建议工具: [${result.suggestedTools.join(', ')}]`);
    }
    console.log();
}

async function runDemo() {
    printHeader('ReAct Agent CLI - Intent Recognition Demo');

    if (!process.env.DEEPSEEK_API_KEY) {
        console.log(`${colors.red}错误: 未设置 DEEPSEEK_API_KEY 环境变量${colors.reset}`);
        console.log('请在 .env 文件中添加: DEEPSEEK_API_KEY=your_key');
        process.exit(1);
    }

    // 创建 LLM 客户端
    const llmClient = Models.createModel('DeepSeek', 'deepseek-chat');
    const tools = Tools.getBuiltInTools();

    console.log(`${colors.blue}ℹ${colors.reset} 已加载 ${tools.length} 个工具`);
    console.log(`${colors.dim}工具列表: ${tools.map(t => t.name).join(', ')}${colors.reset}`);

    // 测试用例
    const testInputs = [
        '你好',
        '帮我计算 25 乘以 4',
        '读取 README.md 文件',
        '生成一个快速排序算法',
        '分析一下今天的天气数据',
        '帮我处理一下这个',
        '看看这个',
    ];

    const modes = ['balanced', 'aggressive', 'conservative'];

    for (const mode of modes) {
        printHeader(`模式: ${mode.toUpperCase()}`);

        const service = new BaseLLMService(llmClient, {
            verbose: false,
            useIntentRecognition: true,
            language: 'cn',
            intentRecognition: {
                mode: mode,
                useToolDescriptions: true,
                llmConfirmationThreshold: 'high' // 减少 LLM 调用以加快测试
            }
        });

        const reactAgent = new Agent.ReActAgent(
            'DeepSeek',
            'deepseek-chat',
            tools,
            { verbose: false, maxIterations: 5 }
        );

        service.setReActAgent(reactAgent);
        service.registerTools(tools);

        for (const input of testInputs) {
            // 使用 IntentRecognizer 直接测试
            const { IntentRecognizer } = await import('../src/agents/conversation/index.js');
            const recognizer = new IntentRecognizer(llmClient, 'deepseek-chat', {
                mode: mode,
                useToolDescriptions: true,
                llmConfirmationThreshold: 'high'
            });
            recognizer.registerTools(tools);

            const result = await recognizer.recognize(input);
            printResult(input, result, mode);
        }
    }

    printHeader('Demo Complete');
    console.log(`${colors.dim}要体验交互式 CLI，请运行: npm run cli${colors.reset}\n`);
}

runDemo().catch(console.error);
