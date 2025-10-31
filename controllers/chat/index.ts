import { Request, Response } from 'express';
import Chat from '../../models/Chat';
import User from '../../models/User';
import asyncHandler from 'express-async-handler';
import { 
  validateCreateChatRequest, 
  validateAddMessageRequest, 
  validateUpdateChatTitleRequest 
} from '../../schemas/chatSchema';
import { ApiResponse, IMessage } from '../../types';

// Create new chat
export const createChat = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    console.log("createChat controller");
    const validation = validateCreateChatRequest(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request format',
        details: validation.error
      });
      return;
    }
    console.log("validation:", validation);
    const { userId } = validation.data!;
    
    // Dynamic import for nanoid (ES module)
    const { nanoid } = await import('nanoid');
    const chatId = nanoid();
    
    const newChat = new Chat({
      id: chatId,
      userId: userId ,
      messages: [],
      title: 'New Chat',
      isActive: true
    });
    
    await newChat.save();
    
    const response: ApiResponse<any> = {
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
  } catch (error: any) {
    console.error('Create chat error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create chat' 
    });
  }
});

// Get chat by ID
export const getChat = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("getChat:", req.params);
    const { id } = req.params;
    
    const chat = await Chat.findOne({ id, isActive: true });
    
    if (!chat) {
      res.status(404).json({ 
        success: false,
        error: 'Chat not found' 
      });
      return;
    }
    
    const response: ApiResponse<any> = {
      success: true,
      data: { chat }
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Get chat error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get chat' 
    });
  }
});

// Get all chats for a user
export const getUserChats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;
    
    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ 
        success: false,
        error: 'User ID required' 
      });
      return;
    }
    
    const chats = await Chat.find({ 
      userId, 
      isActive: true 
    }).sort({ updatedAt: -1 });
    
    const response: ApiResponse<any> = {
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
  } catch (error: any) {
    console.error('Get user chats error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get user chats' 
    });
  }
});

// Add message to chat
export const addMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    console.log("addMessage:");
    const validation = validateAddMessageRequest(req.body);
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
    const { role, content, files, parts, metadata } = validation.data!;
    
    const chat = await Chat.findOne({ id, isActive: true });
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
    
    const newMessage: IMessage = {
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
    
    const response: ApiResponse<any> = {
      success: true,
      message: 'Message added successfully',
      data: { message: newMessage }
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Add message error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to add message' 
    });
  }
});

// Update chat title
export const updateChatTitle = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validation = validateUpdateChatTitleRequest(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request format',
        details: validation.error
      });
      return;
    }
    
    const { id } = req.params;
    const { title } = validation.data!;
    
    const chat = await Chat.findOneAndUpdate(
      { id, isActive: true },
      { title, updatedAt: new Date() },
      { new: true }
    );
    
    if (!chat) {
      res.status(404).json({ 
        success: false,
        error: 'Chat not found' 
      });
      return;
    }
    
    const response: ApiResponse<any> = {
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
  } catch (error: any) {
    console.error('Update chat title error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update chat title' 
    });
  }
});

// Delete chat
export const deleteChat = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const chat = await Chat.findOneAndUpdate(
      { id, isActive: true },
      { isActive: false },
      { new: true }
    );
    
    if (!chat) {
      res.status(404).json({ 
        success: false,
        error: 'Chat not found' 
      });
      return;
    }
    
    const response: ApiResponse<any> = {
      success: true,
      message: 'Chat deleted successfully'
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Delete chat error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete chat' 
    });
  }
});

// Get chat messages
export const getChatMessages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const chat = await Chat.findOne({ id, isActive: true });
    
    if (!chat) {
      res.status(404).json({ 
        success: false,
        error: 'Chat not found' 
      });
      return;
    }
    
    const response: ApiResponse<any> = {
      success: true,
      data: { messages: chat.messages }
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get chat messages' 
    });
  }
});
