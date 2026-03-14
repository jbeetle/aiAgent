/**
 * Skill Schema Definition and Validation
 * 定义 Skill 的标准格式并提供验证功能
 *
 * 支持两种 Skill 类型：
 * 1. ExecutableSkill (可执行技能) - 有 workflow，可被 SkillEngine 执行
 * 2. DescriptiveSkill (描述性技能) - 无 workflow，用于增强 AI 的上下文理解
 */

/**
 * 技能类型枚举
 */
export const SkillType = {
  EXECUTABLE: 'executable',
  DESCRIPTIVE: 'descriptive'
};

/**
 * 可执行技能 JSON Schema 定义
 * 当前格式，必须有 workflow
 */
export const executableSkillSchema = {
  type: 'object',
  required: ['name', 'version', 'description', 'workflow'],
  properties: {
    name: {
      type: 'string',
      pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$',
      description: '技能名称，必须是有效的标识符'
    },
    version: {
      type: 'string',
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: '版本号，格式为 x.y.z'
    },
    description: {
      type: 'string',
      minLength: 1,
      description: '技能描述'
    },
    author: {
      type: 'string',
      description: '作者信息'
    },
    parameters: {
      type: 'object',
      description: '参数定义（JSON Schema格式）'
    },
    workflow: {
      type: 'object',
      required: ['steps'],
      properties: {
        steps: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['id', 'type'],
            properties: {
              id: {
                type: 'string',
                pattern: '^[a-zA-Z_][a-zA-Z0-9_]*$'
              },
              type: {
                type: 'string',
                enum: ['tool', 'llm', 'skill', 'condition']
              },
              description: { type: 'string' }
            }
          }
        }
      }
    },
    knowledge: {
      type: 'object',
      properties: {
        examples: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              input: { type: 'object' },
              output: {},
              description: { type: 'string' }
            }
          }
        },
        best_practices: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  }
};

/**
 * 描述性技能 JSON Schema 定义
 * 业界标准格式，无 workflow，用于让 AI 了解能力
 */
export const descriptiveSkillSchema = {
  type: 'object',
  required: ['name', 'version', 'description'],
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      description: '技能名称，可以包含空格（如 "Browser Automation"）'
    },
    version: {
      type: 'string',
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: '版本号，格式为 x.y.z'
    },
    description: {
      type: 'string',
      minLength: 1,
      description: '技能描述'
    },
    author: {
      type: 'string',
      description: '作者信息'
    },
    // 行业标准的额外元数据
    category: {
      type: 'string',
      description: '技能分类（如 automation, data-analysis）'
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: '标签列表'
    },
    department: {
      type: 'string',
      description: '部门（如 engineering, marketing）'
    },
    capabilities: {
      type: 'array',
      items: { type: 'string' },
      description: '能力列表'
    },
    input: {
      type: 'array',
      items: { type: 'string' },
      description: '输入类型列表'
    },
    output: {
      type: 'array',
      items: { type: 'string' },
      description: '输出类型列表'
    },
    models: {
      type: 'array',
      items: { type: 'string' },
      description: '支持的模型列表'
    },
    mcp: {
      type: 'object',
      description: 'MCP 服务器配置',
      properties: {
        server: { type: 'string' },
        tools: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },
    languages: {
      type: 'array',
      items: { type: 'string' },
      description: '支持的语言列表'
    },
    related_skills: {
      type: 'array',
      items: { type: 'string' },
      description: '相关技能列表'
    },
    // 可选的 workflow（如果提供，则按可执行技能处理）
    workflow: {
      type: 'object',
      description: '可选的工作流定义'
    }
  }
};

/**
 * 检测技能类型
 * @param {Object} skillDef - 技能定义对象
 * @returns {string} - SkillType.EXECUTABLE 或 SkillType.DESCRIPTIVE
 */
export function detectSkillType(skillDef) {
  // 如果有 workflow.steps，则是可执行技能
  if (skillDef.workflow && skillDef.workflow.steps && Array.isArray(skillDef.workflow.steps)) {
    return SkillType.EXECUTABLE;
  }

  // 如果有 capabilities 或 category 等描述性技能特有字段，且没有 workflow，则是描述性技能
  if ((skillDef.capabilities || skillDef.category || skillDef.tags) && !skillDef.workflow) {
    return SkillType.DESCRIPTIVE;
  }

  // 默认根据是否有 workflow 判断
  return skillDef.workflow ? SkillType.EXECUTABLE : SkillType.DESCRIPTIVE;
}

/**
 * 验证技能定义是否符合 Schema
 * 自动检测技能类型并进行相应验证
 *
 * @param {Object} skillDef - 技能定义对象
 * @param {Object} options - 验证选项
 * @param {string} options.skillType - 强制指定技能类型 ('executable' | 'descriptive' | 'auto')
 * @returns {Object} - { valid: boolean, errors: string[], skillType: string, isDescriptive: boolean }
 */
export function validateSkill(skillDef, options = {}) {
  const errors = [];

  // 检测技能类型
  const detectedType = options.skillType === 'auto' || !options.skillType
    ? detectSkillType(skillDef)
    : options.skillType;
  const isDescriptive = detectedType === SkillType.DESCRIPTIVE;

  // 根据类型选择 schema
  const schema = isDescriptive ? descriptiveSkillSchema : executableSkillSchema;
  const required = schema.required;

  // 检查必需字段
  for (const field of required) {
    if (!(field in skillDef)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, skillType: detectedType, isDescriptive };
  }

  // 验证名称格式
  if (isDescriptive) {
    // 描述性技能名称只需要非空
    if (!skillDef.name || skillDef.name.trim().length === 0) {
      errors.push('Skill name cannot be empty');
    }
  } else {
    // 可执行技能名称必须是有效标识符
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(skillDef.name)) {
      errors.push('Skill name must be a valid identifier (start with letter/underscore, followed by letters/numbers/underscores)');
    }
  }

  // 验证版本号格式
  if (!/^\d+\.\d+\.\d+$/.test(skillDef.version)) {
    errors.push('Version must follow semantic versioning (x.y.z)');
  }

  // 验证工作流步骤（仅可执行技能）
  if (!isDescriptive && skillDef.workflow && skillDef.workflow.steps) {
    const stepIds = new Set();
    for (let i = 0; i < skillDef.workflow.steps.length; i++) {
      const step = skillDef.workflow.steps[i];

      // 检查步骤ID唯一性
      if (stepIds.has(step.id)) {
        errors.push(`Duplicate step id: ${step.id}`);
      }
      stepIds.add(step.id);

      // 根据步骤类型验证
      const stepErrors = validateStep(step, i);
      errors.push(...stepErrors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    skillType: detectedType,
    isDescriptive
  };
}

/**
 * 将描述性技能转换为可执行技能
 * 为描述性技能生成默认的 workflow，使其可以被 SkillEngine 执行
 *
 * @param {Object} skillDef - 描述性技能定义
 * @returns {Object} - 可执行技能定义
 */
export function convertToExecutableSkill(skillDef) {
  // 生成安全的技能标识符名称
  const safeName = skillDef.name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^[0-9]/, '_$&');

  // 构建 LLM 提示词，包含技能的所有能力描述
  const capabilities = skillDef.capabilities || [];
  const capabilitiesText = capabilities.length > 0
    ? capabilities.map(c => `- ${c}`).join('\n')
    : '根据用户请求提供帮助';

  const category = skillDef.category || 'general';
  const tags = skillDef.tags || [];

  return {
    ...skillDef,
    name: safeName,
    _originalName: skillDef.name, // 保留原始名称
    _type: SkillType.DESCRIPTIVE, // 标记为描述性技能转换而来
    workflow: {
      steps: [
        {
          id: 'execute_descriptive_skill',
          type: 'llm',
          system_prompt: `你是一个专业的 ${skillDef.name} 助手。

技能描述：${skillDef.description}

分类：${category}
标签：${tags.join(', ')}

你具备以下能力：
${capabilitiesText}

请根据用户请求，利用你的专业知识提供帮助。如果需要特定工具，请明确说明。`,
          prompt: '{{parameters.request}}',
          output_key: 'result'
        }
      ]
    },
    parameters: {
      type: 'object',
      properties: {
        request: {
          type: 'string',
          description: '用户的具体请求'
        }
      },
      required: ['request']
    }
  };
}

/**
 * 获取技能的摘要信息
 * @param {Object} skillDef - 技能定义
 * @returns {Object} - 摘要信息
 */
export function getSkillSummary(skillDef) {
  const type = detectSkillType(skillDef);

  return {
    name: skillDef.name,
    type: type,
    version: skillDef.version,
    description: skillDef.description,
    author: skillDef.author,
    category: skillDef.category,
    tags: skillDef.tags || [],
    capabilities: skillDef.capabilities || [],
    hasWorkflow: !!skillDef.workflow
  };
}

/**
 * 验证单个步骤
 * @param {Object} step - 步骤定义
 * @param {number} index - 步骤索引
 * @returns {string[]} - 错误列表
 */
function validateStep(step, index) {
  const errors = [];
  const prefix = `Step ${index + 1} (${step.id || 'unknown'})`;

  if (!step.id) {
    errors.push(`${prefix}: Missing step id`);
  }

  if (!step.type) {
    errors.push(`${prefix}: Missing step type`);
    return errors;
  }

  switch (step.type) {
    case 'tool':
      if (!step.tool) {
        errors.push(`${prefix}: Tool step requires 'tool' property`);
      }
      break;

    case 'llm':
      if (!step.prompt) {
        errors.push(`${prefix}: LLM step requires 'prompt' property`);
      }
      break;

    case 'skill':
      if (!step.skill) {
        errors.push(`${prefix}: Skill step requires 'skill' property`);
      }
      break;

    case 'condition':
      if (!step.condition) {
        errors.push(`${prefix}: Condition step requires 'condition' property`);
      }
      if (!step.then && !step.else) {
        errors.push(`${prefix}: Condition step requires at least one of 'then' or 'else'`);
      }
      break;

    default:
      errors.push(`${prefix}: Unknown step type '${step.type}'`);
  }

  return errors;
}

/**
 * 创建技能定义的默认模板
 * @param {string} name - 技能名称
 * @param {string} description - 技能描述
 * @returns {Object} - 技能定义模板
 */
export function createSkillTemplate(name, description) {
  return {
    name,
    version: '1.0.0',
    description,
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    workflow: {
      steps: [
        {
          id: 'step_1',
          type: 'llm',
          prompt: '执行任务的提示词',
          output_key: 'result'
        }
      ]
    },
    knowledge: {
      examples: [],
      best_practices: []
    }
  };
}

// 为了保持向后兼容，skillSchema 是 executableSkillSchema 的别名
export { executableSkillSchema as skillSchema };

export default {
  skillSchema: executableSkillSchema, // 保持向后兼容
  executableSkillSchema,
  descriptiveSkillSchema,
  SkillType,
  validateSkill,
  detectSkillType,
  convertToExecutableSkill,
  getSkillSummary,
  createSkillTemplate
};
