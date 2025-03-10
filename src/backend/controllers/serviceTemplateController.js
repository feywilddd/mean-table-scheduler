// controllers/serviceTemplateController.js
import ServiceTemplate from '../models/ServiceTemplate.js';
import { sequelize } from '../config/database.js';
import { generateServiceInstances } from '../services/serviceUtils.js';

/**
 * Get all service templates
 */
export const getAllServiceTemplates = async (req, res) => {
  try {
    const whereClause = {
      is_deleted: false
    };
    
    const templates = await ServiceTemplate.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });
    
    return res.status(200).json(templates);
  } catch (error) {
    console.error('Error getting service templates:', error);
    return res.status(500).json({ message: 'Error getting service templates' });
  }
};

/**
 * Get service template by ID
 */
export const getServiceTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await ServiceTemplate.findOne({
      where: {
        service_template_id: id,
        is_deleted: false
      }
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Service template not found' });
    }
    
    return res.status(200).json(template);
  } catch (error) {
    console.error('Error getting service template by ID:', error);
    return res.status(500).json({ message: 'Error getting service template' });
  }
};

/**
 * Create a new service template
 */
export const createServiceTemplate = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { name, startTime, endTime, isRepeating, repeatingDaysBitmask, generateForDays } = req.body;
    
    // Validate required fields
    if (!name || !startTime || !endTime) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Name, start time and end time are required' });
    }
    
    // Create service template
    const template = await ServiceTemplate.create({
      name,
      start_time: startTime,
      end_time: endTime,
      is_repeating: isRepeating || false,
      repeating_days_bitmask: repeatingDaysBitmask || 0
    }, { transaction });
    
    await transaction.commit();
    
    // If generateForDays is provided, create service instances for that many days
    if (generateForDays && generateForDays > 0) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + generateForDays);
      
      await generateServiceInstances(startDate, endDate, template.service_template_id);
    }
    
    return res.status(201).json(template);
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating service template:', error);
    return res.status(500).json({ message: 'Error creating service template' });
  }
};

/**
 * Update a service template
 */
export const updateServiceTemplate = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { name, startTime, endTime, isRepeating, repeatingDaysBitmask, regenerateInstances } = req.body;
    
    // Find template
    const template = await ServiceTemplate.findOne({
      where: {
        service_template_id: id,
        is_deleted: false
      },
      transaction
    });
    
    if (!template) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Service template not found' });
    }
    
    // Update fields if provided
    if (name) template.name = name;
    if (startTime) template.start_time = startTime;
    if (endTime) template.end_time = endTime;
    if (isRepeating !== undefined) template.is_repeating = isRepeating;
    if (repeatingDaysBitmask !== undefined) template.repeating_days_bitmask = repeatingDaysBitmask;
    
    await template.save({ transaction });
    await transaction.commit();
    
    // If regenerateInstances is true, regenerate service instances for the next 30 days
    if (regenerateInstances) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      
      // This will create new instances or update existing ones with the new times
      await generateServiceInstances(startDate, endDate, template.service_template_id);
    }
    
    return res.status(200).json(template);
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating service template:', error);
    return res.status(500).json({ message: 'Error updating service template' });
  }
};

/**
 * Soft delete a service template
 */
export const deleteServiceTemplate = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    // Find template
    const template = await ServiceTemplate.findOne({
      where: {
        service_template_id: id,
        is_deleted: false
      },
      transaction
    });
    
    if (!template) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Service template not found' });
    }
    
    // Soft delete
    template.is_deleted = true;
    await template.save({ transaction });
    
    await transaction.commit();
    
    return res.status(200).json({ message: 'Service template deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting service template:', error);
    return res.status(500).json({ message: 'Error deleting service template' });
  }
};

/**
 * Generate service instances from a template for a date range
 */
export const generateInstances = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    if (end < start) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }
    
    // Find template to ensure it exists
    const template = await ServiceTemplate.findOne({
      where: {
        service_template_id: id,
        is_deleted: false
      }
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Service template not found' });
    }
    
    // Generate instances
    const count = await generateServiceInstances(start, end, id);
    
    return res.status(200).json({ 
      message: `${count} service instances generated successfully`,
      template
    });
  } catch (error) {
    console.error('Error generating service instances:', error);
    return res.status(500).json({ message: 'Error generating service instances' });
  }
};