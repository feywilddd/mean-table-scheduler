import { Op } from 'sequelize';
import ServiceTemplate from '../models/ServiceTemplate.js';
import ServiceInstance from '../models/ServiceInstance.js';

/**
 * Generate service instances from templates for a specified date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {UUID} [templateId] - Optional template ID (if not provided, all templates are processed)
 * @returns {Promise<number>} - Number of instances created
 */
export const generateServiceInstances = async (startDate, endDate, templateId = null) => {
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (startDateObj > endDateObj) {
        throw new Error('Start date must be before end date');
    }

    // Query templates
    const whereClause = { is_deleted: false };
    if (templateId) {
        whereClause.service_template_id = templateId;
    }
    
    const templates = await ServiceTemplate.findAll({
        where: whereClause
    });

    let instancesCreated = 0;
    
    // For each template
    for (const template of templates) {
        let currentDate = new Date(startDateObj);
        
        // For each day in the range
        while (currentDate <= endDateObj) {
            // Check if this day matches the template's repeating pattern
            const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ...
            
            // Convert day of week to bitmask position
            let bitmaskPosition;
            if (dayOfWeek === 0) {
                bitmaskPosition = 6; // Sunday is bit 6 (64)
            } else {
                bitmaskPosition = dayOfWeek - 1; // Monday is bit 0 (1), etc.
            }
            
            const dayBitmask = 1 << bitmaskPosition;
            
            // Check if service runs on this day (all days for non-repeating, or matching days for repeating)
            if (!template.is_repeating || (template.repeating_days_bitmask & dayBitmask)) {
                try {
                    // Format the date as YYYY-MM-DD for DATEONLY field
                    const formattedDate = currentDate.toISOString().split('T')[0];
                    
                    // Create service instance
                    await ServiceInstance.findOrCreate({
                        where: {
                            service_template_id: template.service_template_id,
                            service_date: formattedDate
                        },
                        defaults: {
                            start_time: template.start_time,
                            end_time: template.end_time,
                            is_deleted: false
                        }
                    });
                    
                    instancesCreated++;
                } catch (error) {
                    console.error(`Error creating instance for template ${template.service_template_id} on ${currentDate.toISOString()}: ${error.message}`);
                }
            }
            
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }
    
    return instancesCreated;
};

/**
 * Find available tables for a specific service instance
 * @param {UUID} serviceInstanceId - Service instance ID
 * @param {number} requiredSeats - Number of seats required
 * @returns {Promise<Array>} - Array of available tables
 */
export const findAvailableTables = async (serviceInstanceId, requiredSeats) => {
    // Import here to avoid circular dependency
    const Table = (await import('../models/Table.js')).default;
    const Reservation = (await import('../models/Reservation.js')).default;
    
    // Get the service instance
    const serviceInstance = await ServiceInstance.findByPk(serviceInstanceId, {
        where: { is_deleted: false }
    });
    
    if (!serviceInstance) {
        throw new Error('Service instance not found');
    }
    
    // Get all tables with enough seats
    const allTables = await Table.findAll({
        where: {
            is_deleted: false,
            seats: { [Op.gte]: requiredSeats }
        }
    });
    
    // Get already reserved tables for this service instance
    const reservedTables = await Reservation.findAll({
        where: {
            reservation_service_instance_id: serviceInstanceId
        },
        attributes: ['reservation_table_id']
    });
    
    const reservedTableIds = reservedTables.map(r => r.reservation_table_id);
    
    // Filter out reserved tables
    const availableTables = allTables.filter(table => 
        !reservedTableIds.includes(table.table_id)
    );
    
    return availableTables;
};

/**
 * Check if a specific date is a valid service day based on a template
 * @param {UUID} templateId - Template ID
 * @param {Date} date - Date to check
 * @returns {Promise<boolean>} - Whether the date is valid for the template
 */
export const isValidServiceDay = async (templateId, date) => {
    const template = await ServiceTemplate.findByPk(templateId, {
        where: { is_deleted: false }
    });
    
    if (!template) {
        throw new Error('Service template not found');
    }
    
    if (!template.is_repeating) {
        return true; // Non-repeating templates can be used on any day
    }
    
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...
    
    // Convert day of week to bitmask position
    let bitmaskPosition;
    if (dayOfWeek === 0) {
        bitmaskPosition = 6; // Sunday is bit 6 (64)
    } else {
        bitmaskPosition = dayOfWeek - 1; // Monday is bit 0 (1), etc.
    }
    
    const dayBitmask = 1 << bitmaskPosition;
    
    // Check if the template's bitmask includes this day
    return (template.repeating_days_bitmask & dayBitmask) > 0;
};