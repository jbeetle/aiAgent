#!/usr/bin/env node

/**
 * Custom Tool Creation Example for ReAct Agent Framework
 *
 * This example demonstrates how to create and use custom tools
 * with the ReAct agent framework.
 */

import {Agent, Tools} from '../src/index.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Create a weather tool (mock implementation)
 */
const weatherTool = Tools.createCustomTool(
    'get_weather',
    'Get the current weather for a specified city',
    {
        type: 'object',
        properties: {
            city: {
                type: 'string',
                description: 'Name of the city to get weather for'
            },
            unit: {
                type: 'string',
                enum: ['celsius', 'fahrenheit'],
                description: 'Temperature unit',
                default: 'celsius'
            }
        },
        required: ['city'],
        additionalProperties: false
    },
    async (args) => {
        const {city, unit = 'celsius'} = args;

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
    }
);

/**
 * Create a string manipulation tool
 */
const stringTool = Tools.createCustomTool(
    'string_manipulate',
    'Perform various string manipulation operations',
    {
        type: 'object',
        properties: {
            operation: {
                type: 'string',
                enum: ['uppercase', 'lowercase', 'reverse', 'count', 'length'],
                description: 'String operation to perform'
            },
            text: {
                type: 'string',
                description: 'The input text to manipulate'
            }
        },
        required: ['operation', 'text'],
        additionalProperties: false
    },
    async (args) => {
        const {operation, text} = args;

        switch (operation) {
            case 'uppercase':
                return text.toUpperCase();
            case 'lowercase':
                return text.toLowerCase();
            case 'reverse':
                return text.split('').reverse().join('');
            case 'count':
                return `The text contains ${text.length} characters`;
            case 'length':
                return text.length;
            default:
                throw new Error(`Unsupported operation: ${operation}`);
        }
    }
);

/**
 * Create a file information tool
 */
const fileInfoTool = Tools.createCustomTool(
    'file_info',
    'Get information about a file (mock implementation)',
    {
        type: 'object',
        properties: {
            filename: {
                type: 'string',
                description: 'Name of the file to get information about'
            }
        },
        required: ['filename'],
        additionalProperties: false
    },
    async (args) => {
        const {filename} = args;

        // Mock file information
        const mockFiles = {
            'example.txt': {size: 1024, created: '2024-01-15', modified: '2024-01-20', type: 'text/plain'},
            'document.pdf': {size: 2048576, created: '2024-01-10', modified: '2024-01-18', type: 'application/pdf'},
            'image.jpg': {size: 524288, created: '2024-01-12', modified: '2024-01-19', type: 'image/jpeg'}
        };

        const fileInfo = mockFiles[filename];
        if (!fileInfo) {
            return `File "${filename}" not found`;
        }

        const sizeKB = Math.round(fileInfo.size / 1024);
        return `File: ${filename}\nSize: ${sizeKB} KB\nType: ${fileInfo.type}\nCreated: ${fileInfo.created}\nModified: ${fileInfo.modified}`;
    }
);

/**
 * Create a unit conversion tool
 */
const unitConverterTool = Tools.createCustomTool(
    'convert_units',
    'Convert between different units of measurement',
    {
        type: 'object',
        properties: {
            value: {
                type: 'number',
                description: 'The value to convert'
            },
            from_unit: {
                type: 'string',
                enum: ['meters', 'kilometers', 'miles', 'feet', 'inches', 'kilograms', 'pounds', 'ounces', 'celsius', 'fahrenheit'],
                description: 'Unit to convert from'
            },
            to_unit: {
                type: 'string',
                enum: ['meters', 'kilometers', 'miles', 'feet', 'inches', 'kilograms', 'pounds', 'ounces', 'celsius', 'fahrenheit'],
                description: 'Unit to convert to'
            }
        },
        required: ['value', 'from_unit', 'to_unit'],
        additionalProperties: false
    },
    async (args) => {
        const {value, from_unit, to_unit} = args;

        if (from_unit === to_unit) {
            return value;
        }

        // Conversion factors
        const conversions = {
            length: {
                meters: {kilometers: 0.001, miles: 0.000621371, feet: 3.28084, inches: 39.3701},
                kilometers: {meters: 1000, miles: 0.621371, feet: 3280.84, inches: 39370.1},
                miles: {meters: 1609.34, kilometers: 1.60934, feet: 5280, inches: 63360},
                feet: {meters: 0.3048, kilometers: 0.0003048, miles: 0.000189394, inches: 12},
                inches: {meters: 0.0254, kilometers: 0.0000254, miles: 0.0000157828, feet: 0.0833333}
            },
            weight: {
                kilograms: {pounds: 2.20462, ounces: 35.274},
                pounds: {kilograms: 0.453592, ounces: 16},
                ounces: {kilograms: 0.0283495, pounds: 0.0625}
            },
            temperature: {
                celsius: {fahrenheit: (c) => (c * 9 / 5) + 32},
                fahrenheit: {celsius: (f) => (f - 32) * 5 / 9}
            }
        };

        let result;

        // Handle temperature conversions
        if (from_unit === 'celsius' && to_unit === 'fahrenheit') {
            result = conversions.temperature.celsius.fahrenheit(value);
        } else if (from_unit === 'fahrenheit' && to_unit === 'celsius') {
            result = conversions.temperature.fahrenheit.celsius(value);
        } else {
            // Handle length and weight conversions
            const fromCategory = ['meters', 'kilometers', 'miles', 'feet', 'inches'].includes(from_unit) ? 'length' : 'weight';
            const toCategory = ['meters', 'kilometers', 'miles', 'feet', 'inches'].includes(to_unit) ? 'length' : 'weight';

            if (fromCategory !== toCategory) {
                throw new Error('Cannot convert between different categories (length/weight/temperature)');
            }

            result = value * conversions[fromCategory][from_unit][to_unit];
        }

        return `${value} ${from_unit} = ${result.toFixed(2)} ${to_unit}`;
    }
);

async function customToolExample() {
    console.log('🔧 ReAct Agent Framework - Custom Tool Creation Example\n');
    try {
        // Create an array of custom tools
        const customTools = [
            weatherTool,
            stringTool,
            fileInfoTool,
            unitConverterTool
        ];

        const agent = new Agent.ReActAgent('DeepSeek', 'deepseek-chat', customTools, {
            verbose: true, // Enable detailed logging
            maxIterations: 8
        });
        console.log('✅ Agent created with custom tools!\n');
        console.log('🔧 Available custom tools:', customTools.map(t => t.name).join(', '));
        console.log('');

        // Example 1: Weather query
        console.log('☀️ Example 1: Weather query');
        console.log('Question: What is the weather like in London?\n');

        const result1 = await agent.run('What is the weather like in London?');
        console.log('✨ Answer:', result1.answer);
        console.log('');

        // Example 2: String manipulation
        console.log('📝 Example 2: String manipulation');
        console.log('Question: Convert "hello world" to uppercase and count the characters\n');

        const result2 = await agent.run('Convert "hello world" to uppercase and count the characters');
        console.log('✨ Answer:', result2.answer);
        console.log('');

        // Example 3: Unit conversion
        console.log('📏 Example 3: Unit conversion');
        console.log('Question: Convert 100 kilometers to miles\n');

        const result3 = await agent.run('Convert 100 kilometers to miles');
        console.log('✨ Answer:', result3.answer);
        console.log('');

        // Example 4: File information
        console.log('📁 Example 4: File information');
        console.log('Question: Get information about the file "example.txt"\n');

        const result4 = await agent.run('Get information about the file "example.txt"');
        console.log('✨ Answer:', result4.answer);
        console.log('');

        // Example 5: Complex multi-tool usage
        console.log('🧠 Example 5: Complex multi-tool usage');
        console.log('Question: Convert 25°C to Fahrenheit, then create a string with the result in uppercase\n');

        const result5 = await agent.run('Convert 25°C to Fahrenheit, then create a string with the result in uppercase');
        console.log('✨ Answer:', result5.answer);
        console.log('');

        console.log('🎉 Custom tool examples completed successfully!');

    } catch (error) {
        console.error('❌ Error running custom tool examples:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
        }
    }
}

//customToolExample().catch(console.error);
