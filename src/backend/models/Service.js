import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Service = sequelize.define('Service', {
    service_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    start_time: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    end_time: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
            isAfterStartTime(value) {
                if (new Date(value) <= new Date(this.start_time)) {
                    throw new Error('End time must be after start time');
                }
                
                // Check if duration is less than or equal to 4 hours
                const startTime = new Date(this.start_time);
                const endTime = new Date(value);
                const durationHours = (endTime - startTime) / (1000 * 60 * 60);
                
                if (durationHours > 4) {
                    throw new Error('Service duration cannot exceed 4 hours');
                }
            }
        }
    },
    is_repeting: {
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
    tableName: 'services',
});

export default Service;