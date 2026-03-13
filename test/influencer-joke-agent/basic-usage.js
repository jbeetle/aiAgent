/**
 * 网红讲笑话Agent - 基本使用示例
 * Basic usage example for the Influencer Joke Agent
 */

import {createInfluencerJokeAgent} from './influencer-joke-agent.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

async function basicUsageExample() {
    try {
        // 检查API密钥
        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) {
            console.error('❌ 请设置DEEPSEEK_API_KEY环境变量');
            console.log('💡 提示：在.env文件中添加 DEEPSEEK_API_KEY=your_api_key');
            process.exit(1);
        }

        console.log('🚀 启动网红讲笑话Agent演示程序...\n');

        // 创建网红讲笑话Agent实例
        const agent = createInfluencerJokeAgent('DeepSeek', 'deepseek-chat', {
            maxIterations: 8,
            verbose: true
        });

        console.log('📋 可用的工具列表：');
        agent.getAvailableTools().forEach((tool, index) => {
            console.log(`  ${index + 1}. ${tool.name}: ${tool.description}`);
        });

        console.log('\n🎯 可用的网红类别：');
        agent.getAvailableCategories().forEach((category, index) => {
            console.log(`  ${index + 1}. ${category}`);
        });

        console.log('\n' + '='.repeat(60));

        // 示例1：随机选择一个网红讲笑话
        console.log('\n🎭 示例1：随机选择网红讲笑话');
        console.log('-'.repeat(40));
        const result1 = await agent.tellJoke();

        if (result1.success) {
            console.log(`\n🎪 笑话内容：\n${result1.joke}`);
            console.log(`\n📊 执行统计：`);
            console.log(`  - 推理迭代次数：${result1.iterations}`);
            console.log(`  - 执行时间：${result1.executionTime}ms`);
        } else {
            console.error(`\n❌ 执行失败：${result1.error}`);
        }

        console.log('\n' + '='.repeat(60));

        // 示例2：选择搞笑类别的网红讲笑话
        console.log('\n🎭 示例2：选择搞笑类别的网红讲笑话');
        console.log('-'.repeat(40));
        const result2 = await agent.tellJoke('搞笑');

        if (result2.success) {
            console.log(`\n🎪 笑话内容：\n${result2.joke}`);
            console.log(`\n📊 执行统计：`);
            console.log(`  - 推理迭代次数：${result2.iterations}`);
            console.log(`  - 执行时间：${result2.executionTime}ms`);
        } else {
            console.error(`\n❌ 执行失败：${result2.error}`);
        }

        console.log('\n' + '='.repeat(60));

        // 示例3：选择美妆类别的网红讲笑话
        console.log('\n🎭 示例3：选择美妆类别的网红讲笑话');
        console.log('-'.repeat(40));
        const result3 = await agent.tellJoke('美妆');

        if (result3.success) {
            console.log(`\n🎪 笑话内容：\n${result3.joke}`);
            console.log(`\n📊 执行统计：`);
            console.log(`  - 推理迭代次数：${result3.iterations}`);
            console.log(`  - 执行时间：${result3.executionTime}ms`);
        } else {
            console.error(`\n❌ 执行失败：${result3.error}`);
        }

        console.log('\n' + '='.repeat(60));

        // 示例4：流式输出模式
        console.log('\n🎭 示例4：流式输出模式（实时显示推理过程）');
        console.log('-'.repeat(40));

        // 定义流式输出回调函数
        const onChunk = (chunk) => {
            if (chunk.type === 'thought') {
                console.log(`🤔 思考：${chunk.content}`);
            } else if (chunk.type === 'action') {
                console.log(`🛠️  行动：${chunk.content}`);
            } else if (chunk.type === 'observation') {
                console.log(`👀 观察：${chunk.content}`);
            } else if (chunk.type === 'final_answer') {
                console.log(`🎪 最终答案：${chunk.content}`);
            }
        };

        const result4 = await agent.tellJokeStream(onChunk, '带货');

        if (result4.success) {
            console.log(`\n📊 流式执行统计：`);
            console.log(`  - 推理迭代次数：${result4.iterations}`);
            console.log(`  - 执行时间：${result4.executionTime}ms`);
        } else {
            console.error(`\n❌ 流式执行失败：${result4.error}`);
        }

        console.log('\n✅ 所有演示完成！');

    } catch (error) {
        console.error('❌ 演示程序执行失败:', error);
        process.exit(1);
    }
}

// 运行演示程序
//basicUsageExample().catch(console.error);
async function simple() {
    console.log('🚀 启动网红讲笑话Agent演示程序...\n');

    // 创建网红讲笑话Agent实例  chat     reasoner
    const agent = createInfluencerJokeAgent('DeepSeek', 'deepseek-reasoner', {
        maxIterations: 5,
        verbose: true
    });

    console.log('📋 可用的工具列表：');
    agent.getAvailableTools().forEach((tool, index) => {
        console.log(`  ${index + 1}. ${tool.name}: ${tool.description}`);
    });

    console.log('\n🎯 可用的网红类别：');
    agent.getAvailableCategories().forEach((category, index) => {
        console.log(`  ${index + 1}. ${category}`);
    });

    console.log('\n' + '='.repeat(60));

    // 示例1：随机选择一个网红讲笑话
    console.log('\n🎭 示例1：随机选择网红讲笑话');
    console.log('-'.repeat(40));
    const result1 = await agent.tellJoke();

    if (result1.success) {
        console.log(`\n🎪 笑话内容：\n${result1.joke}`);
        console.log(`\n📊 执行统计：`);
        console.log(`  - 推理迭代次数：${result1.iterations}`);
    } else {
        console.error(`\n❌ 执行失败：${result1.error}`);
    }
}

async function simple2() {
    try {
        console.log('🚀 启动网红讲笑话Agent演示程序...\n');
        // 创建网红讲笑话Agent实例
        const agent = createInfluencerJokeAgent('DeepSeek', 'deepseek-chat', {
            maxIterations: 8,
            verbose: true
        });
        console.log('📋 可用的工具列表：');
        agent.getAvailableTools().forEach((tool, index) => {
            console.log(`  ${index + 1}. ${tool.name}: ${tool.description}`);
        });

        console.log('\n🎯 可用的网红类别：');
        agent.getAvailableCategories().forEach((category, index) => {
            console.log(`  ${index + 1}. ${category}`);
        });

        console.log('\n' + '='.repeat(60));
        // 示例4：流式输出模式
        console.log('\n🎭 示例4：流式输出模式（实时显示推理过程）');
        console.log('-'.repeat(40));

        // 定义流式输出回调函数
        const onChunk = (chunk) => {
            if (chunk.type === 'thought') {
                console.log(`🤔 思考：${chunk.content}`);
            } else if (chunk.type === 'action') {
                console.log(`🛠️  行动：${chunk.content}`);
            } else if (chunk.type === 'observation') {
                console.log(`👀 观察：${chunk.content}`);
            } else if (chunk.type === 'final_answer') {
                console.log(`🎪 最终答案：${chunk.content}`);
            }
        };

        const result4 = await agent.tellJokeStream(onChunk, '农产品');

        if (result4.success) {
            console.log(`\n📊 流式执行统计：`);
            console.log(`  - 推理迭代次数：${result4.iterations}`);
            console.log(`  - 执行时间：${result4.executionTime}ms`);
        } else {
            console.error(`\n❌ 流式执行失败：${result4.error}`);
        }

        console.log('\n✅ 所有演示完成！');

    } catch (error) {
        console.error('❌ 演示程序执行失败:', error);
        process.exit(1);
    }
}

simple2().catch(console.error);