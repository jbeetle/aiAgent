/**
 * Skill System 使用示例
 *
 * 本示例展示如何使用 ReAct Agent Framework 的 Skill 系统：
 * 1. 创建和注册技能
 * 2. 从文件加载技能
 * 3. 在 Agent 中使用技能
 * 4. 直接执行技能
 */

import {Agent, Models, Skills, Tools} from '../src/index.js';
import dotenv from 'dotenv';
import {fileURLToPath} from 'url';
import path from 'path';

// 加载环境变量
dotenv.config();

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 示例1：直接创建和使用 SkillEngine
 */
async function example1_directSkillUsage() {
    console.log('\n=== 示例1：直接使用 SkillEngine ===\n');

    // 创建技能引擎（传入工具注册表和LLM客户端）
    const tools = Tools.getBuiltInTools();
    const toolsRegistry = Object.fromEntries(tools.map(t => [t.name, t]));
    const llmClient = Models.createModel('DeepSeek', 'deepseek-chat');
    // 注意：实际使用时需要传入LLM客户端
    const skillEngine = new Skills.SkillEngine(toolsRegistry, llmClient, {
        verbose: true
    });

    // 定义一个简单的问候技能
    const greetingSkill = {
        name: 'greeting',
        version: '1.0.0',
        description: '根据时间和用户生成个性化问候语',
        parameters: {
            type: 'object',
            properties: {
                user_name: {type: 'string', description: '用户名称'},
                time_of_day: {
                    type: 'string',
                    enum: ['morning', 'afternoon', 'evening'],
                    description: '时间段'
                }
            },
            required: ['user_name']
        },
        workflow: {
            steps: [
                {
                    id: 'generate_greeting',
                    type: 'llm',
                    prompt: '为{{parameters.user_name}}生成一个{{parameters.time_of_day || "合适"}}的问候语',
                    output_key: 'greeting_message'
                }
            ]
        }
    };

    // 注册技能
    skillEngine.registerSkill(greetingSkill);
    console.log('已注册技能:', skillEngine.getAllSkills().map(s => s.name));

    // 执行技能
    try {
        const result = await skillEngine.execute('greeting', {
            user_name: '张三',
            time_of_day: 'morning'
        });
        console.log('技能执行结果:', result);
    } catch (error) {
        console.log('执行失败（需要配置LLM）:', error.message);
    }
}

/**
 * 示例2：使用 SkillManager 从文件加载技能
 */
async function example2_loadSkillsFromFile() {
    console.log('\n=== 示例2：从文件加载技能 ===\n');

    const tools = Tools.getBuiltInTools();
    const toolsRegistry = Object.fromEntries(tools.map(t => [t.name, t]));

    const skillEngine = new Skills.SkillEngine(toolsRegistry, null);
    const skillManager = new Skills.SkillManager(skillEngine, {verbose: true});

    // 加载内置技能
    const builtinDir = path.join(__dirname, '../src/skills/builtin');
    console.log('加载内置技能目录:', builtinDir);

    try {
        const loadedSkills = await skillManager.loadFromDirectory(builtinDir);
        console.log('成功加载技能:');
        loadedSkills.forEach(skill => {
            console.log(`  - ${skill.name} v${skill.version}: ${skill.description}`);
        });

        // 获取所有已加载技能的信息
        const summaries = skillManager.getSkillSummaries();
        console.log('\n技能摘要:');
        summaries.forEach(s => {
            console.log(`  ${s.name}: ${s.description}`);
        });
    } catch (error) {
        console.log('加载失败:', error.message);
    }
}

/**
 * 示例3：在 ReActAgent 中使用技能
 */
async function example3_agentWithSkills() {
    console.log('\n=== 示例3：ReActAgent 使用技能 ===\n');

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

    // 从文件加载技能
    try {
        const skillPath = path.join(__dirname, '../src/skills/builtin/data-analysis.skill.json');
        await agent.loadSkill(skillPath);
        console.log('已加载技能到 Agent');

        // 查看 Agent 中的所有技能
        const skills = agent.getSkills();
        console.log('Agent 中的技能:', skills.map(s => s.name));
    } catch (error) {
        console.log('加载技能失败:', error.message);
    }

    // 运行 Agent（需要配置LLM）
    console.log('\n运行 Agent...');
    const result = await agent.run('请帮我分析这个文件C:\\temp2\\data2.csv，找出股价小于10块的股票数据');
    console.log('结果:', result);
}

/**
 * 示例4：创建自定义技能模板
 */
async function example4_createSkillTemplate() {
    console.log('\n=== 示例4：创建技能模板 ===\n');

    // 使用 skillSchema 创建技能模板
    const template = Skills.createSkillTemplate('weather_report', {
        description: '生成指定城市的天气报告',
        parameters: {
            city: {type: 'string', description: '城市名称'},
            include_forecast: {type: 'boolean', default: true}
        },
        requiredParams: ['city']
    });

    console.log('生成的技能模板:');
    console.log(JSON.stringify(template, null, 2));

    // 验证技能定义
    const validation = Skills.validateSkill(template);
    console.log('\n验证结果:', validation.valid ? '有效' : '无效');
    if (!validation.valid) {
        console.log('错误:', validation.errors);
    }
}

/**
 * 示例5：批量加载目录中的技能
 */
async function example5_batchLoadSkills() {
    console.log('\n=== 示例5：批量加载技能 ===\n');

    const tools = Tools.getBuiltInTools();
    const toolsRegistry = Object.fromEntries(tools.map(t => [t.name, t]));

    const skillEngine = new Skills.SkillEngine(toolsRegistry, null);
    const skillManager = new Skills.SkillManager(skillEngine, {verbose: true});

    // 加载内置技能目录
    const builtinDir = path.join(__dirname, '../src/skills/builtin');

    try {
        // 使用递归选项加载所有子目录
        const skills = await skillManager.loadFromDirectory(builtinDir, {
            recursive: false,  // 不递归子目录
            pattern: /\.skill\.json$/  // 只加载 .skill.json 文件
        });

        console.log(`成功加载 ${skills.length} 个技能:`);
        skills.forEach(skill => {
            const info = skillManager.getLoadedSkillInfo(skill.name);
            console.log(`  - ${skill.name}`);
            console.log(`    来源: ${info?.filePath || 'inline'}`);
            console.log(`    加载时间: ${info?.loadedAt || 'unknown'}`);
        });
    } catch (error) {
        console.log('加载失败:', error.message);
    }
}

/**
 * 主函数 - 运行所有示例
 */
async function main() {
    console.log('============================================');
    console.log('   Skill System 使用示例');
    console.log('============================================');

    try {
        // 运行示例
        //await example1_directSkillUsage();
        //await example2_loadSkillsFromFile();
        await example3_agentWithSkills(); // 需要配置 LLM API Key
        //await example4_createSkillTemplate();
        //await example5_batchLoadSkills();

        console.log('\n============================================');
        console.log('   所有示例运行完成');
        console.log('============================================');
    } catch (error) {
        console.error('运行示例时发生错误:', error);
    }
}

// 运行主函数
main();

/**
 * 使用说明：
 *
 * 1. 确保已安装依赖: npm install
 * 2. 配置环境变量（复制 .env.example 到 .env 并填写）
 * 3. 运行示例: node examples/skill-usage.js
 *
 * 技能系统核心概念：
 *
 * - Skill: 多步骤工作流，由工具调用、LLM推理等步骤组成
 * - SkillEngine: 执行技能的核心引擎，管理技能的注册和执行
 * - SkillManager: 负责从文件/目录加载技能
 * - workflow: 技能的工作流定义，包含按顺序执行的步骤
 *
 * 技能定义格式（JSON）：
 * {
 *   "name": "技能名称",
 *   "version": "版本号",
 *   "description": "技能描述",
 *   "parameters": { 参数Schema },
 *   "workflow": {
 *     "steps": [
 *       {
 *         "id": "步骤ID",
 *         "type": "tool|llm|skill|condition",
 *         ...步骤特定配置
 *       }
 *     ]
 *   }
 * }
 */
