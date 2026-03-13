#!/usr/bin/env node

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

    // Check if API key is available
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        console.error('❌ Error: OPENAI_API_KEY not found in environment variables');
        console.log('Please create a .env file with: OPENAI_API_KEY=your_key_here');
        process.exit(1);
    }

    try {
        // Create a ReAct agent with all built-in tools
        const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', Tools.getBuiltInTools());

        console.log('✅ Agent created successfully!\n');
        console.log('🔧 Available tools:', ['calculator', 'random_number', 'advanced_calculator'].join(', '));
        console.log('');

        // Example 1: Simple calculation
        console.log('📊 Example 1: Simple calculation');
        console.log('Question: What is 15 * 8 + 42?\n');

        const result1 = await agent.run('What is 15 * 8 + 42?');
        console.log('✨ Answer:', result1.answer);
        console.log('🔄 Iterations:', result1.iterations);
        console.log('');

        // Example 2: Complex calculation
        console.log('📊 Example 2: Complex calculation');
        console.log('Question: Calculate (25 * 4) + (100 / 5) - 30\n');

        const result2 = await agent.run('Calculate (25 * 4) + (100 / 5) - 30');
        console.log('✨ Answer:', result2.answer);
        console.log('🔄 Iterations:', result2.iterations);
        console.log('');

        // Example 3: Random number generation
        console.log('🎲 Example 3: Random number generation');
        console.log('Question: Generate a random number between 1 and 100\n');

        const result3 = await agent.run('Generate a random number between 1 and 100');
        console.log('✨ Answer:', result3.answer);
        console.log('🔄 Iterations:', result3.iterations);
        console.log('');

        // Example 4: Advanced operations
        console.log('🔬 Example 4: Advanced mathematical operations');
        console.log('Question: What is 2 to the power of 8?\n');

        const result4 = await agent.run('What is 2 to the power of 8?');
        console.log('✨ Answer:', result4.answer);
        console.log('🔄 Iterations:', result4.iterations);
        console.log('');

        // Example 5: Multi-step reasoning
        console.log('🧠 Example 5: Multi-step reasoning');
        console.log('Question: If I have 150 apples and I want to divide them equally among 15 people, then give each person 3 more apples, how many apples does each person get?\n');

        const result5 = await agent.run('If I have 150 apples and I want to divide them equally among 15 people, then give each person 3 more apples, how many apples does each person get?');
        console.log('✨ Answer:', result5.answer);
        console.log('🔄 Iterations:', result5.iterations);
        console.log('');

        console.log('🎉 All examples completed successfully!');

    } catch (error) {
        console.error('❌ Error running examples:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
        }
    }
}

// Run the example if this file is executed directly
basicUsageExample().catch(console.error);
