/**
 * 网红讲笑话Agent - 自定义扩展示例
 * Custom Extension Example for Influencer Joke Agent
 *
 * 本示例展示如何：
 * 1. 创建新的网红工具
 * 2. 扩展现有功能
 * 3. 集成到Agent中
 */

import {Agent, Tools} from '../../src/index.js';
import {influencerTools} from './influencer-tools.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 创建网红对比工具 - 比较两个网红的特点
 */
const influencerComparisonTool = Tools.createCustomTool(
  '网红对比',
  '比较两个网红的特点，返回他们的相似点和不同点，用于创作对比类笑话',
  {
    type: 'object',
    properties: {
      name1: {
        type: 'string',
        description: '第一个网红的姓名或昵称',
        minLength: 2,
        maxLength: 20
      },
      name2: {
        type: 'string',
        description: '第二个网红的姓名或昵称',
        minLength: 2,
        maxLength: 20
      }
    },
    required: ['name1', 'name2']
  },
  async (args) => {
    try {
      // 这里简化处理，实际应用中应该从数据库查询详细信息
      const mockInfluencerData = {
        '李佳琦': {
          specialty: '美妆带货',
          personality: '热情夸张',
          platform: '淘宝直播',
          signature: 'O买噶'
        },
        '罗永浩': {
          specialty: '科技带货',
          personality: '幽默自嘲',
          platform: '抖音',
          signature: '工匠精神'
        },
        'papi酱': {
          specialty: '搞笑短视频',
          personality: '毒舌吐槽',
          platform: '抖音/B站',
          signature: '语速飞快'
        }
      };

      const influencer1 = mockInfluencerData[args.name1] || { specialty: '未知', personality: '未知', platform: '未知', signature: '未知' };
      const influencer2 = mockInfluencerData[args.name2] || { specialty: '未知', personality: '未知', platform: '未知', signature: '未知' };

      const similarities = [];
      const differences = [];

      // 分析相似点
      if (influencer1.platform === influencer2.platform) {
        similarities.push(`都在${influencer1.platform}平台活跃`);
      }
      if (influencer1.specialty.includes('带货') && influencer2.specialty.includes('带货')) {
        similarities.push('都是带货主播');
      }
      if (influencer1.personality.includes('幽默') && influencer2.personality.includes('幽默')) {
        similarities.push('都有幽默感');
      }

      // 分析不同点
      if (influencer1.specialty !== influencer2.specialty) {
        differences.push(`${args.name1}专注${influencer1.specialty}，而${args.name2}专注${influencer2.specialty}`);
      }
      if (influencer1.personality !== influencer2.personality) {
        differences.push(`${args.name1}的风格是${influencer1.personality}，${args.name2}是${influencer2.personality}`);
      }
      if (influencer1.signature !== influencer2.signature) {
        differences.push(`${args.name1}的标志性特点是"${influencer1.signature}"，${args.name2}是"${influencer2.signature}"`);
      }

      return {
        success: true,
        data: {
          网红1: args.name1,
          网红2: args.name2,
          相似点: similarities.length > 0 ? similarities : ['风格差异很大，各有特色'],
          不同点: differences.length > 0 ? differences : ['都是独特的个体']
        },
        message: `成功对比${args.name1}和${args.name2}的特点`
      };

    } catch (error) {
      return {
        success: false,
        error: `网红对比失败：${error.message}`,
        data: null
      };
    }
  }
);

/**
 * 创建网红流行语生成工具
 */
const influencerCatchphraseTool = Tools.createCustomTool(
  '网红流行语',
  '根据网红的特点生成符合其风格的流行语或口头禅，用于创作笑话',
  {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: '网红姓名或昵称',
        minLength: 2,
        maxLength: 20
      },
      scenario: {
        type: 'string',
        description: '使用场景，如"推销"、"吐槽"、"鼓励"等',
        default: '推销'
      }
    },
    required: ['name']
  },
  async (args) => {
    try {
      const mockCatchphrases = {
        '李佳琦': {
          推销: ['O买噶！买它买它买它！', '所有女生，听我指挥！', '这也太好看了吧！'],
          吐槽: ['这个设计我服了', '颜色也太丑了吧'],
          鼓励: '相信自己，你值得拥有最好的！'
        },
        '罗永浩': {
          推销: ['这是东半球最好的产品', '我们不是为了赚钱，是为了改变世界'],
          吐槽: ['这个行业需要一些工匠精神', '这都是些什么乱七八糟的'],
          鼓励: '生命不息，折腾不止！'
        },
        'papi酱': {
          推销: ['我不允许你们还没拥有这个', '这个真的太好用了，我哭死'],
          吐槽: ['我受不了了', '这是什么人间疾苦'],
          鼓励: '姐妹们，支棱起来！'
        }
      };

      const influencerPhrases = mockCatchphrases[args.name] || { 推销: ['不错哦'], 吐槽: ['还行吧'], 鼓励: '加油' };
      const scenario = args.scenario || '推销';

      let phrases;
      if (scenario === '推销') {
        phrases = influencerPhrases.推销 || ['这个产品不错'];
      } else if (scenario === '吐槽') {
        phrases = influencerPhrases.吐槽 || ['这个问题不大'];
      } else if (scenario === '鼓励') {
        phrases = [influencerPhrases.鼓励] || ['加油'];
      } else {
        phrases = influencerPhrases.推销 || ['试试这个'];
      }

      // 随机选择一个流行语
      const randomPhrase = Array.isArray(phrases) ?
        phrases[Math.floor(Math.random() * phrases.length)] : phrases;

      return {
        success: true,
        data: {
          网红: args.name,
          场景: scenario,
          流行语: randomPhrase,
          风格: `${args.name}的典型风格`
        },
        message: `成功生成${args.name}的${scenario}流行语`
      };

    } catch (error) {
      return {
        success: false,
        error: `流行语生成失败：${error.message}`,
        data: null
      };
    }
  }
);

/**
 * 扩展的网红讲笑话Agent类
 */
export class ExtendedInfluencerJokeAgent {
  constructor(vendor = 'DeepSeek', model = 'deepseek-chat', config = {}) {
    // 创建扩展的工具集合
    const extendedTools = [
      ...influencerTools,
      influencerComparisonTool,
      influencerCatchphraseTool
    ];

    // 默认配置
    const defaultConfig = {
      maxIterations: 10,
      verbose: true,
      systemPrompt: `你是一个专业的网红笑话创作助手，具备以下增强功能：

1. 网红对比分析：可以比较两个网红的异同点
2. 流行语生成：可以根据场景生成网红的典型流行语
3. 多维度笑话创作：结合对比、流行语等元素创作更丰富的笑话

你的工作流程是：
1. 选择网红（单个或多个对比）
2. 分析特点和背景
3. 生成流行语或对比分析
4. 创作相关笑话

笑话类型可以包括：
- 单人特色笑话
- 对比类笑话
- 流行语改编笑话
- 跨平台互动笑话

保持幽默风趣，避免恶意攻击，让粉丝感到亲切有趣。`
    };

    // 合并配置
    this.config = { ...defaultConfig, ...config };

    // 创建ReActAgent实例
    this.agent = new Agent.ReActAgent(vendor, model, extendedTools, this.config);
  }

  /**
   * 创作对比类笑话
   */
  async createComparisonJoke(name1, name2) {
    try {
      const query = `请对比${name1}和${name2}的特点，然后创作一个关于他们互动的幽默笑话。`;

      console.log(`🎭 开始创作${name1}和${name2}的对比笑话...`);

      const result = await this.agent.run(query);

      return {
        success: true,
        joke: result.answer,
        iterations: result.iterations,
        executionTime: result.executionTime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 创作流行语笑话
   */
  async createCatchphraseJoke(name, scenario = '推销') {
    try {
      const query = `请生成${name}在${scenario}场景下的流行语，然后创作一个相关的幽默笑话。`;

      console.log(`🎭 开始创作${name}的${scenario}流行语笑话...`);

      const result = await this.agent.run(query);

      return {
        success: true,
        joke: result.answer,
        iterations: result.iterations,
        executionTime: result.executionTime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取所有可用工具
   */
  getAllTools() {
    return [
      ...influencerTools,
      {
        name: '网红对比',
        description: '比较两个网红的特点，返回相似点和不同点'
      },
      {
        name: '网红流行语',
        description: '根据网红特点生成符合其风格的流行语或口头禅'
      }
    ];
  }
}

/**
 * 创建扩展版网红讲笑话Agent的便捷函数
 */
export function createExtendedInfluencerJokeAgent(vendor = 'DeepSeek', model = 'deepseek-chat', config = {}) {
  return new ExtendedInfluencerJokeAgent(vendor, model, config);
}

/**
 * 演示函数
 */
async function runExtendedDemo() {
  try {
    console.log('🚀 启动扩展版网红讲笑话Agent演示...\n');

    // 检查API密钥
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('❌ 请设置DEEPSEEK_API_KEY环境变量');
      return;
    }

    // 创建扩展版Agent
    const agent = createExtendedInfluencerJokeAgent('DeepSeek', 'deepseek-chat', {
      maxIterations: 10,
      verbose: true
    });

    console.log('📋 扩展工具列表：');
    agent.getAllTools().forEach((tool, index) => {
      console.log(`  ${index + 1}. ${tool.name}: ${tool.description}`);
    });

    console.log('\n' + '='.repeat(60));

    // 示例1：创作对比笑话
    console.log('\n🎭 示例1：李佳琦 vs 罗永浩 对比笑话');
    console.log('-'.repeat(40));
    const result1 = await agent.createComparisonJoke('李佳琦', '罗永浩');

    if (result1.success) {
      console.log(`\n🎪 对比笑话：\n${result1.joke}`);
      console.log(`\n📊 执行统计：迭代${result1.iterations}次，耗时${result1.executionTime}ms`);
    } else {
      console.error(`\n❌ 执行失败：${result1.error}`);
    }

    console.log('\n' + '='.repeat(60));

    // 示例2：创作流行语笑话
    console.log('\n🎭 示例2：papi酱 吐槽类流行语笑话');
    console.log('-'.repeat(40));
    const result2 = await agent.createCatchphraseJoke('papi酱', '吐槽');

    if (result2.success) {
      console.log(`\n🎪 流行语笑话：\n${result2.joke}`);
      console.log(`\n📊 执行统计：迭代${result2.iterations}次，耗时${result2.executionTime}ms`);
    } else {
      console.error(`\n❌ 执行失败：${result2.error}`);
    }

    console.log('\n✅ 扩展演示完成！');

  } catch (error) {
    console.error('❌ 演示执行失败:', error);
  }
}

// 运行演示
if (import.meta.url === `file://${process.argv[1]}`) {
  runExtendedDemo().catch(console.error);
}

export default {
  ExtendedInfluencerJokeAgent,
  createExtendedInfluencerJokeAgent,
  influencerComparisonTool,
  influencerCatchphraseTool
};