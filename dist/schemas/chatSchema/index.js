"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIChatRequestSchema = exports.UpdateChatTitleRequestSchema = exports.AddMessageRequestSchema = exports.CreateChatRequestSchema = exports.ChatSchema = exports.validateAIChatRequest = exports.validateUpdateChatTitleRequest = exports.validateAddMessageRequest = exports.validateCreateChatRequest = exports.validateChat = void 0;
const zod_1 = require("zod");
// File schema
const FileSchema = zod_1.z.object({
    filename: zod_1.z.string().min(1, "Filename is required"),
    url: zod_1.z.string().url("Valid URL is required"),
    mediaType: zod_1.z.string().min(1, "Media type is required"),
    pdfAnalysis: zod_1.z.string().optional(),
});
// Message schema
const MessageSchema = zod_1.z.object({
    _id: zod_1.z.string().optional(), // MongoDB ObjectId as string
    role: zod_1.z.enum(['user', 'assistant'], {
        errorMap: () => ({ message: "Role must be either 'user' or 'assistant'" })
    }),
    content: zod_1.z.string().optional(), // Made optional since parts can contain the content
    timestamp: zod_1.z.date().optional().default(() => new Date()),
    files: zod_1.z.array(FileSchema).optional().default([]),
    parts: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        text: zod_1.z.string().optional(),
        mediaType: zod_1.z.string().optional(),
        url: zod_1.z.string().optional(),
        filename: zod_1.z.string().optional(),
    })).optional().default([]),
});
// Chat schema
const ChatSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, "Chat ID is required"),
    userId: zod_1.z.string().min(1, "User ID is required"),
    createdAt: zod_1.z.date().optional().default(() => new Date()),
    updatedAt: zod_1.z.date().optional().default(() => new Date()),
    messages: zod_1.z.array(MessageSchema).optional().default([]),
    title: zod_1.z.string().optional().default("New Chat"),
    isActive: zod_1.z.boolean().optional().default(true),
});
exports.ChatSchema = ChatSchema;
// Create chat request schema
const CreateChatRequestSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, "User ID is required"),
});
exports.CreateChatRequestSchema = CreateChatRequestSchema;
// Add message request schema
const AddMessageRequestSchema = zod_1.z.object({
    role: zod_1.z.enum(['user', 'assistant']),
    content: zod_1.z.string().optional(), // Made optional since parts can contain the content
    files: zod_1.z.array(FileSchema).optional().default([]),
    parts: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        text: zod_1.z.string().optional(),
        mediaType: zod_1.z.string().optional(),
        url: zod_1.z.string().optional(),
        filename: zod_1.z.string().optional(),
        image: zod_1.z.string().optional(), // For base64 images
        prompt: zod_1.z.string().optional(),
        generatedAt: zod_1.z.string().optional(),
    })).optional().default([]),
    metadata: zod_1.z.object({
        chatId: zod_1.z.string().optional(),
        model: zod_1.z.string().optional(),
        isImageGeneration: zod_1.z.boolean().optional().default(false),
    }).optional().default({}),
}).refine((data) => {
    // Allow empty content for assistant messages (streaming responses can start empty)
    if (data.role === 'assistant') {
        return true;
    }
    // For user messages, ensure either content or parts with text content is provided
    if (data.content && data.content.trim()) {
        return true;
    }
    if (data.parts && data.parts.length > 0) {
        const hasTextContent = data.parts.some(part => part.type === 'text' && part.text && part.text.trim());
        const hasFileContent = data.parts.some(part => part.type === 'file' && part.url);
        return hasTextContent || hasFileContent;
    }
    return false;
}, {
    message: "For user messages, either content or parts with text/file content must be provided",
    path: ["content"]
});
exports.AddMessageRequestSchema = AddMessageRequestSchema;
// Update chat title request schema
const UpdateChatTitleRequestSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Title is required").max(100, "Title too long"),
});
exports.UpdateChatTitleRequestSchema = UpdateChatTitleRequestSchema;
// AI Chat request schema
const AIChatRequestSchema = zod_1.z.object({
    messages: zod_1.z.array(zod_1.z.object({
        role: zod_1.z.enum(['user', 'assistant']),
        content: zod_1.z.string().optional(),
        text: zod_1.z.string().optional(),
        parts: zod_1.z.array(zod_1.z.object({
            type: zod_1.z.string(),
            text: zod_1.z.string().optional(),
            mediaType: zod_1.z.string().optional(),
            url: zod_1.z.string().optional(),
            filename: zod_1.z.string().optional(),
        })).optional(),
    })).optional(),
    content: zod_1.z.string().optional(),
    text: zod_1.z.string().optional(),
    parts: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        text: zod_1.z.string().optional(),
        mediaType: zod_1.z.string().optional(),
        url: zod_1.z.string().optional(),
        filename: zod_1.z.string().optional(),
    })).optional(),
    chatId: zod_1.z.string().optional(),
    userId: zod_1.z.string().optional(),
    model: zod_1.z.string().optional().default('google'),
    selectedModel: zod_1.z.string().optional().default('google'),
    metadata: zod_1.z.object({
        chatId: zod_1.z.string().optional(),
        model: zod_1.z.string().optional(),
        enableWebSearch: zod_1.z.boolean().optional().default(false),
    }).optional(),
    enableWebSearch: zod_1.z.boolean().optional().default(false),
});
exports.AIChatRequestSchema = AIChatRequestSchema;
// Validation functions
const validateChat = (data) => {
    try {
        return { success: true, data: ChatSchema.parse(data) };
    }
    catch (error) {
        return { success: false, error: error.errors };
    }
};
exports.validateChat = validateChat;
const validateCreateChatRequest = (data) => {
    try {
        console.log("CreateChatRequestSchema:", CreateChatRequestSchema.parse(data));
        return { success: true, data: CreateChatRequestSchema.parse(data) };
    }
    catch (error) {
        console.log("error:", error);
        return { success: false, error: error.errors };
    }
};
exports.validateCreateChatRequest = validateCreateChatRequest;
const validateAddMessageRequest = (data) => {
    try {
        return { success: true, data: AddMessageRequestSchema.parse(data) };
    }
    catch (error) {
        return { success: false, error: error.errors };
    }
};
exports.validateAddMessageRequest = validateAddMessageRequest;
const validateUpdateChatTitleRequest = (data) => {
    try {
        return { success: true, data: UpdateChatTitleRequestSchema.parse(data) };
    }
    catch (error) {
        return { success: false, error: error.errors };
    }
};
exports.validateUpdateChatTitleRequest = validateUpdateChatTitleRequest;
const validateAIChatRequest = (data) => {
    try {
        return { success: true, data: AIChatRequestSchema.parse(data) };
    }
    catch (error) {
        return { success: false, error: error.errors };
    }
};
exports.validateAIChatRequest = validateAIChatRequest;
