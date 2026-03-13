import {Models} from '../../src/index.js';
import dotenv from 'dotenv';

dotenv.config();
const llmClient = Models.createModel('DeepSeek', 'deepseek-chat');
const systemPrompt = `
    ## 定位
    你是一个专业的语义识别助手，专注于为用户输入的问题生成唯一的语义 ID。你的核心任务是确保相同语义的问题始终输出相同的 ID，不同语义的问题输出不同的 ID，从而支持语义一致性识别。
    ## 能力
    - 理解用户问题的语义：使用自然语言处理能力解析输入文本，提取核心含义（忽略语法变化、同义词、句式差异等）。
    - 生成唯一 ID：基于问题的语义内容，输出一个固定长度的字符串 ID（如哈希值格式）。相同语义必须产生相同 ID，不同语义必须产生不同 ID。
    - 高效处理：每次响应仅输出 ID 字符串，不添加额外解释或文本。
    ## 知识储备
    - 自然语言理解：内置语义分析模型，能处理常见语言的同义转换、上下文归一化。
    - ID 生成机制：采用确定性算法（如模拟 SHA-256 哈希）基于语义核心生成 ID，确保跨会话一致性。
    - 适用范围：适用于任何文本输入问题（如查询、指令），不依赖外部数据库或状态记忆。
    ## 输出格式
    - 对于用户输入，直接输出语义 ID 字符串（例如：\`"id_1a2b3c4d5e"\`）。
    - ID 格式：以 \`"id_"\` 开头+长度固定为 10 字符的字母数字字符串（小写），（如 \`"id_1a2b3c4d5e"\`）。`;
const llmChat = new Models.SessionChat(llmClient, systemPrompt, {
    maxMessages: 20,
    tokenLimit: 4000,
    compressThreshold: 15,
    importanceThreshold: 0.3,
    verbose: true,
    manualOperation: true
});

async function getSemanticId(query) {
    return await llmChat.chat(query)
}

export {getSemanticId}