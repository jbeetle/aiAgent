/**
 * 网红选取工具 - 用于随机选择网红并获取其背景信息
 * Social Media Influencer Selection Tool
 */

import {Tools} from '../../src/index.js';

// 网红数据库 - 包含知名网红及其背景信息
const influencersDatabase = [
    {
        name: "李佳琦",
        nickname: "口红一哥",
        platform: "淘宝直播",
        followers: "7000万+",
        specialty: "美妆带货",
        personality: "热情夸张，口头禅'O买噶'",
        background: "从化妆品专柜销售员成长为顶级带货主播，以极具感染力的推销风格著称"
    },
    {
        name: "薇娅",
        nickname: "淘宝一姐",
        platform: "淘宝直播",
        followers: "6000万+",
        specialty: "全品类带货",
        personality: "专业严谨，语速快",
        background: "曾经的歌手转型电商直播，创造了单场直播销售额破亿的记录"
    },
    {
        name: "罗永浩",
        nickname: "老罗",
        platform: "抖音",
        followers: "3000万+",
        specialty: "科技产品带货",
        personality: "幽默自嘲，金句频出",
        background: "锤子科技创始人转型直播带货，以还债为目标，创造了'真还传'的佳话"
    },
    {
        name: "辛巴",
        nickname: "快手一哥",
        platform: "快手",
        followers: "9000万+",
        specialty: "农产品带货",
        personality: "豪爽直接，重情重义",
        background: "从农村走出来的带货主播，专注于助农直播，曾创造单场带货18.8亿的记录"
    },
    {
        name: "李子柒",
        nickname: "东方美食生活家",
        platform: "YouTube/B站",
        followers: "全球1亿+",
        specialty: "传统文化传播",
        personality: "温婉淡雅，慢节奏",
        background: "以制作传统美食和手工艺视频走红，展现中国传统文化之美"
    },
    {
        name: "papi酱",
        nickname: "低配版苏菲玛索",
        platform: "抖音/B站",
        followers: "5000万+",
        specialty: "搞笑短视频",
        personality: "毒舌吐槽，语速飞快",
        background: "中央戏剧学院导演系毕业，以吐槽社会现象的短视频走红"
    },
    {
        name: "疯狂小杨哥",
        nickname: "搞笑一家人",
        platform: "抖音",
        followers: "1亿+",
        specialty: "搞笑家庭短剧",
        personality: "搞笑整蛊，家庭互动",
        background: "以家庭搞笑短剧走红，兄弟三人加上父母的搞笑日常"
    },
    {
        name: "散打哥",
        nickname: "快手土豪",
        platform: "快手",
        followers: "4000万+",
        specialty: "娱乐直播",
        personality: "豪爽大气，喜欢发红包",
        background: "以慷慨打赏和发红包著称，被称为快手'土豪'主播"
    },
    {
        name: "冯提莫",
        nickname: "斗鱼一姐",
        platform: "斗鱼/抖音",
        followers: "3000万+",
        specialty: "游戏直播+唱歌",
        personality: "甜美可爱，歌声动听",
        background: "从英雄联盟主播转型歌手，发行多首个人单曲"
    },
    {
        name: "张大奕",
        nickname: "淘宝第一网红",
        platform: "淘宝",
        followers: "2000万+",
        specialty: "时尚穿搭",
        personality: "时尚前卫，带货能力强",
        background: "模特出身转型电商，创造了网红电商的多个第一"
    }
];

/**
 * 网红选取工具 - 随机选择一个网红并返回详细信息
 */
export const influencerSelectionTool = Tools.createCustomTool(
    'celebrityQuery',
    '从预设的网红数据库中根据目录任选一个网红，如果目录设置为不限则从数据库中随机返回一个网红；返回该网红信息，包括：姓名、昵称、平台、粉丝数、专业领域、人物性格和背景简介等',
    {
        type: 'object',
        properties: {
            category: {
                type: 'string',
                description: '可选参数，指定网红类型（如"美妆"、"搞笑"、"带货"等），如果不指定则随机选择',
                enum: ['美妆', '搞笑', '带货', '游戏', '美食', '时尚', '科技', '农产品', '传统文化', '不限']
            }
        },
        required: ['category']
    },
    async (args) => {
        try {
            let selectedInfluencers;
            console.log('celebrityQuery working!');
            // 根据类别筛选网红
            if (args.category && args.category !== '不限') {
                selectedInfluencers = influencersDatabase.filter(influencer => {
                    const specialties = influencer.specialty;
                    return specialties.includes(args.category);
                });
            } else {
                selectedInfluencers = influencersDatabase;
            }
            // 随机选择一个网红
            const randomIndex = Math.floor(Math.random() * selectedInfluencers.length);
            const selectedInfluencer = selectedInfluencers[randomIndex];

            return {
                success: true,
                data: {
                    姓名: selectedInfluencer.name,
                    昵称: selectedInfluencer.nickname,
                    平台: selectedInfluencer.platform,
                    粉丝数: selectedInfluencer.followers,
                    专业领域: selectedInfluencer.specialty,
                    人物性格: selectedInfluencer.personality,
                    背景介绍: selectedInfluencer.background
                },
                message: `成功选取网红：${selectedInfluencer.name}（${selectedInfluencer.nickname}）`
            };

        } catch (error) {
            return {
                success: false,
                error: `网红选取失败：${error.message}`,
                data: null
            };
        }
    }
);

/**
 * 获取网红背景信息工具 - 根据网红姓名获取详细信息
 */
export const influencerInfoTool = Tools.createCustomTool(
    'getCelebrityBackground',
    '根据网红姓名获取该网红的详细背景信息，包括专业领域、人物性格、背景介绍等',
    {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: '网红姓名',
                minLength: 2,
                maxLength: 20
            }
        },
        required: ['name']
    },
    async (args) => {
        console.log('getCelebrityBackground working!');
        try {
            const influencer = influencersDatabase.find(item =>
                item.name === args.name || item.nickname === args.name
            );

            if (!influencer) {
                return {
                    success: false,
                    error: `未找到名为"${args.name}"的网红信息`,
                    data: null
                };
            }

            return {
                success: true,
                data: {
                    基本信息: {
                        姓名: influencer.name,
                        昵称: influencer.nickname,
                        平台: influencer.platform,
                        粉丝数: influencer.followers
                    },
                    专业信息: {
                        专业领域: influencer.specialty,
                        人物性格: influencer.personality,
                        背景介绍: influencer.background
                    }
                },
                message: `成功获取网红"${influencer.name}"的详细信息`
            };

        } catch (error) {
            return {
                success: false,
                error: `获取网红信息失败：${error.message}`,
                data: null
            };
        }
    }
);

/**
 * 获取所有网红列表工具 - 返回所有可用的网红
 */
export const influencerListTool = Tools.createCustomTool(
    'getCelebrityList',
    '获取所有数据库中可用的网红列表，包括姓名、昵称和专业领域等等',
    {
        type: 'object',
        properties: {}
    },
    async () => {
        console.log('getCelebrityList working!');
        try {
            const influencerList = influencersDatabase.map(influencer => ({
                姓名: influencer.name,
                昵称: influencer.nickname,
                专业领域: influencer.specialty
            }));

            return {
                success: true,
                data: influencerList,
                message: `成功获取${influencerList.length}位网红的信息`,
                total: influencerList.length
            };

        } catch (error) {
            return {
                success: false,
                error: `获取网红列表失败：${error.message}`,
                data: null
            };
        }
    }
);

// 导出所有工具
export const influencerTools = [
    influencerSelectionTool,
    influencerInfoTool,
    influencerListTool
];

// 默认导出
export default {
    influencerSelectionTool,
    influencerInfoTool,
    influencerListTool,
    influencerTools
};