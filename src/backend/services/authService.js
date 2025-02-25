import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/userModel.js';

// Environment variables should be loaded with dotenv
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

/**
 * Generate JWT token for authenticated user
 * @param {Object} user - User object (without password)
 * @returns {String} JWT token
 */
const generateToken = (user) => {
  // Only include necessary user information in the token payload
  const payload = {
    id: user.user_id,
    email: user.email,
    role: user.user_role
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Object} Created user and token
 */
const register = async (userData) => {
  // Hash the password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(userData.password, saltRounds);

  // Create user with hashed password
  const user = await User.create({
    name: userData.name,
    email: userData.email,
    password_hash: passwordHash,
    user_role: userData.user_role || 'user' // Default role
  });

  // Generate token
  const token = generateToken(user);

  // Return user data (excluding password_hash) and token
  const userResponse = {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    user_role: user.user_role,
    created_at: user.created_at
  };

  return { user: userResponse, token };
};

/**
 * Login a user
 * @param {String} email - User email
 * @param {String} password - User password
 * @returns {Object} User object and token
 */
const login = async (email, password) => {
  // Find user by email
  const user = await User.findOne({ where: { email, is_deleted: false } });
  
  // If user not found or is deleted
  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Compare password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Generate token
  const token = generateToken(user);

  // Return user data (excluding password_hash) and token
  const userResponse = {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    user_role: user.user_role,
    created_at: user.created_at
  };

  return { user: userResponse, token };
};

/**
 * Get current user from token
 * @param {String} token - JWT token
 * @returns {Object} User object
 */
const getUserFromToken = async (token) => {
  try {
    // Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user by ID
    const user = await User.findOne({ 
      where: { 
        user_id: decoded.id,
        is_deleted: false
      } 
    });
    
    if (!user) {
      throw new Error('User not found');
    }

    // Return user data (excluding password_hash)
    return {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      user_role: user.user_role,
      created_at: user.created_at
    };
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export default {
  register,
  login,
  generateToken,
  getUserFromToken
};