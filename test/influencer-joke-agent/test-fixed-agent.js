/**
 * 测试修复版网红讲笑话Agent
 * Test Fixed Influencer Joke Agent
 */

import {createFixedInfluencerJokeAgent} from './fixed-influencer-joke-agent.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

async function testFixedAgent() {
  try {
    console.log('🧪 测试修复版网红讲笑话Agent...\n');

    // 检查API密钥
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('❌ 请设置DEEPSEEK_API_KEY环境变量');
      return;
    }

    // 创建修复版Agent实例
    const agent = createFixedInfluencerJokeAgent('DeepSeek', 'deepseek-chat', {
      maxIterations: 8,
      verbose: true
    });

    console.log('📋 可用的工具列表：');
    agent.getAvailableTools().forEach((tool, index) => {
      console.log(`  ${index + 1}. ${tool.name}: ${tool.description}`);
    });

    console.log('\n🎯 测试1：随机选择网红讲笑话');
    console.log('-'.repeat(40));

    // 使用较短的超时时间进行测试
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('测试超时')), 30000)
    );

    const result1 = await Promise.race([
      agent.tellJoke(),
      timeoutPromise
    ]);

    if (result1.success) {
      console.log(`\n✅ 测试成功！`);
      console.log(`🎪 笑话内容：\n${result1.joke}`);
      console.log(`\n📊 执行统计：`);
      console.log(`  - 推理迭代次数：${result1.iterations}`);
      console.log(`  - 执行时间：${result1.executionTime}ms`);
    } else {
      console.log(`\n❌ 测试失败：${result1.error}`);
    }

    console.log('\n' + '='.repeat(60));

    console.log('\n🎯 测试2：选择搞笑类别网红');
    console.log('-'.repeat(40));

    const result2 = await Promise.race([
      agent.tellJoke('搞笑'),
      timeoutPromise
    ]);

    if (result2.success) {
      console.log(`\n✅ 搞笑类别测试成功！`);
      console.log(`🎪 笑话内容：\n${result2.joke}`);
    } else {
      console.log(`\n❌ 搞笑类别测试失败：${result2.error}`);
    }

    console.log('\n✅ 修复版Agent测试完成！');

  } catch (error) {
    console.error('❌ 测试执行失败:', error.message);
  }
}

// 运行测试
testFixedAgent().catch(console.error);