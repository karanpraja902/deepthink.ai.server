import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import User from '../../models/User';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();
console.log("google strategy");
console.log("Environment variables:");
console.log("- NODE_ENV:", process.env.NODE_ENV);
console.log("- BACKEND_URL:", process.env.BACKEND_URL);
console.log("- PORT:", process.env.PORT);
console.log("- GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "SET" : "NOT SET");
console.log("- GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "SET" : "NOT SET");

// Construct callback URL - point to frontend API route
const frontendUrl = process.env.CLIENT_URL || (process.env.NODE_ENV === 'production' ? 'https://deepseek-ai-client.vercel.app' : 'http://localhost:3000');
const callbackURL = `${frontendUrl}/api/auth/google`;

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
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: callbackURL
}, async (_accessToken: string, _refreshToken: string, profile: any, cb: any) => {
    try {
        console.log('Google profile:', profile);
        
        let user = await User.findOne({ email: profile.emails![0].value });
        console.log({"user": user, "message": "Existing user found"});
        console.log("user callback", user);
        if (user) {
            // Update avatar if not set
            if (!user.avatar && profile.photos && profile.photos.length > 0) {
                user.avatar = profile.photos[0].value;
                await user.save();
            }
        } else {
            // Create new user
            user = new User({
                id: uuidv4(),
                name: profile.displayName || profile.emails![0].value.split('@')[0],
                email: profile.emails![0].value,
                username: profile.emails![0].value.split('@')[0],
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
    } catch (error) {
        console.error('Google OAuth error:', error);
        return cb(error, undefined);
    }
}));

export default passport;