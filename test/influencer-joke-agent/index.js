/**
 * 网红讲笑话Agent - 主入口文件
 * Influencer Joke Agent - Main Entry Point
 *
 * 导出所有核心组件和工具
 */

// 基础Agent类
export {
  InfluencerJokeAgent,
  createInfluencerJokeAgent
} from './influencer-joke-agent.js';

// 扩展版Agent类
export {
  ExtendedInfluencerJokeAgent,
  createExtendedInfluencerJokeAgent
} from './custom-extension-example.js';

// 网红工具
export {
  influencerSelectionTool,
  influencerInfoTool,
  influencerListTool,
  influencerTools
} from './influencer-tools.js';

// 扩展工具
export {
  influencerComparisonTool,
  influencerCatchphraseTool
} from './custom-extension-example.js';

// 默认导出所有内容
export default {
  // 基础Agent
  InfluencerJokeAgent,
  createInfluencerJokeAgent,

  // 扩展Agent
  ExtendedInfluencerJokeAgent,
  createExtendedInfluencerJokeAgent,

  // 基础工具
  influencerSelectionTool,
  influencerInfoTool,
  influencerListTool,
  influencerTools,

  // 扩展工具
  influencerComparisonTool,
  influencerCatchphraseTool
};