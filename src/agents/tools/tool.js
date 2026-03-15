/**
 * 工具导出和实用程序
 */

// 导入内置工具
import {advancedCalculatorTool, calculatorTool, getCurrentTimeTool, randomNumberTool} from './calculator.js';
import {fileReaderTool, fileWriterTool} from './file.system.js';
import {scriptTool, shellInfoTool} from './shell.script.js';
import {codeExecutorTool, codeGeneratorTool} from './code.executor.js';

// 重新导出工具以供外部使用
export {calculatorTool, randomNumberTool, advancedCalculatorTool, getCurrentTimeTool} from './calculator.js';
export {fileReaderTool, fileWriterTool} from './file.system.js';
export {scriptTool, shellInfoTool} from './shell.script.js';
export {codeExecutorTool, codeGeneratorTool} from './code.executor.js';

/**
 * 获取所有内置工具数组
 * @returns {Array} - 所有内置工具的数组
 */
export function getBuiltInTools() {
    return [
        calculatorTool,
        randomNumberTool,
        advancedCalculatorTool,
        getCurrentTimeTool,
        fileReaderTool,
        fileWriterTool,
        scriptTool,
        shellInfoTool,
        codeExecutorTool,
        codeGeneratorTool
    ];
}

/**
 * 根据名称获取特定工具
 * @param {string} toolName - 要检索的工具名称
 * @returns {Object|null} - 请求的工具或未找到时返回null
 */
export function getTool(toolName) {
    const tools = getBuiltInTools();
    return tools.find(tool => tool.name === toolName) || null;
}

/**
 * 创建自定义工具
 * @param {string} name - 工具名称
 * @param {string} description - 工具描述
 * @param {Object} parameters - 参数的JSON Schema
 * @param {Function} handler - 工具处理函数
 * @returns {Object} - 完整的自定义工具
 */
export function createCustomTool(name, description, parameters, handler) {
    return {
        name,
        description,
        parameters,
        handler,
        validate: (input) => {
            if (parameters && typeof parameters === 'object') {
                return validateParameters(parameters, input);
            }
            return {valid: true, errors: []};
        }
    };
}

/**
 * 根据JSON Schema验证参数
 * @param {Object} schema - JSON Schema
 * @param {any} data - 要验证的数据
 * @returns {Object} - 验证结果
 */
export function validateParameters(schema, data) {
    const errors = [];

    if (!schema || typeof schema !== 'object') {
        return {valid: true, errors: []};
    }

    // 基本类型检查
    if (schema.type) {
        const type = Array.isArray(data) ? 'array' : typeof data;
        if (type !== schema.type && !(schema.type === 'integer' && Number.isInteger(data))) {
            errors.push(`Expected type ${schema.type}, got ${type}`);
        }
    }

    // 必需字段检查
    if (schema.required && Array.isArray(schema.required)) {
        for (const field of schema.required) {
            if (data[field] === undefined) {
                errors.push(`Missing required field: ${field}`);
            }
        }
    }

    // 属性验证
    if (schema.properties && typeof data === 'object' && data !== null) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
            if (data[key] !== undefined) {
                const propValidation = validateParameters(propSchema, data[key]);
                if (!propValidation.valid) {
                    errors.push(...propValidation.errors.map(e => `${key}.${e}`));
                }
            }
        }
    }

    // 数组验证
    if (schema.items && Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
            const itemValidation = validateParameters(schema.items, data[i]);
            if (!itemValidation.valid) {
                errors.push(...itemValidation.errors.map(e => `[${i}].${e}`));
            }
        }
    }

    // 数字验证
    if (schema.type === 'number' || schema.type === 'integer') {
        if (schema.minimum !== undefined && data < schema.minimum) {
            errors.push(`Value ${data} is less than minimum ${schema.minimum}`);
        }
        if (schema.maximum !== undefined && data > schema.maximum) {
            errors.push(`Value ${data} is greater than maximum ${schema.maximum}`);
        }
    }

    // 字符串验证
    if (schema.type === 'string') {
        if (schema.minLength !== undefined && data.length < schema.minLength) {
            errors.push(`String length ${data.length} is less than minimum ${schema.minLength}`);
        }
        if (schema.maxLength !== undefined && data.length > schema.maxLength) {
            errors.push(`String length ${data.length} is greater than maximum ${schema.maxLength}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * 注册新工具（用于扩展性）
 * @param {Array} toolsArray - 现有工具数组
 * @param {Object} newTool - 要添加的新工具
 * @returns {Array} - 更新后的工具数组
 */
export function registerTool(toolsArray, newTool) {
    if (!Array.isArray(toolsArray)) {
        throw new Error('toolsArray must be an array');
    }

    if (!newTool || typeof newTool !== 'object') {
        throw new Error('newTool must be an object');
    }

    if (!newTool.name || typeof newTool.name !== 'string') {
        throw new Error('Tool must have a name property');
    }

    if (!newTool.handler || typeof newTool.handler !== 'function') {
        throw new Error('Tool must have a handler function');
    }

    // 检查重复名称
    const existingTool = toolsArray.find(tool => tool.name === newTool.name);
    if (existingTool) {
        throw new Error(`Tool with name "${newTool.name}" already exists`);
    }

    return [...toolsArray, newTool];
}

/**
 * 根据名称删除工具
 * @param {Array} toolsArray - 现有工具数组
 * @param {string} toolName - 要删除的工具名称
 * @returns {Array} - 更新后的工具数组
 */
export function removeTool(toolsArray, toolName) {
    if (!Array.isArray(toolsArray)) {
        throw new Error('toolsArray must be an array');
    }

    return toolsArray.filter(tool => tool.name !== toolName);
}