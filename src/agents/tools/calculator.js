/**
 * 基本算术运算计算器工具
 * 支持加法、减法、乘法和除法运算
 */

/**
 * 计算器工具定义
 * @type {Object}
 */
export const calculatorTool = {
    name: 'calculator',
    description: 'Perform basic arithmetic operations (add, subtract, multiply, divide)',
    parameters: {
        type: 'object',
        properties: {
            operation: {
                type: 'string',
                enum: ['add', 'subtract', 'multiply', 'divide'],
                description: 'The arithmetic operation to perform'
            },
            a: {
                type: 'number',
                description: 'First operand'
            },
            b: {
                type: 'number',
                description: 'Second operand'
            }
        },
        required: ['operation', 'a', 'b'],
        additionalProperties: false
    },

    /**
     * 执行计算器运算
     * @param {Object} args - 运算参数
     * @param {string} args.operation - 要执行的运算
     * @param {number} args.a - 第一个操作数
     * @param {number} args.b - 第二个操作数
     * @returns {Promise<number|string>} - 计算结果或错误信息
     */
    async handler(args) {
        const {operation, a, b} = args;

        if (typeof a !== 'number' || typeof b !== 'number') {
            throw new Error('Both operands must be numbers');
        }

        switch (operation) {
            case 'add':
                return a + b;

            case 'subtract':
                return a - b;

            case 'multiply':
                return a * b;

            case 'divide':
                if (b === 0) {
                    throw new Error('Division by zero is not allowed');
                }
                return a / b;

            default:
                throw new Error(`Unsupported operation: ${operation}`);
        }
    }
};

/**
 * 随机数生成器工具
 * @type {Object}
 */
export const randomNumberTool = {
    name: 'random_number',
    description: 'Generate a random number within a specified range',
    parameters: {
        type: 'object',
        properties: {
            min: {
                type: 'number',
                description: 'Minimum value (inclusive)',
                default: 0
            },
            max: {
                type: 'number',
                description: 'Maximum value (inclusive)',
                default: 100
            }
        },
        required: ['min', 'max'],
        additionalProperties: false
    },

    /**
     * 在指定范围内生成随机数
     * @param {Object} args - 生成参数
     * @param {number} args.min - 最小值
     * @param {number} args.max - 最大值
     * @returns {Promise<number>} - 随机数
     */
    async handler(args) {
        const {min, max} = args;

        if (typeof min !== 'number' || typeof max !== 'number') {
            throw new Error('Both min and max must be numbers');
        }

        if (min >= max) {
            throw new Error('Min must be less than max');
        }

        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
};

/**
 * 高级计算器工具，支持更多运算
 * @type {Object}
 */
export const advancedCalculatorTool = {
    name: 'advanced_calculator',
    description: 'Perform advanced mathematical operations including power, modulo, and square root',
    parameters: {
        type: 'object',
        properties: {
            operation: {
                type: 'string',
                enum: ['power', 'modulo', 'sqrt', 'abs'],
                description: 'The mathematical operation to perform'
            },
            a: {
                type: 'number',
                description: 'First operand'
            },
            b: {
                type: 'number',
                description: 'Second operand (not used for sqrt and abs)'
            }
        },
        required: ['operation', 'a'],
        additionalProperties: false
    },

    /**
     * 执行高级数学运算
     * @param {Object} args - 运算参数
     * @param {string} args.operation - 要执行的运算
     * @param {number} args.a - 第一个操作数
     * @param {number} [args.b] - 第二个操作数（可选）
     * @returns {Promise<number|string>} - 计算结果或错误信息
     */
    async handler(args) {
        const {operation, a, b} = args;

        if (typeof a !== 'number') {
            throw new Error('First operand must be a number');
        }

        switch (operation) {
            case 'power':
                if (typeof b !== 'number') {
                    throw new Error('Second operand required for power operation');
                }
                return Math.pow(a, b);

            case 'modulo':
                if (typeof b !== 'number') {
                    throw new Error('Second operand required for modulo operation');
                }
                if (b === 0) {
                    throw new Error('Modulo by zero is not allowed');
                }
                return a % b;

            case 'sqrt':
                if (a < 0) {
                    throw new Error('Cannot calculate square root of negative number');
                }
                return Math.sqrt(a);

            case 'abs':
                return Math.abs(a);

            default:
                throw new Error(`Unsupported operation: ${operation}`);
        }
    }
};

/**
 * 获取当前时间工具
 * @type {Object}
 */
export const getCurrentTimeTool = {
    name: 'get_current_time',
    description: 'Get the current time in YYYY-MM-DD HH:mm:ss format. Only use when the user explicitly asks for current time or date as part of a task. For simple conversational questions like "what time is it" or "what\'s today\'s date", answer directly without using this tool.',
    parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
    },

    /**
     * 获取当前时间并格式化
     * @returns {Promise<string>} - 格式化后的当前时间
     */
    async handler() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
};
