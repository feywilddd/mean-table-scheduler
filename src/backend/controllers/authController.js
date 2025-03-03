import authService from '../services/authService.js';
import { sequelize } from '../config/database.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Helper functions
const findUserById = async (userId) => {
  try {
    const [results] = await sequelize.query(
      'SELECT * FROM users WHERE user_id = :userId',
      {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    return results || null;
  } catch (error) {
    console.error('Error finding user by ID:', error);
    throw error;
  }
};

const findUserByEmail = async (email) => {
  try {
    const [results] = await sequelize.query(
      'SELECT * FROM users WHERE email = :email',
      {
        replacements: { email },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    return results || null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error;
  }
};

const updateUser = async (userId, updateFields) => {
  try {
    // Start a transaction for safety
    const transaction = await sequelize.transaction();
    
    try {
      // Build the SET part of the query
      const setClause = Object.entries(updateFields)
        .map(([key, _]) => `"${key}" = :${key}`)
        .join(', ');
      
      // Add userId to the replacements
      const replacements = {
        ...updateFields,
        userId
      };
      
      // Execute the update
      await sequelize.query(
        `UPDATE users SET ${setClause} WHERE user_id = :userId`,
        {
          replacements,
          type: sequelize.QueryTypes.UPDATE,
          transaction
        }
      );
      
      // Fetch the updated user
      const [updatedUser] = await sequelize.query(
        'SELECT user_id, name, email, user_role, created_at, updated_at FROM users WHERE user_id = :userId',
        {
          replacements: { userId },
          type: sequelize.QueryTypes.SELECT,
          transaction
        }
      );
      
      // Commit the transaction
      await transaction.commit();
      
      return updatedUser;
    } catch (error) {
      // Rollback on error
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Authentication middleware
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find user
      const user = await findUserById(decoded.user_id);
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      if (user.is_deleted) {
        return res.status(401).json({ message: 'User account is disabled' });
      }
      
      // Add user to request
      req.user = {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        user_role: user.user_role,
        created_at: user.created_at
      };
      
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Check admin role middleware
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.user_role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  next();
};

// Auth controller methods
export const register = async (req, res) => {
  try {
    const { name, email, password, user_role } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    
    // Register user
    const result = await authService.register({
      name,
      email,
      password,
      user_role: user_role || 'user' // Default role
    });
    
    return res.status(201).json(result);
  } catch (error) {
    // Handle duplicate email
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Email already in use' });
    }
    
    return res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Login user
    const result = await authService.login(email, password);
    
    return res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    return res.status(500).json({ message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    // Get user ID from authenticated request
    const userId = req.user.user_id;
    
    // Find the user in database using our custom function
    const user = await findUserById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { name, email, currentPassword, newPassword } = req.body;
    const updateFields = {};
    
    // Update name if provided
    if (name && name !== user.name) {
      updateFields.name = name;
    }
    
    // Update email if provided and different
    if (email && email !== user.email) {
      // Check if email is already in use
      const existingUser = await findUserByEmail(email);
      if (existingUser && existingUser.user_id !== userId) {
        return res.status(409).json({ message: 'Email is already in use' });
      }
      updateFields.email = email;
    }
    
    // Handle password update
    if (newPassword) {
      // Verify current password first
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      
      // Hash new password
      const salt = await bcrypt.genSalt(10);
      updateFields.password_hash = await bcrypt.hash(newPassword, salt);
    }
    
    // Only update if there are changes
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'No changes to update' });
    }
    
    // Update timestamp
    updateFields.updated_at = new Date();
    
    // Update user in database using our custom function
    const updatedUser = await updateUser(userId, updateFields);
    
    return res.json(updatedUser);
    
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Server error while updating profile' });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    // User is already attached to request by authenticate middleware
    return res.status(200).json(req.user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const validateToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }
    
    // Get user from token
    const user = await authService.getUserFromToken(token);
    
    return res.status(200).json({ valid: true, user });
  } catch (error) {
    return res.status(401).json({ valid: false, message: error.message });
  }
};

// Admin user management methods

// Get all users (admin only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await sequelize.query(
      `SELECT user_id, name, email, user_role, is_deleted, deleted_at, created_at, updated_at 
       FROM users 
       ORDER BY created_at DESC`,
      {
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    return res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ message: 'Error fetching users' });
  }
};

// Get user by ID (admin only or self)
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Allow users to view their own profile, admins can view any
    if (req.user.user_id !== id && req.user.user_role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const user = await findUserById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove password hash from response
    const { password_hash, ...userData } = user;
    
    return res.status(200).json(userData);
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ message: 'Error fetching user' });
  }
};

// Create a new user (admin only)
export const createUser = async (req, res) => {
  try {
    const { name, email, password, user_role } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    
    // Check if email already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    // Current timestamp
    const now = new Date();
    
    // Insert new user
    const [newUserResult] = await sequelize.query(
      `INSERT INTO users (name, email, password_hash, user_role, created_at, updated_at)
       VALUES (:name, :email, :password_hash, :user_role, :created_at, :updated_at)
       RETURNING user_id`,
      {
        replacements: {
          name,
          email,
          password_hash,
          user_role: user_role || 'user',
          created_at: now,
          updated_at: now
        },
        type: sequelize.QueryTypes.INSERT
      }
    );
    
    // Extract the user_id from the result
    const newUserId = newUserResult?.[0]?.user_id;
    
    if (!newUserId) {
      return res.status(500).json({ message: 'Failed to create user' });
    }
    
    // Get the newly created user data
    const users = await sequelize.query(
      `SELECT user_id, name, email, user_role, is_deleted, created_at, updated_at 
       FROM users 
       WHERE user_id = :userId`,
      {
        replacements: { userId: newUserId },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    const newUser = users[0];
    
    if (!newUser) {
      return res.status(201).json({ 
        message: 'User created successfully', 
        user_id: newUserId
      });
    }
    
    return res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ message: 'Error creating user' });
  }
};

// Update a user (admin only)
export const updateUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, user_role } = req.body;
    
    // Find user
    const user = await findUserById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields
    const updateFields = {};
    
    if (name) updateFields.name = name;
    
    if (email && email !== user.email) {
      // Check if email already exists
      const existingUser = await findUserByEmail(email);
      if (existingUser && existingUser.user_id !== id) {
        return res.status(409).json({ message: 'Email is already in use' });
      }
      updateFields.email = email;
    }
    
    if (user_role) updateFields.user_role = user_role;
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateFields.password_hash = await bcrypt.hash(password, salt);
    }
    
    // Only update if there are changes
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'No changes to update' });
    }
    
    // Update timestamp
    updateFields.updated_at = new Date();
    
    // Update user
    await sequelize.query(
      `UPDATE users 
       SET ${Object.keys(updateFields).map(key => `"${key}" = :${key}`).join(', ')}
       WHERE user_id = :id`,
      {
        replacements: {
          ...updateFields,
          id
        },
        type: sequelize.QueryTypes.UPDATE
      }
    );
    
    // Get updated user
    const updatedUsers = await sequelize.query(
      `SELECT user_id, name, email, user_role, is_deleted, created_at, updated_at 
       FROM users 
       WHERE user_id = :id`,
      {
        replacements: { id },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    return res.status(200).json(updatedUsers[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Error updating user' });
  }
};

// Soft delete a user (admin only)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent deleting self
    if (req.user.user_id === id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    // Find user
    const user = await findUserById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Soft delete
    await sequelize.query(
      `UPDATE users 
       SET is_deleted = TRUE, deleted_at = :now, updated_at = :now
       WHERE user_id = :id`,
      {
        replacements: {
          id,
          now: new Date()
        },
        type: sequelize.QueryTypes.UPDATE
      }
    );
    
    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ message: 'Error deleting user' });
  }
};

// Restore a deleted user (admin only)
export const restoreUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find user
    const user = await findUserById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!user.is_deleted) {
      return res.status(400).json({ message: 'User is not deleted' });
    }
    
    // Restore user
    await sequelize.query(
      `UPDATE users 
       SET is_deleted = FALSE, deleted_at = NULL, updated_at = :now
       WHERE user_id = :id`,
      {
        replacements: {
          id,
          now: new Date()
        },
        type: sequelize.QueryTypes.UPDATE
      }
    );
    
    // Get updated user
    const updatedUsers = await sequelize.query(
      `SELECT user_id, name, email, user_role, is_deleted, created_at, updated_at 
       FROM users 
       WHERE user_id = :id`,
      {
        replacements: { id },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    return res.status(200).json(updatedUsers[0]);
  } catch (error) {
    console.error('Error restoring user:', error);
    return res.status(500).json({ message: 'Error restoring user' });
  }
};
