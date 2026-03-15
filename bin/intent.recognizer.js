import {createLogger} from '../src/agents/utils/logger.js';

/**
 * IntentRecognitionConfig - 意图识别配置
 * @typedef {Object} IntentRecognitionConfig
 * @property {string} mode - 'aggressive' | 'conservative' | 'balanced' (默认: 'balanced')
 * @property {boolean} useToolDescriptions - 是否使用工具描述 (默认: true)
 * @property {boolean} useSkillDescriptions - 是否使用 Skill 描述 (默认: true)
 * @property {string} llmConfirmationThreshold - 何时使用 LLM 确认: 'low' | 'medium' | 'high' (默认: 'medium')
 * @property {number} minToolRelevanceScore - 最小工具相关度分数 (默认: 0.3)
 * @property {boolean} enableSemanticMatching - 是否启用语义匹配 (默认: true)
 * @property {number} maxToolsInPrompt - 提示词中包含的最大工具数量 (默认: 10)
 */

/**
 * IntentRecognitionResult - 意图识别结果
 * @typedef {Object} IntentRecognitionResult
 * @property {boolean} needsTools - 是否需要使用工具
 * @property {string} confidence - 'high' | 'medium' | 'low'
 * @property {string} reason - 判断理由
 * @property {string[]} suggestedTools - 建议的工具列表
 * @property {Array<{tool: string, relevance: number, reason: string}>} toolAnalysis - 工具分析详情
 */

/**
 * IntentRecognizer - 增强的意图识别器
 *
 * 功能特性：
 * 1. 基于工具描述的动态关键词生成
 * 2. 语义相似度计算
 * 3. 支持 Skills 的意图识别
 * 4. 可配置的识别策略（激进/保守/平衡）
 * 5. 改进的 LLM 确认提示词
 */
export class IntentRecognizer {
    #log;
    #tools = [];
    #skills = [];
    #config;
    #llmClient;
    #model;

    // 内置关键词模式（用于快速匹配）
    static BUILTIN_KEYWORD_PATTERNS = {
        // 高置信度工具关键词 - 明确需要工具的场景
        toolKeywordsHigh: [
            { pattern: /计算[\s\d]+[\+\-\*\/\(\)]+/i, reason: 'math_expression' },
            { pattern: /[\d\s]+[\+\-\*\/\(\)]+[\d\s]+等于[\s\?]?/i, reason: 'math_question' },
            { pattern: /(?:算一下?|求|计算)\s*[\d\s\+\-\*\/\(\)\.]+/i, reason: 'math_calculation' },
            { pattern: /(?:执行|运行)\s*(?:代码|脚本|command|script)/i, reason: 'code_execution' },
            { pattern: /(?:查询|获取|读取)\s*(?:数据|文件|信息|状态)/i, reason: 'data_query' },
            { pattern: /(?:生成|创建|写入)\s*(?:文件|代码|文档|报告)/i, reason: 'content_generation' },
            { pattern: /(?:分析|统计|处理)\s*(?:数据|日志|结果)/i, reason: 'data_analysis' },
            { pattern: /(?:调用|使用)\s*(?:工具|skill|技能)/i, reason: 'explicit_tool_call' },
        ],
        // 中置信度工具关键词
        toolKeywordsMedium: [
            { keywords: ['计算', 'calculate', 'calculator', '等于几', '多少', 'result'], reason: 'calculation_keyword' },
            { keywords: ['执行', 'execute', '运行', 'run', 'exec'], reason: 'execution_keyword' },
            { keywords: ['查询', 'query', '搜索', 'search', '查找', 'find'], reason: 'query_keyword' },
            { keywords: ['获取', 'get', 'fetch', '读取', 'read', 'load'], reason: 'fetch_keyword' },
            { keywords: ['写入', 'write', '保存', 'save', 'write', 'store'], reason: 'write_keyword' },
            { keywords: ['生成', 'generate', '创建', 'create', 'make'], reason: 'generation_keyword' },
            { keywords: ['分析', 'analyze', '统计', 'statistics', 'stats'], reason: 'analysis_keyword' },
        ],
        // 明确不需要工具的关键词（闲聊类）
        chatKeywords: [
            { keywords: ['你好', 'hello', 'hi', 'hey', '在吗'], reason: 'greeting' },
            { keywords: ['谢谢', 'thanks', 'thank you', '谢了', '感谢'], reason: 'gratitude' },
            { keywords: ['再见', 'bye', 'goodbye', '拜拜'], reason: 'farewell' },
            { keywords: ['名字', '叫什么', 'who are you', '你是谁'], reason: 'identity_question' },
            { keywords: ['帮助', 'help', '怎么用', '如何使用'], reason: 'help_request', condition: (input) => input.length < 20 },
            { keywords: ['天气', 'weather'], reason: 'weather_chat' },
            { keywords: ['时间', 'time', '几点', '日期', 'date'], reason: 'time_chat' },
        ]
    };

    /**
     * 创建 IntentRecognizer 实例
     * @param {Object} llmClient - LLM 客户端
     * @param {string} model - 模型名称
     * @param {IntentRecognitionConfig} config - 配置选项
     * @param {boolean} verbose - 是否启用详细日志
     */
    constructor(llmClient, model, config = {}, verbose = false) {
        this.#llmClient = llmClient;
        this.#model = model;
        this.#config = {
            mode: 'balanced',
            useToolDescriptions: true,
            useSkillDescriptions: true,
            llmConfirmationThreshold: 'medium',
            minToolRelevanceScore: 0.3,
            enableSemanticMatching: true,
            maxToolsInPrompt: 10,
            language: process.env.PROMPTS_LANG || 'cn',
            ...config
        };
        this.#log = createLogger('IntentRecognizer', verbose);
    }

    /**
     * 更新配置
     * @param {Partial<IntentRecognitionConfig>} config
     */
    updateConfig(config) {
        this.#config = { ...this.#config, ...config };
        this.#log('配置已更新:', this.#config);
    }

    /**
     * 获取当前配置
     * @returns {IntentRecognitionConfig}
     */
    getConfig() {
        return { ...this.#config };
    }

    /**
     * 注册工具
     * @param {Array} tools - 工具数组
     */
    registerTools(tools) {
        this.#tools = tools || [];
        this.#log(`已注册 ${this.#tools.length} 个工具用于意图识别`);
    }

    /**
     * 注册技能
     * @param {Array} skills - 技能数组
     */
    registerSkills(skills) {
        this.#skills = skills || [];
        this.#log(`已注册 ${this.#skills.length} 个技能用于意图识别`);
    }

    /**
     * 获取技能的增强描述（包含 capabilities）
     * @private
     */
    #getSkillEnhancedDescription(skill) {
        let description = skill.description || 'No description';

        // 添加 capabilities 到描述
        if (skill.capabilities && skill.capabilities.length > 0) {
            description += `\nCapabilities: ${skill.capabilities.join(', ')}`;
        }

        // 添加 category 和 tags
        if (skill.category) {
            description += `\nCategory: ${skill.category}`;
        }
        if (skill.tags && skill.tags.length > 0) {
            description += `\nTags: ${skill.tags.join(', ')}`;
        }

        // 添加 input/output
        if (skill.input && skill.input.length > 0) {
            description += `\nInput: ${skill.input.join(', ')}`;
        }
        if (skill.output && skill.output.length > 0) {
            description += `\nOutput: ${skill.output.join(', ')}`;
        }

        return description;
    }

    /**
     * 识别用户意图
     * @param {string} input - 用户输入
     * @returns {Promise<IntentRecognitionResult>}
     */
    async recognize(input) {
        this.#log('开始意图识别:', input);

        // 阶段 1: 快速关键词匹配（高置信度场景）
        const keywordResult = this.#performKeywordMatching(input);
        if (keywordResult.confidence === 'high') {
            this.#log('高置信度关键词匹配:', keywordResult);
            return keywordResult;
        }

        // 阶段 2: 基于工具描述的语义匹配
        if (this.#config.enableSemanticMatching && this.#tools.length > 0) {
            const semanticResult = this.#performSemanticMatching(input);
            if (semanticResult.confidence === 'high') {
                this.#log('高置信度语义匹配:', semanticResult);
                return semanticResult;
            }

            // 合并关键词和语义匹配结果
            const combinedResult = this.#combineResults(keywordResult, semanticResult);

            // 根据配置决定是否使用 LLM 确认
            if (this.#shouldUseLLMConfirmation(combinedResult)) {
                return await this.#performLLMConfirmation(input, combinedResult);
            }

            return combinedResult;
        }

        // 阶段 3: LLM 确认（模糊输入时使用）
        if (this.#shouldUseLLMConfirmation(keywordResult)) {
            return await this.#performLLMConfirmation(input, keywordResult);
        }

        return keywordResult;
    }

    /**
     * 执行关键词匹配
     * @private
     */
    #performKeywordMatching(input) {
        const lowerInput = input.toLowerCase().trim();

        // 1. 检查高置信度工具关键词模式
        for (const { pattern, reason } of IntentRecognizer.BUILTIN_KEYWORD_PATTERNS.toolKeywordsHigh) {
            if (pattern.test(input)) {
                return {
                    needsTools: true,
                    confidence: 'high',
                    reason: reason,
                    suggestedTools: this.#inferToolsFromReason(reason),
                    toolAnalysis: []
                };
            }
        }

        // 2. 检查高置信度闲聊关键词
        for (const { keywords, reason, condition } of IntentRecognizer.BUILTIN_KEYWORD_PATTERNS.chatKeywords) {
            for (const keyword of keywords) {
                if (lowerInput.includes(keyword.toLowerCase())) {
                    // 如果有条件函数，需要满足条件
                    if (condition && !condition(input)) {
                        continue;
                    }
                    // 检查是否同时包含工具相关词汇或分析类词汇（可能是复杂意图）
                    if (this.#hasToolRelatedWords(lowerInput) || this.#hasAnalysisWords(lowerInput)) {
                        // 继续检查中置信度工具关键词
                        break;
                    }
                    return {
                        needsTools: false,
                        confidence: 'high',
                        reason: reason,
                        suggestedTools: [],
                        toolAnalysis: []
                    };
                }
            }
        }

        // 3. 检查中置信度工具关键词
        let matchedKeywords = [];
        for (const { keywords, reason } of IntentRecognizer.BUILTIN_KEYWORD_PATTERNS.toolKeywordsMedium) {
            for (const keyword of keywords) {
                if (lowerInput.includes(keyword.toLowerCase())) {
                    matchedKeywords.push({ keyword, reason });
                }
            }
        }

        if (matchedKeywords.length > 0) {
            return {
                needsTools: true,
                confidence: 'medium',
                reason: matchedKeywords.map(m => m.reason).join(','),
                suggestedTools: this.#inferToolsFromKeywords(matchedKeywords.map(m => m.keyword)),
                toolAnalysis: matchedKeywords.map(m => ({
                    tool: m.reason,
                    relevance: 0.6,
                    reason: `matched_keyword: ${m.keyword}`
                }))
            };
        }

        // 4. 无法确定，返回低置信度
        return {
            needsTools: this.#config.mode === 'aggressive', // 激进模式下默认需要工具
            confidence: 'low',
            reason: 'unclear_input',
            suggestedTools: [],
            toolAnalysis: []
        };
    }

    /**
     * 执行语义匹配（基于工具描述）
     * @private
     */
    #performSemanticMatching(input) {
        const lowerInput = input.toLowerCase();
        const toolAnalysis = [];

        // 分析每个工具的相关度
        for (const tool of this.#tools) {
            const relevance = this.#calculateToolRelevance(tool, lowerInput);
            if (relevance.score >= this.#config.minToolRelevanceScore) {
                toolAnalysis.push({
                    tool: tool.name,
                    relevance: relevance.score,
                    reason: relevance.reason
                });
            }
        }

        // 按相关度排序
        toolAnalysis.sort((a, b) => b.relevance - a.relevance);

        // 确定是否需要工具
        if (toolAnalysis.length === 0) {
            return {
                needsTools: false,
                confidence: 'low',
                reason: 'no_matching_tools',
                suggestedTools: [],
                toolAnalysis: []
            };
        }

        const topMatch = toolAnalysis[0];
        const hasHighRelevance = topMatch.relevance >= 0.7;
        const hasMultipleMatches = toolAnalysis.filter(t => t.relevance >= 0.5).length >= 2;

        if (hasHighRelevance) {
            return {
                needsTools: true,
                confidence: 'high',
                reason: `high_relevance_match: ${topMatch.tool}`,
                suggestedTools: toolAnalysis.slice(0, 3).map(t => t.tool),
                toolAnalysis
            };
        } else if (topMatch.relevance >= 0.5 || hasMultipleMatches) {
            return {
                needsTools: true,
                confidence: 'medium',
                reason: `medium_relevance_matches: ${toolAnalysis.slice(0, 3).map(t => t.tool).join(',')}`,
                suggestedTools: toolAnalysis.slice(0, 3).map(t => t.tool),
                toolAnalysis
            };
        } else {
            return {
                needsTools: this.#config.mode === 'aggressive',
                confidence: 'low',
                reason: 'low_relevance_matches',
                suggestedTools: toolAnalysis.slice(0, 2).map(t => t.tool),
                toolAnalysis
            };
        }
    }

    /**
     * 计算工具与用户输入的相关度
     * @private
     */
    #calculateToolRelevance(tool, input) {
        let score = 0;
        const reasons = [];

        // 1. 工具名称匹配（权重高）
        const nameWords = tool.name.toLowerCase().split(/[_\-]/);
        for (const word of nameWords) {
            if (word.length > 2 && input.includes(word)) {
                score += 0.4;
                reasons.push(`name_match: ${word}`);
            }
        }

        // 2. 工具描述匹配（如果启用）
        if (this.#config.useToolDescriptions && tool.description) {
            const descWords = this.#extractKeywords(tool.description);
            let descMatches = 0;
            for (const word of descWords) {
                if (input.includes(word.toLowerCase())) {
                    descMatches++;
                }
            }
            if (descMatches > 0) {
                const descScore = Math.min(descMatches * 0.15, 0.4);
                score += descScore;
                reasons.push(`desc_matches: ${descMatches}`);
            }
        }

        // 3. 参数描述匹配
        if (tool.parameters && tool.parameters.properties) {
            const paramKeywords = Object.keys(tool.parameters.properties);
            let paramMatches = 0;
            for (const param of paramKeywords) {
                if (input.includes(param.toLowerCase())) {
                    paramMatches++;
                }
            }
            if (paramMatches > 0) {
                score += Math.min(paramMatches * 0.1, 0.2);
                reasons.push(`param_matches: ${paramMatches}`);
            }
        }

        // 4. 特殊模式匹配
        if (tool.name.includes('calculator') || tool.name.includes('math')) {
            if (/[\d\+\-\*\/\(\)\.]{3,}/.test(input)) {
                score += 0.3;
                reasons.push('math_pattern');
            }
        }
        if (tool.name.includes('code') || tool.name.includes('script')) {
            if (/(function|class|const|let|var|if|for|while|=\>|=>)/.test(input)) {
                score += 0.3;
                reasons.push('code_pattern');
            }
        }
        if (tool.name.includes('file') || tool.name.includes('read')) {
            if (/(读取|打开|查看|\.txt|\.json|\.md|\.js|\.py)/.test(input)) {
                score += 0.25;
                reasons.push('file_pattern');
            }
        }

        return {
            score: Math.min(score, 1.0),
            reason: reasons.join(', ')
        };
    }

    /**
     * 执行 LLM 意图确认
     * @private
     */
    async #performLLMConfirmation(input, previousResult) {
        try {
            const prompt = this.#createDetailedIntentPrompt(input);

            const response = await this.#llmClient.getRawClient().chat.completions.create({
                model: this.#model,
                messages: [
                    {
                        role: 'system',
                        content: this.#config.language === 'cn'
                            ? '你是一个专业的意图识别助手。请分析用户输入，判断是否需要调用工具。只返回 JSON 格式，不要有任何其他文字。'
                            : 'You are an intent recognition assistant. Analyze user input and determine if tools are needed. Respond with JSON only, no other text.'
                    },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 500,
                temperature: 0.1
            });

            const content = response.choices[0].message.content.trim();
            return this.#parseLLMResponse(content, previousResult);

        } catch (error) {
            this.#log('LLM 意图确认失败:', error);
            // 失败时根据模式返回默认结果
            return this.#getFallbackResult(previousResult);
        }
    }

    /**
     * 创建详细的意图识别提示词
     * @private
     */
    #createDetailedIntentPrompt(input) {
        const isCN = this.#config.language === 'cn';

        // 构建工具描述
        let toolDescriptions = '';
        if (this.#tools.length > 0 && this.#config.useToolDescriptions) {
            const sortedTools = this.#getRelevantToolsForPrompt(input);
            toolDescriptions = sortedTools.map((tool, idx) => {
                let desc = `${idx + 1}. ${tool.name}: ${tool.description || 'No description'}`;
                if (tool.parameters && tool.parameters.properties) {
                    const params = Object.keys(tool.parameters.properties).join(', ');
                    desc += ` (参数: ${params})`;
                }
                return desc;
            }).join('\n');
        }

        // 构建 Skill 描述（使用增强描述，包含 capabilities）
        let skillDescriptions = '';
        if (this.#skills.length > 0 && this.#config.useSkillDescriptions) {
            skillDescriptions = this.#skills.map((skill, idx) => {
                const enhancedDesc = this.#getSkillEnhancedDescription(skill);
                return `${idx + 1}. ${skill.name}: ${enhancedDesc}`;
            }).join('\n\n');
        }

        if (isCN) {
            return `请分析以下用户输入，判断是否需要调用工具或技能来完成。

重要提示：
**不需要工具的情况（needs_tools = false）：**
- 问候语：你好、再见、谢谢等
- 询问个人信息：你叫什么名字、你会做什么
- 询问当前时间/日期：现在几点、今天是几号（可以直接回答，无需工具）
- 闲聊：天气怎么样、最近如何

**需要工具的情况（needs_tools = true）：**
- 数学计算：包含数字和运算符（+、-、*、/、括号）的计算请求
- 明确说"计算"、"算一下"、"等于几"的数学问题
- 随机数生成："随机生成数字"
- 文件操作：读取、写入、分析文件
- 代码执行：运行代码、执行脚本
- 数据分析：统计分析、数据处理

${toolDescriptions ? `可用工具列表：\n${toolDescriptions}\n` : ''}
${skillDescriptions ? `\n可用技能列表：\n${skillDescriptions}\n` : ''}

用户输入："""${input}"""

请分析：
1. 这是不需要工具的闲聊/问候，还是需要工具的具体任务？
2. 是否包含数学计算、文件操作、代码执行等明确需要工具的内容？
3. 是否需要调用工具或技能来完成这个请求？
4. 如果需要，哪些工具或技能最相关？

请以 JSON 格式回复（不要包含任何其他文字）：
{
  "needs_tools": true/false,
  "confidence": "high/medium/low",
  "reason": "详细判断理由",
  "tool_analysis": [
    {"tool": "tool_name", "relevance": 0.85, "reason": "为什么相关"}
  ],
  "suggested_tools": ["建议调用的工具/技能名称"],
  "intent_summary": "用户意图摘要"
}`;
        } else {
            return `Please analyze the following user input and determine if tools or skills need to be called.

Important guidelines:
**NO tools needed (needs_tools = false):**
- Greetings: hello, goodbye, thanks, etc.
- Personal questions: what's your name, what can you do
- Current time/date queries: what time is it, what's today's date (can answer directly)
- Casual chat: how's the weather, how are you

**TOOLS needed (needs_tools = true):**
- Math calculations: requests with numbers and operators (+, -, *, /, parentheses)
- Explicit calculation requests: "calculate", "compute", "equals"
- Random number generation: "generate random number"
- File operations: read, write, analyze files
- Code execution: run code, execute script
- Data analysis: statistical analysis, data processing

${toolDescriptions ? `Available tools:\n${toolDescriptions}\n` : ''}
${skillDescriptions ? `\nAvailable skills:\n${skillDescriptions}\n` : ''}

User input: """${input}"""

Please analyze:
1. Is this casual chat/greeting or a concrete task requiring tools?
2. Does it contain math calculations, file operations, code execution that clearly need tools?
3. Do we need to call tools or skills to fulfill this request?
4. If yes, which tools or skills are most relevant?

Please respond in JSON format (no other text):
{
  "needs_tools": true/false,
  "confidence": "high/medium/low",
  "reason": "detailed reasoning",
  "tool_analysis": [
    {"tool": "tool_name", "relevance": 0.85, "reason": "why relevant"}
  ],
  "suggested_tools": ["suggested tool/skill names"],
  "intent_summary": "summary of user intent"
}`;
        }
    }

    /**
     * 解析 LLM 响应
     * @private
     */
    #parseLLMResponse(content, fallbackResult) {
        try {
            // 提取 JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : content;
            const result = JSON.parse(jsonStr);

            // 根据模式调整判断
            let needsTools = result.needs_tools === true;

            // 激进模式：即使 LLM 说不需要，只要有相关工具就尝试
            if (this.#config.mode === 'aggressive' && result.tool_analysis) {
                const hasRelevantTools = result.tool_analysis.some(
                    t => (t.relevance || 0) >= 0.5
                );
                if (hasRelevantTools && result.confidence !== 'high') {
                    needsTools = true;
                    result.reason = `aggressive_mode: ${result.reason}`;
                }
            }

            // 保守模式：只有高置信度才使用工具
            if (this.#config.mode === 'conservative') {
                if (result.confidence !== 'high') {
                    needsTools = false;
                    result.reason = `conservative_mode: ${result.reason}`;
                }
            }

            return {
                needsTools,
                confidence: result.confidence || 'medium',
                reason: result.reason || 'llm_classification',
                suggestedTools: result.suggested_tools || [],
                toolAnalysis: result.tool_analysis || [],
                intentSummary: result.intent_summary || ''
            };

        } catch (e) {
            this.#log('JSON 解析失败，使用回退策略:', e.message);
            // 回退到简单判断
            const needsTools = content.toLowerCase().includes('true') ||
                content.toLowerCase().includes('yes') ||
                content.toLowerCase().includes('"needs_tools": true');

            return {
                needsTools,
                confidence: 'low',
                reason: 'fallback_parsing',
                suggestedTools: [],
                toolAnalysis: [],
                ...fallbackResult
            };
        }
    }

    /**
     * 获取回退结果
     * @private
     */
    #getFallbackResult(previousResult) {
        // 根据模式决定默认行为
        if (this.#config.mode === 'aggressive') {
            return {
                needsTools: true,
                confidence: 'low',
                reason: 'llm_error_aggressive_fallback',
                suggestedTools: previousResult.suggestedTools || [],
                toolAnalysis: previousResult.toolAnalysis || []
            };
        } else if (this.#config.mode === 'conservative') {
            return {
                needsTools: false,
                confidence: 'low',
                reason: 'llm_error_conservative_fallback',
                suggestedTools: [],
                toolAnalysis: []
            };
        } else {
            // 平衡模式：让 ReActAgent 自己决定
            return {
                needsTools: true,
                confidence: 'low',
                reason: 'llm_error_let_react_decide',
                suggestedTools: previousResult.suggestedTools || [],
                toolAnalysis: previousResult.toolAnalysis || []
            };
        }
    }

    /**
     * 合并关键词匹配和语义匹配结果
     * @private
     */
    #combineResults(keywordResult, semanticResult) {
        // 如果两者一致，使用高置信度
        if (keywordResult.needsTools === semanticResult.needsTools) {
            const confidence = keywordResult.confidence === 'high' || semanticResult.confidence === 'high'
                ? 'high' : 'medium';
            return {
                needsTools: keywordResult.needsTools,
                confidence,
                reason: `${keywordResult.reason}; ${semanticResult.reason}`,
                suggestedTools: semanticResult.suggestedTools.length > 0
                    ? semanticResult.suggestedTools
                    : keywordResult.suggestedTools,
                toolAnalysis: semanticResult.toolAnalysis
            };
        }

        // 如果不一致，优先使用语义匹配结果（因为它基于工具描述）
        if (semanticResult.confidence === 'high') {
            return semanticResult;
        }

        if (keywordResult.confidence === 'high') {
            return keywordResult;
        }

        // 都低置信度，返回合并结果让 LLM 确认
        return {
            needsTools: this.#config.mode === 'aggressive',
            confidence: 'low',
            reason: `conflicting_signals: keyword=${keywordResult.reason}, semantic=${semanticResult.reason}`,
            suggestedTools: [...new Set([
                ...keywordResult.suggestedTools,
                ...semanticResult.suggestedTools
            ])],
            toolAnalysis: semanticResult.toolAnalysis
        };
    }

    /**
     * 判断是否使用 LLM 确认
     * @private
     */
    #shouldUseLLMConfirmation(result) {
        if (!this.#llmClient) return false;

        const threshold = this.#config.llmConfirmationThreshold;

        // 高阈值：只在低置信度时使用 LLM
        if (threshold === 'high' && result.confidence === 'low') {
            return true;
        }

        // 中阈值：中低置信度都使用 LLM
        if (threshold === 'medium' && (result.confidence === 'low' || result.confidence === 'medium')) {
            return true;
        }

        // 低阈值：总是使用 LLM（除非已经高置信度）
        if (threshold === 'low' && result.confidence !== 'high') {
            return true;
        }

        return false;
    }

    /**
     * 获取用于提示词的相关工具
     * @private
     */
    #getRelevantToolsForPrompt(input) {
        // 计算所有工具的相关度
        const scoredTools = this.#tools.map(tool => ({
            tool,
            score: this.#calculateToolRelevance(tool, input.toLowerCase()).score
        }));

        // 按相关度排序并取前 N 个
        scoredTools.sort((a, b) => b.score - a.score);
        return scoredTools.slice(0, this.#config.maxToolsInPrompt).map(st => st.tool);
    }

    /**
     * 提取关键词
     * @private
     */
    #extractKeywords(text) {
        if (!text) return [];

        // 简单的关键词提取：过滤掉停用词，返回有意义的词
        const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
            'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
            '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
            '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这']);

        return text.toLowerCase()
            .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 1 && !stopWords.has(word));
    }

    /**
     * 检查是否包含工具相关词汇
     * @private
     */
    #hasToolRelatedWords(input) {
        const toolRelated = ['工具', 'tool', '技能', 'skill', '执行', '调用', '运行'];
        return toolRelated.some(word => input.includes(word));
    }

    /**
     * 检查是否包含分析类词汇（可能表示需要工具）
     * @private
     */
    #hasAnalysisWords(input) {
        const analysisWords = ['分析', 'analyze', '处理', 'process', '统计', '统计', '生成', 'generate'];
        return analysisWords.some(word => input.includes(word.toLowerCase()));
    }

    /**
     * 根据原因推断工具
     * @private
     */
    #inferToolsFromReason(reason) {
        const reasonToTool = {
            'math_expression': ['calculator', 'advanced_calculator'],
            'math_question': ['calculator', 'advanced_calculator'],
            'math_calculation': ['calculator', 'advanced_calculator'],
            'code_execution': ['code_executor', 'script_runner'],
            'data_query': ['file_reader', 'data_query'],
            'content_generation': ['code_generator', 'file_writer'],
            'data_analysis': ['analyzer', 'data_processor']
        };
        return reasonToTool[reason] || [];
    }

    /**
     * 根据关键词推断工具
     * @private
     */
    #inferToolsFromKeywords(keywords) {
        const keywordToTool = {
            '计算': ['calculator', 'advanced_calculator'],
            'calculate': ['calculator', 'advanced_calculator'],
            'calculator': ['calculator'],
            '执行': ['code_executor'],
            'execute': ['code_executor'],
            '查询': ['file_reader', 'data_query'],
            'query': ['file_reader', 'data_query'],
            '读取': ['file_reader'],
            'read': ['file_reader'],
            '写入': ['file_writer'],
            'write': ['file_writer'],
            '生成': ['code_generator', 'content_generator'],
            'generate': ['code_generator', 'content_generator'],
            '分析': ['analyzer', 'data_processor'],
            'analyze': ['analyzer', 'data_processor']
        };

        const tools = new Set();
        for (const keyword of keywords) {
            const mapped = keywordToTool[keyword];
            if (mapped) {
                mapped.forEach(t => tools.add(t));
            }
        }
        return Array.from(tools);
    }
}

export default IntentRecognizer;
