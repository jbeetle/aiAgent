/**
 * Code Executor 真实任务测试
 *
 * 测试 ReActAgent 使用 code_executor 解决真实问题
 */

import {Agent, Tools} from '../src/index.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';

dotenv.config();

async function createWebServerLog() {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'real-task-'));
    const logPath = path.join(tempDir, 'web-server.log');

    // 生成模拟的 Web 服务器日志
    const logEntries = [
        '2024-03-13 08:23:45 192.168.1.100 GET /api/users 200 1254 45ms',
        '2024-03-13 08:24:12 192.168.1.101 POST /api/login 200 892 120ms',
        '2024-03-13 08:24:15 192.168.1.102 GET /api/products 200 3456 67ms',
        '2024-03-13 08:25:33 192.168.1.103 GET /api/users 200 1254 52ms',
        '2024-03-13 08:26:01 192.168.1.100 POST /api/order 201 567 89ms',
        '2024-03-13 08:26:45 192.168.1.104 GET /api/products 500 45 234ms',
        '2024-03-13 08:27:12 192.168.1.105 GET /api/users 200 1254 41ms',
        '2024-03-13 08:28:33 192.168.1.106 POST /api/login 401 123 15ms',
        '2024-03-13 08:29:01 192.168.1.107 GET /api/products 200 3456 72ms',
        '2024-03-13 08:30:22 192.168.1.108 POST /api/order 201 567 95ms',
        '2024-03-13 08:31:45 192.168.1.109 GET /api/users 200 1254 48ms',
        '2024-03-13 08:32:12 192.168.1.110 GET /api/products 404 89 12ms',
        '2024-03-13 08:33:01 192.168.1.111 POST /api/login 200 892 110ms',
        '2024-03-13 08:34:33 192.168.1.112 GET /api/users 200 1254 55ms',
        '2024-03-13 08:35:45 192.168.1.113 POST /api/order 500 234 456ms',
        '2024-03-13 08:36:12 192.168.1.114 GET /api/products 200 3456 68ms',
        '2024-03-13 08:37:01 192.168.1.115 GET /api/login 200 892 105ms',
        '2024-03-13 08:38:22 192.168.1.116 POST /api/users 201 456 78ms',
        '2024-03-13 08:39:45 192.168.1.117 GET /api/order 200 789 82ms',
        '2024-03-13 08:40:12 192.168.1.118 GET /api/products 200 3456 71ms',
    ];

    await fs.writeFile(logPath, logEntries.join('\n'), 'utf-8');
    console.log('创建 Web 服务器日志文件:', logPath);
    return logPath;
}

async function createSalesData() {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sales-task-'));
    const dataPath = path.join(tempDir, 'sales.json');

    const salesData = {
        month: '2024-03',
        region: '华北区',
        transactions: [
            {id: 'T001', date: '2024-03-01', product: '笔记本电脑', category: '电子产品', quantity: 2, unitPrice: 5999, salesperson: '张伟'},
            {id: 'T002', date: '2024-03-02', product: '无线鼠标', category: '配件', quantity: 10, unitPrice: 89, salesperson: '李娜'},
            {id: 'T003', date: '2024-03-03', product: '机械键盘', category: '配件', quantity: 5, unitPrice: 299, salesperson: '张伟'},
            {id: 'T004', date: '2024-03-04', product: '显示器', category: '电子产品', quantity: 3, unitPrice: 1299, salesperson: '王强'},
            {id: 'T005', date: '2024-03-05', product: '笔记本电脑', category: '电子产品', quantity: 1, unitPrice: 5999, salesperson: '李娜'},
            {id: 'T006', date: '2024-03-06', product: 'USB扩展坞', category: '配件', quantity: 8, unitPrice: 159, salesperson: '张伟'},
            {id: 'T007', date: '2024-03-07', product: '显示器', category: '电子产品', quantity: 2, unitPrice: 1299, salesperson: '王强'},
            {id: 'T008', date: '2024-03-08', product: '笔记本电脑', category: '电子产品', quantity: 3, unitPrice: 5999, salesperson: '李娜'},
            {id: 'T009', date: '2024-03-09', product: '无线耳机', category: '配件', quantity: 6, unitPrice: 199, salesperson: '张伟'},
            {id: 'T010', date: '2024-03-10', product: '机械键盘', category: '配件', quantity: 4, unitPrice: 299, salesperson: '王强'},
        ]
    };

    await fs.writeFile(dataPath, JSON.stringify(salesData, null, 2), 'utf-8');
    console.log('创建销售数据文件:', dataPath);
    return dataPath;
}

async function task1_logAnalysis(logPath) {
    console.log('\n========================================');
    console.log('   任务1: Web 服务器日志分析');
    console.log('========================================\n');

    if (!process.env.DEEPSEEK_API_KEY) {
        console.log('请设置 DEEPSEEK_API_KEY 环境变量');
        return;
    }

    const tools = Tools.getBuiltInTools();
    const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', tools, {
        verbose: true,
        maxIterations: 8
    });

    const query = `分析这个 Web 服务器日志文件 ${logPath}，请：
1. 统计每种 HTTP 状态码的数量
2. 找出平均响应时间最长的 API 端点
3. 统计每个 IP 的访问次数
4. 识别是否有异常（如大量错误状态码）
请使用代码执行工具来分析日志数据。`;

    console.log('用户问题:', query);
    console.log('\n开始分析...\n');

    try {
        const result = await agent.run(query);
        console.log('\n=== 分析结果 ===\n');
        console.log(result.answer);
        console.log('\n迭代次数:', result.iterations);
    } catch (error) {
        console.error('分析失败:', error.message);
    }
}

async function task2_salesAnalysis(salesPath) {
    console.log('\n========================================');
    console.log('   任务2: 销售数据分析');
    console.log('========================================\n');

    if (!process.env.DEEPSEEK_API_KEY) {
        console.log('请设置 DEEPSEEK_API_KEY 环境变量');
        return;
    }

    const tools = Tools.getBuiltInTools();
    const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', tools, {
        verbose: true,
        maxIterations: 8
    });

    const query = `分析这个销售数据文件 ${salesPath}，请生成一份销售报告：
1. 总销售额和总交易量
2. 按产品类别统计销售额
3. 找出最佳销售员（按销售额）
4. 每种产品的销售数量排行
5. 计算平均客单价
请使用代码编写数据分析。`;

    console.log('用户问题:', query);
    console.log('\n开始分析...\n');

    try {
        const result = await agent.run(query);
        console.log('\n=== 销售报告 ===\n');
        console.log(result.answer);
        console.log('\n迭代次数:', result.iterations);
    } catch (error) {
        console.error('分析失败:', error.message);
    }
}

async function task3_dataTransformation() {
    console.log('\n========================================');
    console.log('   任务3: 数据转换任务');
    console.log('========================================\n');

    if (!process.env.DEEPSEEK_API_KEY) {
        console.log('请设置 DEEPSEEK_API_KEY 环境变量');
        return;
    }

    const tools = Tools.getBuiltInTools();
    const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', tools, {
        verbose: true,
        maxIterations: 5
    });

    // 创建一个需要转换的数据文件
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'transform-'));
    const inputPath = path.join(tempDir, 'input.txt');
    const outputPath = path.join(tempDir, 'output.json');

    const rawData = `name,age,city,score
Alice,25,New York,85
Bob,30,Los Angeles,92
Charlie,28,Chicago,78
Diana,32,New York,95
Eve,27,Los Angeles,88`;

    await fs.writeFile(inputPath, rawData, 'utf-8');

    const query = `将这个 CSV 格式的文本文件 ${inputPath} 转换为 JSON 格式，并保存到 ${outputPath}。
要求：
1. 读取 CSV 内容
2. 转换为 JSON 数组格式
3. 添加一个 "grade" 字段，根据 score 值：>=90为A，>=80为B，<80为C
4. 保存到输出文件
请使用代码执行工具完成这个任务。`;

    console.log('用户问题:', query);
    console.log('\n开始转换...\n');

    try {
        const result = await agent.run(query);
        console.log('\n=== 转换结果 ===\n');
        console.log(result.answer);

        // 验证输出文件
        try {
            const outputContent = await fs.readFile(outputPath, 'utf-8');
            console.log('\n生成的 JSON 内容:');
            console.log(outputContent);
        } catch (e) {
            console.log('\n输出文件未找到或读取失败');
        }
    } catch (error) {
        console.error('转换失败:', error.message);
    }
}

async function main() {
    console.log('============================================');
    console.log('   Code Executor 真实任务测试');
    console.log('============================================');

    try {
        // 创建测试数据
        const logPath = await createWebServerLog();
        const salesPath = await createSalesData();

        // 运行真实任务测试
        await task1_logAnalysis(logPath);
        await task2_salesAnalysis(salesPath);
        await task3_dataTransformation();

        console.log('\n============================================');
        console.log('   所有任务测试完成');
        console.log('============================================');
    } catch (error) {
        console.error('测试失败:', error);
    }
}

main();
