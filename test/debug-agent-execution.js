/**
 * 调试Agent执行过程
 * Debug Agent Execution Process
 */

import {Agent} from '../src/index.js';
import {influencerTools} from './influencer-joke-agent/influencer-tools.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

async function debugAgentExecution() {
  try {
    console.log('🔍 调试Agent执行过程...\n');

    // 创建ReActAgent实例，启用详细日志
    const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', influencerTools, {
      maxIterations: 8,
      verbose: true,  // 启用详细日志
      systemPrompt: `你是一个专业的网红笑话创作助手。你的工作流程是：

1. 首先使用"网红选取"工具选择一个网红（如果用户有类别要求，按类别选择）
2. 分析该网红的背景信息、人物特征和专业领域
3. 根据网红的独特性格、口头禅、行为特征创作一个相关的笑话
4. 笑话要贴近网红的人设，可以调侃但不能恶意攻击

创作笑话的原则：
- 结合网红的真实特点和网络梗
- 可以调侃其标志性行为或口头禅
- 保持幽默风趣，避免低俗内容
- 让粉丝听了会会心一笑

你必须使用提供的工具来完成任务，不能虚构网红信息。`
    });

    console.log('🎯 测试查询: 选择一个搞笑网红并讲个笑话');
    console.log('='.repeat(60));

    // 执行查询
    const result = await agent.run('选择一个搞笑网红并讲个笑话');

    console.log('\n📊 执行结果:');
    console.log('成功:', result.success);
    console.log('迭代次数:', result.iterations);
    if (result.success) {
      console.log('最终答案:', result.answer);
    } else {
      console.log('错误:', result.error);
    }

    // 打印完整的对话历史以查看工具使用情况
    console.log('\n📝 完整的对话历史:');
    console.log('='.repeat(60));
    result.history.forEach((message, index) => {
      console.log(`\n消息 ${index + 1} (${message.role}):`);
      console.log(message.content);
    });

  } catch (error) {
    console.error('❌ 调试执行失败:', error);
  }
}

// 运行调试
debugAgentExecution().catch(console.error);