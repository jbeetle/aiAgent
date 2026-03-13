/**
 * 调试提示词生成
 * Debug prompt generation
 */

import { Agent } from '../src/index.js';
import { influencerTools } from './influencer-joke-agent/influencer-tools.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

async function debugPrompt() {
  try {
    console.log('🔍 调试提示词生成...\n');

    // 创建ReActAgent实例来检查提示词
    const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', influencerTools, {
      maxIterations: 1,
      verbose: true
    });

    // 手动调用createSystemPrompt来查看生成的提示词
    const systemPrompt = agent.createSystemPrompt();

    console.log('📝 生成的系统提示词:');
    console.log('='.repeat(60));
    console.log(systemPrompt);
    console.log('='.repeat(60));

    console.log('\n📋 工具列表验证:');
    console.log('可用工具数量:', influencerTools.length);
    influencerTools.forEach((tool, index) => {
      console.log(`${index + 1}. ${tool.name}: ${tool.description}`);
      console.log(`   参数:`, JSON.stringify(tool.parameters, null, 2));
    });

    // 测试一个简单的查询来查看实际行为
    console.log('\n🧪 测试简单查询:');
    console.log('查询: 选择一个搞笑网红并讲个笑话');

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '选择一个搞笑网红并讲个笑话' }
    ];

    console.log('\n📤 发送给LLM的消息:');
    console.log(JSON.stringify(messages, null, 2));

  } catch (error) {
    console.error('❌ 调试失败:', error);
  }
}

// 运行调试
debugPrompt().catch(console.error);