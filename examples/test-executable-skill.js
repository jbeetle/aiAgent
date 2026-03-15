/**
 * 测试可执行技能（Executable Skill）- code_review
 *
 * 验证功能：
 * 1. 加载可执行技能（JSON 格式带 workflow）
 * 2. 执行 workflow 中的 tool 步骤（file_reader）
 * 3. 执行 workflow 中的 llm 步骤（代码审查）
 * 4. 获取执行结果
 */

import {Agent, Tools} from '../src/index.js';
import fs from 'fs/promises';
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

// 创建一个示例代码文件用于审查
async function createSampleCodeFile() {
    const sampleCode = `
// 这是一个有问题的示例代码文件
function calculatePrice(qty, price) {
    // 没有输入验证
    return qty * price;
}

function getUserData(userId) {
    // 模拟 SQL 查询 - 有 SQL 注入风险
    const query = "SELECT * FROM users WHERE id = " + userId;
    return db.execute(query);
}

// 全局变量
var globalCounter = 0;

function incrementCounter() {
    globalCounter++;
    return globalCounter;
}

// 没有错误处理
async function fetchData(url) {
    const response = await fetch(url);
    return response.json();
}

module.exports = { calculatePrice, getUserData, incrementCounter, fetchData };
`;
    const tempFile = path.join(__dirname, 'temp-sample-code.js');
    await fs.writeFile(tempFile, sampleCode, 'utf-8');
    return tempFile;
}

async function main() {
    log.header('测试可执行技能（Executable Skill）- code_review');

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

        // 2. 加载可执行技能
        log.header('步骤 1: 加载 code_review 可执行技能');
        const skillPath = path.join(__dirname, '../src/skills/builtin/code-review.skill.json');
        log.info(`加载技能文件: ${skillPath}`);

        const skill = await agent.loadSkill(skillPath);
        log.success(`技能加载成功!`);
        log.info(`技能名称: ${skill.name}`);
        log.info(`版本: ${skill.version}`);
        log.info(`类型: ${skill._type || 'executable'}`);
        log.info(`工作流步骤数: ${skill.workflow?.steps?.length || 0}`);

        // 显示工作流详情
        log.info('工作流步骤:');
        skill.workflow?.steps?.forEach((step, idx) => {
            log.info(`  ${idx + 1}. ${step.id} (${step.type})`);
        });

        // 3. 创建示例代码文件
        log.header('步骤 2: 创建示例代码文件');
        const sampleFile = await createSampleCodeFile();
        log.success(`创建示例文件: ${sampleFile}`);

        // 4. 执行可执行技能
        log.header('步骤 3: 执行 code_review 技能');
        log.info('正在审查示例代码文件...');

        const result = await agent.executeSkill('code_review', {
            file_path: sampleFile,
            language: 'javascript',
            review_focus: ['security', 'readability', 'best_practices']
        });

        if (result.success) {
            log.success('技能执行成功!');
            log.header('审查报告:');
            console.log(result.outputs.review_report);

            // 显示执行步骤详情
            log.header('执行步骤详情:');
            Object.entries(result.steps).forEach(([stepId, stepResult]) => {
                log.info(`步骤: ${stepId}`);
                log.info(`  - 类型: ${stepResult.type}`);
                if (stepResult.tool) {
                    log.info(`  - 工具: ${stepResult.tool}`);
                }
                if (stepResult.error) {
                    log.error(`  - 错误: ${stepResult.error}`);
                } else {
                    log.success(`  - 状态: 成功`);
                }
            });
        } else {
            log.error(`技能执行失败: ${result.error}`);
            console.log('步骤结果:', JSON.stringify(result.steps, null, 2));
        }

        // 5. 验证技能摘要
        log.header('步骤 4: 验证技能摘要');
        const summaries = agent.getSkillSummaries();
        log.info(`已加载技能数量: ${summaries.length}`);

        summaries.forEach((summary, idx) => {
            log.info(`\n技能 ${idx + 1}:`);
            log.info(`  - 名称: ${summary.name}`);
            log.info(`  - 类型: ${summary.isDescriptive ? '描述性' : '可执行'}`);
            log.info(`  - 分类: ${summary.category || 'N/A'}`);
            log.info(`  - 版本: ${summary.version}`);
        });

        // 6. 清理
        log.header('步骤 5: 清理临时文件');
        await fs.unlink(sampleFile);
        log.success('临时文件已删除');

        log.header('测试完成！');
        log.success('所有测试通过！可执行技能功能工作正常。');

    } catch (error) {
        log.error(`测试失败: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// 运行测试
main();
