import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { 
  CloudinaryUploadResponse, 
  CloudinaryFileInfo, 
  ApiResponse 
} from '../../types';

// Configure Cloudinary
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

// Validate Cloudinary configuration
if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
  console.error('Cloudinary configuration missing:', {
    cloud_name: cloudinaryConfig.cloud_name ? 'set' : 'missing',
    api_key: cloudinaryConfig.api_key ? 'set' : 'missing',
    api_secret: cloudinaryConfig.api_secret ? 'set' : 'missing'
  });
}

cloudinary.config(cloudinaryConfig);

// Configure multer for file uploads
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Extend Express Request interface to include file
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Upload file to Cloudinary
export const uploadFile = asyncHandler(async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    // Check if Cloudinary is properly configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      res.status(500).json({ 
        success: false,
        error: 'Cloudinary configuration is missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.' 
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({ 
        success: false,
        error: 'No file uploaded' 
      });
      return;
    }
    
    const { originalname, buffer, mimetype } = req.file;
    
    // Convert buffer to base64
    const base64File = buffer.toString('base64');
    const dataURI = `data:${mimetype};base64,${base64File}`;
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      resource_type: 'auto',
      folder: 'deepseek-ai',
      public_id: `${Date.now()}_${originalname}`,
    });
    
    const uploadResponse: CloudinaryUploadResponse = {
      url: result.secure_url,
      publicId: result.public_id,
      filename: originalname,
      mediaType: mimetype,
      size: result.bytes,
      width: result.width,
      height: result.height,
    };
    
    const response: ApiResponse<{ file: CloudinaryUploadResponse }> = {
      success: true,
      data: { file: uploadResponse }
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('File upload error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      cloudinaryConfig: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'set' : 'not set',
        api_key: process.env.CLOUDINARY_API_KEY ? 'set' : 'not set',
        api_secret: process.env.CLOUDINARY_API_SECRET ? 'set' : 'not set'
      }
    });
    res.status(500).json({ 
      success: false,
      error: 'Failed to upload file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete file from Cloudinary
export const deleteFile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { publicId } = req.params;
    
    if (!publicId) {
      res.status(400).json({ 
        success: false,
        error: 'Public ID is required' 
      });
      return;
    }
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      const response: ApiResponse<any> = {
        success: true,
        message: 'File deleted successfully',
      };
      res.status(200).json(response);
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to delete file',
      });
    }
  } catch (error: any) {
    console.error('File deletion error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete file' 
    });
  }
});

// Test Cloudinary configuration
export const testCloudinaryConfig = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const config = {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'set' : 'missing',
      api_key: process.env.CLOUDINARY_API_KEY ? 'set' : 'missing',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'set' : 'missing'
    };
    
    res.status(200).json({
      success: true,
      config,
      message: 'Cloudinary configuration status'
    });
  } catch (error: any) {
    console.error('Config test error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to test configuration' 
    });
  }
});

// Get file info
export const getFileInfo = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { publicId } = req.params;
    
    if (!publicId) {
      res.status(400).json({ 
        success: false,
        error: 'Public ID is required' 
      });
      return;
    }
    
    const result = await cloudinary.api.resource(publicId);
    
    const fileInfo: CloudinaryFileInfo = {
      url: result.secure_url,
      publicId: result.public_id,
      filename: result.original_filename,
      mediaType: result.format,
      size: result.bytes,
      createdAt: result.created_at,
      width: result.width,
      height: result.height,
    };
    
    const response: ApiResponse<{ file: CloudinaryFileInfo }> = {
      success: true,
      data: { file: fileInfo }
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Get file info error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get file info' 
    });
  }
});
