/**
 * 测试修复后的解析器在真实 Agent 中的表现
 */

import {Agent, Tools} from '../src/index.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('============================================');
    console.log('   测试修复后的解析器');
    console.log('============================================');

    if (!process.env.DEEPSEEK_API_KEY) {
        console.log('请设置 DEEPSEEK_API_KEY 环境变量');
        return;
    }

    // 创建一个测试用的日志文件
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'parser-test-'));
    const logPath = path.join(tempDir, 'server.log');

    const logContent = `2024-03-13 08:23:45 192.168.1.100 GET /api/users 200 1254 45ms
2024-03-13 08:24:12 192.168.1.101 POST /api/login 200 892 120ms
2024-03-13 08:26:45 192.168.1.104 GET /api/products 500 45 234ms
2024-03-13 08:28:33 192.168.1.106 POST /api/login 401 123 15ms
2024-03-13 08:32:12 192.168.1.110 GET /api/products 404 89 12ms`;

    await fs.writeFile(logPath, logContent, 'utf-8');
    console.log('创建测试日志文件:', logPath);

    const tools = Tools.getBuiltInTools();
    const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', tools, {
        verbose: true,
        maxIterations: 5
    });

    console.log('\n=== 测试 Agent 使用 code_executor 处理日志 ===\n');

    const query = `分析这个日志文件 ${logPath}，统计每种 HTTP 状态码的数量和各端点的平均响应时间。请使用 Python 代码来分析。`;

    try {
        const result = await agent.run(query);
        console.log('\n=== Agent 回答 ===\n');
        console.log(result.answer);
        console.log('\n迭代次数:', result.iterations);

        if (result.iterations <= 3) {
            console.log('\n✅ 测试成功！解析器正确处理了大段代码。');
        } else {
            console.log('\n⚠️ 迭代次数较多，可能需要检查。');
        }
    } catch (error) {
        console.error('测试失败:', error.message);
    } finally {
        // 清理
        try {
            await fs.unlink(logPath);
            await fs.rmdir(tempDir);
        } catch (e) {}
    }
}

main();
