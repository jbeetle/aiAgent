/**
 * 调试工具结构
 * Debug tool structure
 */

import {influencerTools} from './influencer-tools.js';

console.log('🔍 调试工具结构...\n');

console.log('📋 工具数量:', influencerTools.length);

influencerTools.forEach((tool, index) => {
  console.log(`\n🛠️  工具 ${index + 1}:`);
  console.log(`   名称: ${tool.name}`);
  console.log(`   描述: ${tool.description}`);
  console.log(`   处理器类型: ${typeof tool.handler}`);
  console.log(`   处理器: ${tool.handler ? '存在' : '不存在'}`);
  console.log(`   工具对象键:`, Object.keys(tool));
});