import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Middleware to authenticate JWT token
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user by id
    const user = await User.findOne({ 
      where: { 
        user_id: decoded.id,
        is_deleted: false
      } 
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid token - user not found' });
    }

    // Attach user info to request object (excluding sensitive data)
    req.user = {
      user_id: user.user_id,
      email: user.email,
      name: user.name,
      user_role: user.user_role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    return res.status(401).json({ message: 'Invalid token' });
  }
};

/**
 * Middleware to check if user has required role
 * @param {String|Array} roles - Required role(s)
 */
export const authorize = (roles) => {
  // Convert single role to array
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    // Check if authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Check if user has required role
    if (!roles.includes(req.user.user_role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    next();
  };
};

export default {
  authenticate,
  authorize
};