// controllers/reservationController.js
import reservationService from '../services/reservationService.js';
import { sequelize } from '../config/database.js';
import { findAvailableTables } from '../services/serviceUtils.js';

/**
 * Get all reservations (admin) or filter by query params
 */
export const getAllReservations = async (req, res) => {
  try {
    // Extract filter parameters from query
    const { userId, tableId, restaurantId, serviceInstanceId, startDate, endDate } = req.query;
    
    // Admin can see all reservations, users can only see their own
    const filters = {};
    
    if (req.user.user_role !== 'admin') {
      // Regular users can only see their own reservations
      filters.userId = req.user.user_id;
    } else {
      // Admin can filter by userId if provided
      if (userId) filters.userId = userId;
    }
    
    // Apply other filters if provided
    if (tableId) filters.tableId = tableId;
    if (restaurantId) filters.restaurantId = restaurantId;
    if (serviceInstanceId) filters.serviceInstanceId = serviceInstanceId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    
    const reservations = await reservationService.getAllReservations(filters);
    
    return res.status(200).json(reservations);
  } catch (error) {
    console.error('Error getting reservations:', error);
    return res.status(500).json({ message: error.message || 'Error getting reservations' });
  }
};

/**
 * Get a single reservation by ID
 */
export const getReservationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const reservation = await reservationService.getReservationById(id);
    
    // Check if user is authorized to view this reservation
    if (req.user.user_role !== 'admin' && reservation.reservation_user_id !== req.user.user_id) {
      return res.status(403).json({ message: 'Not authorized to view this reservation' });
    }
    
    return res.status(200).json(reservation);
  } catch (error) {
    if (error.message === 'Reservation not found') {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    
    console.error('Error getting reservation by ID:', error);
    return res.status(500).json({ message: error.message || 'Error getting reservation' });
  }
};

/**
 * Get current user's reservations
 */
export const getCurrentUserReservations = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const reservations = await reservationService.getUserReservations(userId);
    
    return res.status(200).json(reservations);
  } catch (error) {
    console.error('Error getting user reservations:', error);
    return res.status(500).json({ message: error.message || 'Error getting user reservations' });
  }
};

/**
 * Create a new reservation
 */
export const createReservation = async (req, res) => {
  try {
    const { tableId, serviceInstanceId, seatsTaken } = req.body;
    
    // Validate required fields
    if (!tableId || !serviceInstanceId || !seatsTaken) {
      return res.status(400).json({ 
        message: 'Table ID, service instance ID, and seats taken are required' 
      });
    }
    
    // Validate seatsTaken
    if (seatsTaken <= 0) {
      return res.status(400).json({ message: 'Seats taken must be greater than 0' });
    }
    
    // Create reservation
    const reservation = await reservationService.createReservation({
      userId: req.user.user_id,  // Use authenticated user's ID
      tableId,
      serviceInstanceId,
      seatsTaken
    });
    
    return res.status(201).json(reservation);
  } catch (error) {
    console.error('Error creating reservation:', error);
    
    // Handle specific error messages
    if (error.message.includes('already reserved') || 
        error.message.includes('enough seats') ||
        error.message.includes('not found') ||
        error.message.includes('deleted')) {
      return res.status(400).json({ message: error.message });
    }
    
    return res.status(500).json({ message: 'Error creating reservation' });
  }
};

/**
 * Update a reservation
 */
export const updateReservation = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { tableId, serviceInstanceId, seatsTaken } = req.body;
    
    // Fetch the reservation to check ownership
    const reservation = await reservationService.getReservationById(id);
    
    // Only the reservation owner or an admin can update
    if (req.user.user_role !== 'admin' && reservation.reservation_user_id !== req.user.user_id) {
      return res.status(403).json({ message: 'Not authorized to update this reservation' });
    }
    
    // Ensure at least one updateable field is provided
    if (!tableId && !serviceInstanceId && !seatsTaken) {
      return res.status(400).json({ message: 'At least one field to update is required' });
    }
    
    // Update reservation
    const updateData = {};
    if (tableId) updateData.tableId = tableId;
    if (serviceInstanceId) updateData.serviceInstanceId = serviceInstanceId;
    if (seatsTaken) {
      // Validate seatsTaken
      if (seatsTaken <= 0) {
        return res.status(400).json({ message: 'Seats taken must be greater than 0' });
      }
      updateData.seatsTaken = seatsTaken;
    }
    
    const updatedReservation = await reservationService.updateReservation(id, updateData);
    
    return res.status(200).json(updatedReservation);
  } catch (error) {
    console.error('Error updating reservation:', error);
    
    // Handle specific error messages
    if (error.message.includes('Reservation not found')) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    
    if (error.message.includes('already reserved') || 
        error.message.includes('enough seats') ||
        error.message.includes('not found') ||
        error.message.includes('deleted')) {
      return res.status(400).json({ message: error.message });
    }
    
    return res.status(500).json({ message: 'Error updating reservation' });
  }
};

/**
 * Delete a reservation
 */
export const deleteReservation = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch the reservation to check ownership
    try {
      const reservation = await reservationService.getReservationById(id);
      
      // Only the reservation owner or an admin can delete
      if (req.user.user_role !== 'admin' && reservation.reservation_user_id !== req.user.user_id) {
        return res.status(403).json({ message: 'Not authorized to delete this reservation' });
      }
    } catch (error) {
      if (error.message === 'Reservation not found') {
        return res.status(404).json({ message: 'Reservation not found' });
      }
      throw error;
    }
    
    // Delete reservation
    await reservationService.deleteReservation(id);
    
    return res.status(200).json({ message: 'Reservation deleted successfully' });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    return res.status(500).json({ message: 'Error deleting reservation' });
  }
};

/**
 * Find available tables for a service instance
 */
export const findAvailableTablesForService = async (req, res) => {
  try {
    const { serviceInstanceId } = req.params;
    const { seats, restaurantId } = req.query;
    
    // Validate required params
    if (!serviceInstanceId) {
      return res.status(400).json({ message: 'Service instance ID is required' });
    }
    
    // Default to 1 seat if not specified
    const seatsNeeded = seats ? parseInt(seats) : 1;
    
    if (isNaN(seatsNeeded) || seatsNeeded <= 0) {
      return res.status(400).json({ message: 'Seats must be a positive number' });
    }
    
    // Find available tables
    const availableTables = await findAvailableTables(serviceInstanceId, seatsNeeded);
    
    // If restaurant ID is provided, filter tables by restaurant
    let filteredTables = availableTables;
    if (restaurantId) {
      filteredTables = availableTables.filter(table => 
        table.table_restaurant_id === restaurantId
      );
    }
    
    return res.status(200).json(filteredTables);
  } catch (error) {
    console.error('Error finding available tables:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    
    return res.status(500).json({ message: 'Error finding available tables' });
  }
};

/**
 * Check if a specific table is available for a service instance
 */
export const checkTableAvailability = async (req, res) => {
  try {
    const { tableId, serviceInstanceId } = req.params;
    
    // Validate required params
    if (!tableId || !serviceInstanceId) {
      return res.status(400).json({ message: 'Table ID and Service Instance ID are required' });
    }
    
    // Get all available tables for this service instance
    const availableTables = await findAvailableTables(serviceInstanceId, 1);
    
    // Check if our table is in the available tables list
    const isAvailable = availableTables.some(table => table.table_id === tableId);
    
    return res.status(200).json({ available: isAvailable });
  } catch (error) {
    console.error('Error checking table availability:', error);
    
    if (error.message.includes('not found') || error.message.includes('deleted')) {
      return res.status(400).json({ message: error.message });
    }
    
    return res.status(500).json({ message: 'Error checking table availability' });
  }
};

/**
 * Get service instances with available tables
 */
export const getServiceInstancesWithAvailability = async (req, res) => {
  try {
    const { startDate, endDate, seats } = req.query;
    
    // Validate required params
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    // Default to 1 seat if not specified
    const seatsNeeded = seats ? parseInt(seats) : 1;
    
    if (isNaN(seatsNeeded) || seatsNeeded <= 0) {
      return res.status(400).json({ message: 'Seats must be a positive number' });
    }
    
    const result = await reservationService.getServiceInstancesWithAvailability(
      startDate, 
      endDate, 
      seatsNeeded
    );
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error getting service instances with availability:', error);
    return res.status(500).json({ 
      message: 'Error getting service instances with availability' 
    });
  }
};