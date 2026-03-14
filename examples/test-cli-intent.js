#!/usr/bin/env node

/**
 * CLI Intent Recognition Test
 * 模拟 CLI 行为测试意图识别系统
 */

import {Agent, Models, Tools} from '../src/index.js';
import {BaseLLMService} from '../src/agents/conversation/index.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// ANSI 颜色代码
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

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    thinking: (msg) => console.log(`${colors.cyan}🤔${colors.reset} ${msg}`),
    tool: (msg) => console.log(`${colors.yellow}🔧${colors.reset} ${msg}`),
    result: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
    answer: (msg) => console.log(`${colors.bright}${msg}${colors.reset}`),
};

// 测试用例
const testCases = [
    // 高置信度工具调用
    { input: '帮我计算 25 乘以 4', expected: 'tool', description: '数学计算' },
    { input: '15 + 30 等于几', expected: 'tool', description: '数学问题' },

    // 高置信度闲聊
    { input: '你好', expected: 'direct', description: '问候' },
    { input: '谢谢你的帮助', expected: 'direct', description: '感谢' },
    { input: '再见', expected: 'direct', description: '告别' },

    // 中置信度（可能需要 LLM 确认）
    { input: '分析一下今天的天气数据', expected: 'any', description: '分析请求' },
    { input: '生成一个快速排序算法', expected: 'tool', description: '代码生成' },
    { input: '读取 README.md 文件', expected: 'tool', description: '文件读取' },

    // 模糊输入
    { input: '帮我处理一下这个', expected: 'any', description: '模糊请求' },
    { input: '看看这个', expected: 'any', description: '不明确意图' },
];

async function runTest() {
    console.log(`\n${colors.bright}${colors.cyan}=== CLI Intent Recognition Test ===${colors.reset}\n`);

    // 检查 API key
    if (!process.env.DEEPSEEK_API_KEY) {
        log.error('未找到 DEEPSEEK_API_KEY 环境变量');
        console.log('请在 .env 文件中设置 DEEPSEEK_API_KEY');
        process.exit(1);
    }

    // 创建 LLM 客户端
    log.info('创建 LLM 客户端...');
    const llmClient = Models.createModel('DeepSeek', 'deepseek-chat');

    // 获取工具
    const tools = Tools.getBuiltInTools();
    log.info(`加载了 ${tools.length} 个工具`);

    // 测试三种模式
    const modes = ['balanced', 'aggressive', 'conservative'];

    for (const mode of modes) {
        console.log(`\n${colors.bright}${colors.magenta}【测试模式: ${mode.toUpperCase()}】${colors.reset}\n`);

        // 创建 BaseLLMService
        const baseLLMService = new BaseLLMService(llmClient, {
            verbose: false,
            maxMessages: 20,
            tokenLimit: 1024 * 64,
            useIntentRecognition: true,
            language: 'cn',
            intentRecognition: {
                mode: mode,
                useToolDescriptions: true,
                llmConfirmationThreshold: 'medium'
            }
        });

        // 创建 ReActAgent
        const reactAgent = new Agent.ReActAgent(
            'DeepSeek',
            'deepseek-chat',
            tools,
            { verbose: false, maxIterations: 5 }
        );

        // 关联
        baseLLMService.setReActAgent(reactAgent);
        baseLLMService.registerTools(tools);

        // 显示配置
        const config = baseLLMService.getIntentRecognitionConfig();
        log.info(`意图识别模式: ${config.mode}`);

        // 运行测试用例
        let passed = 0;
        let failed = 0;

        for (const testCase of testCases) {
            process.stdout.write(`测试: "${testCase.input}" (${testCase.description})... `);

            try {
                // 只进行意图识别，不实际执行
                const intent = await baseLLMService.getIntentRecognitionConfig();

                // 使用 IntentRecognizer 直接测试
                const { IntentRecognizer } = await import('../src/agents/conversation/index.js');
                const recognizer = new IntentRecognizer(llmClient, 'deepseek-chat', {
                    mode: mode,
                    useToolDescriptions: true,
                    llmConfirmationThreshold: 'high' // 测试中减少 LLM 调用
                });
                recognizer.registerTools(tools);

                const result = await recognizer.recognize(testCase.input);

                // 验证结果
                let testPassed = false;
                if (testCase.expected === 'any') {
                    testPassed = true; // 任何结果都接受
                } else if (testCase.expected === 'tool') {
                    testPassed = result.needsTools === true;
                } else if (testCase.expected === 'direct') {
                    testPassed = result.needsTools === false;
                }

                if (testPassed) {
                    console.log(`${colors.green}✓${colors.reset} ${colors.dim}(needsTools=${result.needsTools}, confidence=${result.confidence})${colors.reset}`);
                    passed++;
                } else {
                    console.log(`${colors.red}✗ 期望 ${testCase.expected}, 实际 needsTools=${result.needsTools}${colors.reset}`);
                    failed++;
                }

                // 显示详细信息（如果 verbose）
                if (process.env.VERBOSE) {
                    console.log(`    reason: ${result.reason}`);
                    if (result.suggestedTools?.length) {
                        console.log(`    suggestedTools: [${result.suggestedTools.join(', ')}]`);
                    }
                }
            } catch (error) {
                console.log(`${colors.red}✗ 错误: ${error.message}${colors.reset}`);
                failed++;
            }
        }

        console.log(`\n${colors.bright}结果: ${colors.green}${passed} 通过${colors.reset}, ${colors.red}${failed} 失败${colors.reset}`);
    }

    console.log(`\n${colors.bright}${colors.cyan}=== Test Complete ===${colors.reset}\n`);
}

// 运行测试
runTest().catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
});
