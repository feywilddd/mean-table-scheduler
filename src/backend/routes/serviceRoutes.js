// routes/serviceRoutes.js
import express from 'express';
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
} from '../controllers/serviceController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/adminMiddleware.js';

const router = express.Router();

// Public endpoints - no authentication required
router.get('/', getAllServices);
router.get('/:id', getServiceById);

// Protected endpoints - require authentication
router.use(authenticate);

// Admin only routes for managing services
router.post('/', requireAdmin, createService);
router.put('/:id', requireAdmin, updateService);
router.delete('/:id', requireAdmin, deleteService);

export default router;