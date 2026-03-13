/**
 * 网红讲笑话Agent - 使用ReActAgent实现
 * Social Media Influencer Joke-Telling Agent
 *
 * 功能：
 * 1. 使用网红选取工具随机选择一个网红
 * 2. 分析该网红的背景和人物特征
 * 3. 根据人物特征创作一个相关的笑话
 */

import {Agent} from '../../src/index.js';
import {influencerTools} from './influencer-tools.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 网红讲笑话Agent类
 */
export class InfluencerJokeAgent {
    constructor(vendor = 'Moonshot', model = 'kimi-k2-turbo-preview', config = {}) {

        // 默认配置
        const defaultConfig = {
            maxIterations: 8,
            verbose: true,
            systemPrompt: `You are a professional social media influencer joke creation assistant. You MUST follow the ReAct (Reasoning and Acting) framework EXACTLY as shown in the examples.

Your workflow MUST be:

1. First, use the "网红选取" (influencer selection) tool to select an influencer
2. Analyze the influencer's background information, personality traits, and professional field
3. Create a relevant joke based on the influencer's unique personality, catchphrases, and behavioral characteristics
4. The joke should fit the influencer's persona and can be playful but not malicious

Joke creation principles:
- Combine the influencer's real characteristics and internet memes
- Can tease their iconic behaviors or catchphrases
- Keep it humorous and fun, avoid vulgar content
- Make fans smile knowingly when they hear it

CRITICAL FORMAT REQUIREMENTS:
You MUST use this EXACT format for EVERY response:

Thought: [Your reasoning about what to do next]
Action: [The exact tool name from the available tools]
Action Input: [JSON parameters for the tool]
Observation: [Wait for the tool result]

Thought: [Your reasoning about what to do next]
Action: Final Answer
Action Input: [Your final joke response]

Example:
Thought: I need to select a funny influencer first
Action: 网红选取
Action Input: {"category": "搞笑"}
Observation: {"success": true, "data": {"姓名": "papi酱", ...}}

Thought: Now I have papi酱's information, I can create a joke based on her fast-talking style and sarcastic personality
Action: Final Answer
Action Input: "papi酱去相亲，对方说：'我喜欢温柔安静的女孩。' papi酱瞬间开启机关枪模式：'温柔？安静？你知道我视频多少播放量吗？你知道我语速多快吗？你知道...' 对方弱弱地说：'我现在知道了，告辞！'"

DO NOT use natural language descriptions like "I used the tool" - use the EXACT format above.

Available influencers for jokes:
- 李佳琦: Can tease his "O买噶" and exaggerated sales style
- 罗永浩: Can tease his "工匠精神" and debt repayment experience
- papi酱: Can tease her sarcastic rants and fast speech
- 李子柒: Can tease her slow-paced rural lifestyle`
        };

        // 合并配置
        //this.config = {...defaultConfig, ...config};

        // 创建ReActAgent实例
        //this.agent = new Agent.ReActAgent(vendor, model, influencerTools, this.config);
        this.agent = new Agent.ReActAgent(vendor, model, influencerTools, config);
    }

    /**
     * 运行网红讲笑话任务
     * @param {null} category - 可选的网红类别
     * @returns {Promise<Object>} 包含笑话和执行过程的响应
     */
    async tellJoke(category = null) {
        try {
            let query;
            if (category) {
                query = `请选择一个${category}类别的网红，分析他的背景特征，然后创作一个相关的笑话。必须使用工具完成。`;
            } else {
                query = '从网红列表中任意选一名网红，分析他的背景特征，然后创作一个相关的笑话。必须使用工具完成。';
            }

            console.log('🎭 网红讲笑话Agent开始工作...');
            console.log(`📝 任务：${query}`);

            const result = await this.agent.run(query);
            console.log(result);
            console.log('\n✅ 笑话创作完成！');
            return {
                success: true,
                joke: result.answer,
                iterations: result.iterations
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
     * 流式运行网红讲笑话任务
     * @param {Function} onChunk - 处理流式输出的回调函数
     * @param {string} category - 可选的网红类别
     * @returns {Promise<Object>} 包含笑话和执行过程的响应
     */
    async tellJokeStream(onChunk, category = null) {
        try {
            let query;
            if (category) {
                query = `请选择一个${category}类别的网红，分析他的背景特征，然后创作一个相关的笑话。要求网红及其相关背景数据必须通过提供的工具用获取`;
            } else {
                query = '请随机选择一个网红，分析他的背景特征，然后创作一个相关的笑话。';
            }

            console.log('🎭 网红讲笑话Agent开始工作（流式模式）...');

            const result = await this.agent.runStream(query, onChunk);

            console.log('\n✅ 流式笑话创作完成！');
            return {
                success: true,
                joke: result.answer,
                reasoning: result.reasoning,
                iterations: result.iterations,
                executionTime: result.executionTime
            };

        } catch (error) {
            console.error('❌ 网红讲笑话Agent流式执行失败:', error);
            return {
                success: false,
                error: error.message,
                joke: null
            };
        }
    }

    /**
     * 获取可用的网红类别列表
     * @returns {Array} 网红类别数组
     */
    getAvailableCategories() {
        return ['美妆', '搞笑', '带货', '游戏', '美食', '时尚', '科技', '农产品', '传统文化'];
    }

    /**
     * 获取所有可用的网红工具
     * @returns {Array} 工具列表
     */
    getAvailableTools() {
        return influencerTools.map(tool => ({
            name: tool.name,
            description: tool.description
        }));
    }
}

/**
 * 创建网红讲笑话Agent的便捷函数
 * @param {string} vendor - API提供商 (默认: DeepSeek)
 * @param {string} model - 模型名称 (默认: deepseek-chat)
 * @param {Object} config - 可选配置
 * @returns {InfluencerJokeAgent} 网红讲笑话Agent实例
 */
export function createInfluencerJokeAgent(vendor = 'DeepSeek', model = 'deepseek-chat', config = {}) {
    return new InfluencerJokeAgent(vendor, model, config);
}

// 默认导出
export default {
    InfluencerJokeAgent,
    createInfluencerJokeAgent
};