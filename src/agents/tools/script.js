/**
 * 脚本执行工具
 * 支持运行本地脚本，Windows 使用 PowerShell，Linux/macOS 使用 Bash
 */

import {spawn} from 'child_process';
import {platform} from 'os';
import {createLogger} from '../utils/logger.js';

const log = createLogger('ScriptTool', false);

/**
 * 获取当前平台的默认 shell
 * @returns {Object} - { shell, shellArg }
 */
function getDefaultShell() {
    const currentPlatform = platform();

    switch (currentPlatform) {
        case 'win32':
            return {
                shell: 'powershell.exe',
                shellArg: '-Command',
                shellName: 'PowerShell'
            };
        case 'darwin':
        case 'linux':
        default:
            return {
                shell: 'bash',
                shellArg: '-c',
                shellName: 'Bash'
            };
    }
}

/**
 * 执行脚本命令
 * @param {string} command - 要执行的命令
 * @param {Object} options - 执行选项
 * @param {number} options.timeout - 超时时间（毫秒），默认 60000
 * @param {string} options.cwd - 工作目录
 * @param {Object} options.env - 环境变量
 * @returns {Promise<Object>} - 执行结果
 */
function executeCommand(command, options = {}) {
    return new Promise((resolve) => {
        const { shell, shellArg, shellName } = getDefaultShell();
        const timeout = options.timeout || 60000;

        log(`Executing ${shellName} command:`, command.substring(0, 100) + (command.length > 100 ? '...' : ''));

        const childProcess = spawn(shell, [shellArg, command], {
            cwd: options.cwd,
            env: { ...process.env, ...options.env },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';
        let timeoutId;

        // 收集标准输出
        childProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        // 收集标准错误
        childProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        // 设置超时
        if (timeout > 0) {
            timeoutId = setTimeout(() => {
                childProcess.kill('SIGTERM');
                resolve({
                    success: false,
                    exitCode: -1,
                    stdout: stdout,
                    stderr: stderr,
                    error: `Command timed out after ${timeout}ms`,
                    shell: shellName,
                    command: command
                });
            }, timeout);
        }

        // 进程结束
        childProcess.on('close', (exitCode) => {
            if (timeoutId) clearTimeout(timeoutId);

            const result = {
                success: exitCode === 0,
                exitCode: exitCode,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                shell: shellName,
                command: command
            };

            if (exitCode !== 0) {
                result.error = `Command failed with exit code ${exitCode}`;
            }

            log(`Command completed with exit code:`, exitCode);
            resolve(result);
        });

        // 进程错误
        childProcess.on('error', (error) => {
            if (timeoutId) clearTimeout(timeoutId);

            resolve({
                success: false,
                exitCode: -1,
                stdout: stdout,
                stderr: stderr,
                error: `Failed to execute command: ${error.message}`,
                shell: shellName,
                command: command
            });
        });
    });
}

/**
 * 脚本执行工具
 * 支持执行 PowerShell/Bash 命令和脚本
 */
export const scriptTool = {
    name: 'script',
    description: '执行本地脚本命令。Windows 使用 PowerShell，Linux/macOS 使用 Bash。支持执行系统命令、文件操作、数据处理等',
    parameters: {
        type: 'object',
        properties: {
            command: {
                type: 'string',
                description: '要执行的命令或脚本内容'
            },
            timeout: {
                type: 'integer',
                description: '超时时间（毫秒），默认 60000（60秒），最大 300000（5分钟）',
                default: 60000,
                minimum: 1000,
                maximum: 300000
            },
            cwd: {
                type: 'string',
                description: '工作目录（可选）'
            },
            description: {
                type: 'string',
                description: '命令的描述/目的（用于日志记录）'
            }
        },
        required: ['command']
    },
    handler: async (args) => {
        const { command, timeout, cwd, description } = args;

        if (!command || typeof command !== 'string') {
            throw new Error('命令不能为空');
        }

        // 安全检查：禁止执行危险命令
        const dangerousPatterns = [
            /rm\s+-rf\s+\//i,           // Linux: rm -rf /
            /format\s+[a-z]:/i,         // Windows: format C:
            /del\s+\/?f\s+.*\*\.\*/i,   // Windows: del /f /s /q
            />\s*\/dev\/null.*dd\s+if/i // Dangerous dd commands
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(command)) {
                throw new Error('检测到潜在危险命令，已拒绝执行');
            }
        }

        if (description) {
            log(`Command description:`, description);
        }

        const result = await executeCommand(command, { timeout, cwd });

        if (!result.success) {
            const errorMsg = result.error || result.stderr || 'Unknown error';
            throw new Error(`脚本执行失败: ${errorMsg}`);
        }

        return {
            success: true,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
            shell: result.shell
        };
    }
};

/**
 * 获取当前平台的 shell 信息
 */
export const shellInfoTool = {
    name: 'shell_info',
    description: '获取当前系统的 shell 信息，包括类型、版本等',
    parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
    },
    handler: async () => {
        const { shell, shellName } = getDefaultShell();
        const currentPlatform = platform();

        let version = '';
        try {
            if (currentPlatform === 'win32') {
                const result = await executeCommand('$PSVersionTable.PSVersion', { timeout: 5000 });
                version = result.stdout;
            } else {
                const result = await executeCommand('bash --version | head -1', { timeout: 5000 });
                version = result.stdout;
            }
        } catch (e) {
            version = 'Unknown';
        }

        return {
            platform: currentPlatform,
            shell: shell,
            shellName: shellName,
            version: version,
            workingDirectory: process.cwd()
        };
    }
};

/**
 * 获取所有脚本工具
 * @returns {Array} - 脚本工具数组
 */
export function getScriptTools() {
    return [scriptTool, shellInfoTool];
}
