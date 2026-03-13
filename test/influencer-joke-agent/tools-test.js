/**
 * 网红工具测试 - 验证工具功能
 * Test influencer tools without API calls
 */

import {influencerTools} from './influencer-tools.js';

async function testInfluencerTools() {
  try {
    console.log('🧪 开始测试网红工具...\n');

    // 测试1：网红选取工具
    console.log('🎯 测试1：网红选取工具（随机选择）');
    const selectionResult = await influencerTools[0].handler({});
    console.log('✅ 随机选择结果：', JSON.stringify(selectionResult, null, 2));

    console.log('\n🎯 测试2：网红选取工具（按类别选择）');
    const categoryResult = await influencerTools[0].handler({ category: '搞笑' });
    console.log('✅ 搞笑类别选择结果：', JSON.stringify(categoryResult, null, 2));

    console.log('\n🎯 测试3：网红背景信息工具');
    const infoResult = await influencerTools[1].handler({ name: '李佳琦' });
    console.log('✅ 李佳琦信息查询结果：', JSON.stringify(infoResult, null, 2));

    console.log('\n🎯 测试4：网红列表工具');
    const listResult = await influencerTools[2].handler({});
    console.log('✅ 网红列表结果：', JSON.stringify(listResult, null, 2));

    console.log('\n🎯 测试5：错误处理测试');
    const errorResult = await influencerTools[1].handler({ name: '不存在的网红' });
    console.log('✅ 错误处理结果：', JSON.stringify(errorResult, null, 2));

    console.log('\n✅ 所有工具测试完成！');

  } catch (error) {
    console.error('❌ 工具测试失败:', error);
  }
}

// 运行测试
testInfluencerTools().catch(console.error);