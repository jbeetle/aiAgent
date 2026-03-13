/**
 * LLM 模型工厂模块
 * 提供统一的 LLM 客户端创建和管理功能，支持多种模型供应商
 *
 * @namespace ModelFactory
 * @description 该模块负责管理不同供应商的 LLM 模型，提供统一的客户端接口
 * 用于创建和管理各种大语言模型的连接和交互
 */

import LLMClient from "./llm.client.js";
import {validateNonEmptyArray, validateNonEmptyString, validateObject} from '../utils/logger.js';

// ---------- 注册表：所有支持的模型 ----------
export const registry = {
    // OpenAI 官方
    OpenAi: {
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: 'https://api.openai.com/v1',
        models: ['gpt-3.5-turbo', 'gpt-4-turbo']
    },
    // 阿里百炼
    Bailian: {
        apiKey: process.env.BAILIAN_API_KEY,
        baseURL: process.env.BAILIAN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        models: ['qwen3-max', 'qwen-flash', 'qwen-plus', 'deepseek-v3.2-exp']
    },
    // Moonshot（Kimi-K2）
    Moonshot: {
        apiKey: process.env.MOONSHOT_API_KEY,
        baseURL: 'https://api.moonshot.cn/v1',
        models: ['kimi-k2-turbo-preview', 'kimi-k2-0711-preview']
    },
    //deepseek
    DeepSeek: {
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com/v1',
        models: ['deepseek-chat', 'deepseek-reasoner']
    },
    //基石
    CoresHub: {
        apiKey: process.env.CORESHUB_API_KEY,
        baseURL: process.env.CORESHUB_BASE_URL || 'https://openapi.coreshub.cn/v1',
        models: ['QwQ-32B', 'ernie-4.5-turbo-128k', 'DeepSeek-V3.1-Terminus', 'Qwen3-32B', 'Qwen3-30B-A3B', 'DeepSeek-V3', 'DeepSeek-R1']
    },
    //火山Volc
    Volcano: {
        apiKey: process.env.VOLC_API_KEY,
        baseURL: process.env.VOLC_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
        models: [
            'doubao-seed-1-6-250615',
            'doubao-seed-1-6-flash-250715',
            'doubao-seed-1-6-thinking-250715',
            'deepseek-r1-250528',
            'doubao-1-5-thinking-vision-pro-250428',
            'doubao-1-5-ui-tars-250428',
            'doubao-1-5-pro-32k-250115',
            'deepseek-v3-250324',
            'kimi-k2-250711'
        ]
    },
    Ollama: {
        apiKey: 'ollama',
        baseURL: 'http://localhost:11434/v1',
        models: ['llama3']
    }
};

/**
 * 动态注册新的模型供应商
 * @param {string} vendorName - 供应商名称
 * @param {Object} vendorConfig - 供应商配置
 * @param {string} vendorConfig.apiKey - API 密钥环境变量名或实际密钥
 * @param {string} vendorConfig.baseURL - API 基础 URL
 * @param {Array<string>} vendorConfig.models - 支持的模型列表
 * @returns {boolean} - 注册是否成功
 * @throws {Error} - 当参数不合法时抛出错误
 */
export function registerVendor(vendorName, vendorConfig) {
    // 验证参数
    validateNonEmptyString(vendorName, '供应商名称');
    validateObject(vendorConfig, '供应商配置');
    validateNonEmptyString(vendorConfig.apiKey, 'API 密钥');
    validateNonEmptyString(vendorConfig.baseURL, 'API 基础 URL');
    validateNonEmptyArray(vendorConfig.models, '模型列表');

    // 检查是否已存在
    if (registry[vendorName]) {
        throw new Error(`供应商 "${vendorName}" 已存在`);
    }

    // 添加到注册表
    registry[vendorName] = {
        apiKey: vendorConfig.apiKey,
        baseURL: vendorConfig.baseURL,
        models: vendorConfig.models
    };

    return true;
}

/**
 * 更新已存在的模型供应商配置
 * @param {string} vendorName - 供应商名称
 * @param {Object} vendorConfig - 要更新的供应商配置
 * @returns {boolean} - 更新是否成功
 * @throws {Error} - 当供应商不存在或参数不合法时抛出错误
 */
export function updateVendor(vendorName, vendorConfig) {
    // 验证参数
    validateNonEmptyString(vendorName, '供应商名称');
    validateObject(vendorConfig, '供应商配置');

    // 检查是否存在
    if (!registry[vendorName]) {
        throw new Error(`供应商 "${vendorName}" 不存在`);
    }

    // 更新配置
    registry[vendorName] = {
        ...registry[vendorName],
        ...vendorConfig
    };

    return true;
}

/**
 * 为指定供应商添加新的模型
 * @param {string} vendorName - 供应商名称
 * @param {string|Array<string>} models - 要添加的模型名称或模型数组
 * @returns {boolean} - 添加是否成功
 * @throws {Error} - 当供应商不存在或参数不合法时抛出错误
 */
export function addVendorModel(vendorName, models) {
    // 验证参数
    validateNonEmptyString(vendorName, '供应商名称');

    // 检查供应商是否存在
    if (!registry[vendorName]) {
        throw new Error(`供应商 "${vendorName}" 不存在`);
    }

    // 标准化模型参数为数组
    let modelsToAdd = [];
    if (typeof models === 'string') {
        modelsToAdd = [models];
    } else if (Array.isArray(models)) {
        modelsToAdd = models;
    } else {
        throw new Error('模型必须是字符串或字符串数组');
    }

    // 验证模型列表
    if (modelsToAdd.length === 0) {
        throw new Error('至少需要提供一个模型');
    }

    // 添加模型（避免重复）
    const vendor = registry[vendorName];
    modelsToAdd.forEach(model => {
        if (!vendor.models.includes(model)) {
            vendor.models.push(model);
        }
    });

    return true;
}

/**
 * 移除模型供应商
 * @param {string} vendorName - 供应商名称
 * @returns {boolean} - 移除是否成功
 * @throws {Error} - 当供应商不存在时抛出错误
 */
export function removeVendor(vendorName) {
    // 验证参数
    validateNonEmptyString(vendorName, '供应商名称');

    // 检查是否存在
    if (!registry[vendorName]) {
        throw new Error(`供应商 "${vendorName}" 不存在`);
    }

    // 从注册表中移除
    delete registry[vendorName];

    return true;
}

/**
 * 获取所有已注册的供应商名称
 * @returns {Array<string>} - 供应商名称数组
 */
export function getRegisteredVendors() {
    return Object.keys(registry);
}

/**
 * 获取指定供应商支持的模型列表
 * @param {string} vendorName - 供应商名称
 * @returns {Array<string>} - 模型列表
 * @throws {Error} - 当供应商不存在时抛出错误
 */
export function getVendorModels(vendorName) {
    // 验证参数
    validateNonEmptyString(vendorName, '供应商名称');

    // 检查是否存在
    if (!registry[vendorName]) {
        throw new Error(`供应商 "${vendorName}" 不存在`);
    }

    return registry[vendorName].models;
}

/**
 * 创建 LLM 客户端工厂实例
 * @param {string} vendor - 供应商名称
 * @param {string} modelName - 模型名称
 * @param {object} httpPool - http连接池属性,通过这个配置可以根据需要调整访问大模型网络通信的特性
 * @returns {LLMClient} - LLMClient 实例
 * @throws {Error} - 当供应商不存在时抛出错误
 */
export function createModel(vendor, modelName, httpPool = {}) {
    const cfg = registry[vendor];
    if (!cfg) throw new Error(`Unknown model: ${vendor}`);
    if (!cfg.models.includes(modelName)) throw new Error(`Unknown model: ${modelName}`);
    const {apiKey, baseURL, model} = {...cfg, model: modelName};
    return new LLMClient(apiKey, baseURL, model, httpPool);
}
