import {Models, Tools} from '../src/index.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();
const llmClient = Models.createModel('DeepSeek', 'deepseek-chat');

async function test() {
    const result = await llmClient.generateText('你是个段子手', '讲个罗永浩的笑话', {
        maxTokens: 250, temperature: 1.5
    });
    console.log(result);
}

//test().catch(console.error);

async function test2() {
    const result = await llmClient.streamText('你是个段子手', '讲个罗永浩的笑话', {
        max_tokens: 250, temperature: 1.5
    });
    for await (const chunk of result) {
        // 使用可选链和空值合并操作符简化代码
        process.stdout.write(chunk.choices?.[0]?.delta?.content ?? '');
    }
    console.log(); // 输出换行符以确保最后一行完整显示
}

//use tool
/**
 * Create a weather tool (mock implementation)
 */
const weatherTool = Tools.createCustomTool('get_weather', 'Get the current weather for a specified city', {
    type: 'object', properties: {
        city: {
            type: 'string', description: 'Name of the city to get weather for'
        }, unit: {
            type: 'string', enum: ['celsius', 'fahrenheit'], description: 'Temperature unit', default: 'celsius'
        }
    }, required: ['city'], additionalProperties: false
}, async (args) => {

    const {city, unit = 'celsius'} = args;
    console.log('get_weather called with args:', city, unit);
    // Mock weather data - in a real implementation, this would call a weather API
    const mockWeatherData = {
        'New York': {temp: 22, condition: 'Sunny', humidity: 65},
        'London': {temp: 15, condition: 'Cloudy', humidity: 80},
        'Tokyo': {temp: 28, condition: 'Rainy', humidity: 75},
        'Sydney': {temp: 25, condition: 'Clear', humidity: 55},
        'Paris': {temp: 18, condition: 'Partly cloudy', humidity: 70}
    };

    const weather = mockWeatherData[city];
    if (!weather) {
        return `Weather data not available for ${city}`;
    }

    let temp = weather.temp;
    if (unit === 'fahrenheit') {
        temp = Math.round((temp * 9 / 5) + 32);
    }

    return `Weather in ${city}: ${weather.condition}, ${temp}°${unit.toUpperCase().charAt(0)}, humidity ${weather.humidity}%`;
});

//test2().catch(console.error);
// 在 test3 函数中添加调试信息
async function test3() {
    const result = await llmClient.callWithTools([{
        role: 'user', content: 'What is the weather like in New York?'
    }], [weatherTool], {
        maxTokens: 1024, temperature: 1.0, stream: false
    });
    console.log(result.choices[0].message.content);
}


//test3().catch(console.error);
async function test4() {
    const result = await llmClient.callWithTools([{
        role: 'user', content: '当前时间是多少？'
    }], [Tools.getTool('get_current_time')], {
        maxTokens: 1024, temperature: 1.0, stream: false
    });
    console.log(result.choices[0].message.content);
}

test4().catch(console.error);