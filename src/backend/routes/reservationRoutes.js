import express from 'express';
import {
  getAllReservations,
  getReservationById,
  getCurrentUserReservations,
  createReservation,
  updateReservation,
  deleteReservation,
  findAvailableTables,
  checkTableAvailability
} from '../controllers/reservationController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/adminMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes


router.get('/available-tables/:serviceId', findAvailableTables);
router.get('/check-availability/:tableId/:serviceId', checkTableAvailability);
router.use(authenticate);
// Get all reservations (admin can see all, users only see their own)
router.get('/', getAllReservations);

// Get current user's reservations
router.get('/my-reservations', getCurrentUserReservations);

// Get reservation by ID
router.get('/:id', getReservationById);

// Create a new reservation
router.post('/', createReservation);

// Update a reservation
router.put('/:id', updateReservation);

// Delete a reservation
router.delete('/:id', deleteReservation);

export default router;