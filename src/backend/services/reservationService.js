// services/reservationService.js
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import Reservation from '../models/Reservation.js';
import ServiceInstance from '../models/ServiceInstance.js';
import ServiceTemplate from '../models/ServiceTemplate.js';
import Table from '../models/Table.js';
import User from '../models/userModel.js';
import Restaurant from '../models/Restaurant.js';

/**
 * Get all reservations (with optional filtering)
 * @param {Object} filters - Optional filters (userId, tableId, restaurantId, serviceInstanceId, startDate, endDate)
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
          model: ServiceInstance,
          as: 'serviceInstance',
          include: [
            {
              model: ServiceTemplate,
              as: 'template',
              attributes: ['service_template_id', 'name']
            }
          ],
          where: {}
        }
      ],
      order: [['created_at', 'DESC']]
    };

    // Add date filtering if provided
    if (filters.startDate || filters.endDate) {
      queryOptions.include[2].where.service_date = {};
      
      if (filters.startDate) {
        queryOptions.include[2].where.service_date[Op.gte] = new Date(filters.startDate);
      }
      
      if (filters.endDate) {
        queryOptions.include[2].where.service_date[Op.lte] = new Date(filters.endDate);
      }
    }

    // Add service instance filtering if provided
    if (filters.serviceInstanceId) {
      queryOptions.include[2].where.service_instance_id = filters.serviceInstanceId;
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
          model: ServiceInstance,
          as: 'serviceInstance',
          include: [
            {
              model: ServiceTemplate,
              as: 'template'
            }
          ]
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
 * @param {String} serviceInstanceId - Service instance UUID
 * @param {Number} seatsNeeded - Number of seats needed
 * @param {String} restaurantId - Optional restaurant filter
 * @param {String} excludeReservationId - Optional reservation ID to exclude from current bookings
 * @returns {Object} The optimal table or null if none found
 */
const findOptimalTable = async (serviceInstanceId, seatsNeeded, restaurantId = null, excludeReservationId = null) => {
  try {
    // Get all available tables for this service instance that have enough seats
    const availableTables = await findAvailableTables(serviceInstanceId, seatsNeeded, restaurantId, excludeReservationId);
    
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
    const { userId, serviceInstanceId, seatsTaken, restaurantId } = reservationData;

    // Check if service instance exists and is not deleted
    const serviceInstance = await ServiceInstance.findOne({
      where: {
        service_instance_id: serviceInstanceId,
        is_deleted: false
      },
      transaction
    });

    if (!serviceInstance) {
      throw new Error('Service instance not found or deleted');
    }

    // Find the optimal table for this reservation
    const optimalTable = await findOptimalTable(serviceInstanceId, seatsTaken, restaurantId);
    
    if (!optimalTable) {
      throw new Error('No suitable tables available for this reservation');
    }

    // Create reservation with the optimal table
    const reservation = await Reservation.create(
      {
        reservation_user_id: userId,
        reservation_table_id: optimalTable.table_id,
        reservation_service_instance_id: serviceInstanceId,
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

    const { seatsTaken, serviceInstanceId, userId } = updateData;
    const currentServiceInstanceId = serviceInstanceId || reservation.reservation_service_instance_id;
    const currentSeatsTaken = seatsTaken || reservation.seats_taken;
    const restaurantId = reservation.table.restaurant.restaurant_id;
    
    // Only reassign table if seat count or service instance is changing
    if (seatsTaken || serviceInstanceId) {
      // Find the optimal table for the updated seats
      const optimalTable = await findOptimalTable(
        currentServiceInstanceId, 
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
    if (serviceInstanceId) reservation.reservation_service_instance_id = serviceInstanceId;
    if (seatsTaken) reservation.seats_taken = seatsTaken;
    if (userId) reservation.reservation_user_id = userId;
    
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
        { model: ServiceInstance, as: 'serviceInstance' }
      ],
      transaction
    });
    
    if (!reservation) {
      throw new Error('Reservation not found');
    }
    
    // Store service instance ID for optimization after deletion
    const serviceInstanceId = reservation.reservation_service_instance_id;
    
    // Delete the reservation
    await reservation.destroy({ transaction });
    
    // Get all reservations for the same service instance to potentially reassign tables
    const serviceReservations = await Reservation.findAll({
      where: { 
        reservation_service_instance_id: serviceInstanceId 
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
        serviceInstanceId, 
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
 * Find available tables for a given service instance
 * @param {String} serviceInstanceId - Service instance UUID
 * @param {Number} seatsNeeded - Minimum number of seats needed
 * @param {String} restaurantId - Optional restaurant filter
 * @param {String} excludeReservationId - Optional reservation ID to exclude from current bookings
 * @returns {Array} List of available tables
 */
const findAvailableTables = async (serviceInstanceId, seatsNeeded, restaurantId = null, excludeReservationId = null) => {
  try {
    // Check if service instance exists and is not deleted
    const serviceInstance = await ServiceInstance.findOne({
      where: {
        service_instance_id: serviceInstanceId,
        is_deleted: false
      }
    });

    if (!serviceInstance) {
      throw new Error('Service instance not found or deleted');
    }
    
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
    
    // Get all tables already reserved for this service instance
    const reservationWhere = { 
      reservation_service_instance_id: serviceInstanceId 
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
 * Check if a specific table is available for a given service instance
 * @param {String} tableId - Table UUID
 * @param {String} serviceInstanceId - Service instance UUID
 * @param {String} excludeReservationId - Optional reservation ID to exclude
 * @returns {Boolean} True if available, false if already booked
 */
const isTableAvailable = async (tableId, serviceInstanceId, excludeReservationId = null) => {
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

    // Get service instance details
    const serviceInstance = await ServiceInstance.findOne({
      where: { 
        service_instance_id: serviceInstanceId,
        is_deleted: false
      }
    });
    
    if (!serviceInstance) {
      throw new Error('Service instance not found or is deleted');
    }

    // Check if there's any existing reservation for this table during this service instance
    const whereClause = {
      reservation_table_id: tableId,
      reservation_service_instance_id: serviceInstanceId
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
 * Optimize all reservations for a given service instance
 * @param {String} serviceInstanceId - Service instance UUID
 * @returns {Number} Number of reservations optimized
 */
const optimizeServiceInstanceReservations = async (serviceInstanceId) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Get all reservations for this service instance
    const reservations = await Reservation.findAll({
      where: { reservation_service_instance_id: serviceInstanceId },
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
        serviceInstanceId, 
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
    console.error('Error optimizing service instance reservations:', error);
    throw error;
  }
};

/**
 * Get service instances with availability information for a date range
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Number} seatsNeeded - Number of seats needed
 * @returns {Array} Service instances with availability info
 */
const getServiceInstancesWithAvailability = async (startDate, endDate, seatsNeeded) => {
  try {
    // Get all service instances in date range
    const serviceInstances = await ServiceInstance.findAll({
      where: {
        service_date: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        },
        is_deleted: false
      },
      include: [
        {
          model: ServiceTemplate,
          as: 'template',
          attributes: ['service_template_id', 'name']
        }
      ],
      order: [
        ['service_date', 'ASC'],
        ['start_time', 'ASC']
      ]
    });
    
    // Create a map to store results
    const results = [];
    
    // For each service instance, check availability
    for (const instance of serviceInstances) {
      const availableTables = await findAvailableTables(instance.service_instance_id, seatsNeeded);
      
      results.push({
        serviceInstance: instance,
        hasAvailability: availableTables.length > 0,
        availableTableCount: availableTables.length,
        availableTables: availableTables.map(table => ({
          tableId: table.table_id,
          number: table.number,
          seats: table.seats,
          restaurantId: table.table_restaurant_id,
          restaurantName: table.restaurant ? table.restaurant.name : null
        }))
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error getting service instances with availability:', error);
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
  optimizeServiceInstanceReservations,
  getServiceInstancesWithAvailability
};