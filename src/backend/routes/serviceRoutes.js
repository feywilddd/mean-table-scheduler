// routes/serviceRoutes.js
import express from 'express';
import {
  getAllServiceTemplates,
  getServiceTemplateById,
  createServiceTemplate,
  updateServiceTemplate,
  deleteServiceTemplate,
  generateInstances
} from '../controllers/serviceTemplateController.js';

import {
  getServiceInstances,
  getServiceInstanceById,
  createServiceInstance,
  updateServiceInstance,
  deleteServiceInstance,
  getAvailableDates
} from '../controllers/serviceInstanceController.js';

import { authenticate } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/adminMiddleware.js';

const router = express.Router();

// Service Templates - Public endpoints
router.get('/templates', getAllServiceTemplates);
router.get('/templates/:id', getServiceTemplateById);

// Service Instances - Public endpoints
router.get('/instances', getServiceInstances);
router.get('/instances/:id', getServiceInstanceById);
router.get('/available-dates/:year/:month', getAvailableDates);

// Protected endpoints - require authentication
router.use(authenticate);

// Admin only routes for managing service templates
router.post('/templates', requireAdmin, createServiceTemplate);
router.put('/templates/:id', requireAdmin, updateServiceTemplate);
router.delete('/templates/:id', requireAdmin, deleteServiceTemplate);
router.post('/templates/:id/generate', requireAdmin, generateInstances);

// Admin only routes for managing service instances
router.post('/instances', requireAdmin, createServiceInstance);
router.put('/instances/:id', requireAdmin, updateServiceInstance);
router.delete('/instances/:id', requireAdmin, deleteServiceInstance);

export default router;