const fs = require('fs');
const path = require('path');

const envContent = `# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/deepseek-ai

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
BACKEND_URL=https://deepseek-ai-server.vercel.app

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Client URL (for CORS)
CLIENT_URL=https://deepseek-ai-client.vercel.app

# AI Service Configuration
GOOGLE_GENERATIVE_AI_API_KEY=your-google-api-key
GOOGLE_API_KEY=your-google-api-key
OPENAI_API_KEY=your-openai-api-key

# OpenRouter Model-Specific API Keys
DEEPSEEK_R1_API_KEY=your-deepseek-r1-api-key
LLAMA_31_API_KEY=your-llama-31-api-key
GPT_OSS_API_KEY=your-gpt-oss-api-key

# Web Search Configuration
SEARCHAPI_KEY=your-searchapi-key

# Weather API Configuration
OPENWEATHER_API_KEY=your-openweather-api-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
`;

const envPath = path.join(__dirname, '.env');

try {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully!');
  console.log('⚠️  Please update the following required values:');
  console.log('   - GOOGLE_CLIENT_ID: Your Google OAuth client ID');
  console.log('   - GOOGLE_CLIENT_SECRET: Your Google OAuth client secret');
  console.log('   - JWT_SECRET: A strong secret key for JWT tokens');
  console.log('   - MONGODB_URI: Your MongoDB connection string');
  console.log('   - Other API keys as needed');
  console.log('\n📝 You can get Google OAuth credentials from:');
  console.log('   https://console.developers.google.com/apis/credentials');
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
}
