"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeatherDataOnly = exports.getWeatherWithAI = exports.tools = exports.weatherTool = void 0;
const ai_1 = require("ai");
const google_1 = require("@ai-sdk/google");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const zod_1 = require("zod");
const axios_1 = __importDefault(require("axios"));
// Weather API configuration
const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';
// Function to get real weather data from OpenWeatherMap API
const getRealWeatherData = async (location) => {
    if (!WEATHER_API_KEY) {
        console.error('❌ OPENWEATHER_API_KEY not configured in environment variables');
        throw new Error('Weather API key not configured. Please set OPENWEATHER_API_KEY in your .env file');
    }
    try {
        // First, try to get coordinates using the Geocoding API
        const geocodeResponse = await axios_1.default.get(`http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${WEATHER_API_KEY}`);
        if (!geocodeResponse.data || geocodeResponse.data.length === 0) {
            throw new Error(`Location "${location}" not found`);
        }
        const { lat, lon, name, country } = geocodeResponse.data[0];
        console.log(`📍 Found coordinates for ${name}, ${country}: lat=${lat}, lon=${lon}`);
        // Then, get current weather data using coordinates
        const weatherResponse = await axios_1.default.get(`${WEATHER_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=imperial`);
        const weatherData = weatherResponse.data;
        console.log('🌤️ Weather data received:', {
            location: weatherData.name,
            temp: weatherData.main.temp,
            weather: weatherData.weather[0].main,
            humidity: weatherData.main.humidity,
            windSpeed: weatherData.wind.speed
        });
        return {
            weather: weatherData.weather[0].main,
            temperature: Math.round(weatherData.main.temp),
            location: weatherData.name,
            humidity: weatherData.main.humidity,
            windSpeed: weatherData.wind.speed,
            description: weatherData.weather[0].description
        };
    }
    catch (error) {
        console.error('❌ Weather API error:', error);
        if (error.response?.status === 404) {
            throw new Error(`Location "${location}" not found. Try using just the city name (e.g., "Jodhpur" instead of "jodhpur rajasthan")`);
        }
        throw new Error(`Failed to fetch weather data: ${error.message}`);
    }
};
// Weather tool function
exports.weatherTool = {
    description: 'Display the weather for a location',
    inputSchema: zod_1.z.object({
        location: zod_1.z.string().describe('The location to get the weather for'),
    }),
    execute: async function (input) {
        try {
            // Get real weather data from OpenWeatherMap API
            const weatherData = await getRealWeatherData(input.location);
            return weatherData;
        }
        catch (error) {
            // Log the specific error for debugging
            console.error('❌ Weather API failed:', error);
            console.error('❌ Error details:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data
            });
            // Don't fallback to mock data - throw the error instead
            throw new Error(`Failed to get real-time weather for ${input.location}: ${error.message}`);
        }
    },
};
exports.tools = {
    displayWeather: exports.weatherTool,
};
// Weather tool function that uses Google AI with built-in weather tool
exports.getWeatherWithAI = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { location, userQuestion } = req.body;
        if (!location) {
            res.status(400).json({
                success: false,
                error: 'Location is required'
            });
            return;
        }
        console.log(`Getting weather for location: ${location}`);
        // Get weather data first
        const weatherData = await exports.weatherTool.execute({ location });
        console.log('weatherData', weatherData);
        // Use Google AI to generate response (always use Google for weather)
        const result = await (0, ai_1.generateText)({
            model: (0, google_1.google)('gemini-2.5-flash'),
            prompt: `You are a helpful weather assistant. Here is the current weather data for ${location}:

Temperature: ${weatherData.temperature}°F
Weather Condition: ${weatherData.weather}
Description: ${weatherData.description}
Humidity: ${weatherData.humidity}%
Wind Speed: ${weatherData.windSpeed} mph

User Question: ${userQuestion || 'What is the current weather?'}

Please provide a friendly, conversational response about the weather. For temperature context: 75°F is pleasant, 80°F+ is warm, 90°F+ is hot, 60°F is cool, 50°F is chilly. Keep it concise (2-3 sentences).`,
            temperature: 0.7,
        });
        // Send response
        const response = {
            success: true,
            data: {
                weather: weatherData.weather,
                temperature: weatherData.temperature,
                location: weatherData.location,
                humidity: weatherData.humidity,
                windSpeed: weatherData.windSpeed,
                description: weatherData.description,
                aiResponse: result.text,
                retrievedAt: new Date().toISOString()
            }
        };
        console.log('✅ Weather data retrieved successfully');
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Weather error:', error);
        let errorMessage = 'Failed to get weather information';
        let errorDetails = '';
        if (error.message) {
            errorMessage = error.message;
        }
        if (error.code) {
            errorDetails = `Error code: ${error.code}`;
        }
        if (error.status) {
            errorDetails = `${errorDetails} | Status: ${error.status}`;
        }
        res.status(500).json({
            success: false,
            error: errorMessage,
            details: errorDetails || undefined,
            timestamp: new Date().toISOString()
        });
    }
});
// Simple weather data endpoint using the weather tool directly
exports.getWeatherDataOnly = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { location } = req.body;
        if (!location) {
            res.status(400).json({
                success: false,
                error: 'Location is required'
            });
            return;
        }
        console.log(`Getting weather data for location: ${location}`);
        // Use the weather tool directly
        const weatherData = await exports.weatherTool.execute({ location });
        const response = {
            success: true,
            data: {
                weather: weatherData.weather,
                temperature: weatherData.temperature,
                location: weatherData.location,
                humidity: weatherData.humidity,
                windSpeed: weatherData.windSpeed,
                description: weatherData.description,
                retrievedAt: new Date().toISOString()
            }
        };
        console.log('✅ Weather data retrieved successfully');
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Weather data error:', error);
        let errorMessage = 'Failed to get weather data';
        let errorDetails = '';
        if (error.message) {
            errorMessage = error.message;
        }
        if (error.code) {
            errorDetails = `Error code: ${error.code}`;
        }
        if (error.status) {
            errorDetails = `${errorDetails} | Status: ${error.status}`;
        }
        res.status(500).json({
            success: false,
            error: errorMessage,
            details: errorDetails || undefined,
            timestamp: new Date().toISOString()
        });
    }
});
