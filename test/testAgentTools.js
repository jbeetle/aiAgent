import {Agent, Tools} from '../src/index.js';

async function example3_agentWithSkills() {
    // 检查环境变量
    if (!process.env.DEEPSEEK_API_KEY) {
        console.log('请设置 DEEPSEEK_API_KEY 环境变量来运行此示例');
        return;
    }

    // 创建工具
    const tools = Tools.getBuiltInTools();

    // 创建 Agent
    const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', tools, {
        verbose: true,
        maxIterations: 15
    });


    // 运行 Agent（需要配置LLM）
    console.log('\n运行 Agent...');
    const result = await agent.run('请帮我截取这个C:\\temp2\\data2.csv最后10行的记录，并C:\\temp2目录下在生成一个新的data3.txt文件');
    console.log('结果:', result);
}
example3_agentWithSkills().then(result => {
    console.log('done');
})