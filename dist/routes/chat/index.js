"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_1 = require("../../controllers/chat");
const validation_1 = require("../../middleware/validation");
const router = (0, express_1.Router)();
// Create new chat
router.post('/', validation_1.validateCreateChat, chat_1.createChat);
// Get all chats for a user (must come before /:id route)
router.get('/', chat_1.getUserChats);
// Get chat by ID
router.get('/:id', chat_1.getChat);
// Add message to chat
router.post('/:id/messages', validation_1.validateAddMessage, chat_1.addMessage);
// Update chat title
router.put('/:id/title', validation_1.validateUpdateChatTitle, chat_1.updateChatTitle);
// Delete chat
router.delete('/:id', chat_1.deleteChat);
// Get chat messages
router.get('/:id/messages', chat_1.getChatMessages);
exports.default = router;
