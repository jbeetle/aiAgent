#!/usr/bin/env node

/**
 * Simple test for streaming functionality
 */

import {Agent, Tools} from '../src/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function testStreaming() {
    console.log('🧪 Testing ReAct Agent Streaming...\n');


    try {
        const tools = Tools.getBuiltInTools();
        // Use the correct format for the ReActAgent constructor
        const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', tools, {
            verbose: false,
            maxIterations: 3
        });

        console.log('✅ Agent initialized with streaming support');
        console.log('📋 Available tools:', tools.map(t => t.name).join(', '));
        console.log('\n🌊 Testing streaming functionality...\n');

        // Test the streaming method with a simple callback
        await agent.runStream('Calculate 15 * 8 + 42', (chunk) => {
            //console.log('type->:', chunk.type);
            //console.log('-----');
            switch (chunk.type) {
                case 'start':
                    console.log('🚀 Starting stream...');
                    break;
                case 'iteration_start':
                    console.log(`\n📍 Iteration ${chunk.iteration}/${chunk.maxIterations}`);
                    break;
                case 'thinking':
                    process.stdout.write(chunk.content);
                    break;
                case 'parsed':
                    console.log('\n📊 Parsed response:');
                    if (chunk.thought) console.log(`   Thought: ${chunk.thought}`);
                    if (chunk.action) console.log(`   Action: ${chunk.action}`);
                    if (chunk.finalAnswer) console.log(`   Final: ${chunk.finalAnswer}`);
                    break;
                case 'tool_start':
                    console.log(`⚙️  Tool: ${chunk.tool}`);
                    break;
                case 'tool_result':
                    console.log(`📤 Result: ${chunk.result}`);
                    break;
                case 'complete':
                    console.log('\n✅ Stream complete!');
                    console.log(`📝 Final answer: ${chunk.result.answer}`);
                    break;
                case 'error':
                    console.error('❌ Error:', chunk.error);
                    break;
            }
        });

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run test
testStreaming().catch(console.error);