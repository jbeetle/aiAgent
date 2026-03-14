/**
 * Skill Engine - 技能执行引擎
 * 负责解析和执行 Skill 定义中的工作流
 */

import {validateSkill} from './skill.schema.js';
import {createLogger} from '../agents/utils/logger.js';

/**
 * 技能执行引擎
 */
export class SkillEngine {
  #log;
  #maxExecutionDepth = 10; // 防止无限递归

  /**
   * 创建技能执行引擎
   * @param {Object} toolsRegistry - 工具注册表 { name: tool }
   * @param {Object} llmClient - LLM 客户端
   * @param {Object} config - 配置选项
   */
  constructor(toolsRegistry, llmClient, config = {}) {
    this.tools = toolsRegistry || {};
    this.llm = llmClient;
    this.config = {
      timeout: 60000, // 默认超时 60 秒
      verbose: false,
      ...config
    };
    this.skills = new Map(); // 注册的技能
    this.#log = createLogger('SkillEngine', this.config.verbose);
  }

  /**
   * 注册技能
   * @param {Object} skillDefinition - 技能定义
   * @returns {boolean} - 是否注册成功
   */
  registerSkill(skillDefinition) {
    // 验证技能定义
    const validation = validateSkill(skillDefinition);
    if (!validation.valid) {
      throw new Error(`Invalid skill definition: ${validation.errors.join(', ')}`);
    }

    // 检查重复
    if (this.skills.has(skillDefinition.name)) {
      throw new Error(`Skill '${skillDefinition.name}' is already registered`);
    }

    this.skills.set(skillDefinition.name, skillDefinition);
    this.#log(`Skill registered: ${skillDefinition.name} v${skillDefinition.version}`);
    return true;
  }

  /**
   * 注销技能
   * @param {string} skillName - 技能名称
   * @returns {boolean} - 是否注销成功
   */
  unregisterSkill(skillName) {
    if (!this.skills.has(skillName)) {
      return false;
    }
    this.skills.delete(skillName);
    this.#log(`Skill unregistered: ${skillName}`);
    return true;
  }

  /**
   * 获取已注册的技能
   * @param {string} skillName - 技能名称
   * @returns {Object|null} - 技能定义
   */
  getSkill(skillName) {
    return this.skills.get(skillName) || null;
  }

  /**
   * 获取所有已注册的技能
   * @returns {Array} - 技能定义列表
   */
  getAllSkills() {
    return Array.from(this.skills.values());
  }

  /**
   * 获取技能的能力描述
   * 用于意图识别器了解技能能力
   *
   * @param {string} skillName - 技能名称（可选，不提供则返回所有技能的能力）
   * @returns {Object|Array} - 技能能力描述
   */
  getSkillCapabilities(skillName = null) {
    if (skillName) {
      const skill = this.skills.get(skillName);
      if (!skill) return null;

      return {
        name: skill.name,
        originalName: skill._originalName || skill.name,
        type: skill._skillType || 'executable',
        description: skill.description,
        category: skill.category,
        tags: skill.tags || [],
        capabilities: skill.capabilities || [],
        input: skill.input || [],
        output: skill.output || [],
        mcp: skill.mcp || null
      };
    }

    // 返回所有技能的能力列表
    return Array.from(this.skills.values()).map(skill => ({
      name: skill.name,
      originalName: skill._originalName || skill.name,
      type: skill._skillType || 'executable',
      description: skill.description,
      category: skill.category,
      tags: skill.tags || [],
      capabilities: skill.capabilities || [],
      input: skill.input || [],
      output: skill.output || [],
      mcp: skill.mcp || null
    }));
  }

  /**
   * 执行技能
   * @param {string} skillName - 技能名称
   * @param {Object} parameters - 执行参数
   * @param {Object} context - 执行上下文（可选）
   * @returns {Promise<Object>} - 执行结果
   */
  async execute(skillName, parameters = {}, context = {}) {
    const skill = this.skills.get(skillName);
    if (!skill) {
      throw new Error(`Skill not found: ${skillName}`);
    }

    // 检查执行深度，防止循环调用
    const executionDepth = context._executionDepth || 0;
    if (executionDepth >= this.#maxExecutionDepth) {
      throw new Error(`Maximum execution depth exceeded (${this.#maxExecutionDepth})`);
    }

    // 初始化执行上下文
    const execContext = {
      parameters: { ...parameters },
      steps: {},
      outputs: {},
      env: process.env,
      _executionDepth: executionDepth + 1,
      _skillName: skillName
    };

    this.#log(`Executing skill: ${skillName}`, parameters);

    try {
      // 按 workflow.steps 顺序执行
      for (const step of skill.workflow.steps) {
        await this.#executeStep(step, execContext);
      }

      this.#log(`Skill completed: ${skillName}`);

      return {
        success: true,
        skill: skillName,
        outputs: execContext.outputs,
        steps: execContext.steps
      };
    } catch (error) {
      this.#log(`Skill execution failed: ${skillName}`, error.message);
      return {
        success: false,
        skill: skillName,
        error: error.message,
        outputs: execContext.outputs,
        steps: execContext.steps
      };
    }
  }

  /**
   * 执行单个步骤
   * @param {Object} step - 步骤定义
   * @param {Object} context - 执行上下文
   * @returns {Promise<Object>} - 步骤执行结果
   */
  async #executeStep(step, context) {
    this.#log(`Executing step: ${step.id} (${step.type})`);

    let result;
    switch (step.type) {
      case 'tool':
        result = await this.#executeToolStep(step, context);
        break;
      case 'llm':
        result = await this.#executeLlmStep(step, context);
        break;
      case 'skill':
        result = await this.#executeSkillStep(step, context);
        break;
      case 'condition':
        result = await this.#executeConditionStep(step, context);
        break;
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }

    // 保存步骤结果到上下文
    context.steps[step.id] = result;
    if (step.output_key) {
      context.outputs[step.output_key] = result.output || result;
    }

    return result;
  }

  /**
   * 执行工具步骤
   * @param {Object} step - 步骤定义
   * @param {Object} context - 执行上下文
   * @returns {Promise<Object>} - 执行结果
   */
  async #executeToolStep(step, context) {
    const tool = this.tools[step.tool];
    if (!tool) {
      throw new Error(`Tool not found: ${step.tool}`);
    }

    // 解析输入参数中的变量
    const input = this.#resolveVariables(step.input, context);

    // 执行工具
    const output = await tool.handler(input);

    return {
      type: 'tool',
      tool: step.tool,
      input,
      output
    };
  }

  /**
   * 执行 LLM 步骤
   * @param {Object} step - 步骤定义
   * @param {Object} context - 执行上下文
   * @returns {Promise<Object>} - 执行结果
   */
  async #executeLlmStep(step, context) {
    if (!this.llm) {
      throw new Error('LLM client not configured');
    }

    // 解析提示词中的变量
    const prompt = this.#resolveVariables(step.prompt, context);
    const systemPrompt = step.system_prompt
      ? this.#resolveVariables(step.system_prompt, context)
      : null;

    // 调用 LLM
    let output;
    if (this.llm.generateText) {
      // 使用 LLMClient
      output = await this.llm.generateText(systemPrompt || 'You are a helpful assistant', prompt);
    } else if (this.llm.chat) {
      // 使用原始 OpenAI 客户端
      const messages = [
        { role: 'system', content: systemPrompt || 'You are a helpful assistant' },
        { role: 'user', content: prompt }
      ];
      const response = await this.llm.chat.completions.create({
        model: this.config.model || 'gpt-3.5-turbo',
        messages,
        max_tokens: 2048
      });
      output = response.choices[0].message.content;
    } else {
      throw new Error('LLM client does not support required methods');
    }

    return {
      type: 'llm',
      prompt,
      output
    };
  }

  /**
   * 执行技能步骤（嵌套调用）
   * @param {Object} step - 步骤定义
   * @param {Object} context - 执行上下文
   * @returns {Promise<Object>} - 执行结果
   */
  async #executeSkillStep(step, context) {
    // 解析输入参数
    const input = this.#resolveVariables(step.input, context);

    // 递归执行子技能
    const result = await this.execute(step.skill, input, context);

    return {
      type: 'skill',
      skill: step.skill,
      input,
      output: result.success ? result.outputs : null,
      error: result.error
    };
  }

  /**
   * 执行条件步骤
   * @param {Object} step - 步骤定义
   * @param {Object} context - 执行上下文
   * @returns {Promise<Object>} - 执行结果
   */
  async #executeConditionStep(step, context) {
    // 解析条件表达式
    const condition = this.#resolveVariables(step.condition, context);

    // 评估条件（简化版本：使用 Function 构造函数）
    // 注意：生产环境应使用更安全的表达式评估器
    let conditionMet = false;
    try {
      const evalFunc = new Function('context', `return ${condition}`);
      conditionMet = evalFunc(context);
    } catch (e) {
      this.#log(`Condition evaluation failed: ${condition}`, e.message);
      conditionMet = false;
    }

    const branch = conditionMet ? step.then : step.else;
    const results = [];

    if (branch && Array.isArray(branch)) {
      for (const subStep of branch) {
        const result = await this.#executeStep(subStep, context);
        results.push(result);
      }
    }

    return {
      type: 'condition',
      condition,
      conditionMet,
      results
    };
  }

  /**
   * 解析并替换变量
   * @param {string|Object} template - 模板字符串或对象
   * @param {Object} context - 执行上下文
   * @returns {string|Object} - 替换后的值
   */
  #resolveVariables(template, context) {
    if (typeof template === 'string') {
      return this.#resolveStringVariables(template, context);
    }

    if (typeof template === 'object' && template !== null) {
      const result = {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = this.#resolveVariables(value, context);
      }
      return result;
    }

    return template;
  }

  /**
   * 解析字符串中的变量
   * @param {string} template - 模板字符串
   * @param {Object} context - 执行上下文
   * @returns {string} - 替换后的字符串
   */
  #resolveStringVariables(template, context) {
    return template
      // {{parameters.xxx}} 或 {{parameters.xxx.yyy}}
      .replace(/\{\{parameters\.([\w.]+)\}\}/g, (match, key) => {
        const value = this.#getNestedValue(context.parameters, key);
        return value !== undefined ? value : match;
      })
      // {{steps.xxx.output}} 或 {{steps.xxx.output.yyy}}
      .replace(/\{\{steps\.(\w+)\.output(?:\.([\w.]+))?\}\}/g, (match, stepKey, nestedPath) => {
        const step = context.steps[stepKey];
        if (!step || step.output === undefined) return match;
        if (nestedPath) {
          const value = this.#getNestedValue(step.output, nestedPath);
          return value !== undefined ? value : match;
        }
        return step.output;
      })
      // {{outputs.xxx}} 或 {{outputs.xxx.yyy}}
      .replace(/\{\{outputs\.([\w.]+)\}\}/g, (match, key) => {
        const value = this.#getNestedValue(context.outputs, key);
        return value !== undefined ? value : match;
      })
      // {{env.xxx}}
      .replace(/\{\{env\.(\w+)\}\}/g, (match, key) => {
        return process.env[key] !== undefined ? process.env[key] : match;
      });
  }

  /**
   * 获取嵌套对象的值
   * @param {Object} obj - 对象
   * @param {string} path - 路径，如 "content" 或 "data.items.0"
   * @returns {any} - 值
   */
  #getNestedValue(obj, path) {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      if (value === undefined || value === null) return undefined;
      value = value[key];
    }
    return value;
  }
}

export default SkillEngine;
