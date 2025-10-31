"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableModelsHandler = exports.generateImageHandler = exports.getMemories = exports.addMemoriesForUser = exports.streamChat = void 0;
const ai_1 = require("ai");
// import { googleTools } from '@ai-sdk/google/internal';
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const cloudinary_1 = require("cloudinary");
const google_1 = require("@ai-sdk/google");
// import { GoogleAICacheManager } from '@google/generative-ai/server';
// Mem0 imports
const vercel_ai_provider_1 = require("@mem0/vercel-ai-provider");
const vercel_ai_provider_2 = require("@mem0/vercel-ai-provider");
// Model provider imports
const modelProvider_1 = require("../../services/modelProvider");
// Context management imports
const contextManager_1 = require("../../services/contextManager");
const cloudinaryConfig = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
};
// Validate Cloudinary configuration
if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
    console.warn('⚠️ Cloudinary configuration incomplete. Image uploads may fail.');
    console.log('Cloudinary config:', {
        cloud_name: cloudinaryConfig.cloud_name ? 'SET' : 'MISSING',
        api_key: cloudinaryConfig.api_key ? 'SET' : 'MISSING',
        api_secret: cloudinaryConfig.api_secret ? 'SET' : 'MISSING'
    });
}
cloudinary_1.v2.config(cloudinaryConfig);
const memoryCache = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration
const MAX_CACHE_SIZE = 50; // Maximum number of users to cache
const MAX_MEMORY_LENGTH = 5000; // Maximum memory string length per user
// Initialize Mem0 Client for Google
const mem0 = (0, vercel_ai_provider_1.createMem0)({
    provider: 'google',
    mem0ApiKey: process.env.MEM0_API_KEY || '',
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
    config: {
    // Configure the Google LLM Provider here
    },
    // Optional Mem0 Global Config
    mem0Config: {
    // Configure Mem0 settings here if needed
    },
});
// Function to manage cache size with LRU eviction
const manageCacheSize = () => {
    const cacheKeys = Object.keys(memoryCache);
    if (cacheKeys.length <= MAX_CACHE_SIZE) {
        return;
    }
    // Sort by last accessed time and remove oldest entries
    const sortedKeys = cacheKeys.sort((a, b) => memoryCache[a].lastAccessed - memoryCache[b].lastAccessed);
    const keysToRemove = sortedKeys.slice(0, cacheKeys.length - MAX_CACHE_SIZE);
    keysToRemove.forEach(key => {
        delete memoryCache[key];
    });
    console.log(`🗑️ Evicted ${keysToRemove.length} cache entries (LRU)`);
};
// Enhanced memory retrieval with background refresh and timeout handling
const getMemoriesWithCache = async (userId, query) => {
    const cacheKey = userId;
    const now = Date.now();
    // Return cached immediately if available
    if (memoryCache[cacheKey] && (now - memoryCache[cacheKey].timestamp) < CACHE_DURATION) {
        console.log('✅ Using cached memories for user:', userId);
        // Update last accessed time for LRU
        memoryCache[cacheKey].lastAccessed = now;
        // Background refresh if cache is more than 2 minutes old
        if ((now - memoryCache[cacheKey].timestamp) > 2 * 60 * 1000) {
            refreshMemoriesBackground(userId, query);
        }
        return memoryCache[cacheKey].memories;
    }
    // If no cache, try to fetch with short timeout for faster response
    try {
        console.log('🔄 Fast fetching memories from Mem0 for user:', userId);
        const memoriesPromise = (0, vercel_ai_provider_2.retrieveMemories)(query, {
            user_id: userId,
            mem0ApiKey: process.env.MEM0_API_KEY
        });
        // Wait max 1.5 seconds for memories to avoid blocking response
        const memories = await Promise.race([
            memoriesPromise,
            new Promise((resolve) => setTimeout(() => resolve(''), 1500))
        ]);
        if (memories) {
            // Truncate memories if too long to prevent excessive memory usage
            const memoriesString = memories;
            const truncatedMemories = memoriesString.length > MAX_MEMORY_LENGTH
                ? memoriesString.substring(0, MAX_MEMORY_LENGTH) + '...[truncated]'
                : memoriesString;
            memoryCache[cacheKey] = {
                memories: truncatedMemories,
                timestamp: now,
                query: query,
                lastAccessed: now
            };
            // Manage cache size after adding new entry
            manageCacheSize();
            console.log('✅ Memories cached for user:', userId);
        }
        return memories || '';
    }
    catch (error) {
        console.error('❌ Fast memory fetch failed:', error);
        // Return expired cache if available
        if (memoryCache[cacheKey]) {
            console.log('⚠️ Using expired cached memories due to fetch error');
            return memoryCache[cacheKey].memories;
        }
        return '';
    }
};
// Background memory refresh to keep cache warm
const refreshMemoriesBackground = (userId, query) => {
    setImmediate(async () => {
        try {
            console.log('🔄 Background refresh for user:', userId);
            const memories = await (0, vercel_ai_provider_2.retrieveMemories)(query, {
                user_id: userId,
                mem0ApiKey: process.env.MEM0_API_KEY
            });
            memoryCache[userId] = {
                memories: memories || '',
                timestamp: Date.now(),
                query: query,
                lastAccessed: Date.now()
            };
            console.log('✅ Background memory refresh completed for user:', userId);
        }
        catch (error) {
            console.error('❌ Background memory refresh failed:', error);
        }
    });
};
// Function to invalidate cache for a user (when new memories are added)
const invalidateUserCache = (userId) => {
    if (memoryCache[userId]) {
        delete memoryCache[userId];
        console.log('🗑️ Invalidated memory cache for user:', userId);
    }
};
// Function to clean up expired cache entries
const cleanupExpiredCache = () => {
    const now = Date.now();
    let cleanedCount = 0;
    Object.keys(memoryCache).forEach(userId => {
        if ((now - memoryCache[userId].timestamp) > CACHE_DURATION) {
            delete memoryCache[userId];
            cleanedCount++;
        }
    });
    if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }
};
// Function to log memory usage
const logMemoryUsage = () => {
    const usage = process.memoryUsage();
    const cacheCount = Object.keys(memoryCache).length;
    const totalCacheSize = Object.values(memoryCache)
        .reduce((total, entry) => total + entry.memories.length, 0);
    console.log('📊 Memory Usage:', {
        rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
        external: `${Math.round(usage.external / 1024 / 1024)} MB`,
        cacheEntries: cacheCount,
        cacheSize: `${Math.round(totalCacheSize / 1024)} KB`
    });
};
// Clean up expired cache every 10 minutes
setInterval(cleanupExpiredCache, 10 * 60 * 1000);
// Log memory usage every 15 minutes
setInterval(logMemoryUsage, 15 * 60 * 1000);
exports.streamChat = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { messages, userId, model: requestedModel } = req.body;
        if (!messages || !Array.isArray(messages)) {
            res.status(400).json({
                success: false,
                error: 'Messages array is required'
            });
            return;
        }
        console.log("messagesss:", messages[messages.length - 1].parts);
        console.log("userId1:", userId);
        // Optimized message transformation for multimodal content with fast-path processing
        let transformedMessages = messages
            .map((msg) => {
            // Handle tool messages properly
            if (msg.role === 'tool') {
                return {
                    role: msg.role,
                    content: msg.content,
                    toolCallId: msg.toolCallId,
                    toolName: msg.toolName
                };
            }
            // Fast path for simple text messages (most common case)
            if (!msg.parts || !Array.isArray(msg.parts)) {
                return msg.content?.trim() ? {
                    role: msg.role,
                    content: msg.content
                } : null;
            }
            // Process multimodal content efficiently without blocking
            const content = [];
            for (const part of msg.parts) {
                if (part.type === 'text' && part.text?.trim()) {
                    content.push({ type: 'text', text: part.text });
                }
                else if (part.type === 'file' && part.url && part.mediaType?.startsWith('image/')) {
                    content.push({ type: 'image', image: new URL(part.url) });
                }
                else if (part.type === 'file' && part.url && part.mediaType === 'application/pdf') {
                    // For PDFs, provide immediate text description instead of blocking download
                    let pdfContent = `PDF Document: ${part.filename || 'Document'}\nURL: ${part.url}`;
                    if (part.pdfAnalysis) {
                        pdfContent += `\n\nPDF Analysis:\n- Page Count: ${part.pdfAnalysis.pageCount || 'Unknown'}`;
                        if (part.pdfAnalysis.text) {
                            pdfContent += `\n- Extracted Text: ${part.pdfAnalysis.text.substring(0, 1500)}${part.pdfAnalysis.text.length > 1500 ? '...' : ''}`;
                        }
                    }
                    content.push({ type: 'text', text: pdfContent });
                }
            }
            // Fallback to simple content if no parts processed
            if (content.length === 0 && msg.content?.trim()) {
                return {
                    role: msg.role,
                    content: msg.content
                };
            }
            return content.length > 0 ? {
                role: msg.role,
                content
            } : null;
        })
            .filter((msg) => msg !== null);
        // Parallel memory retrieval that doesn't block main processing
        let memoryContext = '';
        let memoryPromise = null;
        if (userId && process.env.MEM0_API_KEY) {
            console.log("Mem0 integration enabled for user:", userId);
            // Get the latest user message to use as query for memory retrieval
            const latestUserMessage = transformedMessages
                .filter(msg => msg.role === 'user')
                .pop();
            if (latestUserMessage) {
                const userQuery = typeof latestUserMessage.content === 'string'
                    ? latestUserMessage.content
                    : latestUserMessage.content?.find((part) => part.type === 'text')?.text || '';
                console.log('Starting parallel memory retrieval for query:', userQuery);
                // Start memory retrieval in parallel (don't await yet)
                memoryPromise = getMemoriesWithCache(userId, userQuery)
                    .then(memories => {
                    if (memories && memories.trim()) {
                        console.log('✅ Memories retrieved in parallel');
                        return `\n\nUser Memory Context:\n${memories}\n\nPlease use this memory context to provide personalized and relevant responses.`;
                    }
                    return '';
                })
                    .catch(error => {
                    console.error('❌ Parallel memory retrieval failed:', error);
                    return '';
                });
            }
        }
        else {
            console.log('Skipping Mem0 - userId:', !!userId, 'MEM0_API_KEY:', !!process.env.MEM0_API_KEY);
        }
        // Continue with message processing while memory loads in background
        // We'll incorporate memory results later if available
        // Quickly try to get memory context with timeout, fallback to processing without it
        let messagesWithMemory = transformedMessages;
        console.log("transformedMessages.length:", transformedMessages.length);
        if (memoryPromise && transformedMessages.length > 0) {
            try {
                // Try to get memory context quickly (max 800ms)
                const timeoutMemory = Promise.race([
                    memoryPromise,
                    new Promise((resolve) => setTimeout(() => resolve(''), 800))
                ]);
                memoryContext = await timeoutMemory;
                if (memoryContext.trim()) {
                    // Create a system message with memory context
                    const systemMessage = {
                        role: 'system',
                        content: `You are a helpful AI assistant.${memoryContext}`
                    };
                    console.log("systemMessage length:", systemMessage.content.length);
                    // Add system message at the beginning
                    messagesWithMemory = [systemMessage, ...transformedMessages];
                    console.log("messagesWithMemory.length:", messagesWithMemory.length);
                    console.log('✅ Added memory context to system message');
                }
                else {
                    console.log('No memory context available within timeout, proceeding without');
                }
            }
            catch (error) {
                console.error('❌ Memory context integration failed:', error);
                console.log('Proceeding without memory context');
            }
        }
        // Convert messages to the correct format for AI SDK
        const convertedMessages = messagesWithMemory.map(msg => {
            if (msg.role === 'system') {
                return {
                    role: 'system',
                    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
                };
            }
            else if (msg.role === 'user') {
                return {
                    role: 'user',
                    content: typeof msg.content === 'string' ? msg.content :
                        Array.isArray(msg.content) ? msg.content.map((part) => typeof part === 'string' ? part :
                            part.type === 'text' ? part.text :
                                part.type === 'image' ? part.image :
                                    JSON.stringify(part)).join(' ') : JSON.stringify(msg.content)
                };
            }
            else if (msg.role === 'assistant') {
                return {
                    role: 'assistant',
                    content: typeof msg.content === 'string' ? msg.content :
                        Array.isArray(msg.content) ? msg.content.map((part) => typeof part === 'string' ? part :
                            part.type === 'text' ? part.text :
                                JSON.stringify(part)).join(' ') : JSON.stringify(msg.content)
                };
            }
            else if (msg.role === 'tool') {
                return {
                    role: 'tool',
                    content: msg.content,
                    toolCallId: msg.toolCallId,
                    toolName: msg.toolName
                };
            }
            return msg;
        });
        console.log("convertedMessages:", convertedMessages.length);
        // Determine which model to use
        console.log("requestedModel:", requestedModel);
        const modelKey = requestedModel && (0, modelProvider_1.isValidModel)(requestedModel) ? requestedModel : modelProvider_1.DEFAULT_MODEL;
        console.log(`Using model: ${modelKey} (${modelProvider_1.AVAILABLE_MODELS[modelKey]?.displayName})`);
        console.log("modelKey:", modelKey);
        // Manage context length to prevent token limit errors
        const managedMessages = await (0, contextManager_1.manageContext)(convertedMessages, modelKey);
        // Log context management results
        const originalTokens = (0, contextManager_1.calculateMessageTokens)(convertedMessages);
        const managedTokens = (0, contextManager_1.calculateMessageTokens)(managedMessages);
        const tokenLimit = (0, contextManager_1.getTokenLimit)(modelKey);
        console.log(`📊 Context Management:
      Original: ${convertedMessages.length} messages (${originalTokens} tokens)
      Managed: ${managedMessages.length} messages (${managedTokens} tokens)
      Limit: ${tokenLimit} tokens
      Model: ${modelKey}`);
        // Validate final context
        const validation = (0, contextManager_1.validateContext)(managedMessages, modelKey);
        if (!validation.valid) {
            console.error(`❌ Context validation failed: ${validation.suggestion}`);
            res.status(400).json({
                success: false,
                error: `Context too large for model ${modelKey}. ${validation.suggestion}`,
                details: {
                    tokens: validation.tokens,
                    limit: validation.limit,
                    modelKey
                }
            });
            return;
        }
        // Build tools - only for Google models for now
        const tools = modelKey === 'google' ? {
            code_execution: google_1.google.tools.codeExecution({}),
            google_search: google_1.google.tools.googleSearch({}),
            url_context: google_1.google.tools.urlContext({}),
        } : {};
        // Build provider options - only for Google models
        const providerOptions = modelKey === 'google' ? {
            google: {
                thinkingConfig: {
                    includeThoughts: true,
                },
            },
        } : {};
        // console.log("managedMessages:", managedMessages)
        // Optimized context management: preserve conversation flow while respecting token limits
        const optimizedMessages = managedMessages; // Use the properly managed context from manageContext()
        // Wrap the model call in try-catch to catch OpenRouter errors before streaming
        let result;
        try {
            result = await (0, modelProvider_1.streamTextWithFallback)({
                modelKey,
                tools,
                providerOptions,
                messages: optimizedMessages,
                temperature: 0.4,
            });
        }
        catch (modelError) {
            console.error('❌ Model call failed:', modelError);
            // Enhanced error handling for different error types
            let errorMessage = 'Internal server error';
            let errorDetails = '';
            let statusCode = 500;
            // Handle OpenRouter rate limit errors
            if (modelError.message && modelError.message.includes('Rate limit exceeded')) {
                errorMessage = 'Rate limit exceeded for this model. Please try again later or add credits to your OpenRouter account.';
                errorDetails = modelError.message;
                statusCode = 429;
                console.log("modelError:", modelError);
            }
            // Handle API key errors
            else if (modelError.message && modelError.message.includes('API key')) {
                errorMessage = 'API key error. Please check your model configuration.';
                errorDetails = modelError.message;
                statusCode = 401;
                console.log("modelError:", modelError);
            }
            // Handle model not found errors
            else if (modelError.message && modelError.message.includes('not found')) {
                errorMessage = 'Model not available. Please try a different model.';
                errorDetails = modelError.message;
                statusCode = 404;
                console.log("modelError:", modelError);
            }
            // Handle other specific errors
            else if (modelError.message) {
                errorMessage = modelError.message;
                if (modelError.code) {
                    errorDetails = `Error code: ${modelError.code}`;
                }
                if (modelError.status) {
                    errorDetails = `${errorDetails} | Status: ${modelError.status}`;
                }
                console.log("modelError:", modelError);
            }
            console.log("errorMessage:", errorMessage);
            // Extract additional error information from AI SDK errors
            if (modelError.data && modelError.data.error) {
                const aiError = modelError.data.error;
                if (aiError.message) {
                    errorMessage = aiError.message;
                }
                if (aiError.code) {
                    errorDetails = `${errorDetails} | AI Error Code: ${aiError.code}`;
                }
                console.log("modelError:", modelError);
            }
            // Send error response immediately
            if (!res.headersSent) {
                res.status(statusCode).json({
                    success: false,
                    error: errorMessage,
                    details: errorDetails || undefined,
                    timestamp: new Date().toISOString(),
                    errorType: 'model_error'
                });
                return; // Exit early
            }
        }
        // Check if result is defined before proceeding
        if (!result) {
            console.error('❌ No result from model call');
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: 'Model call failed to return a result',
                    timestamp: new Date().toISOString()
                });
            }
            return;
        }
        // Stream response directly to client with error handling
        try {
            result.pipeTextStreamToResponse(res, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                }
            });
        }
        catch (streamError) {
            console.error('❌ Error streaming response:', streamError);
            // Fallback: send a simple text response
            if (!res.headersSent) {
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.write('I apologize, but I encountered an error while processing your request. Please try again.');
                res.end();
            }
        }
        // Store the conversation in Mem0 memory after streaming starts (non-blocking)
        if (userId && process.env.MEM0_API_KEY) {
            // Use setImmediate for truly non-blocking operation
            setImmediate(() => {
                try {
                    console.log('Queueing conversation for memory storage - user:', userId);
                    // Get the latest user message
                    const latestUserMessage = transformedMessages
                        .filter(msg => msg.role === 'user')
                        .pop();
                    if (latestUserMessage) {
                        // Validate message format before adding to memories
                        const messageToAdd = {
                            role: 'user',
                            content: typeof latestUserMessage.content === 'string'
                                ? latestUserMessage.content
                                : latestUserMessage.content?.find((part) => part.type === 'text')?.text || ''
                        };
                        if (messageToAdd.content.trim()) {
                            // Queue memory storage in batch processor
                            const memoryPromise = (0, vercel_ai_provider_2.addMemories)([messageToAdd], {
                                user_id: userId,
                                mem0ApiKey: process.env.MEM0_API_KEY
                            }).then(() => {
                                console.log('✅ Conversation stored in Mem0 memory successfully');
                                // Invalidate cache since new memories were added
                                invalidateUserCache(userId);
                            }).catch((memoryError) => {
                                console.error('❌ Error storing conversation in memory:', memoryError);
                            });
                            // Don't wait for memory storage to complete
                            memoryPromise.catch(() => { }); // Prevent unhandled promise rejection
                        }
                        else {
                            console.log('Skipping empty message for memory storage');
                        }
                    }
                }
                catch (error) {
                    console.error('❌ Error preparing memory storage:', error);
                }
            });
        }
    }
    catch (error) {
        console.error('Streaming error:', error);
        if (!res.headersSent) {
            // Provide detailed error information
            let errorMessage = 'Internal server error';
            let errorDetails = '';
            if (error.message) {
                errorMessage = error.message;
            }
            if (error.code) {
                errorDetails = `Error code: ${error.code}`;
            }
            if (error.status) {
                errorDetails = `${errorDetails} | Status: ${error.status}`;
            }
            res.status(500).json({
                success: false,
                error: errorMessage,
                details: errorDetails || undefined,
                timestamp: new Date().toISOString()
            });
        }
    }
});
// Image Generation Endpoint
// Add Memories for a user (for testing)
exports.addMemoriesForUser = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { userId, message } = req.body;
        if (!userId || !message) {
            res.status(400).json({
                success: false,
                error: 'User ID and message are required'
            });
            return;
        }
        if (!process.env.MEM0_API_KEY) {
            res.status(400).json({
                success: false,
                error: 'Mem0 API key is not configured'
            });
            return;
        }
        console.log(`Adding memory for user: ${userId}`);
        try {
            const messageToAdd = {
                role: 'user',
                content: message
            };
            await (0, vercel_ai_provider_2.addMemories)([messageToAdd], {
                user_id: userId,
                mem0ApiKey: process.env.MEM0_API_KEY
            });
            console.log('✅ Memory added successfully');
            res.status(200).json({
                success: true,
                data: {
                    message: 'Memory added successfully',
                    userId,
                    addedAt: new Date().toISOString()
                }
            });
        }
        catch (mem0Error) {
            console.error('❌ Error adding memory:', mem0Error);
            res.status(500).json({
                success: false,
                error: 'Failed to add memory',
                details: mem0Error instanceof Error ? mem0Error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        console.error('Add memory error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to add memory',
            timestamp: new Date().toISOString()
        });
    }
});
// Get Memories for a user (for debugging only)
exports.getMemories = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        console.log("getMemories");
        const { userId } = req.params;
        if (!userId) {
            res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
            return;
        }
        console.log("getMemories:");
        if (!process.env.MEM0_API_KEY) {
            res.status(400).json({
                success: false,
                error: 'Mem0 API key is not configured'
            });
            return;
        }
        console.log(`Retrieving memories for user: ${userId}`);
        try {
            // Use a general query to retrieve all memories for the user
            const memories = await (0, vercel_ai_provider_2.retrieveMemories)('Retrieve all memories for this user', {
                user_id: userId,
                mem0ApiKey: process.env.MEM0_API_KEY
            });
            console.log('✅ Memories retrieved successfully');
            res.status(200).json({
                success: true,
                data: {
                    memories,
                    userId,
                    retrievedAt: new Date().toISOString()
                }
            });
        }
        catch (mem0Error) {
            console.error('❌ Error retrieving memories:', mem0Error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve memories',
                details: mem0Error instanceof Error ? mem0Error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        console.error('Get memories error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get memories',
            timestamp: new Date().toISOString()
        });
    }
});
exports.generateImageHandler = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { prompt, aspectRatio = '16:9', size = '1024x1024' } = req.body;
        if (!prompt) {
            res.status(400).json({
                success: false,
                error: 'Prompt is required for image generation'
            });
            return;
        }
        console.log(`Generating image with prompt: ${prompt}`);
        // Read the clever-bee service account credentials
        // const serviceAccountPath = path.join(__dirname, '../../clever-bee-468418-s7-9d2a25e023ff.json');
        // const serviceAccountKey = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        // const vertex = createVertex({
        //   project: serviceAccountKey.project_id,
        //   location: 'us-central1',
        //   googleAuthOptions: {
        //     credentials: serviceAccountKey,
        //   },
        // });
        // const { image } = await generateImage({
        //   model: vertex.image('imagen-3.0-generate-002'),
        //   prompt: prompt,
        //   aspectRatio: '16:9',
        // });
        const result = await (0, ai_1.generateText)({
            model: (0, google_1.google)('gemini-2.0-flash-exp'),
            providerOptions: {
                google: { responseModalities: ['TEXT', 'IMAGE'] },
            },
            prompt: prompt,
        });
        console.log("resultfiles:", result.files);
        //     const imageBase64 = result.files[0].base64;
        //     for (const file of result.files) {
        //       if (file.mediaType.startsWith('image/')) {
        // console.log("Imagefile:", file)
        //         // The file object provides multiple data formats:
        //         // Access images as base64 string, Uint8Array binary data, or check type
        //         // - file.base64: string (data URL format)
        //         // - file.uint8Array: Uint8Array (binary data)
        //         // - file.mediaType: string (e.g. "image/png")
        //       }
        //     }
        //     console.log(
        //       `Revised prompt: ${providerMetadata.vertex.images[0].revisedPrompt}`,
        //     );
        //     console.log('✅ Image generated successfully');
        //     console.log('Image type:', typeof image);
        //     console.log('Image object keys:', Object.keys(image));
        //     console.log('Image object:', JSON.stringify(image, null, 2));
        // Convert image to base64 string
        const image = result.files[0];
        let imageBase64;
        if (typeof image === 'string') {
            imageBase64 = image;
        }
        else if (image && typeof image === 'object') {
            // Handle different image object formats
            if ('base64' in image && image.base64) {
                imageBase64 = image.base64;
            }
            else if ('toString' in image && typeof image.toString === 'function') {
                imageBase64 = image.toString();
            }
            else {
                // Try to convert to base64 using Buffer
                imageBase64 = Buffer.from(image).toString('base64');
            }
        }
        else {
            throw new Error('Invalid image format received from Vertex AI');
        }
        console.log('Image base64 length:', imageBase64.length);
        let cloudinaryUrl;
        try {
            cloudinaryUrl = await uploadBase64ImageToCloudinary(imageBase64, prompt);
        }
        catch (uploadError) {
            console.error('Failed to upload to Cloudinary, falling back to base64:', uploadError);
            // Fallback to base64 if Cloudinary upload fails
            cloudinaryUrl = `data:image/png;base64,${imageBase64}`;
        }
        // Generate AI commentary about the image
        const commentaryResult = await (0, ai_1.streamText)({
            model: (0, google_1.google)('gemini-2.5-flash'),
            messages: [
                {
                    role: 'user',
                    content: `I just generated an image with the prompt: "${prompt}". Please provide a brief, friendly commentary about this image generation. Keep it under 2-3 sentences and make it conversational. Don't describe the image itself, just comment on the generation process or creative aspect.`
                }
            ],
            temperature: 0.7,
        });
        // Get the commentary text
        let commentary = '';
        for await (const chunk of commentaryResult.textStream) {
            commentary += chunk;
        }
        const response = {
            success: true,
            data: {
                image: cloudinaryUrl,
                prompt: prompt,
                aspectRatio: aspectRatio,
                size: size,
                generatedAt: new Date().toISOString(),
                commentary: commentary.trim()
            }
        };
        console.log("responseImage:", response.data.image);
        console.log("responseImage type:", typeof response.data.image);
        console.log("Full response data:", JSON.stringify(response.data, null, 2));
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Image generation error:', error);
        // Provide detailed error information
        let errorMessage = 'Failed to generate image';
        let errorDetails = '';
        if (error.message) {
            errorMessage = error.message;
        }
        if (error.code) {
            errorDetails = `Error code: ${error.code}`;
        }
        if (error.status) {
            errorDetails = `${errorDetails} | Status: ${error.status}`;
        }
        res.status(500).json({
            success: false,
            error: errorMessage,
            details: errorDetails || undefined,
            timestamp: new Date().toISOString()
        });
    }
});
// Get available models endpoint
exports.getAvailableModelsHandler = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const models = (0, modelProvider_1.getAvailableModels)();
        res.status(200).json({
            success: true,
            data: {
                models,
                defaultModel: modelProvider_1.DEFAULT_MODEL
            }
        });
    }
    catch (error) {
        console.error('Get models error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get available models',
            timestamp: new Date().toISOString()
        });
    }
});
// Helper function to upload base64 image to Cloudinary
const uploadBase64ImageToCloudinary = async (base64Data, prompt) => {
    try {
        // Create a unique filename based on prompt and timestamp
        const timestamp = Date.now();
        const sanitizedPrompt = prompt.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        const filename = `ai-generated-${sanitizedPrompt}-${timestamp}`;
        console.log('Uploading to Cloudinary - Base64 length:', base64Data.length);
        console.log('Base64 starts with:', base64Data.substring(0, 50));
        // Ensure base64 data has proper format for Cloudinary
        let formattedBase64 = base64Data;
        if (!base64Data.startsWith('data:image/')) {
            formattedBase64 = `data:image/png;base64,${base64Data}`;
        }
        // Upload to Cloudinary
        const result = await cloudinary_1.v2.uploader.upload(formattedBase64, {
            resource_type: 'image',
            folder: 'ai-generated-images',
            public_id: filename,
            format: 'png',
            transformation: [
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ]
        });
        console.log('✅ Image uploaded to Cloudinary:', result.secure_url);
        return result.secure_url;
    }
    catch (error) {
        console.error('❌ Failed to upload image to Cloudinary:', error);
        console.error('Error details:', error);
        throw new Error('Failed to upload image to Cloudinary');
    }
};
