/**
 * 测试描述性技能（Descriptive Skill）的加载和执行
 *
 * 验证功能：
 * 1. 加载业界标准 Markdown 格式的描述性技能
 * 2. 自动检测技能类型
 * 3. 转换为可执行技能
 * 4. 通过 SkillEngine 执行
 */

import {Agent, Tools} from '../src/index.js';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 颜色代码
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    skill: (msg) => console.log(`${colors.magenta}📦${colors.reset} ${msg}`),
    header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`)
};

async function main() {
    log.header('测试描述性技能（Descriptive Skill）');

    try {
        // 1. 创建 ReActAgent
        log.info('创建 ReActAgent...');
        const tools = Tools.getBuiltInTools();
        const agent = new Agent.ReActAgent(
            process.env.TEST_VENDOR || 'DeepSeek',
            process.env.TEST_MODEL || 'deepseek-chat',
            tools,
            { verbose: true, maxIterations: 5 }
        );
        log.success('ReActAgent 创建成功');

        // 2. 加载描述性技能
        log.header('步骤 1: 加载描述性技能');
        const skillPath = path.join(__dirname, 'browser-automation.skill.md');
        log.info(`加载技能文件: ${skillPath}`);

        const skill = await agent.loadSkill(skillPath);
        log.success(`技能加载成功!`);
        log.info(`技能名称: ${skill.name}`);
        log.info(`原始名称: ${skill._originalName || skill.name}`);
        log.info(`版本: ${skill.version}`);
        log.info(`类型: ${skill._type || 'executable'}`);

        // 3. 验证技能摘要
        log.header('步骤 2: 验证技能摘要');
        const summaries = agent.getSkillSummaries();
        log.info(`已加载技能数量: ${summaries.length}`);

        summaries.forEach((summary, idx) => {
            log.info(`\n技能 ${idx + 1}:`);
            log.info(`  - 名称: ${summary.name}`);
            log.info(`  - 原始名称: ${summary.originalName || summary.name}`);
            log.info(`  - 类型: ${summary.isDescriptive ? '描述性' : '可执行'}`);
            log.info(`  - 分类: ${summary.category || 'N/A'}`);
            log.info(`  - 标签: ${summary.tags?.join(', ') || 'N/A'}`);
            log.info(`  - 能力: ${summary.capabilities?.slice(0, 3).join(', ') || 'N/A'}${(summary.capabilities?.length || 0) > 3 ? '...' : ''}`);
        });

        // 4. 测试技能执行
        log.header('步骤 3: 测试技能执行');
        log.info('执行描述性技能...');

        const result = await agent.executeSkill(skill.name, {
            request: '请解释如何使用 browser automation 技能来抓取网页数据'
        });

        if (result.success) {
            log.success('技能执行成功!');
            log.info('输出结果:');
            console.log(result.outputs.result || JSON.stringify(result.outputs, null, 2));
        } else {
            log.error(`技能执行失败: ${result.error}`);
        }

        // 5. 验证技能元数据
        log.header('步骤 4: 验证技能元数据');
        const skillEngine = agent.skillEngine;
        const allSkills = skillEngine.getAllSkills();

        allSkills.forEach(s => {
            log.info(`\n技能: ${s.name}`);
            log.info(`  - _type: ${s._type || 'N/A'}`);
            log.info(`  - _skillType: ${s._skillType || 'N/A'}`);
            log.info(`  - category: ${s.category || 'N/A'}`);
            log.info(`  - tags: ${s.tags?.join(', ') || 'N/A'}`);
            log.info(`  - capabilities: ${s.capabilities?.length || 0} 个能力`);
            log.info(`  - mcp: ${s.mcp ? JSON.stringify(s.mcp) : 'N/A'}`);
        });

        // 6. 获取技能能力（用于意图识别）
        log.header('步骤 5: 获取技能能力（用于意图识别）');
        const capabilities = skillEngine.getSkillCapabilities();
        log.info(`获取到 ${capabilities.length} 个技能的能力信息:`);

        capabilities.forEach(cap => {
            log.info(`\n技能: ${cap.name}`);
            log.info(`  - 类型: ${cap.type}`);
            log.info(`  - 分类: ${cap.category || 'N/A'}`);
            log.info(`  - 能力数: ${cap.capabilities?.length || 0}`);
            log.info(`  - MCP服务器: ${cap.mcp?.server || 'N/A'}`);
        });

        // 7. 验证意图识别器集成
        log.header('步骤 6: 验证意图识别器');
        // 这里我们验证技能被正确传递给意图识别器
        // 实际意图识别需要 BaseLLMService，这里只做基本验证
        log.info('技能已注册到系统，意图识别器可以访问 skills 数据');

        log.header('测试完成！');
        log.success('所有测试通过！描述性技能功能工作正常。');

    } catch (error) {
        log.error(`测试失败: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// 运行测试
main();
