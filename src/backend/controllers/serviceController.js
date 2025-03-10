// controllers/serviceController.js
import Service from '../models/Service.js';
import { sequelize } from '../config/database.js';

/**
 * Get all services
 */
export const getAllServices = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build where clause
    const whereClause = {
      is_deleted: false
    };
    
    // Filter by date range if provided
    if (startDate || endDate) {
      whereClause.start_time = {};
      
      if (startDate) {
        whereClause.start_time.gte = new Date(startDate);
      }
      
      if (endDate) {
        whereClause.start_time.lte = new Date(endDate);
      }
    }
    
    const services = await Service.findAll({
      where: whereClause,
      order: [['start_time', 'ASC']]
    });
    
    return res.status(200).json(services);
  } catch (error) {
    console.error('Error getting services:', error);
    return res.status(500).json({ message: 'Error getting services' });
  }
};

/**
 * Get service by ID
 */
export const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const service = await Service.findOne({
      where: {
        service_id: id,
        is_deleted: false
      }
    });
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    return res.status(200).json(service);
  } catch (error) {
    console.error('Error getting service by ID:', error);
    return res.status(500).json({ message: 'Error getting service' });
  }
};

/**
 * Create a new service
 */
export const createService = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { startTime, endTime, isRepeting, repeatingDaysBitmask } = req.body;
    
    // Validate required fields
    if (!startTime || !endTime) {
      return res.status(400).json({ message: 'Start time and end time are required' });
    }
    
    // Validate times
    const startTimeDate = new Date(startTime);
    const endTimeDate = new Date(endTime);
    
    if (isNaN(startTimeDate.getTime()) || isNaN(endTimeDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    if (endTimeDate <= startTimeDate) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }
    
    // Check if duration is less than or equal to 4 hours
    const durationHours = (endTimeDate - startTimeDate) / (1000 * 60 * 60);
    if (durationHours > 4) {
      return res.status(400).json({ message: 'Service duration cannot exceed 4 hours' });
    }
    
    // Create service
    const service = await Service.create({
      start_time: startTimeDate,
      end_time: endTimeDate,
      is_repeting: isRepeting || false,
      repeating_days_bitmask: repeatingDaysBitmask || 0
    }, { transaction });
    
    await transaction.commit();
    
    return res.status(201).json(service);
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating service:', error);
    return res.status(500).json({ message: 'Error creating service' });
  }
};

/**
 * Update a service
 */
export const updateService = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { startTime, endTime, isRepeting, repeatingDaysBitmask } = req.body;
    
    // Find service
    const service = await Service.findOne({
      where: {
        service_id: id,
        is_deleted: false
      },
      transaction
    });
    
    if (!service) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Service not found' });
    }
    
    // Update fields if provided
    if (startTime) {
      const startTimeDate = new Date(startTime);
      if (isNaN(startTimeDate.getTime())) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Invalid start time format' });
      }
      service.start_time = startTimeDate;
    }
    
    if (endTime) {
      const endTimeDate = new Date(endTime);
      if (isNaN(endTimeDate.getTime())) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Invalid end time format' });
      }
      service.end_time = endTimeDate;
    }
    
    // Make sure end time is still after start time
    if (service.end_time <= service.start_time) {
      await transaction.rollback();
      return res.status(400).json({ message: 'End time must be after start time' });
    }
    
    // Check if duration is less than or equal to 4 hours
    const durationHours = (service.end_time - service.start_time) / (1000 * 60 * 60);
    if (durationHours > 4) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Service duration cannot exceed 4 hours' });
    }
    
    if (isRepeting !== undefined) service.is_repeting = isRepeting;
    if (repeatingDaysBitmask !== undefined) service.repeating_days_bitmask = repeatingDaysBitmask;
    
    await service.save({ transaction });
    await transaction.commit();
    
    return res.status(200).json(service);
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating service:', error);
    return res.status(500).json({ message: 'Error updating service' });
  }
};

/**
 * Soft delete a service
 */
export const deleteService = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    // Find service
    const service = await Service.findOne({
      where: {
        service_id: id,
        is_deleted: false
      },
      transaction
    });
    
    if (!service) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Service not found' });
    }
    
    // Soft delete
    service.is_deleted = true;
    service.deleted_at = new Date();
    await service.save({ transaction });
    
    await transaction.commit();
    
    return res.status(200).json({ message: 'Service deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting service:', error);
    return res.status(500).json({ message: 'Error deleting service' });
  }
};