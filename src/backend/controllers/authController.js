import authService from '../services/authService.js';
import { sequelize } from '../config/database.js';
import bcrypt from 'bcrypt'; 

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

const findUserById = async (userId) => {
    try {
      // Updated to use named parameters and correct column name
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
        
        // Execute the update - fixed table name and column name
        await sequelize.query(
          `UPDATE users SET ${setClause} WHERE user_id = :userId`,
          {
            replacements,
            type: sequelize.QueryTypes.UPDATE,
            transaction
          }
        );
        
        // Fetch the updated user - fixed column names and table name
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
  
export const updateProfile = async (req, res) => {
    try {
      // Get user ID from authenticated request - update to use user_id instead of id
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
        // Verify current password first - update to use password_hash instead of password
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