/**
 * Skill Manager - 技能管理器
 * 负责从文件和目录加载技能定义
 */

import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';
import {validateSkill, detectSkillType, SkillType, convertToExecutableSkill} from './skill.schema.js';
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
      case '.md':
      case '.markdown':
        skillDef = this.#parseMarkdown(content, filePath);
        break;
      default:
        throw new Error(`Unsupported skill file format: ${ext}`);
    }

    // 检测技能类型
    const detectedType = detectSkillType(skillDef);
    const isDescriptive = detectedType === SkillType.DESCRIPTIVE;

    this.#log(`Detected skill type: ${detectedType} for ${skillDef.name}`);

    // 验证技能定义（根据类型）
    const validation = validateSkill(skillDef, { skillType: detectedType });
    if (!validation.valid) {
      throw new Error(`Invalid skill definition in ${filePath}: ${validation.errors.join(', ')}`);
    }

    // 如果是描述性技能，自动转换为可执行技能
    let executableSkillDef = skillDef;
    if (isDescriptive) {
      executableSkillDef = convertToExecutableSkill(skillDef);
      this.#log(`Converted descriptive skill "${skillDef.name}" to executable skill "${executableSkillDef.name}"`);
    }

    // 注册到引擎
    this.engine.registerSkill(executableSkillDef, { originalType: detectedType });

    // 记录加载信息
    this.loadedSkills.set(executableSkillDef.name, {
      filePath,
      definition: executableSkillDef,
      originalDefinition: skillDef,
      skillType: detectedType,
      isDescriptive,
      loadedAt: new Date().toISOString()
    });

    this.#log(`Skill loaded successfully: ${executableSkillDef.name} v${executableSkillDef.version} (${detectedType})`);

    return executableSkillDef;
  }

  /**
   * 从目录批量加载技能
   * @param {string} dirPath - 技能目录路径
   * @param {Object} options - 加载选项
   * @returns {Promise<Array>} - 加载的技能定义列表
   */
  async loadFromDirectory(dirPath, options = {}) {
    const { recursive = false, pattern = /\.skill\.(json|yaml|yml|js|md)$/ } = options;

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
    return this.engine.getAllSkills().map(skill => {
      const loadedInfo = this.loadedSkills.get(skill.name);
      const isDescriptive = skill._type === 'descriptive' || loadedInfo?.isDescriptive;

      return {
        name: skill.name,
        originalName: skill._originalName || skill.name,
        type: isDescriptive ? 'descriptive' : 'executable',
        version: skill.version,
        description: skill.description,
        author: skill.author,
        category: skill.category,
        tags: skill.tags || [],
        capabilities: skill.capabilities || [],
        parameters: skill.parameters,
        source: loadedInfo?.filePath || 'inline',
        isDescriptive
      };
    });
  }

  /**
   * 卸载技能
   * @param {string} skillName - 技能名称
   * @returns {Object} - 卸载的技能信息
   */
  unloadSkill(skillName) {
    const info = this.loadedSkills.get(skillName);
    if (!info) {
      throw new Error(`Skill not found: ${skillName}`);
    }

    // 从引擎注销
    this.engine.unregisterSkill(skillName);

    // 从已加载列表中移除
    this.loadedSkills.delete(skillName);

    this.#log(`Skill unloaded: ${skillName}`);

    return {
      name: skillName,
      filePath: info.filePath,
      unloadedAt: new Date().toISOString()
    };
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

  /**
   * 解析 Markdown 文件
   * 支持 YAML frontmatter 格式
   * @param {string} content - Markdown 文件内容
   * @param {string} filePath - 文件路径（用于错误提示）
   * @returns {Object} - 解析后的技能定义
   */
  #parseMarkdown(content, filePath) {
    try {
      // 尝试解析 YAML frontmatter
      const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

      if (frontmatterMatch) {
        const yamlContent = frontmatterMatch[1];
        const markdownBody = frontmatterMatch[2].trim();

        let skillDef;

        // 首先尝试作为 JSON 解析
        try {
          skillDef = JSON.parse(yamlContent);
        } catch {
          // 如果不是 JSON，尝试解析为 YAML
          skillDef = this.#parseEnhancedYAML(yamlContent);
        }

        // 如果没有 description，使用 markdown body 作为描述
        if (!skillDef.description && markdownBody) {
          const firstParagraph = markdownBody.split('\n\n').find(p => p.trim());
          if (firstParagraph) {
            skillDef.description = firstParagraph.replace(/^#+\s*/, '').trim();
          }
        }

        return skillDef;
      }

      throw new Error(
        `No valid skill definition found in ${filePath}. ` +
        `Markdown skill files should have YAML frontmatter (---\nyaml content\n---\n)`
      );
    } catch (error) {
      if (error.message.includes('No valid skill definition')) {
        throw error;
      }
      throw new Error(`Failed to parse Markdown file ${filePath}: ${error.message}`);
    }
  }

  /**
   * 增强的 YAML 解析器（支持业界标准的 YAML 结构）
   * @param {string} yamlContent - YAML 内容
   * @returns {Object} - 解析后的对象
   */
  #parseEnhancedYAML(yamlContent) {
    const result = {};
    const lines = yamlContent.split('\n');
    const contextStack = [];
    let currentObj = result;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      const indent = line.search(/\S/);

      if (trimmedLine.startsWith('- ')) {
        const value = trimmedLine.substring(2).trim();

        let arrayContext = null;
        for (let j = contextStack.length - 1; j >= 0; j--) {
          if (Array.isArray(contextStack[j].value)) {
            arrayContext = contextStack[j];
            break;
          }
        }

        if (arrayContext) {
          const objMatch = value.match(/^(\w+):\s*(.*)$/);
          if (objMatch && !value.startsWith('{')) {
            const key = objMatch[1];
            const val = objMatch[2];
            const lastItem = arrayContext.value[arrayContext.value.length - 1];
            const expectedChildIndent = arrayContext.indent + 2;

            if (indent >= expectedChildIndent && typeof lastItem === 'object' && lastItem !== null && !Array.isArray(lastItem)) {
              lastItem[key] = val ? this.#parseYAMLValue(val) : null;
            } else {
              const newObj = { [key]: val ? this.#parseYAMLValue(val) : null };
              arrayContext.value.push(newObj);
            }
          } else {
            arrayContext.value.push(this.#parseYAMLValue(value));
          }
        }
        continue;
      }

      const keyValueMatch = trimmedLine.match(/^(\w+):\s*(.*)$/);
      if (keyValueMatch) {
        const key = keyValueMatch[1];
        let value = keyValueMatch[2];

        while (contextStack.length > 0 && contextStack[contextStack.length - 1].indent >= indent) {
          contextStack.pop();
        }

        currentObj = contextStack.length > 0 ? contextStack[contextStack.length - 1].value : result;
        if (Array.isArray(currentObj)) {
          const lastItem = currentObj[currentObj.length - 1];
          if (lastItem && typeof lastItem === 'object') {
            currentObj = lastItem;
          }
        }

        if (value) {
          currentObj[key] = this.#parseYAMLValue(value);
        } else {
          const nextLine = lines[i + 1];
          if (nextLine) {
            const nextTrimmed = nextLine.trim();
            const nextIndent = nextLine.search(/\S/);

            if (nextTrimmed.startsWith('- ')) {
              currentObj[key] = [];
              contextStack.push({ indent, value: currentObj[key], key });
            } else if (nextIndent > indent) {
              currentObj[key] = {};
              contextStack.push({ indent, value: currentObj[key], key });
            } else {
              currentObj[key] = null;
            }
          } else {
            currentObj[key] = null;
          }
        }
      }
    }

    return result;
  }

  /**
   * 解析 YAML 值
   * @param {string} value - 字符串值
   * @returns {any} - 解析后的值
   */
  #parseYAMLValue(value) {
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (/^-?\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    if (/^-?\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }

    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null' || value === '~') return null;

    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        return JSON.parse(value);
      } catch {
        return value.slice(1, -1).split(',').map(s => s.trim());
      }
    }

    return value;
  }
}

export default SkillManager;
