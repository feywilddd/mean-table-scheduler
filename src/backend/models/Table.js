// models/tableModel.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import Restaurant from './Restaurant.js';

const Table = sequelize.define('tables', {
  table_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  table_restaurant_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'restaurants',
      key: 'restaurant_id'
    },
    onDelete: 'CASCADE'
  },
  number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  seats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true
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
  timestamps: false, // We'll handle timestamps manually
  indexes: [
    {
      unique: true,
      fields: ['table_restaurant_id', 'number'],
      where: {
        is_deleted: false
      }
    }
  ]
});

// Define association with Restaurant
Table.belongsTo(Restaurant, {
  foreignKey: 'table_restaurant_id',
  as: 'restaurant'
});

Restaurant.hasMany(Table, {
  foreignKey: 'table_restaurant_id',
  as: 'tables'
});

export default Table;