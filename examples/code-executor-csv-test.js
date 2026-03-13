/**
 * Code Executor CSV 文件处理测试
 *
 * 测试使用代码执行工具读取和处理 CSV 文件
 */

import {Agent, Tools} from '../src/index.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';

dotenv.config();

async function createSampleCSV() {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'csv-test-'));
    const csvPath = path.join(tempDir, 'sales_data.csv');

    const csvContent = `date,product,category,quantity,price,region
2024-01-15,Laptop,Electronics,5,1200,North
2024-01-16,Mouse,Electronics,20,25,North
2024-01-17,Keyboard,Electronics,10,80,South
2024-01-18,Monitor,Electronics,3,300,East
2024-01-19,Laptop,Electronics,2,1200,West
2024-01-20,Desk,Furniture,4,500,North
2024-01-21,Chair,Furniture,8,150,South
2024-01-22,Lamp,Furniture,12,45,East
2024-01-23,Bookcase,Furniture,2,200,West
2024-01-24,Laptop,Electronics,3,1200,North`;

    await fs.writeFile(csvPath, csvContent, 'utf-8');
    console.log('创建测试 CSV 文件:', csvPath);
    return csvPath;
}

async function test1_directCodeExecution(csvPath) {
    console.log('\n=== 测试1: 直接使用代码执行工具处理 CSV ===\n');

    const escapedPath = csvPath.replace(/\\/g, '\\\\');
    const code = `
import csv
import json
from collections import defaultdict

# 读取 CSV 文件
with open('${escapedPath}', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    data = list(reader)

# 数据分析
analysis = {
    'total_records': len(data),
    'categories': {},
    'region_sales': defaultdict(float),
    'total_revenue': 0
}

for row in data:
    category = row['category']
    revenue = float(row['quantity']) * float(row['price'])
    region = row['region']

    # 按类别统计
    if category not in analysis['categories']:
        analysis['categories'][category] = {'count': 0, 'revenue': 0}
    analysis['categories'][category]['count'] += 1
    analysis['categories'][category]['revenue'] += revenue

    # 按地区统计
    analysis['region_sales'][region] += revenue
    analysis['total_revenue'] += revenue

# 转换为普通 dict 以便 JSON 序列化
analysis['region_sales'] = dict(analysis['region_sales'])

print(json.dumps(analysis, indent=2, ensure_ascii=False))
`;

    try {
        const result = await Tools.codeExecutorTool.handler({
            code,
            language: 'python',
            description: '分析销售数据 CSV'
        });
        console.log('分析结果:');
        console.log(result.stdout);
    } catch (error) {
        console.error('执行失败:', error.message);
    }
}

async function test2_agentWithCSV(csvPath) {
    console.log('\n=== 测试2: ReActAgent 处理 CSV 文件 ===\n');

    if (!process.env.DEEPSEEK_API_KEY) {
        console.log('请设置 DEEPSEEK_API_KEY 环境变量来运行此测试');
        return;
    }

    const tools = Tools.getBuiltInTools();
    const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', tools, {
        verbose: true,
        maxIterations: 5
    });

    const query = `请分析这个 CSV 文件 ${csvPath}，帮我计算：
1. 每个类别的总销售额
2. 销量最高的产品
3. 每个地区的销售情况
请以表格形式输出结果`;

    console.log('用户问题:', query);
    console.log('\nAgent 开始处理...\n');

    try {
        const result = await agent.run(query);
        console.log('\n=== Agent 最终回答 ===\n');
        console.log(result.answer);
        console.log('\n迭代次数:', result.iterations);
    } catch (error) {
        console.error('Agent 执行失败:', error.message);
    }
}

async function test3_nodejsCSVProcessing(csvPath) {
    console.log('\n=== 测试3: 使用 Node.js 处理 CSV ===\n');

    const escapedPath = csvPath.replace(/\\/g, '\\\\');
    const code = `
const fs = require('fs');
const path = require('path');

// 读取 CSV 文件
const content = fs.readFileSync('${escapedPath}', 'utf-8');
const lines = content.trim().split('\\n');
const headers = lines[0].split(',');

// 解析数据
const data = lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i]);
    return obj;
});

// 简单统计
const stats = {
    totalRecords: data.length,
    products: [...new Set(data.map(r => r.product))],
    categoryCount: {}
};

data.forEach(r => {
    const cat = r.category;
    stats.categoryCount[cat] = (stats.categoryCount[cat] || 0) + 1;
});

console.log('数据统计:');
console.log(JSON.stringify(stats, null, 2));
`;

    try {
        const result = await Tools.codeExecutorTool.handler({
            code,
            language: 'nodejs',
            description: '使用 Node.js 读取 CSV'
        });
        console.log('执行结果:');
        console.log(result.stdout);
    } catch (error) {
        console.error('执行失败:', error.message);
    }
}

async function main() {
    console.log('============================================');
    console.log('   Code Executor CSV 处理测试');
    console.log('============================================');

    let csvPath;
    try {
        // 创建测试 CSV 文件
        csvPath = await createSampleCSV();

        // 运行测试
        await test1_directCodeExecution(csvPath);
        await test3_nodejsCSVProcessing(csvPath);
        await test2_agentWithCSV(csvPath);

        console.log('\n============================================');
        console.log('   测试完成');
        console.log('============================================');
    } catch (error) {
        console.error('测试失败:', error);
    } finally {
        // 清理临时文件
        if (csvPath) {
            try {
                await fs.unlink(csvPath);
                await fs.rmdir(path.dirname(csvPath));
                console.log('\n临时文件已清理');
            } catch (e) {
                // 忽略清理错误
            }
        }
    }
}

main();
