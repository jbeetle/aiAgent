/**
 * Code Executor JSON 文件处理测试
 *
 * 测试使用代码执行工具读取和处理 JSON 文件
 * 演示通过 INPUTS 传递数据到执行代码
 */

import {Tools} from '../src/index.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

async function createSampleJSON() {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'json-test-'));
    const jsonPath = path.join(tempDir, 'employees.json');

    const employeesData = {
        company: "Tech Solutions Inc.",
        department: "Engineering",
        lastUpdated: "2024-03-13",
        employees: [
            {id: 1, name: "张三", age: 28, position: "软件工程师", salary: 15000, skills: ["JavaScript", "Python", "Node.js"], joinDate: "2022-01-15"},
            {id: 2, name: "李四", age: 35, position: "高级架构师", salary: 35000, skills: ["Java", "Spring", "Microservices"], joinDate: "2020-06-01"},
            {id: 3, name: "王五", age: 26, position: "前端开发", salary: 12000, skills: ["React", "Vue", "TypeScript"], joinDate: "2023-03-10"},
            {id: 4, name: "赵六", age: 32, position: "DevOps工程师", salary: 25000, skills: ["Docker", "Kubernetes", "AWS"], joinDate: "2021-08-20"},
            {id: 5, name: "陈七", age: 29, position: "数据分析师", salary: 18000, skills: ["Python", "SQL", "Tableau"], joinDate: "2022-11-05"},
            {id: 6, name: "刘八", age: 27, position: "软件工程师", salary: 16000, skills: ["Go", "Rust", "Microservices"], joinDate: "2022-07-12"},
            {id: 7, name: "周九", age: 31, position: "产品经理", salary: 22000, skills: ["Product Design", "Agile", "Data Analysis"], joinDate: "2021-03-01"},
            {id: 8, name: "吴十", age: 24, position: "初级开发", salary: 9000, skills: ["JavaScript", "HTML", "CSS"], joinDate: "2023-09-01"}
        ]
    };

    await fs.writeFile(jsonPath, JSON.stringify(employeesData, null, 2), 'utf-8');
    console.log('创建测试 JSON 文件:', jsonPath);
    return { jsonPath, data: employeesData };
}

async function testPythonProcessing(data) {
    console.log('\n=== 测试1: 使用 Python 处理 JSON 数据 ===\n');

    const code = `
import json
import statistics
from collections import defaultdict

# 从 INPUTS 获取数据
data = INPUTS['data']
employees = data['employees']

# 分析统计
analysis = {
    'total_employees': len(employees),
    'avg_age': statistics.mean([e['age'] for e in employees]),
    'avg_salary': statistics.mean([e['salary'] for e in employees]),
    'min_salary': min(e['salary'] for e in employees),
    'max_salary': max(e['salary'] for e in employees),
}

# 职位统计
position_count = defaultdict(int)
position_salary = defaultdict(float)
for emp in employees:
    position_count[emp['position']] += 1
    position_salary[emp['position']] += emp['salary']

# 技能统计
skill_count = defaultdict(int)
for emp in employees:
    for skill in emp['skills']:
        skill_count[skill] += 1

# 入职年份分析
from collections import Counter
join_years = Counter([e['joinDate'][:4] for e in employees])

# 高薪员工
high_earners = [e for e in employees if e['salary'] > 20000]

# 输出结果
print('=' * 50)
print('Employee Data Analysis Report')
print('=' * 50)
print('Total Employees:', analysis['total_employees'])
print('Average Age:', round(analysis['avg_age'], 1))
print('Average Salary:', round(analysis['avg_salary'], 0))
print('Salary Range: $' + str(analysis['min_salary']) + ' - $' + str(analysis['max_salary']))
print()
print('Positions:')
for pos, count in sorted(position_count.items(), key=lambda x: x[1], reverse=True):
    print('  ' + pos + ': ' + str(count) + ' people')
print()
print('Top Skills:')
for skill, count in sorted(skill_count.items(), key=lambda x: x[1], reverse=True)[:10]:
    print('  ' + skill + ': ' + str(count))
print()
print('Join Year Distribution:')
for year, count in sorted(join_years.items()):
    print('  ' + year + ': ' + str(count) + ' people')
print()
print('High Earners (> $20,000): ' + str(len(high_earners)) + ' people')
for emp in high_earners:
    print('  - ' + emp['name'] + ': $' + str(emp['salary']) + ' (' + emp['position'] + ')')
`;

    try {
        const result = await Tools.codeExecutorTool.handler({
            code,
            language: 'python',
            description: '分析员工 JSON 数据',
            inputs: { data }
        });
        console.log(result.stdout);
    } catch (error) {
        console.error('执行失败:', error.message);
    }
}

async function testNodeJSProcessing(data) {
    console.log('\n=== 测试2: 使用 Node.js 处理 JSON 数据 ===\n');

    const code = `
// 从 INPUTS 获取数据
const data = INPUTS.data;
const employees = data.employees;

// 统计分析
const stats = {
    totalEmployees: employees.length,
    avgSalary: employees.reduce((sum, e) => sum + e.salary, 0) / employees.length,
    avgAge: employees.reduce((sum, e) => sum + e.age, 0) / employees.length,
};

// 职位分布
const positions = {};
employees.forEach(e => {
    positions[e.position] = (positions[e.position] || 0) + 1;
});

// 技能统计
const skills = {};
employees.forEach(e => {
    e.skills.forEach(skill => {
        skills[skill] = (skills[skill] || 0) + 1;
    });
});

// 薪资分档
const salaryRanges = {
    'Junior (< 15000)': 0,
    'Mid (15000-25000)': 0,
    'Senior (> 25000)': 0
};
employees.forEach(e => {
    if (e.salary < 15000) salaryRanges['Junior (< 15000)']++;
    else if (e.salary <= 25000) salaryRanges['Mid (15000-25000)']++;
    else salaryRanges['Senior (> 25000)']++;
});

console.log('=' .repeat(50));
console.log('Employee Statistics (Node.js)');
console.log('=' .repeat(50));
console.log('Total Employees:', stats.totalEmployees);
console.log('Average Age:', stats.avgAge.toFixed(1));
console.log('Average Salary: $' + stats.avgSalary.toFixed(0));
console.log();
console.log('Position Distribution:');
Object.entries(positions).forEach(([pos, count]) => {
    console.log('  ' + pos + ': ' + count);
});
console.log();
console.log('Top Skills:');
Object.entries(skills)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([skill, count]) => {
        console.log('  ' + skill + ': ' + count);
    });
console.log();
console.log('Salary Distribution:');
Object.entries(salaryRanges).forEach(([range, count]) => {
    console.log('  ' + range + ': ' + count + ' people');
});
`;

    try {
        const result = await Tools.codeExecutorTool.handler({
            code,
            language: 'nodejs',
            description: '使用 Node.js 分析员工 JSON',
            inputs: { data }
        });
        console.log(result.stdout);
    } catch (error) {
        console.error('执行失败:', error.message);
    }
}

async function main() {
    console.log('============================================');
    console.log('   Code Executor JSON 处理测试');
    console.log('============================================');

    let jsonPath;
    try {
        // 创建测试 JSON 文件
        const { jsonPath: path, data } = await createSampleJSON();
        jsonPath = path;

        // 运行测试
        await testPythonProcessing(data);
        await testNodeJSProcessing(data);

        console.log('\n============================================');
        console.log('   测试完成');
        console.log('============================================');
        console.log('\nJSON 文件路径:', jsonPath);
        console.log('你可以使用这个文件测试 ReActAgent:');
        console.log(`  agent.run('分析这个文件 ${jsonPath}');`);
    } catch (error) {
        console.error('测试失败:', error);
    }
}

main();
