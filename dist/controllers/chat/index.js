"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChatMessages = exports.deleteChat = exports.updateChatTitle = exports.addMessage = exports.getUserChats = exports.getChat = exports.createChat = void 0;
const Chat_1 = __importDefault(require("../../models/Chat"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const chatSchema_1 = require("../../schemas/chatSchema");
// Create new chat
exports.createChat = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        // Validate request body
        console.log("createChat controller");
        const validation = (0, chatSchema_1.validateCreateChatRequest)(req.body);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                error: 'Invalid request format',
                details: validation.error
            });
            return;
        }
        console.log("validation:", validation);
        const { userId } = validation.data;
        // Dynamic import for nanoid (ES module)
        const { nanoid } = await Promise.resolve().then(() => __importStar(require('nanoid')));
        const chatId = nanoid();
        const newChat = new Chat_1.default({
            id: chatId,
            userId: userId,
            messages: [],
            title: 'New Chat',
            isActive: true
        });
        await newChat.save();
        const response = {
            success: true,
            message: 'Chat created successfully',
            data: {
                chat: {
                    _id: newChat.id, // Use _id to match client expectations
                    id: newChat.id,
                    userId: newChat.userId,
                    title: newChat.title,
                    createdAt: newChat.createdAt
                }
            }
        };
        console.log("ChatResponse:", response);
        res.status(201).json(response);
    }
    catch (error) {
        console.error('Create chat error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create chat'
        });
    }
});
// Get chat by ID
exports.getChat = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        console.log("getChat:", req.params);
        const { id } = req.params;
        const chat = await Chat_1.default.findOne({ id, isActive: true });
        if (!chat) {
            res.status(404).json({
                success: false,
                error: 'Chat not found'
            });
            return;
        }
        const response = {
            success: true,
            data: { chat }
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Get chat error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get chat'
        });
    }
});
// Get all chats for a user
exports.getUserChats = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId || typeof userId !== 'string') {
            res.status(400).json({
                success: false,
                error: 'User ID required'
            });
            return;
        }
        const chats = await Chat_1.default.find({
            userId,
            isActive: true
        }).sort({ updatedAt: -1 });
        const response = {
            success: true,
            data: {
                chats: chats.map(chat => ({
                    id: chat.id,
                    title: chat.title,
                    createdAt: chat.createdAt,
                    updatedAt: chat.updatedAt,
                    messageCount: chat.messages.length
                }))
            }
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Get user chats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user chats'
        });
    }
});
// Add message to chat
exports.addMessage = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        // Validate request body
        console.log("addMessage:");
        const validation = (0, chatSchema_1.validateAddMessageRequest)(req.body);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                error: 'Invalid request format',
                details: validation.error
            });
            return;
        }
        console.log("addMessage:");
        const { id } = req.params;
        console.log("id:", id);
        const { role, content, files, parts, metadata } = validation.data;
        const chat = await Chat_1.default.findOne({ id, isActive: true });
        console.log("chat:", chat);
        if (!chat) {
            res.status(404).json({
                success: false,
                error: 'Chat not found'
            });
            return;
        }
        // Extract content from parts if content is not provided
        let messageContent = content || '';
        if (!messageContent && parts && parts.length > 0) {
            const textPart = parts.find(part => part.type === 'text' && part.text);
            messageContent = textPart?.text || '';
        }
        const newMessage = {
            role,
            content: messageContent || '',
            timestamp: new Date(),
            files: files || [],
            parts: parts || [],
            metadata: metadata || {}
        };
        chat.messages.push(newMessage);
        chat.updatedAt = new Date();
        // Update title if it's the first user message
        if (role === 'user' && chat.messages.length === 1) {
            const words = messageContent.split(' ').slice(0, 4).join(' ');
            chat.title = words.length > 20 ? words.substring(0, 20) + '...' : words;
        }
        await chat.save();
        console.log("chat saved:", chat);
        const response = {
            success: true,
            message: 'Message added successfully',
            data: { message: newMessage }
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Add message error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add message'
        });
    }
});
// Update chat title
exports.updateChatTitle = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        // Validate request body
        const validation = (0, chatSchema_1.validateUpdateChatTitleRequest)(req.body);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                error: 'Invalid request format',
                details: validation.error
            });
            return;
        }
        const { id } = req.params;
        const { title } = validation.data;
        const chat = await Chat_1.default.findOneAndUpdate({ id, isActive: true }, { title, updatedAt: new Date() }, { new: true });
        if (!chat) {
            res.status(404).json({
                success: false,
                error: 'Chat not found'
            });
            return;
        }
        const response = {
            success: true,
            message: 'Chat title updated successfully',
            data: {
                chat: {
                    id: chat.id,
                    title: chat.title,
                    updatedAt: chat.updatedAt
                }
            }
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Update chat title error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update chat title'
        });
    }
});
// Delete chat
exports.deleteChat = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { id } = req.params;
        const chat = await Chat_1.default.findOneAndUpdate({ id, isActive: true }, { isActive: false }, { new: true });
        if (!chat) {
            res.status(404).json({
                success: false,
                error: 'Chat not found'
            });
            return;
        }
        const response = {
            success: true,
            message: 'Chat deleted successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Delete chat error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete chat'
        });
    }
});
// Get chat messages
exports.getChatMessages = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { id } = req.params;
        const chat = await Chat_1.default.findOne({ id, isActive: true });
        if (!chat) {
            res.status(404).json({
                success: false,
                error: 'Chat not found'
            });
            return;
        }
        const response = {
            success: true,
            data: { messages: chat.messages }
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Get chat messages error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get chat messages'
        });
    }
});
