/**
 * IntentRecognizer 测试示例
 * 测试增强的意图识别系统
 */

import {IntentRecognizer} from '../bin/intent.recognizer.js';
import {getBuiltInTools} from '../src/agents/tools/tool.js';

// 模拟 LLM 客户端
const mockLLMClient = {
    model: 'test-model',
    getRawClient: () => ({
        chat: {
            completions: {
                create: async (params) => {
                    console.log('[Mock LLM] 接收到请求，模拟响应...');
                    // 模拟 LLM 响应
                    return {
                        choices: [{
                            message: {
                                content: JSON.stringify({
                                    needs_tools: true,
                                    confidence: 'high',
                                    reason: 'mock_llm_response',
                                    suggested_tools: ['calculator'],
                                    tool_analysis: [
                                        {tool: 'calculator', relevance: 0.9, reason: 'math_calculation'}
                                    ]
                                })
                            }
                        }]
                    };
                }
            }
        }
    })
};

// 测试用例
const testCases = [
    // 高置信度工具调用
    { input: '帮我计算 25 乘以 4', expected: 'needsTools: true, confidence: high' },
    { input: 'calculate 15 + 30', expected: 'needsTools: true, confidence: high' },
    { input: '执行这段代码', expected: 'needsTools: true' },

    // 高置信度闲聊
    { input: '你好', expected: 'needsTools: false, confidence: high' },
    { input: '谢谢', expected: 'needsTools: false, confidence: high' },
    { input: 'hello world', expected: 'needsTools: false, confidence: high' },

    // 中置信度（需要语义匹配或 LLM 确认）
    { input: '分析一下今天的天气数据', expected: 'needsTools: true/false' },
    { input: '生成一个快速排序算法', expected: 'needsTools: true' },

    // 模糊输入
    { input: '帮我处理一下这个', expected: 'low confidence' },
];

async function runTests() {
    console.log('=== IntentRecognizer 测试 ===\n');

    // 获取内置工具
    const tools = getBuiltInTools();
    console.log(`已加载 ${tools.length} 个工具:`);
    tools.forEach(t => console.log(`  - ${t.name}: ${t.description}`));
    console.log();

    // 创建 IntentRecognizer 实例
    const recognizer = new IntentRecognizer(mockLLMClient, 'test-model', {
        mode: 'balanced',
        useToolDescriptions: true,
        llmConfirmationThreshold: 'medium',
        enableSemanticMatching: true
    }, true);

    // 注册工具
    recognizer.registerTools(tools);

    console.log('--- 测试关键词匹配 ---\n');

    for (const testCase of testCases) {
        console.log(`\n测试: "${testCase.input}"`);
        console.log(`期望: ${testCase.expected}`);

        const result = await recognizer.recognize(testCase.input);
        console.log(`结果: needsTools=${result.needsTools}, confidence=${result.confidence}, reason=${result.reason}`);

        if (result.suggestedTools && result.suggestedTools.length > 0) {
            console.log(`建议工具: [${result.suggestedTools.join(', ')}]`);
        }

        if (result.toolAnalysis && result.toolAnalysis.length > 0) {
            console.log('工具分析:');
            result.toolAnalysis.forEach(ta => {
                console.log(`  - ${ta.tool}: relevance=${ta.relevance}, ${ta.reason}`);
            });
        }

        console.log('---');
    }

    // 测试不同模式
    console.log('\n\n=== 测试不同模式 ===\n');

    const testInput = '帮我看看这个';

    const modes = ['aggressive', 'balanced', 'conservative'];
    for (const mode of modes) {
        recognizer.updateConfig({ mode });
        const result = await recognizer.recognize(testInput);
        console.log(`模式 "${mode}": needsTools=${result.needsTools}, reason=${result.reason}`);
    }

    // 测试配置获取
    console.log('\n\n=== 当前配置 ===');
    console.log(recognizer.getConfig());

    console.log('\n=== 测试完成 ===');
}

runTests().catch(console.error);
