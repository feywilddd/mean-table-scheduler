import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './userModel.js';
import Table from './Table.js';
import Service from './Service.js';

const Reservation = sequelize.define('Reservation', {
    reservation_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    reservation_user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'user_id'
        }
    },
    reservation_table_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Table,
            key: 'table_id'
        }
    },
    reservation_service_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Service,
            key: 'service_id'
        }
    },
    seats_taken: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1
        }
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
    tableName: 'reservations',
});

// Define relationships
Reservation.belongsTo(User, { foreignKey: 'reservation_user_id', as: 'user' });
User.hasMany(Reservation, { foreignKey: 'reservation_user_id', as: 'reservations' });

Reservation.belongsTo(Table, { foreignKey: 'reservation_table_id', as: 'table' });
Table.hasMany(Reservation, { foreignKey: 'reservation_table_id', as: 'reservations' });

Reservation.belongsTo(Service, { foreignKey: 'reservation_service_id', as: 'service' });
Service.hasMany(Reservation, { foreignKey: 'reservation_service_id', as: 'reservations' });

export default Reservation;