// models/restaurantModel.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Restaurant = sequelize.define('restaurants', {
  restaurant_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      is: /^\+?[0-9\s-\(\)]{8,20}$/
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false // We'll handle timestamps manually
});

export default Restaurant;