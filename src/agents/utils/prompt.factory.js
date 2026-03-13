/**
 * 提示词面板类 - 用于管理和切换不同语言的提示词模板
 */

// 导入英文和中文提示词模块
import * as enPrompts from './prompts.en.js';
import * as cnPrompts from './prompts.cn.js';
import dotenv from 'dotenv';

dotenv.config();

class PromptFactory {
    /**
     * 构造函数
     * @param {string} defaultLanguage - 默认语言，可选值: 'en' | 'cn'
     * 如果不设置，默认会读取环境变量 PROMPTS_LANG的值
     */
    constructor(defaultLanguage = '') {
        if (defaultLanguage.length > 0) {
            this.currentLanguage = defaultLanguage;
        } else {
            const lang = process.env.PROMPTS_LANG;
            if (lang) {
                this.currentLanguage = lang;
            } else {
                //throw new Error('无法识别模板默认语言，请指定');
                this.currentLanguage = 'en';
            }
        }
        this.promptsMap = {
            en: enPrompts, cn: cnPrompts
        };
    }

    /**
     * 切换语言
     * @param {string} language - 目标语言，可选值: 'en' | 'cn'
     * @returns {string} - 切换后的语言
     * @throws {Error} - 当提供的语言不受支持时抛出错误
     */
    switchLanguage(language) {
        if (!this.promptsMap[language]) {
            throw new Error(`不支持的语言: ${language}，目前仅支持 'en' 和 'cn'`);
        }
        this.currentLanguage = language;
        return this.currentLanguage;
    }

    /**
     * 获取当前语言
     * @returns {string} - 当前使用的语言
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * 获取所有支持的语言
     * @returns {Array} - 支持的语言数组
     */
    getSupportedLanguages() {
        return Object.keys(this.promptsMap);
    }

    /**
     * 创建ReAct提示模板
     * @param {Array} tools - 可用工具数组
     * @param {string} language - 可选，指定使用的语言
     * @param {Array} skills - 可选，可用技能数组
     * @returns {string} - 格式化的ReAct提示
     */
    createReActPrompt(tools, language = this.currentLanguage, skills = []) {
        if (!this.promptsMap[language]) {
            throw new Error(`不支持的语言: ${language}`);
        }
        return this.promptsMap[language].createReActPrompt(tools, skills);
    }

    /**
     * 创建基本交互的系统提示
     * @param {string} language - 可选，指定使用的语言
     * @returns {string} - 基本系统提示
     */
    createBasicPrompt(language = this.currentLanguage) {
        if (!this.promptsMap[language]) {
            throw new Error(`不支持的语言: ${language}`);
        }
        return this.promptsMap[language].createBasicPrompt();
    }

    /**
     * 动态生成工具文档
     * @param {Array} tools - 工具数组
     * @param {string} language - 可选，指定使用的语言
     * @returns {string} - 格式化的工具文档
     */
    generateToolDocumentation(tools, language = this.currentLanguage) {
        if (!this.promptsMap[language]) {
            throw new Error(`不支持的语言: ${language}`);
        }
        return this.promptsMap[language].generateToolDocumentation(tools);
    }

    /**
     * 创建自定义工具创建提示
     * @param {string} toolName - 自定义工具名称
     * @param {string} description - 工具描述
     * @param {string} language - 可选，指定使用的语言
     * @returns {string} - 自定义工具创建提示
     */
    createCustomToolPrompt(toolName, description, language = this.currentLanguage) {
        if (!this.promptsMap[language]) {
            throw new Error(`不支持的语言: ${language}`);
        }
        return this.promptsMap[language].createCustomToolPrompt(toolName, description);
    }
}

// 导出单例实例和类本身
export const promptFactory = new PromptFactory();
export default PromptFactory;