import reservationService from '../services/reservationService.js';
import ServiceInstance from '../models/ServiceInstance.js';
import ServiceTemplate from '../models/ServiceTemplate.js';
import Table from '../models/Table.js';
import User from '../models/userModel.js';

/**
 * Get all reservations with optional date filter
 */
export const getAllReservations = async (req, res) => {
  try {
    const { date, userId, serviceInstanceId } = req.query;
    
    // Use the service function with appropriate filters
    const filters = {
      userId,
      serviceInstanceId
    };
    
    // Add date filtering if provided
    if (date) {
      filters.startDate = date;
      filters.endDate = date;
    }
    
    const reservations = await reservationService.getAllReservations(filters);
    return res.status(200).json(reservations);
  } catch (error) {
    console.error('Error getting all reservations:', error);
    return res.status(500).json({ message: error.message || 'Error getting reservations' });
  }
};

/**
 * Create a new reservation (admin version)
 */
export const createReservation = async (req, res) => {
  try {
    const { service_instance_id, user_id, seats_taken } = req.body;
    
    // Validate required fields
    if (!service_instance_id || !user_id || !seats_taken) {
      return res.status(400).json({ 
        message: 'Service instance ID, user ID, and number of people are required' 
      });
    }
    
    // Create reservation data for admin
    const reservationData = {
      serviceInstanceId: service_instance_id,
      userId: user_id,
      seatsTaken: seats_taken
    };
    
    // Use the service to create the reservation
    try {
      const newReservation = await reservationService.createReservation(reservationData);
      return res.status(201).json(newReservation);
    } catch (serviceError) {
      // Handle specific errors from the service
      if (serviceError.message.includes('No suitable tables available')) {
        return res.status(400).json({ message: serviceError.message });
      }
      if (serviceError.message.includes('not found')) {
        return res.status(404).json({ message: serviceError.message });
      }
      throw serviceError;
    }
  } catch (error) {
    console.error('Error creating reservation:', error);
    return res.status(500).json({ message: error.message || 'Error creating reservation' });
  }
};

/**
 * Update a reservation (admin version)
 */
export const updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { service_instance_id, user_id, seats_taken } = req.body;
    
    // Create update data object with only provided fields
    const updateData = {};
    if (service_instance_id) updateData.serviceInstanceId = service_instance_id;
    if (user_id) updateData.userId = user_id;
    if (seats_taken) updateData.seatsTaken = seats_taken;
    
    try {
      // Use the service to update the reservation
      const updatedReservation = await reservationService.updateReservation(id, updateData);
      return res.status(200).json(updatedReservation);
    } catch (serviceError) {
      // Handle specific errors from the service
      if (serviceError.message.includes('Reservation not found')) {
        return res.status(404).json({ message: 'Reservation not found' });
      }
      if (serviceError.message.includes('No suitable tables available')) {
        return res.status(400).json({ message: serviceError.message });
      }
      if (serviceError.message.includes('not found')) {
        return res.status(404).json({ message: serviceError.message });
      }
      throw serviceError;
    }
  } catch (error) {
    console.error('Error updating reservation:', error);
    return res.status(500).json({ message: error.message || 'Error updating reservation' });
  }
};

/**
 * Delete a reservation (admin version)
 */
export const deleteReservation = async (req, res) => {
  try {
    const { id } = req.params;
    
    try {
      // Use the service to delete the reservation
      await reservationService.deleteReservation(id);
      return res.status(200).json({ message: 'Reservation deleted successfully' });
    } catch (serviceError) {
      // Handle specific errors from the service
      if (serviceError.message.includes('not found')) {
        return res.status(404).json({ message: 'Reservation not found' });
      }
      throw serviceError;
    }
  } catch (error) {
    console.error('Error deleting reservation:', error);
    return res.status(500).json({ message: error.message || 'Error deleting reservation' });
  }
};

/**
 * Get all service instances (admin version)
 */
export const getAllServiceInstances = async (req, res) => {
  try {
    const serviceInstances = await ServiceInstance.findAll({
      where: { is_deleted: false },
      include: [
        {
          model: ServiceTemplate,
          as: 'template',
          attributes: ['name']
        }
      ],
      order: [
        ['service_date', 'ASC'],
        ['start_time', 'ASC']
      ]
    });
    
    return res.status(200).json(serviceInstances);
  } catch (error) {
    console.error('Error getting all service instances:', error);
    return res.status(500).json({ message: 'Error getting service instances' });
  }
};

/**
 * Get all tables (admin version)
 */
export const getAllTables = async (req, res) => {
  try {
    const tables = await Table.findAll({
      where: { is_deleted: false },
      order: [['number', 'ASC']]
    });
    
    return res.status(200).json(tables);
  } catch (error) {
    console.error('Error getting all tables:', error);
    return res.status(500).json({ message: 'Error getting tables' });
  }
};

/**
 * Get all users (admin version)
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { is_deleted: false },
      attributes: ['user_id', 'name', 'email'],
      order: [['name', 'ASC']]
    });
    
    return res.status(200).json(users);
  } catch (error) {
    console.error('Error getting all users:', error);
    return res.status(500).json({ message: 'Error getting users' });
  }
};
