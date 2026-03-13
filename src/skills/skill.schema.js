/**
 * Skill Schema Definition and Validation
 * 定义 Skill 的标准格式并提供验证功能
 */

/**
 * Skill JSON Schema 定义
 */
export const skillSchema = {
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
 * 验证技能定义是否符合 Schema
 * @param {Object} skillDef - 技能定义对象
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateSkill(skillDef) {
  const errors = [];

  // 检查必需字段
  const required = skillSchema.required;
  for (const field of required) {
    if (!(field in skillDef)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // 验证名称格式
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(skillDef.name)) {
    errors.push('Skill name must be a valid identifier (start with letter/underscore, followed by letters/numbers/underscores)');
  }

  // 验证版本号格式
  if (!/^\d+\.\d+\.\d+$/.test(skillDef.version)) {
    errors.push('Version must follow semantic versioning (x.y.z)');
  }

  // 验证工作流步骤
  if (skillDef.workflow && skillDef.workflow.steps) {
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
    errors
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

export default { skillSchema, validateSkill, createSkillTemplate };
