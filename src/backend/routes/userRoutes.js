import express from 'express';
import { getUsers, createUser } from '../controllers/userController.js';

const router = express.Router();

router.get('/', getUsers);       // Fetch all users
router.post('/register', createUser); // Register a new user

export default router;
