// services/reservationService.js
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import Reservation from '../models/Reservation.js';
import Service from '../models/Service.js';
import Table from '../models/Table.js';
import User from '../models/userModel.js';
import Restaurant from '../models/Restaurant.js';

/**
 * Get all reservations (with optional filtering)
 * @param {Object} filters - Optional filters (userId, tableId, restaurantId, serviceId, startDate, endDate)
 * @returns {Array} List of reservations
 */
const getAllReservations = async (filters = {}) => {
  try {
    const queryOptions = {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['user_id', 'name', 'email'],
          where: filters.userId ? { user_id: filters.userId } : {}
        },
        {
          model: Table,
          as: 'table',
          attributes: ['table_id', 'number', 'seats'],
          where: filters.tableId ? { table_id: filters.tableId } : {},
          include: [
            {
              model: Restaurant,
              as: 'restaurant',
              attributes: ['restaurant_id', 'name', 'address', 'phone'],
              where: filters.restaurantId ? { restaurant_id: filters.restaurantId } : {}
            }
          ]
        },
        {
          model: Service,
          as: 'service',
          where: {}
        }
      ],
      order: [['created_at', 'DESC']]
    };

    // Add date filtering if provided
    if (filters.startDate || filters.endDate) {
      queryOptions.include[2].where.start_time = {};
      
      if (filters.startDate) {
        queryOptions.include[2].where.start_time[Op.gte] = new Date(filters.startDate);
      }
      
      if (filters.endDate) {
        queryOptions.include[2].where.start_time[Op.lte] = new Date(filters.endDate);
      }
    }

    // Add service filtering if provided
    if (filters.serviceId) {
      queryOptions.include[2].where.service_id = filters.serviceId;
    }

    const reservations = await Reservation.findAll(queryOptions);
    return reservations;
  } catch (error) {
    console.error('Error getting reservations:', error);
    throw new Error('Failed to get reservations');
  }
};

/**
 * Get reservation by ID
 * @param {String} reservationId - Reservation UUID
 * @returns {Object} Reservation details
 */
const getReservationById = async (reservationId) => {
  try {
    const reservation = await Reservation.findByPk(reservationId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['user_id', 'name', 'email']
        },
        {
          model: Table,
          as: 'table',
          include: [
            {
              model: Restaurant,
              as: 'restaurant'
            }
          ]
        },
        {
          model: Service,
          as: 'service'
        }
      ]
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    return reservation;
  } catch (error) {
    console.error('Error getting reservation by ID:', error);
    throw error;
  }
};

/**
 * Get reservations for a user
 * @param {String} userId - User UUID
 * @returns {Array} List of user's reservations
 */
const getUserReservations = async (userId) => {
  try {
    return await getAllReservations({ userId });
  } catch (error) {
    console.error('Error getting user reservations:', error);
    throw error;
  }
};

/**
 * Find the most optimal table (smallest available table that fits the party)
 * @param {String} serviceId - Service UUID
 * @param {Number} seatsNeeded - Number of seats needed
 * @param {String} restaurantId - Optional restaurant filter
 * @param {String} excludeReservationId - Optional reservation ID to exclude from current bookings
 * @returns {Object} The optimal table or null if none found
 */
const findOptimalTable = async (serviceId, seatsNeeded, restaurantId = null, excludeReservationId = null) => {
  try {
    // Get all available tables for this service that have enough seats
    const availableTables = await findAvailableTables(serviceId, seatsNeeded, restaurantId, excludeReservationId);
    
    if (availableTables.length === 0) {
      return null;
    }
    
    // Sort tables by seat count (ascending) to find the smallest suitable table
    availableTables.sort((a, b) => a.seats - b.seats);
    
    // Return the smallest table that can accommodate the party
    return availableTables[0];
  } catch (error) {
    console.error('Error finding optimal table:', error);
    throw error;
  }
};

/**
 * Check if tables has enough seats for the reservation
 * @param {String} tableId - Table UUID
 * @param {Number} seatsNeeded - Number of seats needed
 * @returns {Boolean} True if has enough seats, false otherwise
 */
const hasEnoughSeats = async (tableId, seatsNeeded) => {
  try {
    const table = await Table.findByPk(tableId);
    if (!table) {
      throw new Error('Table not found');
    }

    return table.seats >= seatsNeeded;
  } catch (error) {
    console.error('Error checking seats availability:', error);
    throw error;
  }
};

/**
 * Create a new reservation with optimal table assignment
 * @param {Object} reservationData - Reservation details
 * @returns {Object} Created reservation
 */
const createReservation = async (reservationData) => {
  const transaction = await sequelize.transaction();

  try {
    const { userId, serviceId, seatsTaken, restaurantId } = reservationData;

    // Check if service exists and is not deleted
    const service = await Service.findOne({
      where: {
        service_id: serviceId,
        is_deleted: false
      },
      transaction
    });

    if (!service) {
      throw new Error('Service not found or deleted');
    }

    // Find the optimal table for this reservation
    const optimalTable = await findOptimalTable(serviceId, seatsTaken, restaurantId);
    
    if (!optimalTable) {
      throw new Error('No suitable tables available for this reservation');
    }

    // Create reservation with the optimal table
    const reservation = await Reservation.create(
      {
        reservation_user_id: userId,
        reservation_table_id: optimalTable.table_id,
        reservation_service_id: serviceId,
        seats_taken: seatsTaken
      },
      { transaction }
    );

    await transaction.commit();
    
    // Return full reservation with related data
    return await getReservationById(reservation.reservation_id);
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating reservation:', error);
    throw error;
  }
};

/**
 * Update a reservation with optimal table reassignment
 * @param {String} reservationId - Reservation UUID
 * @param {Object} updateData - Fields to update
 * @returns {Object} Updated reservation
 */
const updateReservation = async (reservationId, updateData) => {
  const transaction = await sequelize.transaction();

  try {
    const reservation = await Reservation.findByPk(reservationId, { 
      transaction,
      include: [
        {
          model: Table,
          as: 'table',
          include: [{ model: Restaurant, as: 'restaurant' }]
        }
      ]
    });
    
    if (!reservation) {
      throw new Error('Reservation not found');
    }

    const { seatsTaken, serviceId } = updateData;
    const currentServiceId = serviceId || reservation.reservation_service_id;
    const currentSeatsTaken = seatsTaken || reservation.seats_taken;
    const restaurantId = reservation.table.restaurant.restaurant_id;
    
    // Only reassign table if seat count is changing
    if (seatsTaken || serviceId) {
      // Find the optimal table for the updated seats
      const optimalTable = await findOptimalTable(
        currentServiceId, 
        currentSeatsTaken, 
        restaurantId,
        reservationId // Exclude current reservation to prevent conflicts
      );
      
      if (!optimalTable) {
        throw new Error('No suitable tables available for this updated reservation');
      }
      
      // Update to optimal table
      reservation.reservation_table_id = optimalTable.table_id;
    }
    
    // Update other fields
    if (serviceId) reservation.reservation_service_id = serviceId;
    if (seatsTaken) reservation.seats_taken = seatsTaken;
    
    await reservation.save({ transaction });
    await transaction.commit();
    
    // Return updated reservation with related data
    return await getReservationById(reservationId);
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating reservation:', error);
    throw error;
  }
};

/**
 * Delete a reservation and potentially trigger table reassignments
 * @param {String} reservationId - Reservation UUID
 * @returns {Boolean} True if successful
 */
const deleteReservation = async (reservationId) => {
  const transaction = await sequelize.transaction();
  
  try {
    const reservation = await Reservation.findByPk(reservationId, {
      include: [
        { model: Service, as: 'service' }
      ],
      transaction
    });
    
    if (!reservation) {
      throw new Error('Reservation not found');
    }
    
    // Store service ID for optimization after deletion
    const serviceId = reservation.reservation_service_id;
    
    // Delete the reservation
    await reservation.destroy({ transaction });
    
    // Get all reservations for the same service to potentially reassign tables
    const serviceReservations = await Reservation.findAll({
      where: { 
        reservation_service_id: serviceId 
      },
      include: [
        { 
          model: Table, 
          as: 'table',
          include: [{ model: Restaurant, as: 'restaurant' }]
        }
      ],
      order: [['seats_taken', 'DESC']], // Process larger parties first
      transaction
    });
    
    // For each reservation, try to find a more optimal table
    for (const res of serviceReservations) {
      const restaurantId = res.table.restaurant.restaurant_id;
      const optimalTable = await findOptimalTable(
        serviceId, 
        res.seats_taken, 
        restaurantId,
        res.reservation_id // Exclude current reservation
      );
      
      // If a better table is found, update the reservation
      if (optimalTable && optimalTable.table_id !== res.reservation_table_id) {
        res.reservation_table_id = optimalTable.table_id;
        await res.save({ transaction });
      }
    }
    
    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting reservation:', error);
    throw error;
  }
};

/**
 * Find available tables for a given service
 * @param {String} serviceId - Service UUID
 * @param {Number} seatsNeeded - Minimum number of seats needed
 * @param {String} restaurantId - Optional restaurant filter
 * @param {String} excludeReservationId - Optional reservation ID to exclude from current bookings
 * @returns {Array} List of available tables
 */
const findAvailableTables = async (serviceId, seatsNeeded, restaurantId = null, excludeReservationId = null) => {
  try {
    // Get all tables from the restaurant (if specified) or all restaurants
    const whereClause = {
      is_deleted: false,
      seats: { [Op.gte]: seatsNeeded }
    };
    
    if (restaurantId) {
      whereClause.table_restaurant_id = restaurantId;
    }
    
    const tables = await Table.findAll({
      where: whereClause,
      include: [
        {
          model: Restaurant,
          as: 'restaurant'
        }
      ]
    });
    
    // Get all tables already reserved for this service
    const reservationWhere = { 
      reservation_service_id: serviceId 
    };
    
    // Exclude a specific reservation if needed (for updates)
    if (excludeReservationId) {
      reservationWhere.reservation_id = { [Op.ne]: excludeReservationId };
    }
    
    const reservedTableIds = await Reservation.findAll({
      where: reservationWhere,
      attributes: ['reservation_table_id']
    }).then(reservations => reservations.map(r => r.reservation_table_id));
    
    // Filter out reserved tables
    const availableTables = tables.filter(table => 
      !reservedTableIds.includes(table.table_id)
    );
    
    return availableTables;
  } catch (error) {
    console.error('Error finding available tables:', error);
    throw error;
  }
};

/**
 * Check if a specific table is available for a given service time
 * @param {String} tableId - Table UUID
 * @param {String} serviceId - Service UUID
 * @param {String} excludeReservationId - Optional reservation ID to exclude
 * @returns {Boolean} True if available, false if already booked
 */
const isTableAvailable = async (tableId, serviceId, excludeReservationId = null) => {
  try {
    // Check if table exists and is not deleted
    const table = await Table.findOne({
      where: {
        table_id: tableId,
        is_deleted: false
      }
    });

    if (!table) {
      throw new Error('Table not found or deleted');
    }

    // Get service details
    const service = await Service.findOne({
      where: { 
        service_id: serviceId,
        is_deleted: false
      }
    });
    
    if (!service) {
      throw new Error('Service not found or is deleted');
    }

    // Check if there's any existing reservation for this table during this service time
    const whereClause = {
      reservation_table_id: tableId,
      reservation_service_id: serviceId
    };
    
    // Exclude a specific reservation if needed (for updates)
    if (excludeReservationId) {
      whereClause.reservation_id = { [Op.ne]: excludeReservationId };
    }
    
    const existingReservation = await Reservation.findOne({
      where: whereClause
    });

    return !existingReservation;
  } catch (error) {
    console.error('Error checking table availability:', error);
    throw error;
  }
};

/**
 * Optimize all reservations for a given service
 * @param {String} serviceId - Service UUID
 * @returns {Number} Number of reservations optimized
 */
const optimizeServiceReservations = async (serviceId) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Get all reservations for this service
    const reservations = await Reservation.findAll({
      where: { reservation_service_id: serviceId },
      include: [
        { 
          model: Table, 
          as: 'table',
          include: [{ model: Restaurant, as: 'restaurant' }]
        }
      ],
      order: [['seats_taken', 'DESC']], // Process larger parties first
      transaction
    });
    
    let optimizedCount = 0;
    
    // For each reservation, try to find a more optimal table
    for (const res of reservations) {
      const restaurantId = res.table.restaurant.restaurant_id;
      const optimalTable = await findOptimalTable(
        serviceId, 
        res.seats_taken, 
        restaurantId,
        res.reservation_id // Exclude current reservation
      );
      
      // If a better table is found, update the reservation
      if (optimalTable && optimalTable.table_id !== res.reservation_table_id) {
        res.reservation_table_id = optimalTable.table_id;
        await res.save({ transaction });
        optimizedCount++;
      }
    }
    
    await transaction.commit();
    return optimizedCount;
  } catch (error) {
    await transaction.rollback();
    console.error('Error optimizing service reservations:', error);
    throw error;
  }
};

export default {
  getAllReservations,
  getReservationById,
  getUserReservations,
  createReservation,
  updateReservation,
  deleteReservation,
  findAvailableTables,
  isTableAvailable,
  hasEnoughSeats,
  findOptimalTable,
  optimizeServiceReservations
};