/**
 * 共享日志工具类
 * 提供统一的日志输出功能，支持前缀和详细模式控制
 */

/**
 * 创建日志记录器
 * @param {string} prefix - 日志前缀
 * @param {boolean} verbose - 是否启用详细日志
 * @returns {Function} 日志函数
 */
export function createLogger(prefix, verbose = false) {
    return function log(...args) {
        if (verbose) {
            console.log(`[${prefix}]`, ...args);
        }
    };
}

/**
 * 简单的验证工具函数
 * @param {string} value - 要验证的值
 * @param {string} paramName - 参数名称
 * @throws {Error} - 当值为空字符串时抛出错误
 */
export function validateNonEmptyString(value, paramName) {
    if (!value || typeof value !== 'string' || value.trim() === '') {
        throw new Error(`${paramName}必须是非空字符串`);
    }
}

/**
 * 验证对象参数
 * @param {object} value - 要验证的值
 * @param {string} paramName - 参数名称
 * @throws {Error} - 当值不是对象时抛出错误
 */
export function validateObject(value, paramName) {
    if (!value || typeof value !== 'object') {
        throw new Error(`${paramName}必须是对象`);
    }
}

/**
 * 验证非空数组参数
 * @param {Array} value - 要验证的值
 * @param {string} paramName - 参数名称
 * @throws {Error} - 当值为空数组时抛出错误
 */
export function validateNonEmptyArray(value, paramName) {
    if (!Array.isArray(value) || value.length === 0) {
        throw new Error(`${paramName}必须是非空数组`);
    }
}

/**
 * 序列化结果为字符串
 * @param {any} result - 要序列化的结果
 * @returns {string} 序列化后的字符串
 */
export function serializeResult(result) {
    return typeof result === 'string' ? result : JSON.stringify(result);
}
