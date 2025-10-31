import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
const cookieParser = require("cookie-parser");
// Load environment variables
dotenv.config();

import connectDB from './config/database';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import userRoutes from './routes/user';
import pdfRoutes from './routes/pdf';
import cloudinaryRoutes from './routes/cloudinary';
import aiRoutes from './routes/ai';
import weatherRoutes from './routes/weather';
import stripeRoutes from './routes/stripe';
import { handleValidationError } from './middleware/validation';

import passport from "passport";
import "./strategy/google";

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(cookieParser());
// CORS configuration
const allowedOrigins = [
  'http://localhost:3000', // Local development
  'https://deepseek-ai-client.vercel.app', // Production client
  'https://deepseek-ai-web.vercel.app', // Production frontend
  'https://deepseek-ai-client.vercel.app', // Alternative client URL
  process.env.CLIENT_URL // Custom client URL from environment
].filter(Boolean); // Remove any undefined values

console.log('Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else if (process.env.NODE_ENV === 'development') {
      // In development, allow any localhost origins
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        console.warn('CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // In production, also allow any vercel.app subdomain for your project
      if (origin.includes('deepseek-ai') && origin.includes('vercel.app')) {
        console.log('Allowing Vercel deployment origin:', origin);
        callback(null, true);
      } else {
        console.warn('CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));
app.use(passport.initialize());

// Rate limiting - more lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 for dev, 100 for prod
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  }
});

// Apply rate limiting to all API routes except auth (to prevent login/logout issues)
app.use('/api/chat', limiter);
app.use('/api/user', limiter);
app.use('/api/pdf', limiter);
app.use('/api/cloudinary', limiter);
app.use('/api/ai', limiter);
app.use('/api/weather', limiter);
app.use('/api/stripe', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/user', userRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/cloudinary', cloudinaryRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/stripe', stripeRoutes);
// Validation error handling middleware
app.use(handleValidationError);
const welcomeStrings = [
  "Hello Express!",
  "To learn more about Express on Vercel, visit https://vercel.com/docs/frameworks/backend/express",
]

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});
app.get('/', (_req, res) => {
  res.send(welcomeStrings.join('\n\n'))
})
// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
