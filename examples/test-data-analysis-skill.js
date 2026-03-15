/**
 * 测试可执行技能（Executable Skill）- data_analysis
 */

import {Agent, Tools} from '../src/index.js';
import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`)
};

async function createSampleDataFile() {
    const sampleData = `month,revenue,expenses,profit
2024-01,10000,6000,4000
2024-02,12000,7000,5000
2024-03,15000,8000,7000
2024-04,13000,7500,5500
2024-05,18000,9000,9000
2024-06,20000,10000,10000`;

    const tempFile = path.join(__dirname, 'temp-sales-data.csv');
    await fs.writeFile(tempFile, sampleData, 'utf-8');
    return tempFile;
}

async function main() {
    log.header('测试可执行技能（Executable Skill）- data_analysis');

    try {
        const tools = Tools.getBuiltInTools();
        const agent = new Agent.ReActAgent(
            process.env.TEST_VENDOR || 'DeepSeek',
            process.env.TEST_MODEL || 'deepseek-chat',
            tools,
            { verbose: true, maxIterations: 5 }
        );
        log.success('ReActAgent 创建成功');

        log.header('步骤 1: 加载 data_analysis 可执行技能');
        const skillPath = path.join(__dirname, '../src/skills/builtin/data-analysis.skill.json');
        const skill = await agent.loadSkill(skillPath);
        log.success(`技能加载成功: ${skill.name} v${skill.version}`);

        log.header('步骤 2: 创建示例数据文件');
        const sampleFile = await createSampleDataFile();
        log.success(`创建示例文件: ${sampleFile}`);

        log.header('步骤 3: 执行 data_analysis 技能');
        log.info('正在分析销售数据...');

        const result = await agent.executeSkill('data_analysis', {
            file_path: sampleFile,
            analysis_type: 'summary',
            output_format: 'markdown'
        });

        if (result.success) {
            log.success('技能执行成功!');
            log.header('分析报告:');
            console.log(result.outputs.analysis_report);
        } else {
            log.error(`技能执行失败: ${result.error}`);
        }

        log.header('步骤 4: 清理');
        await fs.unlink(sampleFile);
        log.success('临时文件已删除');

        log.header('测试完成！');

    } catch (error) {
        log.error(`测试失败: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

main();
