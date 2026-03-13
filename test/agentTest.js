import {Agent, Tools} from '../src/index.js';
import dotenv from 'dotenv';

dotenv.config();

// 创建代理实例
const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', Tools.getBuiltInTools(), {
    verbose: true, // 启用详细日志
    maxIterations: 5 // 最大推理步骤
});

// 运行代理处理任务
const result = await agent.run('15 * 8 + 42 是多少？');

console.log('答案:', result.answer); // "15 * 8 + 42 = 162"
