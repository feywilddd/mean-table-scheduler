// routes/adminRoutes.js
import express from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import * as adminController from '../controllers/adminController.js';

const router = express.Router();

// Apply authentication and admin check middleware to all routes
router.use(authenticate);
router.use(authorize('admin'));

// Reservation endpoints
router.get('/reservations', adminController.getAllReservations);
router.post('/reservations', adminController.createReservation);
router.put('/reservations/:id', adminController.updateReservation);
router.delete('/reservations/:id', adminController.deleteReservation);

// Service instance endpoints
router.get('/service-instances', adminController.getAllServiceInstances);

// Tables endpoints
router.get('/tables', adminController.getAllTables);

// Users endpoints
router.get('/users', adminController.getAllUsers);

export default router;