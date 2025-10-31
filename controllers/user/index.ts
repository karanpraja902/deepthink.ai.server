import { Request, Response } from 'express';
import User from '../../models/User';
import asyncHandler from 'express-async-handler';
import { ApiResponse, IUserPreferences } from '../../types';

// Get user profile
export const getUserProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    const user = await User.findOne({ id: userId, isActive: true });
    
    if (!user) {
      res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
      return;
    }
    
    const response: ApiResponse<any> = {
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
  } catch (error: any) {
    console.error('Get user profile error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get user profile' 
    });
  }
});

// Update user profile
export const updateUserProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('updateUserProfile');
    const { userId } = req.params;
    const { name, avatar, preferences, subscription }: { 
      name?: string; 
      avatar?: string; 
      preferences?: Partial<IUserPreferences>;
      subscription?: {
        plan: string;
        status: string;
        subscribedAt?: Date;
        currentPeriodEnd?: Date;
        trialEnd?: Date;
      };
    } = req.body;
    
    const updateData: any = {};
    if (name) updateData.name = name;
    if (avatar) updateData.avatar = avatar;
    if (preferences) updateData.preferences = preferences;
    if (subscription) updateData.subscription = subscription;
    
    updateData.lastActive = new Date();
    
    const user = await User.findOneAndUpdate(
      { id: userId, isActive: true },
      updateData,
      { new: true }
    );
    console.log('updatedUserProfile', user);
    if (!user) {
      res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
      return;
    }
    
    const response: ApiResponse<any> = {
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
  } catch (error: any) {
    console.error('Update user profile error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update user profile' 
    });
  }
});

// Get user statistics
export const getUserStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    const user = await User.findOne({ id: userId, isActive: true });
    
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
    
    const response: ApiResponse<any> = {
      success: true,
      data: { stats }
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Get user stats error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get user statistics' 
    });
  }
});
