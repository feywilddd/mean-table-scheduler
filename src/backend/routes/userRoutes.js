import express from 'express';
import { 
  getAllUsers,
  getUserById,
  createUser,
  updateUserById,
  deleteUser,
  restoreUser
} from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/adminMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all users (admin only)
router.get('/', requireAdmin, getAllUsers);

// Get user by ID (admin or self)
router.get('/:id', getUserById);

// Create a new user (admin only)
router.post('/', requireAdmin, createUser);

// Update a user (admin only)
router.put('/:id', requireAdmin, updateUserById);

// Soft delete a user (admin only)
router.delete('/:id', requireAdmin, deleteUser);

// Restore a deleted user (admin only)
router.put('/:id/restore', requireAdmin, restoreUser);

export default router;