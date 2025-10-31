import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false,
      error: 'Token is not valid' 
    });
  }
};

export default authMiddleware;