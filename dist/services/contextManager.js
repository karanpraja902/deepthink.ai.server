"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateContext = exports.manageContext = exports.truncateMessages = exports.getTokenLimit = exports.calculateMessageTokens = exports.estimateTokens = void 0;
// Token limits for different models (with safety buffer)
const MODEL_TOKEN_LIMITS = {
    'google': 150000, // Gemini 2.5 Flash - buffer from 163840 max
    'deepseek-r1': 150000, // Based on error message showing ~163840 limit
    'llama-3.1': 120000, // Conservative estimate
    'gpt-oss': 8000, // Conservative estimate for smaller models
};
// Rough token estimation (words * 1.3 for average token-to-word ratio)
const estimateTokens = (text) => {
    // Simple estimation: split by whitespace and multiply by average token ratio
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words * 1.3);
};
exports.estimateTokens = estimateTokens;
// Calculate total tokens in messages
const calculateMessageTokens = (messages) => {
    let totalTokens = 0;
    for (const message of messages) {
        // Handle different message formats
        if (message.parts && Array.isArray(message.parts)) {
            for (const part of message.parts) {
                if (part.type === 'text' && part.text) {
                    totalTokens += (0, exports.estimateTokens)(part.text);
                }
                // Add minimal tokens for other content types
                else if (part.type === 'image') {
                    totalTokens += 100; // Rough estimate for image processing
                }
                else if (part.type === 'file') {
                    totalTokens += 50; // Minimal for file references
                }
            }
        }
        else if (message.content) {
            if (typeof message.content === 'string') {
                totalTokens += (0, exports.estimateTokens)(message.content);
            }
            else if (Array.isArray(message.content)) {
                for (const item of message.content) {
                    if (item.type === 'text' && item.text) {
                        totalTokens += (0, exports.estimateTokens)(item.text);
                    }
                }
            }
        }
        // Add overhead for message structure
        totalTokens += 10;
    }
    return totalTokens;
};
exports.calculateMessageTokens = calculateMessageTokens;
// Get token limit for a model
const getTokenLimit = (modelKey) => {
    return MODEL_TOKEN_LIMITS[modelKey] || 8000; // Default conservative limit
};
exports.getTokenLimit = getTokenLimit;
// Truncate messages to fit within token limit
const truncateMessages = (messages, modelKey, systemPromptTokens = 500) => {
    const tokenLimit = (0, exports.getTokenLimit)(modelKey);
    const availableTokens = tokenLimit - systemPromptTokens - 1000; // Reserve tokens for response
    console.log(`🎯 Token management: Limit=${tokenLimit}, Available=${availableTokens}, Model=${modelKey}`);
    if (messages.length === 0)
        return messages;
    // Always keep the last message (current user input)
    const lastMessage = messages[messages.length - 1];
    const lastMessageTokens = (0, exports.calculateMessageTokens)([lastMessage]);
    if (lastMessageTokens > availableTokens) {
        console.warn(`⚠️ Single message too long: ${lastMessageTokens} tokens`);
        // If even the last message is too long, we need to truncate it
        return [truncateSingleMessage(lastMessage, availableTokens)];
    }
    // Work backwards from the last message to include as many as possible
    const truncatedMessages = [lastMessage];
    let currentTokens = lastMessageTokens;
    for (let i = messages.length - 2; i >= 0; i--) {
        const messageTokens = (0, exports.calculateMessageTokens)([messages[i]]);
        if (currentTokens + messageTokens <= availableTokens) {
            truncatedMessages.unshift(messages[i]);
            currentTokens += messageTokens;
        }
        else {
            // If we can't fit the entire message, try to include a summary
            const remainingTokens = availableTokens - currentTokens;
            if (remainingTokens > 200 && i < messages.length - 10) {
                // Add a summary of the truncated conversation
                const summaryMessage = {
                    role: 'system',
                    content: `[Previous conversation truncated due to length. Total messages removed: ${i + 1}]`
                };
                truncatedMessages.unshift(summaryMessage);
                currentTokens += (0, exports.estimateTokens)(summaryMessage.content);
            }
            break;
        }
    }
    const finalTokens = (0, exports.calculateMessageTokens)(truncatedMessages);
    console.log(`✂️ Truncated from ${messages.length} to ${truncatedMessages.length} messages (${finalTokens} tokens)`);
    return truncatedMessages;
};
exports.truncateMessages = truncateMessages;
// Truncate a single message if it's too long
const truncateSingleMessage = (message, maxTokens) => {
    if (message.parts && Array.isArray(message.parts)) {
        const truncatedParts = [];
        let currentTokens = 0;
        for (const part of message.parts) {
            if (part.type === 'text' && part.text) {
                const partTokens = (0, exports.estimateTokens)(part.text);
                if (currentTokens + partTokens <= maxTokens) {
                    truncatedParts.push(part);
                    currentTokens += partTokens;
                }
                else {
                    // Truncate this text part
                    const availableTokens = maxTokens - currentTokens;
                    if (availableTokens > 50) {
                        const words = part.text.split(' ');
                        const maxWords = Math.floor(availableTokens / 1.3);
                        const truncatedText = words.slice(0, maxWords).join(' ') + '... [truncated]';
                        truncatedParts.push({
                            ...part,
                            text: truncatedText
                        });
                    }
                    break;
                }
            }
            else {
                // Keep non-text parts as they use minimal tokens
                truncatedParts.push(part);
                currentTokens += part.type === 'image' ? 100 : 50;
            }
        }
        return {
            ...message,
            parts: truncatedParts
        };
    }
    else if (message.content && typeof message.content === 'string') {
        const words = message.content.split(' ');
        const maxWords = Math.floor(maxTokens / 1.3);
        const truncatedContent = words.slice(0, maxWords).join(' ') + '... [truncated]';
        return {
            ...message,
            content: truncatedContent
        };
    }
    return message;
};
// Smart context management with conversation summarization
const manageContext = async (messages, modelKey) => {
    const totalTokens = (0, exports.calculateMessageTokens)(messages);
    const tokenLimit = (0, exports.getTokenLimit)(modelKey);
    console.log(`📊 Context analysis: ${totalTokens} tokens, limit: ${tokenLimit}`);
    // If we're within limits, return as-is
    if (totalTokens <= tokenLimit * 0.8) { // Use 80% as a safety margin
        return messages;
    }
    // If we exceed limits, truncate
    console.log(`🚨 Context limit exceeded, truncating messages`);
    return (0, exports.truncateMessages)(messages, modelKey);
};
exports.manageContext = manageContext;
// Validate context before sending to model
const validateContext = (messages, modelKey) => {
    const tokens = (0, exports.calculateMessageTokens)(messages);
    const limit = (0, exports.getTokenLimit)(modelKey);
    const valid = tokens <= limit;
    const result = {
        valid,
        tokens,
        limit
    };
    if (!valid) {
        result.suggestion = `Consider using a model with higher token limit or reduce conversation length. Current: ${tokens}, Limit: ${limit}`;
    }
    return result;
};
exports.validateContext = validateContext;
