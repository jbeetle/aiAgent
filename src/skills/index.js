/**
 * Skills Module - 技能系统模块
 *
 * 提供动态技能定义、加载和执行能力
 */

// 核心类
export { SkillEngine } from './skill.engine.js';
export { SkillManager } from './skill.manager.js';

// Schema 和验证
export {
  skillSchema,
  executableSkillSchema,
  descriptiveSkillSchema,
  SkillType,
  validateSkill,
  detectSkillType,
  convertToExecutableSkill,
  getSkillSummary,
  createSkillTemplate
} from './skill.schema.js';

// 默认导出
export { SkillEngine as default } from './skill.engine.js';
