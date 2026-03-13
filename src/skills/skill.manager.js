/**
 * Skill Manager - 技能管理器
 * 负责从文件和目录加载技能定义
 */

import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';
import {validateSkill} from './skill.schema.js';
import {createLogger} from '../agents/utils/logger.js';

/**
 * 技能管理器
 */
export class SkillManager {
  #log;

  /**
   * 创建技能管理器
   * @param {SkillEngine} skillEngine - 技能执行引擎
   * @param {Object} config - 配置选项
   */
  constructor(skillEngine, config = {}) {
    this.engine = skillEngine;
    this.config = {
      encoding: 'utf-8',
      verbose: false,
      ...config
    };
    this.#log = createLogger('SkillManager', this.config.verbose);
    this.loadedSkills = new Map(); // 记录已加载的技能及其来源
  }

  /**
   * 从文件加载技能
   * @param {string} filePath - 技能文件路径
   * @returns {Promise<Object>} - 加载的技能定义
   */
  async loadFromFile(filePath) {
    this.#log(`Loading skill from file: ${filePath}`);

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new Error(`Skill file not found: ${filePath}`);
    }

    // 读取文件内容
    const content = await fs.readFile(filePath, this.config.encoding);

    // 根据文件扩展名解析
    const ext = path.extname(filePath).toLowerCase();
    let skillDef;

    switch (ext) {
      case '.json':
        skillDef = this.#parseJSON(content, filePath);
        break;
      case '.yaml':
      case '.yml':
        skillDef = this.#parseYAML(content, filePath);
        break;
      case '.js':
        skillDef = await this.#parseJS(filePath);
        break;
      default:
        throw new Error(`Unsupported skill file format: ${ext}`);
    }

    // 验证技能定义
    const validation = validateSkill(skillDef);
    if (!validation.valid) {
      throw new Error(`Invalid skill definition in ${filePath}: ${validation.errors.join(', ')}`);
    }

    // 注册到引擎
    this.engine.registerSkill(skillDef);

    // 记录加载信息
    this.loadedSkills.set(skillDef.name, {
      filePath,
      definition: skillDef,
      loadedAt: new Date().toISOString()
    });

    this.#log(`Skill loaded successfully: ${skillDef.name} v${skillDef.version}`);

    return skillDef;
  }

  /**
   * 从目录批量加载技能
   * @param {string} dirPath - 技能目录路径
   * @param {Object} options - 加载选项
   * @returns {Promise<Array>} - 加载的技能定义列表
   */
  async loadFromDirectory(dirPath, options = {}) {
    const { recursive = false, pattern = /\.skill\.(json|yaml|yml|js)$/ } = options;

    this.#log(`Loading skills from directory: ${dirPath}`);

    // 检查目录是否存在
    try {
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${dirPath}`);
      }
    } catch (error) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    const loadedSkills = [];

    if (recursive) {
      // 递归加载
      await this.#loadRecursively(dirPath, pattern, loadedSkills);
    } else {
      // 仅加载当前目录
      const files = await fs.readdir(dirPath);
      for (const file of files) {
        if (pattern.test(file)) {
          const filePath = path.join(dirPath, file);
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            try {
              const skill = await this.loadFromFile(filePath);
              loadedSkills.push(skill);
            } catch (error) {
              this.#log(`Failed to load skill from ${file}:`, error.message);
            }
          }
        }
      }
    }

    this.#log(`Loaded ${loadedSkills.length} skills from ${dirPath}`);
    return loadedSkills;
  }

  /**
   * 递归加载目录中的技能
   * @param {string} dirPath - 目录路径
   * @param {RegExp} pattern - 文件匹配模式
   * @param {Array} results - 结果数组
   */
  async #loadRecursively(dirPath, pattern, results) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await this.#loadRecursively(fullPath, pattern, results);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        try {
          const skill = await this.loadFromFile(fullPath);
          results.push(skill);
        } catch (error) {
          this.#log(`Failed to load skill from ${fullPath}:`, error.message);
        }
      }
    }
  }

  /**
   * 加载内置技能
   * @returns {Promise<Array>} - 加载的内置技能列表
   */
  async loadBuiltinSkills() {
    // 获取当前文件所在目录
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const builtinDir = path.join(__dirname, 'builtin');

    try {
      return await this.loadFromDirectory(builtinDir);
    } catch (error) {
      this.#log('No builtin skills loaded:', error.message);
      return [];
    }
  }

  /**
   * 获取已加载技能的信息
   * @param {string} skillName - 技能名称
   * @returns {Object|null} - 技能加载信息
   */
  getLoadedSkillInfo(skillName) {
    return this.loadedSkills.get(skillName) || null;
  }

  /**
   * 获取所有已加载技能的信息
   * @returns {Array} - 技能信息列表
   */
  getAllLoadedSkillInfo() {
    return Array.from(this.loadedSkills.entries()).map(([name, info]) => ({
      name,
      ...info
    }));
  }

  /**
   * 重新加载技能
   * @param {string} skillName - 技能名称
   * @returns {Promise<Object>} - 重新加载的技能定义
   */
  async reloadSkill(skillName) {
    const info = this.loadedSkills.get(skillName);
    if (!info) {
      throw new Error(`Skill not found: ${skillName}`);
    }

    // 先注销
    this.engine.unregisterSkill(skillName);
    this.loadedSkills.delete(skillName);

    // 重新加载
    return await this.loadFromFile(info.filePath);
  }

  /**
   * 获取所有可用技能的摘要信息
   * @returns {Array} - 技能摘要列表
   */
  getSkillSummaries() {
    return this.engine.getAllSkills().map(skill => ({
      name: skill.name,
      version: skill.version,
      description: skill.description,
      author: skill.author,
      parameters: skill.parameters,
      source: this.loadedSkills.get(skill.name)?.filePath || 'inline'
    }));
  }

  /**
   * 解析 JSON
   * @param {string} content - JSON 字符串
   * @param {string} filePath - 文件路径（用于错误提示）
   * @returns {Object} - 解析后的对象
   */
  #parseJSON(content, filePath) {
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }
  }

  /**
   * 解析 YAML
   * @param {string} content - YAML 字符串
   * @param {string} filePath - 文件路径（用于错误提示）
   * @returns {Object} - 解析后的对象
   */
  #parseYAML(content, filePath) {
    // 简单的 YAML 解析（仅支持基本结构）
    // 生产环境应使用专门的 YAML 解析库，如 js-yaml
    try {
      // 尝试作为 JSON 解析（YAML 是 JSON 的超集）
      return JSON.parse(content);
    } catch {
      // 如果失败，抛出错误提示需要 YAML 库
      throw new Error(
        `YAML parsing requires 'js-yaml' package. Please install it: npm install js-yaml\n` +
        `Or convert ${filePath} to JSON format.`
      );
    }
  }

  /**
   * 解析 JS 模块
   * @param {string} filePath - JS 文件路径
   * @returns {Promise<Object>} - 导出的技能定义
   */
  async #parseJS(filePath) {
    try {
      const module = await import(filePath);
      return module.default || module.skill;
    } catch (error) {
      throw new Error(`Failed to import JS module ${filePath}: ${error.message}`);
    }
  }
}

export default SkillManager;
