#!/usr/bin/env node

/**
 * ReAct Agent CLI
 * 交互式命令行工具，支持自然语言对话和动态 Skill 管理
 */

import {Agent, Models, Tools} from '../src/index.js';
import readline from 'node:readline/promises';
import {stdin as input, stdout as output} from 'node:process';
import path from 'path';
import {fileURLToPath} from 'url';

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI 颜色代码
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

// 带颜色的日志函数
const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    thinking: (msg) => console.log(`${colors.cyan}🤔${colors.reset} ${msg}`),
    tool: (msg) => console.log(`${colors.yellow}🔧${colors.reset} ${msg}`),
    result: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
    answer: (msg) => console.log(`${colors.bright}${colors.white}📊${colors.reset} ${colors.bright}${msg}${colors.reset}`),
    skill: (msg) => console.log(`${colors.magenta}📦${colors.reset} ${msg}`)
};

/**
 * 解析命令行参数
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        vendor: 'DeepSeek',
        model: 'deepseek-chat',
        skillsDir: null,
        verbose: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--vendor':
            case '-v':
                options.vendor = args[++i];
                break;
            case '--model':
            case '-m':
                options.model = args[++i];
                break;
            case '--skills-dir':
            case '-s':
                options.skillsDir = args[++i];
                break;
            case '--verbose':
                options.verbose = true;
                break;
            case '--help':
            case '-h':
                printHelp();
                process.exit(0);
                break;
        }
    }

    return options;
}

/**
 * 打印命令行帮助
 */
function printHelp() {
    console.log(`${colors.bright}ReAct Agent CLI${colors.reset}

用法: node bin/cli.js [选项]

选项:
  -v, --vendor <name>      设置 LLM 提供商 (默认: DeepSeek)
  -m, --model <name>       设置模型名称 (默认: deepseek-chat)
  -s, --skills-dir <path>  启动时加载技能的目录
  --verbose                启用详细日志
  -h, --help               显示帮助信息

示例:
  node bin/cli.js
  node bin/cli.js --vendor OpenAI --model gpt-4
  node bin/cli.js -s ./my-skills --verbose
`);
}

/**
 * CLI Agent 类
 */
class CLIAgent {
    constructor(options) {
        this.options = options;
        this.tools = Tools.getBuiltInTools();
        this.agent = null;
        this.rl = null;
        this.running = false;
        this.conversationHistory = [];
    }

    /**
     * 初始化 Agent
     */
    async initialize() {
        try {
            // 创建 ReActAgent
            this.agent = new Agent.ReActAgent(
                this.options.vendor,
                this.options.model,
                this.tools,
                {
                    verbose: this.options.verbose,
                    maxIterations: 10
                }
            );

            // 创建 readline 接口
            this.rl = readline.createInterface({
                input,
                output,
                prompt: `${colors.cyan}>${colors.reset} `
            });

            // 如果指定了 skills 目录，加载它
            if (this.options.skillsDir) {
                await this.loadSkillsFromDirectory(this.options.skillsDir);
            }

            return true;
        } catch (error) {
            log.error(`初始化失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 启动 CLI
     */
    async start() {
        if (!await this.initialize()) {
            process.exit(1);
        }

        this.running = true;
        this.printBanner();

        while (this.running) {
            const input = await this.rl.question(`${colors.cyan}>${colors.reset} `);
            const trimmed = input.trim();

            if (!trimmed) continue;

            try {
                const shouldExit = await this.handleInput(trimmed);
                if (shouldExit) break;
            } catch (error) {
                log.error(`错误: ${error.message}`);
            }
        }

        this.rl.close();
        console.log(`\n${colors.green}👋 再见!${colors.reset}\n`);
    }

    /**
     * 处理用户输入
     */
    async handleInput(input) {
        // 检查是否是命令
        if (input.startsWith('/')) {
            return await this.executeCommand(input);
        }

        // 普通对话
        await this.chat(input);
        return false;
    }

    /**
     * 执行命令
     */
    async executeCommand(input) {
        const parts = input.split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (command) {
            case '/help':
            case '/h':
                this.printCommandHelp();
                break;
            case '/exit':
            case '/quit':
            case '/q':
                return true;
            case '/load':
                await this.loadSkill(args[0]);
                break;
            case '/loaddir':
                await this.loadSkillsFromDirectory(args[0]);
                break;
            case '/unload':
                await this.unloadSkill(args[0]);
                break;
            case '/reload':
                await this.reloadSkill(args[0]);
                break;
            case '/list':
            case '/ls':
                this.listSkills();
                break;
            case '/builtin':
                await this.loadBuiltinSkills();
                break;
            case '/clear':
                this.clearHistory();
                break;
            case '/model':
                await this.switchModel(args[0], args[1]);
                break;
            case '/history':
                this.showHistory();
                break;
            default:
                log.warning(`未知命令: ${command}, 输入 /help 查看可用命令`);
        }

        return false;
    }

    /**
     * 打印启动横幅
     */
    printBanner() {
        const skillCount = this.agent.getSkillSummaries().length;
        console.log(`
${colors.bright}${colors.cyan}🤖 ReAct Agent CLI${colors.reset}
${colors.dim}==================${colors.reset}
${colors.blue}Provider:${colors.reset} ${this.options.vendor}
${colors.blue}Model:${colors.reset}    ${this.options.model}
${colors.blue}Skills:${colors.reset}   ${skillCount} loaded

${colors.dim}Type /help for commands or start chatting!${colors.reset}
`);
    }

    /**
     * 打印命令帮助
     */
    printCommandHelp() {
        console.log(`
${colors.bright}可用命令:${colors.reset}

${colors.yellow}Skill 管理:${colors.reset}
  /load <filepath>       从文件加载 skill
  /loaddir <dirpath>     从目录批量加载 skills
  /unload <skillname>    卸载指定 skill
  /reload <skillname>    重新加载 skill
  /list                  列出所有已加载的 skills
  /builtin               加载内置 skills

${colors.yellow}对话控制:${colors.reset}
  /clear                 清除对话历史
  /history               显示对话历史
  /model <vendor> <model> 切换 LLM 模型

${colors.yellow}其他:${colors.reset}
  /help, /h              显示此帮助
  /exit, /quit, /q       退出程序

${colors.dim}直接输入文本开始与 Agent 对话${colors.reset}
`);
    }

    /**
     * 从文件加载 Skill
     */
    async loadSkill(filePath) {
        if (!filePath) {
            log.error('请提供文件路径，例如: /load ./my-skill.skill.json');
            return;
        }

        try {
            // 支持相对路径
            const resolvedPath = path.resolve(filePath);
            const skill = await this.agent.loadSkill(resolvedPath);
            log.success(`Skill "${skill.name}" v${skill.version} 加载成功`);
            log.info(`描述: ${skill.description}`);
        } catch (error) {
            log.error(`加载失败: ${error.message}`);
        }
    }

    /**
     * 从目录批量加载 Skills
     */
    async loadSkillsFromDirectory(dirPath) {
        if (!dirPath) {
            log.error('请提供目录路径，例如: /loaddir ./skills');
            return;
        }

        try {
            const resolvedPath = path.resolve(dirPath);
            const skills = await this.agent.loadSkillsFromDirectory(resolvedPath);
            log.success(`成功加载 ${skills.length} 个 skills:`);
            skills.forEach(skill => {
                console.log(`  ${colors.cyan}•${colors.reset} ${skill.name} v${skill.version}: ${skill.description}`);
            });
        } catch (error) {
            log.error(`加载失败: ${error.message}`);
        }
    }

    /**
     * 卸载 Skill
     */
    async unloadSkill(skillName) {
        if (!skillName) {
            log.error('请提供 skill 名称，例如: /unload my_skill');
            return;
        }

        try {
            const info = this.agent.unloadSkill(skillName);
            log.success(`Skill "${skillName}" 已卸载`);
            log.info(`来源: ${info.filePath}`);
        } catch (error) {
            log.error(`卸载失败: ${error.message}`);
        }
    }

    /**
     * 重新加载 Skill
     */
    async reloadSkill(skillName) {
        if (!skillName) {
            log.error('请提供 skill 名称，例如: /reload my_skill');
            return;
        }

        try {
            const skill = await this.agent.reloadSkill(skillName);
            log.success(`Skill "${skillName}" 重新加载成功`);
            log.info(`版本: v${skill.version}`);
        } catch (error) {
            log.error(`重新加载失败: ${error.message}`);
        }
    }

    /**
     * 列出所有已加载的 Skills
     */
    listSkills() {
        const summaries = this.agent.getSkillSummaries();

        if (summaries.length === 0) {
            log.warning('没有已加载的 skills');
            console.log(`${colors.dim}使用 /builtin 加载内置 skills 或使用 /load 加载自定义 skills${colors.reset}`);
            return;
        }

        console.log(`\n${colors.bright}📋 已加载 Skills (${summaries.length}):${colors.reset}\n`);

        summaries.forEach((skill, index) => {
            console.log(`${colors.cyan}${index + 1}.${colors.reset} ${colors.bright}${skill.name}${colors.reset} v${skill.version}`);
            console.log(`   ${colors.dim}${skill.description}${colors.reset}`);
            console.log(`   ${colors.dim}来源: ${skill.source}${colors.reset}\n`);
        });
    }

    /**
     * 加载内置 Skills
     */
    async loadBuiltinSkills() {
        try {
            const skills = await this.agent.skillManager.loadBuiltinSkills();
            if (skills.length === 0) {
                log.warning('没有内置 skills 或目录不存在');
            } else {
                log.success(`成功加载 ${skills.length} 个内置 skills`);
                skills.forEach(skill => {
                    console.log(`  ${colors.cyan}•${colors.reset} ${skill.name}`);
                });
            }
        } catch (error) {
            log.error(`加载失败: ${error.message}`);
        }
    }

    /**
     * 清除对话历史
     */
    clearHistory() {
        this.agent.reset();
        this.conversationHistory = [];
        log.success('对话历史已清除');
    }

    /**
     * 显示对话历史
     */
    showHistory() {
        if (this.conversationHistory.length === 0) {
            log.warning('对话历史为空');
            return;
        }

        console.log(`\n${colors.bright}对话历史:${colors.reset}\n`);
        this.conversationHistory.forEach((entry, index) => {
            if (entry.role === 'user') {
                console.log(`${colors.cyan}用户:${colors.reset} ${entry.content}`);
            } else if (entry.role === 'assistant') {
                console.log(`${colors.green}Agent:${colors.reset} ${entry.content.substring(0, 200)}${entry.content.length > 200 ? '...' : ''}`);
            }
            if (index < this.conversationHistory.length - 1) {
                console.log();
            }
        });
        console.log();
    }

    /**
     * 切换模型
     */
    async switchModel(vendor, model) {
        if (!vendor || !model) {
            log.error('请提供提供商和模型名称，例如: /model DeepSeek deepseek-chat');
            return;
        }

        try {
            // 重新创建 Agent
            this.agent = new Agent.ReActAgent(vendor, model, this.tools, {
                verbose: this.options.verbose,
                maxIterations: 10
            });
            this.options.vendor = vendor;
            this.options.model = model;
            log.success(`已切换到: ${vendor} / ${model}`);
        } catch (error) {
            log.error(`切换失败: ${error.message}`);
        }
    }

    /**
     * 执行对话
     */
    async chat(query) {
        // 记录用户输入
        this.conversationHistory.push({ role: 'user', content: query });

        try {
            console.log(); // 空行

            await this.agent.runStream(query, (chunk) => {
                switch (chunk.type) {
                    case 'start':
                        // 静默开始
                        break;
                    case 'thinking':
                        // 思考过程不显示，保持界面简洁
                        break;
                    case 'parsed':
                        if (chunk.thought) {
                            log.thinking(chunk.thought);
                        }
                        break;
                    case 'tool_start':
                        log.tool(`执行: ${chunk.tool}`);
                        if (this.options.verbose && chunk.input) {
                            console.log(`${colors.dim}  参数: ${JSON.stringify(chunk.input)}${colors.reset}`);
                        }
                        break;
                    case 'tool_result':
                        log.result(`完成: ${chunk.tool}`);
                        if (this.options.verbose && chunk.result) {
                            const resultStr = typeof chunk.result === 'string'
                                ? chunk.result
                                : JSON.stringify(chunk.result);
                            console.log(`${colors.dim}  结果: ${resultStr.substring(0, 200)}${resultStr.length > 200 ? '...' : ''}${colors.reset}`);
                        }
                        break;
                    case 'final_answer':
                        console.log();
                        log.answer(chunk.message);
                        console.log();
                        break;
                    case 'error':
                        log.error(chunk.error);
                        break;
                    case 'max_iterations':
                        log.warning(chunk.message);
                        break;
                }
            });

            // 记录助手回复 (获取最后一次对话)
            // 注意: ReActAgent 不直接暴露对话历史，所以这里只记录查询
            // 实际历史由 Agent 内部管理

        } catch (error) {
            log.error(`对话出错: ${error.message}`);
        }
    }
}

/**
 * 主函数
 */
async function main() {
    const options = parseArgs();
    const cli = new CLIAgent(options);
    await cli.start();
}

// 运行主函数
main().catch(error => {
    console.error(`${colors.red}致命错误:${colors.reset}`, error);
    process.exit(1);
});
