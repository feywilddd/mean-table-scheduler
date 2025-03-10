// controllers/serviceInstanceController.js
import ServiceInstance from '../models/ServiceInstance.js';
import ServiceTemplate from '../models/ServiceTemplate.js';
import { sequelize } from '../config/database.js';
import { Op } from 'sequelize';

/**
 * Get all service instances for a date range
 */
export const getServiceInstances = async (req, res) => {
  try {
    const { startDate, endDate, templateId } = req.query;
    
    // Build where clause
    const whereClause = {
      is_deleted: false
    };
    
    // Filter by template ID if provided
    if (templateId) {
      whereClause.service_template_id = templateId;
    }
    
    // Filter by date range if provided
    if (startDate || endDate) {
      whereClause.service_date = {};
      
      if (startDate) {
        whereClause.service_date[Op.gte] = new Date(startDate);
      }
      
      if (endDate) {
        whereClause.service_date[Op.lte] = new Date(endDate);
      }
    }
    
    const instances = await ServiceInstance.findAll({
      where: whereClause,
      include: [
        {
          model: ServiceTemplate,
          as: 'template',
          attributes: ['name', 'is_repeating', 'repeating_days_bitmask']
        }
      ],
      order: [
        ['service_date', 'ASC'],
        ['start_time', 'ASC']
      ]
    });
    
    return res.status(200).json(instances);
  } catch (error) {
    console.error('Error getting service instances:', error);
    return res.status(500).json({ message: 'Error getting service instances' });
  }
};

/**
 * Get service instance by ID
 */
export const getServiceInstanceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const instance = await ServiceInstance.findOne({
      where: {
        service_instance_id: id,
        is_deleted: false
      },
      include: [
        {
          model: ServiceTemplate,
          as: 'template',
          attributes: ['name', 'is_repeating', 'repeating_days_bitmask']
        }
      ]
    });
    
    if (!instance) {
      return res.status(404).json({ message: 'Service instance not found' });
    }
    
    return res.status(200).json(instance);
  } catch (error) {
    console.error('Error getting service instance by ID:', error);
    return res.status(500).json({ message: 'Error getting service instance' });
  }
};

/**
 * Create a new service instance (manual creation for exceptions)
 */
export const createServiceInstance = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { templateId, date, startTime, endTime } = req.body;
    
    // Validate required fields
    if (!templateId || !date || !startTime || !endTime) {
      await transaction.rollback();
      return res.status(400).json({ 
        message: 'Template ID, date, start time and end time are required' 
      });
    }
    
    // Verify template exists
    const template = await ServiceTemplate.findOne({
      where: {
        service_template_id: templateId,
        is_deleted: false
      },
      transaction
    });
    
    if (!template) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Service template not found' });
    }
    
    // Parse date
    const serviceDate = new Date(date);
    if (isNaN(serviceDate.getTime())) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    // Check if instance already exists for this template and date
    const existingInstance = await ServiceInstance.findOne({
      where: {
        service_template_id: templateId,
        service_date: serviceDate.toISOString().split('T')[0]
      },
      transaction
    });
    
    if (existingInstance) {
      await transaction.rollback();
      return res.status(400).json({ 
        message: 'Service instance already exists for this template and date' 
      });
    }
    
    // Create instance
    const instance = await ServiceInstance.create({
      service_template_id: templateId,
      service_date: serviceDate,
      start_time: startTime,
      end_time: endTime
    }, { transaction });
    
    await transaction.commit();
    
    return res.status(201).json(instance);
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating service instance:', error);
    return res.status(500).json({ message: 'Error creating service instance' });
  }
};

/**
 * Update a service instance
 */
export const updateServiceInstance = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { startTime, endTime, isDeleted } = req.body;
    
    // Find instance
    const instance = await ServiceInstance.findOne({
      where: {
        service_instance_id: id,
        is_deleted: false
      },
      transaction
    });
    
    if (!instance) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Service instance not found' });
    }
    
    // Update fields if provided
    if (startTime) instance.start_time = startTime;
    if (endTime) instance.end_time = endTime;
    if (isDeleted !== undefined) instance.is_deleted = isDeleted;
    
    await instance.save({ transaction });
    await transaction.commit();
    
    return res.status(200).json(instance);
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating service instance:', error);
    return res.status(500).json({ message: 'Error updating service instance' });
  }
};

/**
 * Soft delete a service instance
 */
export const deleteServiceInstance = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    // Find instance
    const instance = await ServiceInstance.findOne({
      where: {
        service_instance_id: id,
        is_deleted: false
      },
      transaction
    });
    
    if (!instance) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Service instance not found' });
    }
    
    // Soft delete
    instance.is_deleted = true;
    await instance.save({ transaction });
    
    await transaction.commit();
    
    return res.status(200).json({ message: 'Service instance deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting service instance:', error);
    return res.status(500).json({ message: 'Error deleting service instance' });
  }
};

/**
 * Get available dates for a specific month
 */
export const getAvailableDates = async (req, res) => {
  try {
    const { year, month } = req.params;
    
    // Validate params
    if (!year || !month) {
      return res.status(400).json({ message: 'Year and month are required' });
    }
    
    const numYear = parseInt(year);
    const numMonth = parseInt(month) - 1; // JS months are 0-indexed
    
    if (isNaN(numYear) || isNaN(numMonth) || numMonth < 0 || numMonth > 11) {
      return res.status(400).json({ message: 'Invalid year or month' });
    }
    
    // Calculate start and end of month
    const startDate = new Date(numYear, numMonth, 1);
    const endDate = new Date(numYear, numMonth + 1, 0); // Last day of month
    
    // Find all service instances in this month
    const instances = await ServiceInstance.findAll({
      attributes: ['service_date'],
      where: {
        service_date: {
          [Op.between]: [
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
          ]
        },
        is_deleted: false
      },
      group: ['service_date']
    });
    
    // Extract dates
    const availableDates = instances.map(instance => instance.service_date);
    
    return res.status(200).json(availableDates);
  } catch (error) {
    console.error('Error getting available dates:', error);
    return res.status(500).json({ message: 'Error getting available dates' });
  }
};