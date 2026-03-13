/**
 * Basic Usage Example for ReAct Agent Framework
 *
 * This example demonstrates how to create and use a ReAct agent
 * with built-in tools to solve mathematical problems.
 */
import {Agent, Tools} from '../src/index.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function basicUsageExample() {
    console.log('🤖 ReAct Agent Framework - Basic Usage Example\n');
    //console.log('vendors:', getRegisteredVendors());

    try {
        // Create a ReAct agent with all built-in tools
        const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', Tools.getBuiltInTools(), {
            verbose: true, // Enable detailed logging
            maxIterations: 5
        });

        console.log('✅ Agent created successfully!\n');
        console.log('🔧 Available tools:', ['calculator', 'random_number', 'advanced_calculator'].join(', '));
        console.log('');

        // Example 1: Simple calculation
        console.log('📊 Example 1: Simple calculation');
        console.log('Question: What is 15 * 8 + 42?\n');

        const result1 = await agent.run('15 * 8 + 42是多少呀？算出次结果再加5，最后是多少？');
        console.log('✨ Answer:', result1.answer);
        console.log('🔄 Iterations:', result1.iterations);
        console.log('');
    } catch (error) {
        console.error('❌ Error running examples:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
        }
    }
}

// Run the example if this file is executed directly
basicUsageExample().catch(console.error);
