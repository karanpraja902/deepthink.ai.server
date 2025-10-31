"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserStats = exports.updateUserProfile = exports.getUserProfile = void 0;
const User_1 = __importDefault(require("../../models/User"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
// Get user profile
exports.getUserProfile = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User_1.default.findOne({ id: userId, isActive: true });
        if (!user) {
            res.status(404).json({
                success: false,
                error: 'User not found'
            });
            return;
        }
        const response = {
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    name: user.name,
                    avatar: user.avatar,
                    preferences: user.preferences,
                    subscription: user.subscription,
                    createdAt: user.createdAt,
                    lastActive: user.lastActive
                }
            }
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user profile'
        });
    }
});
// Update user profile
exports.updateUserProfile = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        console.log('updateUserProfile');
        const { userId } = req.params;
        const { name, avatar, preferences, subscription } = req.body;
        const updateData = {};
        if (name)
            updateData.name = name;
        if (avatar)
            updateData.avatar = avatar;
        if (preferences)
            updateData.preferences = preferences;
        if (subscription)
            updateData.subscription = subscription;
        updateData.lastActive = new Date();
        const user = await User_1.default.findOneAndUpdate({ id: userId, isActive: true }, updateData, { new: true });
        console.log('updatedUserProfile', user);
        if (!user) {
            res.status(404).json({
                success: false,
                error: 'User not found'
            });
            return;
        }
        const response = {
            success: true,
            message: 'User profile updated successfully',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    name: user.name,
                    avatar: user.avatar,
                    preferences: user.preferences,
                    subscription: user.subscription,
                    lastActive: user.lastActive
                }
            }
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Update user profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user profile'
        });
    }
});
// Get user statistics
exports.getUserStats = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User_1.default.findOne({ id: userId, isActive: true });
        if (!user) {
            res.status(404).json({
                success: false,
                error: 'User not found'
            });
            return;
        }
        // You can add more statistics here based on your needs
        const stats = {
            totalChats: 0, // This would need to be calculated from Chat model
            totalMessages: 0, // This would need to be calculated from Chat model
            lastActive: user.lastActive,
            memberSince: user.createdAt,
            preferences: user.preferences
        };
        const response = {
            success: true,
            data: { stats }
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user statistics'
        });
    }
});
