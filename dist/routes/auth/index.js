"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("passport"));
const auth_1 = require("../../controllers/auth");
const auth_2 = require("../../middleware/auth");
const router = express_1.default.Router();
// Initialize static user
router.post('/init', auth_1.initializeStaticUser);
// Get user with memory
router.get('/user', auth_1.getUserWithMemory);
// Login user
router.post('/login', auth_1.login);
// Register new user
router.post('/register', auth_1.register);
// Get current user
router.get('/me', auth_2.authMiddleware, auth_1.getCurrentUser);
// Google OAuth routes
console.log("google route");
router.get("/google", passport_1.default.authenticate('google', {
    scope: ['profile', 'email'],
    accessType: 'offline',
    prompt: 'select_account consent'
}));
router.get('/google/callback', passport_1.default.authenticate('google', { session: false, failureRedirect: '/sign-in' }), auth_1.googleCallback);
// Logout user
router.post('/logout', auth_1.logout);
// Update user memory
router.put('/user/:userId/memory', auth_1.updateUserMemory);
exports.default = router;
