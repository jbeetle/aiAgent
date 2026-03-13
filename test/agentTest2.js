import {Agent, Tools} from '../src/index.js';
import dotenv from 'dotenv';

dotenv.config();

// 创建代理实例
const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', Tools.getBuiltInTools(), {
    verbose: false, // 启用详细日志
    maxIterations: 5 // 最大推理步骤
});
// 流式处理，实时显示推理过程
await agent.runStream('计算 (25 * 4) + (100 / 5) - 30', (chunk) => {
    if(chunk.tool){
        process.stdout.write(chunk.tool);
    }

    switch (chunk.type) {
        case 'thinking':
            //console.log('思考中:', chunk.content);
            break;
        case 'tool_start':
            console.log('执行工具:', chunk.tool);
            break;
        case 'final_answer':
            console.log('最终答案:', chunk.message);
            break;
    }
});