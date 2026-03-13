#!/usr/bin/env node

/**
 * Streaming Usage Example for ReAct Agent Framework
 *
 * This example demonstrates how to use the new streaming functionality
 * with real-time updates for better user experience.
 */

import {Agent, Tools} from '../src/index.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function streamingUsageExample() {
    console.log('🌊 ReAct Agent Framework - Streaming Usage Example\n');


    try {
        // Create a ReAct agent with streaming enabled
        const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', Tools.getBuiltInTools(), {
            verbose: false,
            maxIterations: 5
        });

        console.log('✅ Agent created successfully!\n');
        console.log('🌊 Starting streaming response for complex calculation...\n');

        // Example 1: Complex mathematical calculation with streaming
        console.log('📊 Example 1: Complex calculation with streaming');
        console.log('Question: Calculate (25 * 4) + (100 / 5) - 30 and then multiply by 2\n');

        await runWithStreaming(agent, 'Calculate (25 * 4) + (100 / 5) - 30 and then multiply by 2');

        console.log('\n' + '='.repeat(50) + '\n');

        // Example 2: Multi-step reasoning with streaming
        console.log('🧠 Example 2: Multi-step reasoning with streaming');
        console.log('Question: If I have 150 apples and I want to divide them equally among 15 people, then give each person 3 more apples, how many apples does each person get?\n');

        await runWithStreaming(agent, 'If I have 150 apples and I want to divide them equally among 15 people, then give each person 3 more apples, how many apples does each person get?');

        console.log('\n' + '='.repeat(50) + '\n');

        // Example 3: Advanced operations with streaming
        console.log('🔬 Example 3: Advanced operations with streaming');
        console.log('Question: Calculate 2 to the power of 8, then find the square root of the result\n');

        await runWithStreaming(agent, 'Calculate 2 to the power of 8, then find the square root of the result');

    } catch (error) {
        console.error('❌ Error running streaming examples:', error.message);
    }
}

/**
 * Helper function to run agent with streaming and display progress
 * @param {ReActAgent} agent - The ReAct agent instance
 * @param {string} query - The query to process
 */
async function runWithStreaming(agent, query) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        let lastUpdate = startTime;

        const progressBar = {
            current: 0,
            total: 0,
            chars: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
        };

        function onChunk(chunk) {
            const now = Date.now();
            const elapsed = now - startTime;

            switch (chunk.type) {
                case 'start':
                    console.log('🚀 Starting stream...');
                    break;

                case 'iteration_start':
                    console.log(`\n📍 Iteration ${chunk.iteration}/${chunk.maxIterations}`);
                    progressBar.total = chunk.maxIterations;
                    progressBar.current = chunk.iteration;
                    break;

                case 'thinking':
                    // Show real-time thinking with simple animation
                    if (now - lastUpdate > 100) { // Update every 100ms
                        const spinner = progressBar.chars[Math.floor(elapsed / 100) % progressBar.chars.length];
                        process.stdout.write(`\r${spinner} Thinking... `);
                        lastUpdate = now;
                    }
                    break;

                case 'parsed':
                    process.stdout.write('\r\n'); // Clear line

                    if (chunk.thought) {
                        console.log(`💭 Thought: ${chunk.thought}`);
                    }

                    if (chunk.action) {
                        console.log(`🔧 Action: ${chunk.action}`);
                    }

                    if (chunk.actionInput) {
                        console.log(`📥 Input: ${JSON.stringify(chunk.actionInput)}`);
                    }

                    if (chunk.finalAnswer) {
                        console.log(`✅ Final Answer: ${chunk.finalAnswer}`);
                    }
                    break;

                case 'tool_start':
                    console.log(`⚙️  Executing tool: ${chunk.tool}`);
                    break;

                case 'tool_result':
                    console.log(`📤 Tool result: ${chunk.result}`);
                    break;

                case 'final_answer':
                    console.log(`\n🎯 Answer: ${chunk.message}`);
                    break;

                case 'complete':
                    const totalTime = Date.now() - startTime;
                    console.log(`\n✅ Completed in ${totalTime}ms with ${chunk.result.iterations} iterations`);
                    resolve(chunk.result);
                    break;

                case 'error':
                    console.error(`❌ Error: ${chunk.error}`);
                    reject(new Error(chunk.error));
                    break;

                case 'max_iterations':
                    console.log(`⏰ ${chunk.message}`);
                    break;
            }
        }

        agent.runStream(query, onChunk).catch(reject);
    });
}

// Run the example if this file is executed directly

streamingUsageExample().catch(console.error);
