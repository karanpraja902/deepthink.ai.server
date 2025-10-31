"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../../models/User"));
const uuid_1 = require("uuid");
dotenv_1.default.config();
console.log("google strategy");
console.log("Environment variables:");
console.log("- NODE_ENV:", process.env.NODE_ENV);
console.log("- BACKEND_URL:", process.env.BACKEND_URL);
console.log("- PORT:", process.env.PORT);
console.log("- GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "SET" : "NOT SET");
console.log("- GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "SET" : "NOT SET");
// Construct callback URL with proper protocol for production
const backendUrl = process.env.BACKEND_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://your-production-domain.com' : 'http://localhost:5000');
const callbackURL = `${backendUrl}/api/auth/google/callback`;
console.log("Google OAuth callback URL:", callbackURL);
// Validate environment variables
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error("❌ Missing required Google OAuth environment variables!");
    console.error("Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET");
}
if (process.env.NODE_ENV === 'production' && !process.env.BACKEND_URL) {
    console.warn("⚠️ BACKEND_URL not set in production! Using fallback URL.");
    console.warn("Please set BACKEND_URL to your production domain (e.g., https://yourdomain.com)");
}
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callbackURL
}, async (_accessToken, _refreshToken, profile, cb) => {
    try {
        console.log('Google profile:', profile);
        let user = await User_1.default.findOne({ email: profile.emails[0].value });
        console.log({ "user": user, "message": "Existing user found" });
        console.log("user callback", user);
        if (user) {
            // Update avatar if not set
            if (!user.avatar && profile.photos && profile.photos.length > 0) {
                user.avatar = profile.photos[0].value;
                await user.save();
            }
        }
        else {
            // Create new user
            user = new User_1.default({
                id: (0, uuid_1.v4)(),
                name: profile.displayName || profile.emails[0].value.split('@')[0],
                email: profile.emails[0].value,
                username: profile.emails[0].value.split('@')[0],
                password: 'google_oauth_user', // Placeholder password for Google users
                avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : '',
                preferences: {
                    theme: 'light',
                    language: 'en',
                    aiModel: 'gemini-2.5-flash',
                    conversationStyle: 'casual',
                    topics: []
                },
                memory: {}
            });
            console.log("user212", user);
            await user.save();
            console.log('New Google user created:', user.email);
        }
        return cb(null, user);
    }
    catch (error) {
        console.error('Google OAuth error:', error);
        return cb(error, undefined);
    }
}));
exports.default = passport_1.default;
