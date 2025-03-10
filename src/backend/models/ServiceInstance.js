import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import ServiceTemplate from './ServiceTemplate.js';

const ServiceInstance = sequelize.define('ServiceInstance', {
    service_instance_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    service_template_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: ServiceTemplate,
            key: 'service_template_id'
        }
    },
    service_date: {
        type: DataTypes.DATEONLY,
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
            }
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
    tableName: 'service_instances',
    indexes: [
        {
            unique: true,
            fields: ['service_template_id', 'service_date']
        }
    ]
});

// Define relationships
ServiceInstance.belongsTo(ServiceTemplate, { foreignKey: 'service_template_id', as: 'template' });
ServiceTemplate.hasMany(ServiceInstance, { foreignKey: 'service_template_id', as: 'instances' });

export default ServiceInstance;