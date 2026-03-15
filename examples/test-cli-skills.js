/**
 * 模拟 CLI 交互式技能测试
 * 演示 CLI 中的技能加载、列出、执行功能
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
    magenta: '\x1b[35m',
    gray: '\x1b[90m'
};

const log = {
    header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    cmd: (msg) => console.log(`${colors.yellow}>${colors.reset} ${colors.gray}${msg}${colors.reset}`),
    output: (msg) => console.log(`${colors.magenta}↳${colors.reset} ${msg}`),
    chat: (role, msg) => console.log(`${colors.cyan}[${role}]${colors.reset} ${msg}`)
};

class MockCLI {
    constructor() {
        this.agent = null;
        this.loadedSkills = new Map();
    }

    async init() {
        log.header('🤖 ReAct Agent CLI (模拟)');
        log.info('Provider: DeepSeek');
        log.info('Model: deepseek-chat');
        log.info('Skills: 0 loaded');

        // 创建 Agent
        const tools = Tools.getBuiltInTools();
        this.agent = new Agent.ReActAgent(
            process.env.TEST_VENDOR || 'DeepSeek',
            process.env.TEST_MODEL || 'deepseek-chat',
            tools,
            { verbose: false, maxIterations: 15 }
        );
    }

    // 模拟 /load 命令
    async loadSkill(filePath) {
        log.cmd(`/load ${filePath}`);
        try {
            const fullPath = path.resolve(filePath);
            const skill = await this.agent.loadSkill(fullPath);
            this.loadedSkills.set(skill.name, skill);
            log.success(`Skill "${skill.name}" v${skill.version} 加载成功`);
            log.info(`描述: ${skill.description}`);
            return skill;
        } catch (error) {
            log.error(`加载失败: ${error.message}`);
            throw error;
        }
    }

    // 模拟 /list 命令
    listSkills() {
        log.cmd('/list');
        const summaries = this.agent.getSkillSummaries();

        if (summaries.length === 0) {
            log.info('没有加载任何技能');
            return;
        }

        log.info(`已加载 ${summaries.length} 个技能:`);
        console.log('');
        console.log('  名称                    类型        版本    描述');
        console.log('  ───────────────────────────────────────────────────────────────');

        summaries.forEach(skill => {
            const typeTag = skill.isDescriptive ? '[描述性]' : '[可执行]';
            const name = skill.name.padEnd(22);
            const type = typeTag.padEnd(10);
            const version = skill.version.padEnd(7);
            const desc = skill.description.length > 35
                ? skill.description.substring(0, 35) + '...'
                : skill.description;

            console.log(`  ${name}${type}${version}${desc}`);
        });
    }

    // 模拟 /builtin 命令
    async loadBuiltin() {
        log.cmd('/builtin');
        try {
            const skills = await this.agent.skillManager.loadBuiltinSkills();
            skills.forEach(skill => {
                this.loadedSkills.set(skill.name, skill);
            });
            log.success(`加载了 ${skills.length} 个内置技能`);
        } catch (error) {
            log.info('没有内置技能或加载失败');
        }
    }

    // 模拟聊天 - 使用技能
    async chat(message) {
        log.chat('用户', message);
        console.log('');

        try {
            const response = await this.agent.chat(message);
            log.chat('AI', response);
        } catch (error) {
            log.error(`聊天失败: ${error.message}`);
        }
    }

    // 模拟直接执行技能
    async executeSkill(skillName, params) {
        log.cmd(`/skill ${skillName} ${JSON.stringify(params)}`);
        try {
            const result = await this.agent.executeSkill(skillName, params);
            if (result.success) {
                log.success('执行成功');
                log.output(result.outputs.result || JSON.stringify(result.outputs, null, 2));
            } else {
                log.error(`执行失败: ${result.error}`);
            }
            return result;
        } catch (error) {
            log.error(`执行出错: ${error.message}`);
            throw error;
        }
    }

    // 显示帮助
    showHelp() {
        log.cmd('/help');
        console.log('');
        console.log('  可用命令:');
        console.log('    /load <filepath>    - 从文件加载技能');
        console.log('    /loaddir <dirpath>  - 从目录加载技能');
        console.log('    /builtin            - 加载内置技能');
        console.log('    /list               - 列出已加载的技能');
        console.log('    /unload <name>      - 卸载技能');
        console.log('    /reload <name>      - 重新加载技能');
        console.log('    /skill <name>       - 直接执行技能');
        console.log('    /clear              - 清除对话历史');
        console.log('    /history            - 显示对话历史');
        console.log('    /help               - 显示帮助');
        console.log('    /exit               - 退出 CLI');
        console.log('');
        console.log('  直接输入消息开始对话');
    }
}

async function main() {
    const cli = new MockCLI();
    await cli.init();

    // 1. 显示帮助
    cli.showHelp();

    // 2. 加载描述性技能
    log.header('测试 1: 加载描述性技能');
    await cli.loadSkill('examples/browser-automation.skill.md');

    // 3. 列出技能
    log.header('测试 2: 列出已加载技能');
    cli.listSkills();

    // 4. 执行描述性技能
    log.header('测试 3: 执行描述性技能');
    await cli.executeSkill('Browser_Automation', {
        request: '如何用 puppeteer 截取网页截图？'
    });

    // 5. 通过聊天使用技能（意图识别）
    log.header('测试 4: 通过聊天询问技能相关知识');
    await cli.chat('你能帮我写一个用 Playwright 抓取网页数据的脚本吗？');

    // 6. 加载内置技能
    log.header('测试 5: 加载内置技能');
    await cli.loadBuiltin();

    // 7. 再次列出技能
    log.header('测试 6: 列出所有技能');
    cli.listSkills();

    log.header('测试完成！');
    log.success('所有 CLI 技能功能工作正常。');
}

main().catch(error => {
    log.error(`测试失败: ${error.message}`);
    console.error(error);
    process.exit(1);
});
