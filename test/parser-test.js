/**
 * 测试修复后的 ReAct 解析器
 */

// 模拟解析器逻辑
function parseResponse(response) {
    const lines = response.split('\n');
    let thought = '';
    let action = '';
    let actionInput = '';
    let finalAnswer = '';
    let inFinalAnswer = false;
    let inActionInput = false;

    function isValidJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed.startsWith('Thought:')) {
            thought = trimmed.substring(8).trim();
            inFinalAnswer = false;
            inActionInput = false;
        } else if (trimmed.startsWith('Action:')) {
            action = trimmed.substring(7).trim();
            inFinalAnswer = false;
            inActionInput = false;
        } else if (trimmed.startsWith('Action Input:')) {
            actionInput = trimmed.substring(13).trim();
            inFinalAnswer = false;
            if (actionInput.startsWith('{')) {
                inActionInput = true;
                if (isValidJSON(actionInput)) {
                    inActionInput = false;
                }
            }
        } else if (trimmed.startsWith('Final Answer:')) {
            finalAnswer = trimmed.substring(13).trim();
            inFinalAnswer = true;
            inActionInput = false;
        } else if (inFinalAnswer) {
            finalAnswer += '\n' + line;
        } else if (inActionInput) {
            actionInput += '\n' + line;
            if (isValidJSON(actionInput)) {
                inActionInput = false;
            }
        }
    }

    if (actionInput && actionInput.startsWith('{') && actionInput.endsWith('}')) {
        try {
            actionInput = JSON.parse(actionInput);
        } catch (e) {
            // 保持字符串形式
        }
    }

    return { thought, action, actionInput, finalAnswer };
}

// 测试用例1: 包含大段代码的Action Input
const testCase1 = `Thought: 我需要分析日志文件
Action: code_executor
Action Input: {
  "code": "import json\\nfrom collections import defaultdict\\n\\n# 解析日志数据\\nlog_lines = [\\n    '2024-03-13 08:23:45 192.168.1.100 GET /api/users 200 1254 45ms',\\n    '2024-03-13 08:24:12 192.168.1.101 POST /api/login 200 892 120ms',\\n    '2024-03-13 08:26:45 192.168.1.104 GET /api/products 500 45 234ms'\\n]\\n\\ndef parse_log_line(line):\\n    parts = line.split()\\n    return {\\n        'timestamp': f'{parts[0]} {parts[1]}',\\n        'ip': parts[2],\\n        'method': parts[3],\\n        'endpoint': parts[4],\\n        'status_code': int(parts[5]),\\n        'response_size': int(parts[6]),\\n        'response_time': int(parts[7].replace('ms', ''))\\n    }\\n\\nlogs = [parse_log_line(line) for line in log_lines]\\n\\n# 统计状态码\\nstatus_counts = defaultdict(int)\\nfor log in logs:\\n    status_counts[log['status_code']] += 1\\n\\nprint('Status Code Statistics:')\\nfor status, count in sorted(status_counts.items()):\\n    print(f'  {status}: {count}')\\n",
  "language": "python",
  "description": "分析日志数据"
}`;

// 测试用例2: 简单的单行JSON
const testCase2 = `Thought: 我需要读取文件
Action: file_reader
Action Input: {"path": "/tmp/test.txt", "encoding": "utf-8"}`;

// 测试用例3: Final Answer多行
const testCase3 = `Thought: 我已经完成分析
Action: Final Answer
Final Answer: 这里是多行答案
第一行内容
第二行内容
第三行内容`;

// 测试用例4: 包含多层嵌套的大JSON
const testCase4 = `Thought: 我需要处理复杂数据
Action: code_executor
Action Input: {
  "code": "data = {\\n    'users': [\\n        {'id': 1, 'name': '张三', 'age': 28},\\n        {'id': 2, 'name': '李四', 'age': 35}\\n    ],\\n    'settings': {\\n        'theme': 'dark',\\n        'notifications': True\\n    }\\n}\\n\\nfor user in data['users']:\\n    print(f\\"User {user['id']}: {user['name']}\\")\\n",
  "language": "python",
  "inputs": {"key": "value"}
}`;

// 运行测试
console.log('=== 测试1: 包含大段代码的Action Input ===\n');
const result1 = parseResponse(testCase1);
console.log('Thought:', result1.thought);
console.log('Action:', result1.action);
console.log('ActionInput type:', typeof result1.actionInput);
if (typeof result1.actionInput === 'object' && result1.actionInput.code) {
    console.log('Code length:', result1.actionInput.code.length);
    console.log('Language:', result1.actionInput.language);
    console.log('\n✅ 成功解析包含大段代码的JSON!');
} else {
    console.log('ActionInput:', result1.actionInput);
    console.log('\n❌ 解析失败');
}

console.log('\n=== 测试2: 简单的单行JSON ===\n');
const result2 = parseResponse(testCase2);
console.log('Thought:', result2.thought);
console.log('Action:', result2.action);
console.log('ActionInput:', JSON.stringify(result2.actionInput));
if (typeof result2.actionInput === 'object' && result2.actionInput.path === '/tmp/test.txt') {
    console.log('\n✅ 成功解析单行JSON!');
} else {
    console.log('\n❌ 解析失败');
}

console.log('\n=== 测试3: Final Answer多行 ===\n');
const result3 = parseResponse(testCase3);
console.log('Thought:', result3.thought);
console.log('Action:', result3.action);
console.log('FinalAnswer lines:', result3.finalAnswer.split('\n').length);
if (result3.finalAnswer.includes('第一行内容') && result3.finalAnswer.includes('第三行内容')) {
    console.log('\n✅ 成功解析多行Final Answer!');
} else {
    console.log('\n❌ 解析失败');
}

console.log('\n=== 测试4: 多层嵌套的大JSON ===\n');
const result4 = parseResponse(testCase4);
console.log('Thought:', result4.thought);
console.log('Action:', result4.action);
console.log('ActionInput type:', typeof result4.actionInput);
if (typeof result4.actionInput === 'object' && result4.actionInput.inputs) {
    console.log('Has inputs:', true);
    console.log('Code length:', result4.actionInput.code.length);
    console.log('\n✅ 成功解析多层嵌套JSON!');
} else {
    console.log('ActionInput:', result4.actionInput);
    console.log('\n❌ 解析失败');
}

console.log('\n=== 所有测试完成 ===');
