/**
 * 文件系统工具
 * 提供文件读写功能，供 Skill 系统使用
 */

import fs from 'fs/promises';
import path from 'path';
import {createLogger} from '../utils/logger.js';

const log = createLogger('FileSystem', false);

/**
 * 文件读取工具
 * 读取指定路径的文件内容
 */
export const fileReaderTool = {
    name: 'file_reader',
    description: '读取指定路径的文件内容，支持文本文件',
    parameters: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: '文件的绝对路径'
            },
            encoding: {
                type: 'string',
                description: '文件编码，默认为 utf-8',
                default: 'utf-8'
            },
            max_size: {
                type: 'integer',
                description: '最大读取字节数，防止读取过大文件',
                default: 1048576 // 1MB
            }
        },
        required: ['path']
    },
    handler: async (args) => {
        const {path: filePath, encoding = 'utf-8', max_size = 1048576} = args;

        if (!filePath) {
            throw new Error('文件路径不能为空');
        }

        // 安全检查：确保路径是绝对路径
        const resolvedPath = path.resolve(filePath);
        log(`读取文件: ${resolvedPath}`);

        try {
            // 检查文件是否存在
            const stats = await fs.stat(resolvedPath);

            if (!stats.isFile()) {
                throw new Error(`路径不是文件: ${filePath}`);
            }

            // 检查文件大小
            if (stats.size > max_size) {
                throw new Error(
                    `文件过大 (${(stats.size / 1024).toFixed(2)} KB)，` +
                    `超过最大限制 (${(max_size / 1024).toFixed(2)} KB)`
                );
            }

            // 读取文件内容
            const content = await fs.readFile(resolvedPath, encoding);

            return {
                success: true,
                path: resolvedPath,
                size: stats.size,
                content: content
            };

        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`文件不存在: ${filePath}`);
            }
            if (error.code === 'EACCES') {
                throw new Error(`没有权限访问文件: ${filePath}`);
            }
            throw error;
        }
    }
};

/**
 * 文件写入工具
 * 将内容写入指定路径的文件
 */
export const fileWriterTool = {
    name: 'file_writer',
    description: '将内容写入指定路径的文件，支持自动创建目录',
    parameters: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: '文件的绝对路径'
            },
            content: {
                type: 'string',
                description: '要写入的文件内容'
            },
            encoding: {
                type: 'string',
                description: '文件编码，默认为 utf-8',
                default: 'utf-8'
            },
            append: {
                type: 'boolean',
                description: '是否追加模式，默认为 false（覆盖）',
                default: false
            }
        },
        required: ['path', 'content']
    },
    handler: async (args) => {
        const {path: filePath, content, encoding = 'utf-8', append = false} = args;

        if (!filePath) {
            throw new Error('文件路径不能为空');
        }

        if (content === undefined || content === null) {
            throw new Error('文件内容不能为空');
        }

        // 安全检查：确保路径是绝对路径
        const resolvedPath = path.resolve(filePath);
        log(`写入文件: ${resolvedPath}`);

        try {
            // 确保目录存在
            const dir = path.dirname(resolvedPath);
            await fs.mkdir(dir, {recursive: true});

            // 写入文件
            const flag = append ? 'a' : 'w';
            await fs.writeFile(resolvedPath, content, {encoding, flag});

            // 获取写入后的文件信息
            const stats = await fs.stat(resolvedPath);

            return {
                success: true,
                path: resolvedPath,
                size: stats.size,
                bytes_written: Buffer.byteLength(content, encoding)
            };

        } catch (error) {
            if (error.code === 'EACCES') {
                throw new Error(`没有权限写入文件: ${filePath}`);
            }
            if (error.code === 'ENOSPC') {
                throw new Error(`磁盘空间不足，无法写入: ${filePath}`);
            }
            throw new Error(`写入文件失败: ${error.message}`);
        }
    }
};

/**
 * 获取所有文件系统工具
 * @returns {Array} - 文件系统工具数组
 */
export function getFileSystemTools() {
    return [fileReaderTool, fileWriterTool];
}
