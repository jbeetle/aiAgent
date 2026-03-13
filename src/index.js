/**
 * ReAct Agent Framework - 主入口文件
 * 基于JavaScript的AI代理框架，实现了ReAct（推理+行动）模式
 * 此文件聚合了框架的核心组件，提供统一的导出接口
 */

// 导入智能体相关模块
import {ReActAgent} from './agents/react.agent.js'; // ReAct代理核心实现
import PromptFactory from './agents/utils/prompt.factory.js'; // 提示词工厂类，用于创建和管理提示词模板
// 导入模型管理相关模块
import {
    createModel,
    getRegisteredVendors,
    getVendorModels,
    registerVendor,
    updateVendor
} from './agents/models/model.factory.js';

// 导入工具系统相关模块
import {
    codeExecutorTool,
    codeGeneratorTool,
    createCustomTool,
    fileReaderTool,
    fileWriterTool,
    getBuiltInTools,
    getTool,
    registerTool,
    removeTool,
    scriptTool,
    shellInfoTool,
    validateParameters
} from './agents/tools/tool.js';
import LLMClient from "./agents/models/llm.client.js";
import {SessionChat} from './agents/models/chat.session.js';
import McpClient from './agents/models/mcp.client.js';

// 导入技能系统相关模块
import {createSkillTemplate, SkillEngine, SkillManager, skillSchema, validateSkill} from './skills/index.js';

/**
 * Agent命名空间 - 智能体相关组件
 * 包含实现代理逻辑的核心类
 */
export const Agent = {
    ReActAgent, // ReAct模式代理类，实现推理+行动逻辑
    PromptFactory // 提示词工厂，管理不同语言和类型的提示词模板
};

/**
 * Models命名空间 - 模型管理相关组件
 * 提供模型创建、注册和管理功能
 */
export const Models = {
    LLMClient, // 统一语言模型客户端，封装与各模型API的交互
    SessionChat,// 会话聊天类，用于管理上下文和历史消息
    McpClient,// MCP客户端，用于与MCP服务器进行交互
    registerVendor, // 动态注册新的模型提供商
    getRegisteredVendors, // 获取所有已注册的模型提供商列表
    getVendorModels, // 获取特定提供商支持的模型列表
    updateVendor, // 更新现有模型提供商的配置
    createModel // 创建特定模型的客户端实例
};

/**
 * Tools命名空间 - 工具系统相关组件
 * 提供工具创建、注册、验证和管理功能
 */
export const Tools = {
    getTool, // 根据名称检索已注册的工具
    createCustomTool, // 创建自定义工具的工厂函数
    validateParameters, // 使用JSON Schema验证工具参数
    registerTool, // 将新工具注册到工具系统
    removeTool, // 从工具系统中移除工具
    getBuiltInTools, // 获取框架预定义的内置工具列表
    fileReaderTool, // 文件读取工具
    fileWriterTool, // 文件写入工具
    scriptTool, // 脚本执行工具
    shellInfoTool, // Shell信息工具
    codeExecutorTool, // 代码执行工具
    codeGeneratorTool // 代码生成工具
};

/**
 * Skills命名空间 - 技能系统相关组件
 * 提供技能定义、验证、加载和执行功能
 */
export const Skills = {
    SkillEngine,    // 技能执行引擎，负责执行技能工作流
    SkillManager,   // 技能管理器，负责从文件/目录加载技能
    skillSchema,    // 技能JSON Schema定义
    validateSkill,  // 验证技能定义的函数
    createSkillTemplate // 创建技能模板文件的函数
};