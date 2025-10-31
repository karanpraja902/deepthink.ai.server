"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileInfo = exports.testCloudinaryConfig = exports.deleteFile = exports.uploadFile = exports.upload = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const cloudinary_1 = require("cloudinary");
const multer_1 = __importDefault(require("multer"));
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
cloudinary_1.v2.config(cloudinaryConfig);
// Configure multer for file uploads
exports.upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});
// Upload file to Cloudinary
exports.uploadFile = (0, express_async_handler_1.default)(async (req, res) => {
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
        const result = await cloudinary_1.v2.uploader.upload(dataURI, {
            resource_type: 'auto',
            folder: 'deepseek-ai',
            public_id: `${Date.now()}_${originalname}`,
        });
        const uploadResponse = {
            url: result.secure_url,
            publicId: result.public_id,
            filename: originalname,
            mediaType: mimetype,
            size: result.bytes,
            width: result.width,
            height: result.height,
        };
        const response = {
            success: true,
            data: { file: uploadResponse }
        };
        res.status(200).json(response);
    }
    catch (error) {
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
exports.deleteFile = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { publicId } = req.params;
        if (!publicId) {
            res.status(400).json({
                success: false,
                error: 'Public ID is required'
            });
            return;
        }
        const result = await cloudinary_1.v2.uploader.destroy(publicId);
        if (result.result === 'ok') {
            const response = {
                success: true,
                message: 'File deleted successfully',
            };
            res.status(200).json(response);
        }
        else {
            res.status(400).json({
                success: false,
                error: 'Failed to delete file',
            });
        }
    }
    catch (error) {
        console.error('File deletion error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete file'
        });
    }
});
// Test Cloudinary configuration
exports.testCloudinaryConfig = (0, express_async_handler_1.default)(async (req, res) => {
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
    }
    catch (error) {
        console.error('Config test error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test configuration'
        });
    }
});
// Get file info
exports.getFileInfo = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { publicId } = req.params;
        if (!publicId) {
            res.status(400).json({
                success: false,
                error: 'Public ID is required'
            });
            return;
        }
        const result = await cloudinary_1.v2.api.resource(publicId);
        const fileInfo = {
            url: result.secure_url,
            publicId: result.public_id,
            filename: result.original_filename,
            mediaType: result.format,
            size: result.bytes,
            createdAt: result.created_at,
            width: result.width,
            height: result.height,
        };
        const response = {
            success: true,
            data: { file: fileInfo }
        };
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Get file info error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get file info'
        });
    }
});
