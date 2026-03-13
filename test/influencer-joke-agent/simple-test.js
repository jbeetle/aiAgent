/**
 * 网红讲笑话Agent - 简单测试脚本
 * Simple test script for the Influencer Joke Agent
 */

import {createInfluencerJokeAgent} from './influencer-joke-agent.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

async function simpleTest() {
  try {
    // 检查API密钥
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('❌ 请设置DEEPSEEK_API_KEY环境变量');
      console.log('💡 提示：在.env文件中添加 DEEPSEEK_API_KEY=your_api_key');
      return;
    }

    console.log('🧪 开始简单测试...\n');

    // 创建Agent实例
    const agent = createInfluencerJokeAgent('DeepSeek', 'deepseek-chat', {
      maxIterations: 6,
      verbose: false  // 关闭详细输出，简化测试
    });

    console.log('🎯 测试1：随机选择网红讲笑话');
    const result = await agent.tellJoke();

    if (result.success) {
      console.log('✅ 测试成功！');
      console.log(`🎪 笑话内容：\n${result.joke}`);
      console.log(`\n📊 执行统计：迭代${result.iterations}次，耗时${result.executionTime}ms`);
    } else {
      console.log('❌ 测试失败：', result.error);
    }

    console.log('\n🎯 测试2：选择搞笑类别网红');
    const result2 = await agent.tellJoke('搞笑');

    if (result2.success) {
      console.log('✅ 搞笑类别测试成功！');
      console.log(`🎪 笑话内容：\n${result2.joke}`);
    } else {
      console.log('❌ 搞笑类别测试失败：', result2.error);
    }

    console.log('\n✅ 简单测试完成！');

  } catch (error) {
    console.error('❌ 测试执行失败:', error.message);
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  simpleTest().catch(console.error);
}