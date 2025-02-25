import express from 'express';
import { register, login, getCurrentUser, validateToken, updateProfile } from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';


const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/validate-token', validateToken);

// Protected routes
router.get('/me', authenticate, getCurrentUser);
router.put('/me/edit', authenticate, updateProfile);

export default router;
