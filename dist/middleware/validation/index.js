"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = exports.handleValidationError = exports.validateUpdateChatTitle = exports.validateAddMessage = exports.validateCreateChat = exports.validateAIChat = void 0;
const chatSchema_1 = require("../../schemas/chatSchema");
// Generic validation middleware
const validateRequest = (validationFunction) => {
    return (req, res, next) => {
        const validation = validationFunction(req.body);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validation.error
            });
            return;
        }
        // Replace req.body with validated data
        req.body = validation.data;
        next();
    };
};
exports.validateRequest = validateRequest;
// Specific validation middlewares
exports.validateAIChat = validateRequest(chatSchema_1.validateAIChatRequest);
exports.validateCreateChat = validateRequest(chatSchema_1.validateCreateChatRequest);
exports.validateAddMessage = validateRequest(chatSchema_1.validateAddMessageRequest);
exports.validateUpdateChatTitle = validateRequest(chatSchema_1.validateUpdateChatTitleRequest);
// Error handling middleware for validation errors
const handleValidationError = (error, req, res, next) => {
    if (error.name === 'ZodError') {
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: error.errors
        });
        return;
    }
    next(error);
};
exports.handleValidationError = handleValidationError;
