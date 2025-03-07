// routes/restaurantRoutes.js
import express from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import {
  getAllRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant
} from '../controllers/restaurantController.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Apply admin authorization middleware to all routes
router.use(authorize('admin'));

// Get all restaurants
router.get('/', getAllRestaurants);

// Get a single restaurant
router.get('/:restaurantId', getRestaurantById);

// Create a new restaurant
router.post('/', createRestaurant);

// Update a restaurant
router.put('/:restaurantId', updateRestaurant);

// Delete a restaurant
router.delete('/:restaurantId', deleteRestaurant);

export default router;