import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ServiceTemplate = sequelize.define('ServiceTemplate', {
    service_template_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    start_time: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    end_time: {
        type: DataTypes.TIME,
        allowNull: false,
        validate: {
            isAfterStartTime(value) {
                // Create dummy dates with the same day but with our times
                const today = new Date().toDateString();
                const startTime = new Date(`${today} ${this.start_time}`);
                const endTime = new Date(`${today} ${value}`);
                
                if (endTime <= startTime) {
                    throw new Error('End time must be after start time');
                }
                
                // Check if duration is less than or equal to 4 hours
                const durationHours = (endTime - startTime) / (1000 * 60 * 60);
                
                if (durationHours > 4) {
                    throw new Error('Service duration cannot exceed 4 hours');
                }
            }
        }
    },
    is_repeating: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    repeating_days_bitmask: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
            min: 0,
            max: 127
        }
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    timestamps: false,
    tableName: 'service_templates',
});

export default ServiceTemplate;