/**
 * 代码执行工具
 * 支持执行 Node.js 和 Python 代码，让 AI 能够动态编程解决问题
 */

import {spawn} from 'child_process';
import {createLogger} from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const log = createLogger('CodeExecutor', false);

/**
 * 执行代码
 * @param {string} code - 要执行的代码
 * @param {string} language - 编程语言 (nodejs 或 python)
 * @param {Object} options - 执行选项
 * @param {number} options.timeout - 超时时间（毫秒）
 * @param {string} options.cwd - 工作目录
 * @returns {Promise<Object>} - 执行结果
 */
async function executeCode(code, language, options = {}) {
    const timeout = options.timeout || 30000;
    const cwd = options.cwd || process.cwd();
    const startTime = Date.now();

    // 创建临时文件
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'code-exec-'));
    const timestamp = Date.now();
    let filePath;
    let command;
    let args;

    if (language === 'nodejs' || language === 'javascript' || language === 'js') {
        filePath = path.join(tempDir, `script-${timestamp}.mjs`);
        await fs.writeFile(filePath, code, 'utf-8');
        command = 'node';
        args = [filePath];
    } else if (language === 'python' || language === 'py') {
        filePath = path.join(tempDir, `script-${timestamp}.py`);
        await fs.writeFile(filePath, code, 'utf-8');
        command = 'python';
        args = [filePath];
    } else {
        throw new Error(`不支持的语言: ${language}。支持: nodejs, python`);
    }

    log(`执行 ${language} 代码:`, code.substring(0, 100) + '...');

    return new Promise((resolve) => {
        const childProcess = spawn(command, args, {
            cwd,
            env: { ...process.env, NODE_ENV: 'production' },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        const MAX_OUTPUT_SIZE = 10 * 1024 * 1024; // 10MB limit
        const stdoutChunks = [];
        const stderrChunks = [];
        let stdoutSize = 0;
        let stderrSize = 0;
        let timeoutId;

        // 清理临时文件辅助函数
        const cleanup = async () => {
            try {
                await fs.unlink(filePath);
                await fs.rmdir(tempDir);
            } catch (e) {
                // 忽略清理错误
            }
        };

        // 收集标准输出
        childProcess.stdout.on('data', (data) => {
            const chunk = data.toString();
            if (stdoutSize < MAX_OUTPUT_SIZE) {
                const remaining = MAX_OUTPUT_SIZE - stdoutSize;
                stdoutChunks.push(chunk.slice(0, remaining));
                stdoutSize += Math.min(chunk.length, remaining);
            }
        });

        // 收集标准错误
        childProcess.stderr.on('data', (data) => {
            const chunk = data.toString();
            if (stderrSize < MAX_OUTPUT_SIZE) {
                const remaining = MAX_OUTPUT_SIZE - stderrSize;
                stderrChunks.push(chunk.slice(0, remaining));
                stderrSize += Math.min(chunk.length, remaining);
            }
        });

        // 设置超时
        if (timeout > 0) {
            timeoutId = setTimeout(() => {
                childProcess.kill('SIGTERM');
                resolve({
                    success: false,
                    exitCode: -1,
                    stdout: stdoutChunks.join('').trim(),
                    stderr: stderrChunks.join('').trim(),
                    error: `代码执行超时 (${timeout}ms)`,
                    language,
                    executionTime: timeout
                });
            }, timeout);
        }

        // 进程结束
        childProcess.on('close', async (exitCode) => {
            if (timeoutId) clearTimeout(timeoutId);

            // 清理临时文件
            await cleanup();

            const stdout = stdoutChunks.join('').trim();
            const stderr = stderrChunks.join('').trim();

            const result = {
                success: exitCode === 0,
                exitCode: exitCode,
                stdout,
                stderr,
                language,
                executionTime: Date.now() - startTime
            };

            if (exitCode !== 0) {
                result.error = `代码执行失败 (exit code ${exitCode})`;
            }

            log(`代码执行完成，退出码:`, exitCode);
            resolve(result);
        });

        // 进程错误
        childProcess.on('error', async (error) => {
            if (timeoutId) clearTimeout(timeoutId);

            // 清理临时文件
            await cleanup();

            resolve({
                success: false,
                exitCode: -1,
                stdout: stdoutChunks.join(''),
                stderr: stderrChunks.join(''),
                error: `启动进程失败: ${error.message}`,
                language
            });
        });
    });
}

/**
 * 安全检查代码
 * @param {string} code - 代码内容
 * @param {string} language - 编程语言
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validateCode(code, language) {
    const errors = [];

    // 危险模式检查
    const dangerousPatterns = [
        // 文件系统危险操作
        { pattern: /rm\s+-rf\s+\//, msg: '禁止删除根目录' },
        { pattern: /del\s+\/?[fqs]\s+.*\*\.\*/, msg: '禁止批量删除文件' },
        { pattern: /format\s+[a-z]:/, msg: '禁止格式化磁盘' },

        // 网络危险操作
        { pattern: /socket\s*\.\s*connect\s*\(\s*[^)]*25[0-5]\./, msg: '禁止直接连接外部IP' },

        // 系统危险操作
        { pattern: /eval\s*\(\s*process\.env/, msg: '禁止 eval 环境变量' },
        { pattern: /child_process/, msg: '禁止创建子进程' },
        { pattern: /spawn\s*\(/, msg: '禁止 spawn 子进程' },
        { pattern: /exec\s*\(/, msg: '禁止 exec 执行命令' },

        // 无限循环检查 (简单检查)
        { pattern: /while\s*\(\s*true\s*\)/, msg: '禁止无限循环 (while(true))' },
        { pattern: /for\s*\(\s*;\s*;\s*\)/, msg: '禁止无限循环 (for(;;))' },
    ];

    for (const { pattern, msg } of dangerousPatterns) {
        if (pattern.test(code)) {
            errors.push(msg);
        }
    }

    // 代码长度检查
    if (code.length > 100000) {
        errors.push('代码长度超过 100KB 限制');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * 代码执行工具
 * 支持 Node.js 和 Python 代码的动态执行
 */
export const codeExecutorTool = {
    name: 'code_executor',
    description: '执行 Node.js 或 Python 代码。当现有工具无法满足需求时，AI 可以编写代码来完成特定任务，如数据处理、文件转换、复杂计算等',
    parameters: {
        type: 'object',
        properties: {
            code: {
                type: 'string',
                description: '要执行的代码内容'
            },
            language: {
                type: 'string',
                enum: ['nodejs', 'python'],
                description: '编程语言：nodejs (JavaScript) 或 python'
            },
            description: {
                type: 'string',
                description: '代码功能的简要描述'
            },
            timeout: {
                type: 'integer',
                description: '超时时间（毫秒），默认 30000（30秒），最大 120000（2分钟）',
                default: 30000,
                minimum: 1000,
                maximum: 120000
            },
            inputs: {
                type: 'object',
                description: '传递给代码的输入数据（可选）',
                additionalProperties: true
            }
        },
        required: ['code', 'language']
    },
    handler: async (args) => {
        const { code, language, description, timeout, inputs } = args;

        if (!code || typeof code !== 'string') {
            throw new Error('代码内容不能为空');
        }

        if (!language) {
            throw new Error('必须指定编程语言 (nodejs 或 python)');
        }

        // 安全检查
        const validation = validateCode(code, language);
        if (!validation.valid) {
            throw new Error(`代码安全检查失败: ${validation.errors.join(', ')}`);
        }

        if (description) {
            log(`代码描述:`, description);
        }

        // 如果提供了 inputs，将其序列化并添加到代码中
        let finalCode = code;

        // 对于 Node.js，如果代码包含 return 语句，将其包装在 async IIFE 中
        if (language === 'nodejs' || language === 'javascript' || language === 'js') {
            const hasReturn = /\breturn\s+/.test(code);
            if (hasReturn && !code.includes('function') && !code.includes('=>')) {
                // 简单包装，处理顶级 return 语句
                finalCode = `(async () => {\n${code}\n})().catch(console.error);`;
            }
        }

        if (inputs && Object.keys(inputs).length > 0) {
            if (language === 'nodejs' || language === 'javascript' || language === 'js') {
                const inputsJson = JSON.stringify(inputs, null, 2);
                finalCode = `const INPUTS = ${inputsJson};\n\n${finalCode}`;
            } else if (language === 'python' || language === 'py') {
                // 使用 base64 编码避免引号问题
                const inputsJson = JSON.stringify(inputs);
                const base64Data = Buffer.from(inputsJson).toString('base64');
                finalCode = `import json\nimport base64\nINPUTS = json.loads(base64.b64decode('${base64Data}').decode('utf-8'))\n\n${finalCode}`;
            }
        }

        const result = await executeCode(finalCode, language, { timeout });

        if (!result.success) {
            const errorMsg = result.error || result.stderr || '代码执行失败';
            throw new Error(errorMsg);
        }

        return {
            success: true,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
            language: result.language,
            executionTime: result.executionTime,
            description: description || '代码执行'
        };
    }
};

/**
 * 代码生成辅助工具
 * 帮助 AI 生成常见任务的代码模板
 */
export const codeGeneratorTool = {
    name: 'code_generator',
    description: '生成常见任务的代码模板，帮助 AI 快速编写 Node.js 或 Python 代码',
    parameters: {
        type: 'object',
        properties: {
            task: {
                type: 'string',
                description: '任务描述',
                enum: ['file_read', 'file_write', 'data_transform', 'api_call', 'csv_parse', 'json_process', 'regex_extract', 'math_compute']
            },
            language: {
                type: 'string',
                enum: ['nodejs', 'python'],
                description: '编程语言'
            },
            requirements: {
                type: 'string',
                description: '具体需求描述'
            }
        },
        required: ['task', 'language']
    },
    handler: async (args) => {
        const { task, language, requirements } = args;

        const templates = {
            nodejs: {
                file_read: `const fs = require('fs');\nconst path = require('path');\n\n// 读取文件\nconst filePath = process.argv[2] || 'input.txt';\nconst content = fs.readFileSync(filePath, 'utf-8');\nconsole.log(content);`,

                file_write: `const fs = require('fs');\nconst path = require('path');\n\n// 写入文件\nconst outputPath = process.argv[2] || 'output.txt';\nconst content = 'Your content here';\nfs.writeFileSync(outputPath, content, 'utf-8');\nconsole.log('File written to:', outputPath);`,

                data_transform: `// 数据转换\nconst data = INPUTS.data || [];\n\n// 在这里进行数据转换\nconst result = data.map(item => {\n    // 转换逻辑\n    return item;\n});\n\nconsole.log(JSON.stringify(result, null, 2));`,

                csv_parse: `// CSV 解析\nconst fs = require('fs');\n\nfunction parseCSV(content) {\n    const lines = content.trim().split('\\n');\n    const headers = lines[0].split(',');\n    const data = lines.slice(1).map(line => {\n        const values = line.split(',');\n        const obj = {};\n        headers.forEach((h, i) => obj[h] = values[i]);\n        return obj;\n    });\n    return data;\n}\n\n// 使用示例\nconst csvContent = INPUTS.csv || '';\nconst parsed = parseCSV(csvContent);\nconsole.log(JSON.stringify(parsed, null, 2));`,

                json_process: `// JSON 处理\nconst data = INPUTS.json || {};\n\n// 在这里处理 JSON\nconst result = {\n    // 处理结果\n};\n\nconsole.log(JSON.stringify(result, null, 2));`,

                regex_extract: `// 正则提取\nconst text = INPUTS.text || '';\nconst pattern = new RegExp(INPUTS.pattern || '', 'g');\n\nconst matches = text.match(pattern) || [];\nconsole.log('Matches:', matches);`,

                math_compute: `// 数学计算\nconst data = INPUTS.numbers || [];\n\nconst sum = data.reduce((a, b) => a + b, 0);\nconst avg = data.length > 0 ? sum / data.length : 0;\nconst max = Math.max(...data);\nconst min = Math.min(...data);\n\nconsole.log(JSON.stringify({ sum, avg, max, min }, null, 2));`
            },
            python: {
                file_read: `import sys\n\n# 读取文件\nfile_path = sys.argv[1] if len(sys.argv) > 1 else 'input.txt'\nwith open(file_path, 'r', encoding='utf-8') as f:\n    content = f.read()\nprint(content)`,

                file_write: `import sys\n\n# 写入文件\noutput_path = sys.argv[1] if len(sys.argv) > 1 else 'output.txt'\ncontent = 'Your content here'\nwith open(output_path, 'w', encoding='utf-8') as f:\n    f.write(content)\nprint(f'File written to: {output_path}')`,

                data_transform: `import json\n\n# 数据转换\ndata = INPUTS.get('data', [])\n\n# 在这里进行数据转换\nresult = [item for item in data]\n\nprint(json.dumps(result, indent=2, ensure_ascii=False))`,

                csv_parse: `import csv\nimport json\nimport io\n\n# CSV 解析\ncsv_content = INPUTS.get('csv', '')\nreader = csv.DictReader(io.StringIO(csv_content))\ndata = list(reader)\n\nprint(json.dumps(data, indent=2, ensure_ascii=False))`,

                json_process: `import json\n\n# JSON 处理\ndata = INPUTS.get('json', {})\n\n# 在这里处理 JSON\nresult = {}\n\nprint(json.dumps(result, indent=2, ensure_ascii=False))`,

                regex_extract: `import re\nimport json\n\n# 正则提取\ntext = INPUTS.get('text', '')\npattern = INPUTS.get('pattern', '')\n\nmatches = re.findall(pattern, text)\nprint(json.dumps({'matches': matches}, indent=2, ensure_ascii=False))`,

                math_compute: `import json\nimport statistics\n\n# 数学计算\ndata = INPUTS.get('numbers', [])\n\nif data:\n    result = {\n        'sum': sum(data),\n        'avg': statistics.mean(data),\n        'max': max(data),\n        'min': min(data),\n        'count': len(data)\n    }\nelse:\n    result = {}\n\nprint(json.dumps(result, indent=2, ensure_ascii=False))`
            }
        };

        const template = templates[language]?.[task];
        if (!template) {
            throw new Error(`未找到 ${language} 语言的 ${task} 模板`);
        }

        return {
            success: true,
            template: template,
            task,
            language,
            requirements: requirements || '无特定要求',
            usage: `使用 code_executor 工具执行此代码，language 设置为 "${language}"`
        };
    }
};

/**
 * 获取所有代码执行相关工具
 * @returns {Array} - 工具数组
 */
export function getCodeExecutorTools() {
    return [codeExecutorTool, codeGeneratorTool];
}
