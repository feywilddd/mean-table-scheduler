// routes/tableRoutes.js
import express from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import {
  getAllTables,
  getTablesByRestaurant,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  restoreTable,
  getDeletedTables
} from '../controllers/tableController.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Apply admin authorization middleware to all routes
router.use(authorize('admin'));

// Get all tables
router.get('/', getAllTables);

// Get tables for a specific restaurant
router.get('/restaurant/:restaurantId', getTablesByRestaurant);

// Get all deleted tables
router.get('/deleted/all', getDeletedTables);

// Get a single table
router.get('/:tableId', getTableById);

// Create a new table
router.post('/', createTable);

// Update a table
router.put('/:tableId', updateTable);

// Delete a table (soft delete)
router.delete('/:tableId', deleteTable);

// Restore a deleted table
router.post('/:tableId/restore', restoreTable);

export default router;