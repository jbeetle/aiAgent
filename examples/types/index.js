/**
 * @typedef {Object} Tool
 * @property {string} name - The name of the tool
 * @property {string} description - A description of what the tool does
 * @property {Object} parameters - JSON Schema for parameter validation
 * @property {Function} handler - Async function to execute the tool
 * @property {Function} [validate] - Optional validation function
 */

/**
 * @typedef {Object} ReActAgentConfig
 * @property {string} [model='deepseek-reasoner'] - OpenAI model to use
 * @property {number} [maxIterations=5] - Maximum reasoning steps
 * @property {string} [systemPrompt] - Custom system prompt
 * @property {boolean} [verbose=false] - Enable detailed logging
 */

/**
 * @typedef {Object} ReActStep
 * @property {string} [thought] - The agent's reasoning step
 * @property {string} [action] - The action to take
 * @property {any} [actionInput] - Input parameters for the action
 * @property {string} [observation] - Result from executing the action
 * @property {string} [finalAnswer] - The final answer to the query
 */

/**
 * @typedef {Object} AgentResult
 * @property {boolean} success - Whether the execution was successful
 * @property {string} answer - The final answer from the agent
 * @property {number} iterations - Number of reasoning iterations
 * @property {Array} history - Conversation history
 * @property {string} [error] - Error message if execution failed
 */

/**
 * JSON Schema validation utilities
 */
export class ValidationUtils {
  /**
   * Basic JSON Schema validator
   * @param {Object} schema - JSON Schema
   * @param {any} data - Data to validate
   * @returns {Object} - Validation result
   */
  static validate(schema, data) {
    const errors = [];
    
    if (!schema || typeof schema !== 'object') {
      return { valid: true, errors: [] };
    }

    // Type validation
    if (schema.type) {
      const type = Array.isArray(data) ? 'array' : typeof data;
      if (type !== schema.type && !(schema.type === 'integer' && Number.isInteger(data))) {
        errors.push(`Expected type ${schema.type}, got ${type}`);
      }
    }

    // Required fields validation
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (data[field] === undefined) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Properties validation for objects
    if (schema.properties && typeof data === 'object' && data !== null) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (data[key] !== undefined) {
          const propValidation = this.validate(propSchema, data[key]);
          if (!propValidation.valid) {
            errors.push(...propValidation.errors.map(e => `${key}.${e}`));
          }
        }
      }
    }

    // Array items validation
    if (schema.items && Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        const itemValidation = this.validate(schema.items, data[i]);
        if (!itemValidation.valid) {
          errors.push(...itemValidation.errors.map(e => `[${i}].${e}`));
        }
      }
    }

    // Number validation
    if (schema.type === 'number' || schema.type === 'integer') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        errors.push(`Value ${data} is less than minimum ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && data > schema.maximum) {
        errors.push(`Value ${data} is greater than maximum ${schema.maximum}`);
      }
    }

    // String validation
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
}

/**
 * Tool creation utility
 */
export class ToolBuilder {
  /**
   * Create a new tool with validation
   * @param {string} name - Tool name
   * @param {string} description - Tool description
   * @param {Object} parameters - JSON Schema for parameters
   * @param {Function} handler - Tool handler function
   * @returns {Tool} - Complete tool object
   */
  static create(name, description, parameters, handler) {
    return {
      name,
      description,
      parameters,
      handler,
      validate: (input) => ValidationUtils.validate(parameters, input)
    };
  }
}