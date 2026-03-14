/**
 * 网红讲笑话Agent - 修复版，使用更严格的ReAct格式
 * Fixed Social Media Influencer Joke-Telling Agent with Strict ReAct Format
 */

import {Agent} from '../../src/index.js';
import {influencerTools} from './influencer-tools.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 创建自定义的严格ReAct提示词
 */
function createStrictReActPrompt(tools) {
    const toolDescriptions = tools.map(tool => {
        const params = tool.parameters ? JSON.stringify(tool.parameters, null, 2) : '{}';
        return `${tool.name}: ${tool.description}
参数: ${params}`;
    }).join('\n\n');

    return `You are a helpful AI assistant that MUST use the ReAct (Reasoning and Acting) framework EXACTLY as specified. You have access to the following tools:

${toolDescriptions}

CRITICAL INSTRUCTIONS:
1. You MUST follow the EXACT format shown below - no variations allowed
2. You MUST use the tools provided - you cannot simulate or pretend to use them
3. You MUST start with "Thought:" and end with "Final Answer:"
4. You MUST use the exact Chinese tool names as specified above

REQUIRED FORMAT - USE THIS EXACTLY:
Thought: [Your reasoning about what to do next]
Action: [The exact tool name from the available tools]
Action Input: [JSON parameters for the tool]
Observation: [Wait for the tool result - you will receive this]

Thought: [Your reasoning about what to do next]
Action: Final Answer
Action Input: [Your final response]

EXAMPLE WITH INFLUENCER TOOLS:

User: "选择一个搞笑网红并讲个笑话"

Thought: I need to first select a funny influencer using the 网红选取 tool
Action: 网红选取
Action Input: {"category": "搞笑"}
Observation: {"success": true, "data": {"姓名": "papi酱", "昵称": "低配版苏菲玛索", "平台": "抖音/B站", "粉丝数": "5000万+", "专业领域": "搞笑短视频", "人物性格": "毒舌吐槽，语速飞快", "背景介绍": "中央戏剧学院导演系毕业，以吐槽社会现象的短视频走红"}}

Thought: Now I have papi酱's information. I can create a joke based on her fast-talking style and sarcastic personality
Action: Final Answer
Action Input: "papi酱去相亲，对方说：'我喜欢温柔安静的女孩。' papi酱瞬间开启机关枪模式：'温柔？安静？你知道我视频多少播放量吗？你知道我语速多快吗？你知道...' 对方弱弱地说：'我现在知道了，告辞！'"

NOW YOUR TASK:
You are a professional influencer joke creation assistant. Your workflow MUST be:

1. First, use the "网红选取" tool to select an influencer (use specific category if requested)
2. Analyze the influencer's background information, personality traits, and professional field
3. Create a relevant joke based on the influencer's unique personality, catchphrases, and behavioral characteristics
4. The joke should fit the influencer's persona and can be playful but not malicious

Joke creation principles:
- Combine the influencer's real characteristics and internet memes
- Can tease their iconic behaviors or catchphrases
- Keep it humorous and fun, avoid vulgar content
- Make fans smile knowingly when they hear it

REMEMBER: You MUST use the tools. You cannot simulate tool usage. You MUST wait for the Observation after each Action.

STOPPING CRITERIA:
- After you have selected an influencer and analyzed their background, create your joke
- Use "Final Answer" as the Action when you are ready to provide the joke
- Do NOT keep calling tools indefinitely - provide the final joke after your analysis
- Typically you should: 1) Select influencer → 2) Get background info → 3) Provide final joke

Begin!`;
}

/**
 * 修复版网红讲笑话Agent类
 */
export class FixedInfluencerJokeAgent {
  constructor(vendor = 'DeepSeek', model = 'deepseek-chat', config = {}) {

    // 默认配置
    const defaultConfig = {
      maxIterations: 8,
      verbose: true
    };

    // 合并配置
    this.config = { ...defaultConfig, ...config };
    this.tools = influencerTools;

    // 创建自定义系统提示词
    const systemPrompt = createStrictReActPrompt(influencerTools);

    // 创建ReActAgent实例
    this.agent = new Agent.ReActAgent(vendor, model, influencerTools, {
      ...this.config,
      systemPrompt: systemPrompt
    });
  }

  /**
   * 运行网红讲笑话任务
   */
  async tellJoke(category = null) {
    try {
      let query;
      if (category) {
        query = `请选择一个${category}类别的网红，分析他的背景特征，然后创作一个相关的笑话。必须使用工具完成。`;
      } else {
        query = '请随机选择一个网红，分析他的背景特征，然后创作一个相关的笑话。必须使用工具完成。';
      }

      console.log('🎭 网红讲笑话Agent开始工作...');
      console.log(`📝 任务：${query}`);

      const result = await this.agent.run(query);

      console.log('\n✅ 笑话创作完成！');
      return {
        success: true,
        joke: result.answer,
        reasoning: result.reasoning,
        iterations: result.iterations,
        executionTime: result.executionTime
      };

    } catch (error) {
      console.error('❌ 网红讲笑话Agent执行失败:', error);
      return {
        success: false,
        error: error.message,
        joke: null
      };
    }
  }

  /**
   * 获取可用的网红类别列表
   */
  getAvailableCategories() {
    return ['美妆', '搞笑', '带货', '游戏', '美食', '时尚', '科技', '农产品', '传统文化'];
  }

  /**
   * 获取所有可用的网红工具
   */
  getAvailableTools() {
    return influencerTools.map(tool => ({
      name: tool.name,
      description: tool.description
    }));
  }
}

/**
 * 创建修复版网红讲笑话Agent的便捷函数
 */
export function createFixedInfluencerJokeAgent(vendor = 'DeepSeek', model = 'deepseek-chat', config = {}) {
  return new FixedInfluencerJokeAgent(vendor, model, config);
}

// 默认导出
export default {
  FixedInfluencerJokeAgent,
  createFixedInfluencerJokeAgent,
  createStrictReActPrompt
};