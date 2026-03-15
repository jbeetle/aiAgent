#!/usr/bin/env node

/**
 * ReAct Agent CLI
 * 交互式命令行工具，支持自然语言对话和动态 Skill 管理
 */

import {Agent, Models} from '../src/index.js';
import {BaseLLMService} from './conversation/index.js';
import readline from 'node:readline/promises';
import {stdin as input, stdout as output} from 'node:process';
import path from 'path';
import {fileURLToPath} from 'url';

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 常量定义
const DEFAULT_MAX_ITERATIONS = 15;

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

// CLI 提示符常量
const CLI_PROMPT = `${colors.cyan}>${colors.reset} `;

/**
 * 解析命令行参数
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        vendor: 'DeepSeek',
        model: 'deepseek-chat',
        skillsDir: null,
        verbose: false,
        direct: false  // 直接模式：绕过 BaseLLMService，直接使用 ReActAgent
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
            case '--direct':
            case '-d':
                options.direct = true;
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
  -s, --skills-dir <path> 启动时加载技能的目录
  -d, --direct             直接模式：绕过 BaseLLMService，直接使用 ReActAgent
  --verbose                启用详细日志
  -h, --help               显示帮助信息

示例:
  node bin/cli.js
  node bin/cli.js --vendor OpenAI --model gpt-4
  node bin/cli.js --direct                    # 直接使用 ReActAgent
  node bin/cli.js -s ./my-skills --verbose
`);
}

/**
 * CLI Agent 类
 * 新架构：BaseLLMService 作为主要对话接口，ReActAgent 作为任务执行器
 */
class CLIAgent {
    constructor(options) {
        this.options = options;
        this.reactAgent = null;
        this.baseLLMService = null;
        this.rl = null;
        this.running = false;
    }

    /**
     * 初始化 Agent
     *
     * 初始化顺序：
     * 1. 创建 LLM 客户端
     * 2. 创建 ReActAgent（自动加载内置工具）
     * 3. 创建 BaseLLMService
     * 4. 关联 ReActAgent 到 BaseLLMService
     * 5. 加载 Skills
     * 6. 创建 readline 接口
     */
    async initialize() {
        try {
            // 1. 创建 LLM 客户端
            const llmClient = Models.createModel(this.options.vendor, this.options.model);

            // 2. 创建 ReActAgent（自动加载所有内置工具）
            this.reactAgent = new Agent.ReActAgent(
                this.options.vendor,
                this.options.model,
                null, // 不传工具，让 ReActAgent 自动加载内置工具
                {
                    verbose: this.options.verbose,
                    maxIterations: DEFAULT_MAX_ITERATIONS
                }
            );

            // 3. 创建 BaseLLMService（主要对话接口，管理跨对话上下文 + 意图识别）
            this.baseLLMService = new BaseLLMService(llmClient, {
                verbose: this.options.verbose,
                maxMessages: 20,
                tokenLimit: 1024 * 64,
                enableRefinement: true,
                intentMode: 'balanced',
                language: process.env.PROMPTS_LANG || 'cn'
            });

            // 4. 关联两者：BaseLLMService 使用 ReActAgent 执行工具任务
            this.baseLLMService.setReActAgent(this.reactAgent);

            // 让 IntentRecognizer 能访问内置工具描述（用于语义匹配）
            this.baseLLMService.registerToolsForIntent(this.reactAgent.tools);

            // 5. 自动加载内置 skills
            await this.#loadBuiltinSkills();

            // 6. 创建 readline 接口
            this.rl = readline.createInterface({
                input,
                output,
                prompt: CLI_PROMPT
            });

            // 如果指定了 skills 目录，加载它
            if (this.options.skillsDir) {
                await this.loadSkillsFromDirectory(this.options.skillsDir);
            }

            this.#log('CLI 初始化完成，使用新架构：BaseLLMService + ReActAgent');
            return true;
        } catch (error) {
            log.error(`初始化失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 私有日志方法
     */
    #log(...args) {
        if (this.options.verbose) {
            console.log(`${colors.dim}[CLI]${colors.reset}`, ...args);
        }
    }

    /**
     * 打印详细日志（仅在 verbose 模式下）
     * @param {string} label - 标签
     * @param {any} data - 数据
     */
    #logVerbose(label, data) {
        if (!this.options.verbose || data == null) return;
        const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
        console.log(`${colors.dim}  ${label}: ${dataStr.substring(0, 200)}${dataStr.length > 200 ? '...' : ''}${colors.reset}`);
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
            const input = await this.rl.question(CLI_PROMPT);
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
        const skillCount = this.reactAgent.getSkillSummaries().length;
        const stats = this.baseLLMService.getStats();
        const contextCount = Math.max(0, (stats.messageCount || 1) - 1);
        const refinementStatus = this.baseLLMService.config?.enableRefinement !== false ? 'enabled' : 'disabled';
        const modeText = this.options.direct ? `${colors.yellow}直接模式${colors.reset}` : `${colors.green}智能路由${colors.reset}`;
        console.log(`
${colors.bright}${colors.cyan}🤖 ReAct Agent CLI${colors.reset}
${colors.dim}==================${colors.reset}
${colors.blue}Provider:${colors.reset} ${this.options.vendor}
${colors.blue}Model:${colors.reset}    ${this.options.model}
${colors.blue}Skills:${colors.reset}   ${skillCount} loaded
${colors.blue}Mode:${colors.reset}      ${modeText}
${colors.blue}Context:${colors.reset}  ${refinementStatus}
${colors.dim}Messages:${colors.reset} ${contextCount} messages

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
            const skill = await this.reactAgent.loadSkill(resolvedPath);
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
            const skills = await this.reactAgent.loadSkillsFromDirectory(resolvedPath);
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
            const info = this.reactAgent.unloadSkill(skillName);
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
            const skill = await this.reactAgent.reloadSkill(skillName);
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
        const summaries = this.reactAgent.getSkillSummaries();

        if (summaries.length === 0) {
            log.warning('没有已加载的 skills');
            console.log(`${colors.dim}使用 /builtin 加载内置 skills 或使用 /load 加载自定义 skills${colors.reset}`);
            return;
        }

        console.log(`\n${colors.bright}📋 已加载 Skills (${summaries.length}):${colors.reset}\n`);

        summaries.forEach((skill, index) => {
            const typeBadge = skill.isDescriptive
                ? `${colors.magenta}[描述性]${colors.reset}`
                : `${colors.green}[可执行]${colors.reset}`;
            const displayName = skill.originalName !== skill.name
                ? `${skill.originalName} (${colors.dim}${skill.name}${colors.reset})`
                : skill.name;

            console.log(`${colors.cyan}${index + 1}.${colors.reset} ${colors.bright}${displayName}${colors.reset} v${skill.version} ${typeBadge}`);
            console.log(`   ${colors.dim}${skill.description}${colors.reset}`);

            // 显示描述性技能的额外信息
            if (skill.isDescriptive) {
                if (skill.category) {
                    console.log(`   ${colors.dim}分类: ${skill.category}${colors.reset}`);
                }
                if (skill.tags && skill.tags.length > 0) {
                    console.log(`   ${colors.dim}标签: ${skill.tags.slice(0, 5).join(', ')}${colors.reset}`);
                }
                if (skill.capabilities && skill.capabilities.length > 0) {
                    console.log(`   ${colors.dim}能力: ${skill.capabilities.slice(0, 3).join(', ')}${skill.capabilities.length > 3 ? '...' : ''}${colors.reset}`);
                }
            }

            console.log(`   ${colors.dim}来源: ${skill.source}${colors.reset}\n`);
        });
    }

    /**
     * 加载内置 Skills（私有方法，初始化时自动调用）
     */
    async #loadBuiltinSkills() {
        try {
            const skills = await this.reactAgent.skillManager.loadBuiltinSkills();
            if (skills.length > 0) {
                this.#log(`自动加载 ${skills.length} 个内置 skills: ${skills.map(s => s.name).join(', ')}`);
            }
        } catch (error) {
            this.#log(`内置 skills 加载失败: ${error.message}`);
        }
    }

    /**
     * 清除对话历史
     */
    clearHistory() {
        this.reactAgent.reset();
        this.baseLLMService.clearHistory();
        log.success('对话历史已清除');
    }

    /**
     * 显示对话历史
     */
    showHistory() {
        const history = this.baseLLMService.getHistory();
        if (history.length <= 1) { // 只有系统消息
            log.warning('对话历史为空');
            return;
        }

        const stats = this.baseLLMService.getStats();
        const tokenStatus = this.baseLLMService.getTokenStatus();

        console.log(`\n${colors.bright}对话历史:${colors.reset}`);
        console.log(`${colors.dim}消息数: ${stats.messagesCount - 1} | Token 估算: ${Math.round(stats.tokenEstimate)} | 状态: ${tokenStatus.status}${colors.reset}\n`);

        history.forEach((entry, index) => {
            if (entry.role === 'user') {
                console.log(`${colors.cyan}用户:${colors.reset} ${entry.content}`);
            } else if (entry.role === 'assistant') {
                console.log(`${colors.green}Agent:${colors.reset} ${entry.content.substring(0, 200)}${entry.content.length > 200 ? '...' : ''}`);
            } else if (entry.role === 'system') {
                // 跳过系统消息或显示摘要
                return;
            }
            if (index < history.length - 1) {
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
            // 创建新的 LLM 客户端
            const llmClient = Models.createModel(vendor, model);

            // 重新创建 ReActAgent（自动加载内置工具）
            this.reactAgent = new Agent.ReActAgent(vendor, model, null, {
                verbose: this.options.verbose,
                maxIterations: 10
            });

            // 重新创建 BaseLLMService（对话管理层），保留原有上下文
            const oldHistory = this.baseLLMService.getHistory();
            this.baseLLMService = new BaseLLMService(llmClient, {
                verbose: this.options.verbose,
                maxMessages: 20,
                tokenLimit: 1024 * 64,
                enableRefinement: true,
                intentMode: 'balanced',
                language: process.env.PROMPTS_LANG || 'cn'
            });

            // 恢复历史上下文
            if (oldHistory.length > 1) {
                for (let i = 1; i < oldHistory.length; i++) {
                    const msg = oldHistory[i];
                    this.baseLLMService.sessionChat.addMessage(msg.role, msg.content);
                }
            }

            // 重新关联
            this.baseLLMService.setReActAgent(this.reactAgent);
            // 重新注册工具到 IntentRecognizer
            this.baseLLMService.registerToolsForIntent(this.reactAgent.tools);

            this.options.vendor = vendor;
            this.options.model = model;
            log.success(`已切换到: ${vendor} / ${model}`);
        } catch (error) {
            log.error(`切换失败: ${error.message}`);
        }
    }

    /**
     * 处理 ReActAgent 事件的回调函数
     * @param {Object} chunk - 事件数据
     */
    #handleAgentEvent(chunk) {
        switch (chunk.type) {
            case 'parsed':
                if (chunk.thought) log.thinking(chunk.thought);
                break;
            case 'tool_start':
                log.tool(`执行: ${chunk.tool}`);
                this.#logVerbose('参数', chunk.input);
                break;
            case 'tool_result':
                log.result(`完成: ${chunk.tool}`);
                this.#logVerbose('结果', chunk.result);
                break;
            case 'final_answer':
                console.log();
                log.answer(chunk.message);
                console.log();
                break;
            case 'error':
                console.log();
                log.error(`错误: ${chunk.error}`);
                console.log(`${colors.dim}提示: 使用 --verbose 查看详细错误信息${colors.reset}`);
                console.log();
                break;
            case 'max_iterations':
                log.warning(chunk.message);
                break;
            // 'start', 'thinking', 'complete' 等事件静默处理
        }
    }

    /**
     * 执行对话
     * 新架构：通过 BaseLLMService 处理，支持意图识别和上下文保持
     * 直接模式：绕过 BaseLLMService，直接使用 ReActAgent
     */
    async chat(query) {
        try {
            console.log(); // 空行

            // 直接模式：绕过 BaseLLMService，直接使用 ReActAgent
            if (this.options.direct) {
                this.#logVerbose('模式', '直接模式 (绕过 BaseLLMService)');
                await this.reactAgent.executeTaskStream({ query }, (chunk) => {
                    this.#handleAgentEvent(chunk);
                });
                return;
            }

            // 使用 BaseLLMService 进行流式对话
            // 新架构流程：
            // 1. IntentRecognizer - 判断是否需要工具
            // 2. 问题完善 - 基于对话历史理解用户意图，完善问题描述
            // 3. 路由决策 - 决定使用 SessionChat 还是 ReActAgent
            // 4. 上下文管理（所有对话历史都保存在 BaseLLMService 中）
            await this.baseLLMService.streamChat(query, (chunk) => {
                // 先处理 BaseLLMService 特有事件
                switch (chunk.type) {
                    case 'intent_recognized':
                        // 显示意图识别结果（verbose 模式）
                        const needsToolsText = chunk.needsTools ? '需要工具' : '直接对话';
                        const confidenceText = chunk.confidence === 'high' ? '高' : chunk.confidence === 'medium' ? '中' : '低';
                        this.#logVerbose('意图识别', `${needsToolsText} (${confidenceText}置信度) - ${chunk.reason}`);
                        if (chunk.suggestedTools && chunk.suggestedTools.length > 0) {
                            this.#logVerbose('建议工具', chunk.suggestedTools.join(', '));
                        }
                        if (chunk.needsRefinement) {
                            this.#logVerbose('问题完善', `${chunk.originalInput} → ${chunk.refinedQuery}`);
                        }
                        break;
                    case 'routing':
                        // 显示路由决策（verbose 模式）
                        this.#logVerbose('路由', `目标: ${chunk.target} (${chunk.reason || chunk.needsTools ? 'needsTools=' + chunk.needsTools : ''})`);
                        break;
                    case 'intent_refined':
                        // 显示意图理解结果（仅在 verbose 模式）
                        this.#logVerbose('意图理解', `${chunk.original} → ${chunk.refined}`);
                        break;
                    default:
                        // 其他事件委托给通用处理器
                        this.#handleAgentEvent(chunk);
                        break;
                }
            });

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
