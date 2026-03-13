/**
 * Simple Agent Test - Test ReActAgent with basic tasks
 */

import {Agent, Tools} from '../src/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('============================================');
    console.log('   Simple Agent Test');
    console.log('============================================');

    if (!process.env.DEEPSEEK_API_KEY) {
        console.log('Please set DEEPSEEK_API_KEY environment variable');
        return;
    }

    const tools = Tools.getBuiltInTools();
    console.log('\nAvailable tools:', tools.map(t => t.name).join(', '));

    const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', tools, {
        verbose: true,
        maxIterations: 5
    });

    // Test 1: Simple calculation
    console.log('\n========================================');
    console.log('   Test 1: Simple Calculation');
    console.log('========================================\n');

    try {
        const result1 = await agent.run('What is 123 * 456 + 789?');
        console.log('\nAnswer:', result1.answer);
        console.log('Iterations:', result1.iterations);
    } catch (error) {
        console.error('Test 1 failed:', error.message);
    }

    // Reset agent for next test
    agent.reset();

    // Test 2: Current time
    console.log('\n========================================');
    console.log('   Test 2: Current Time');
    console.log('========================================\n');

    try {
        const result2 = await agent.run('What is the current time?');
        console.log('\nAnswer:', result2.answer);
        console.log('Iterations:', result2.iterations);
    } catch (error) {
        console.error('Test 2 failed:', error.message);
    }

    // Reset agent for next test
    agent.reset();

    // Test 3: Simple code execution
    console.log('\n========================================');
    console.log('   Test 3: Code Execution');
    console.log('========================================\n');

    try {
        const result3 = await agent.run('Generate the first 10 Fibonacci numbers using Python');
        console.log('\nAnswer:', result3.answer);
        console.log('Iterations:', result3.iterations);
    } catch (error) {
        console.error('Test 3 failed:', error.message);
    }

    console.log('\n============================================');
    console.log('   All tests completed');
    console.log('============================================');
}

main().catch(console.error);
