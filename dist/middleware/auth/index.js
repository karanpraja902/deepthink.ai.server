"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware = (req, res, next) => {
    // Try to get token from cookie first, then from Authorization header
    // console.log("auth middleware request", req);
    console.log("auth middleware cookies", req.cookies);
    let token = req?.cookies?.auth_token;
    console.log("auth middleware token", token);
    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
    }
    console.log("auth middleware token", token);
    if (!token) {
        res.status(401).json({
            success: false,
            error: "No token, authorization denied"
        });
        console.log("No token, authorization denied");
        return;
    }
    console.log("auth middleware token", token);
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({
            success: false,
            error: 'Token is not valid'
        });
    }
};
exports.authMiddleware = authMiddleware;
exports.default = exports.authMiddleware;
