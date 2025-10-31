# DeepSeek AI Backend

This is the backend API server for the DeepSeek AI Chat Application built with Node.js, Express.js, and MongoDB.

## Features

- **Authentication**: User management with JWT tokens
- **Chat Management**: Create, read, update, and delete chat conversations
- **File Upload**: Cloudinary integration for file storage
- **PDF Analysis**: PDF text extraction and analysis
- **Web Search**: Web scraping and search functionality
- **User Profiles**: User preferences and memory management

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Cloudinary
- **PDF Processing**: pdf-parse
- **Web Scraping**: Cheerio
- **Security**: Helmet, CORS, Rate Limiting

## Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection configuration
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── chatController.js    # Chat management logic
│   ├── userController.js    # User profile logic
│   ├── pdfController.js     # PDF processing logic
│   ├── searchController.js  # Web search logic
│   └── cloudinaryController.js # File upload logic
├── middleware/
│   └── (custom middleware)
├── models/
│   ├── Chat.js             # Chat data model
│   └── User.js             # User data model
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── chat.js             # Chat routes
│   ├── user.js             # User routes
│   ├── pdf.js              # PDF routes
│   ├── search.js           # Search routes
│   └── cloudinary.js       # File upload routes
├── services/
│   └── (business logic services)
├── utils/
│   └── (utility functions)
├── server.js               # Main server file
├── package.json            # Dependencies and scripts
└── env.example             # Environment variables template
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system or use a cloud service.

5. **Run the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/deepseek-ai

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Client URL (for CORS)
CLIENT_URL=https://deepseek-ai-client.vercel.app
```

## API Endpoints

### Authentication
- `POST /api/auth/init` - Initialize static user
- `GET /api/auth/user` - Get user with memory
- `POST /api/auth/login` - User login
- `PUT /api/auth/user/:userId/memory` - Update user memory

### Chat Management
- `POST /api/chat` - Create new chat
- `GET /api/chat` - Get user chats
- `GET /api/chat/:id` - Get chat by ID
- `GET /api/chat/:id/messages` - Get chat messages
- `POST /api/chat/:id/messages` - Add message to chat
- `PUT /api/chat/:id/title` - Update chat title
- `DELETE /api/chat/:id` - Delete chat

### User Management
- `GET /api/user/:userId` - Get user profile
- `PUT /api/user/:userId` - Update user profile
- `GET /api/user/:userId/stats` - Get user statistics

### File Management
- `POST /api/cloudinary/upload` - Upload file to Cloudinary
- `DELETE /api/cloudinary/:publicId` - Delete file from Cloudinary
- `GET /api/cloudinary/:publicId` - Get file info

### PDF Processing
- `POST /api/pdf/analyze` - Analyze PDF content
- `POST /api/pdf/extract` - Extract text from PDF

### Web Search
- `POST /api/search` - Perform web search
- `POST /api/search/scrape` - Scrape webpage content

## Development

### Running in Development Mode
```bash
npm run dev
```

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing configuration
- **Rate Limiting**: Request rate limiting
- **Input Validation**: Request validation
- **JWT Authentication**: Secure token-based authentication

## Error Handling

The API includes comprehensive error handling with:
- HTTP status codes
- Descriptive error messages
- Logging for debugging
- Graceful error responses

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
