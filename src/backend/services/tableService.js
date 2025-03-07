// services/tableService.js
import { sequelize } from '../config/database.js';
import Table from '../models/Table.js';
import Restaurant from '../models/Restaurant.js';
import { Op } from 'sequelize';

const tableService = {
  /**
   * Get all active tables with restaurant info
   */
  getAllTables: async () => {
    try {
      return await Table.findAll({
        where: { is_deleted: false },
        include: [
          {
            model: Restaurant,
            as: 'restaurant',
            attributes: ['restaurant_id', 'name']
          }
        ],
        order: [
          [sequelize.col('restaurant.name'), 'ASC'],
          ['number', 'ASC']
        ]
      });
    } catch (error) {
      console.error('Error fetching tables:', error);
      throw error;
    }
  },

  /**
   * Get tables for a specific restaurant
   */
  getTablesByRestaurant: async (restaurantId) => {
    try {
      return await Table.findAll({
        where: { 
          table_restaurant_id: restaurantId,
          is_deleted: false 
        },
        order: [['number', 'ASC']]
      });
    } catch (error) {
      console.error('Error fetching restaurant tables:', error);
      throw error;
    }
  },

  /**
   * Get a single table by ID
   */
  getTableById: async (tableId) => {
    try {
      return await Table.findOne({
        where: { 
          table_id: tableId,
          is_deleted: false 
        },
        include: [
          {
            model: Restaurant,
            as: 'restaurant',
            attributes: ['restaurant_id', 'name']
          }
        ]
      });
    } catch (error) {
      console.error('Error fetching table:', error);
      throw error;
    }
  },

  /**
   * Create a new table
   */
  createTable: async (tableData) => {
    let transaction;
    
    try {
      // Start transaction
      transaction = await sequelize.transaction();
      
      // Check if restaurant exists
      const restaurant = await Restaurant.findByPk(tableData.table_restaurant_id, { transaction });
      
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }
      
      // Check if table number already exists for this restaurant
      const existingTable = await Table.findOne({
        where: {
          table_restaurant_id: tableData.table_restaurant_id,
          number: tableData.number,
          is_deleted: false
        },
        transaction
      });
      
      if (existingTable) {
        throw new Error('Table number already exists for this restaurant');
      }
      
      // Create the table
      const newTable = await Table.create({
        ...tableData,
        created_at: new Date(),
        updated_at: new Date()
      }, { transaction });
      
      // Commit transaction
      await transaction.commit();
      
      return newTable;
    } catch (error) {
      // Rollback transaction if active and not already rolled back
      if (transaction) await transaction.rollback().catch(() => {});
      
      console.error('Error creating table:', error);
      throw error;
    }
  },

  /**
   * Update a table
   */
  updateTable: async (tableId, tableData) => {
    let transaction;
    
    try {
      // Start transaction
      transaction = await sequelize.transaction();
      
      // Check if table exists
      const table = await Table.findOne({
        where: { table_id: tableId, is_deleted: false },
        transaction
      });
      
      if (!table) {
        throw new Error('Table not found');
      }
      
      // Check if restaurant exists
      const restaurant = await Restaurant.findByPk(tableData.table_restaurant_id, { transaction });
      
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }
      
      // Check if new table number already exists for this restaurant (excluding current table)
      const existingTable = await Table.findOne({
        where: {
          table_restaurant_id: tableData.table_restaurant_id,
          number: tableData.number,
          table_id: { [Op.ne]: tableId },
          is_deleted: false
        },
        transaction
      });
      
      if (existingTable) {
        throw new Error('Table number already exists for this restaurant');
      }
      
      // Update the table
      await table.update({
        ...tableData,
        updated_at: new Date()
      }, { transaction });
      
      // Reload the updated table
      await table.reload({ transaction });
      
      // Commit transaction
      await transaction.commit();
      
      return table;
    } catch (error) {
      // Rollback transaction if active and not already rolled back
      if (transaction) await transaction.rollback().catch(() => {});
      
      console.error('Error updating table:', error);
      throw error;
    }
  },

  /**
   * Soft delete a table
   */
  deleteTable: async (tableId) => {
    let transaction;
    
    try {
      // Start transaction
      transaction = await sequelize.transaction();
      
      const table = await Table.findOne({
        where: { table_id: tableId, is_deleted: false },
        transaction
      });
      
      if (!table) {
        throw new Error('Table not found');
      }
      
      // Soft delete the table
      await table.update({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date()
      }, { transaction });
      
      // Commit transaction
      await transaction.commit();
      
      return { message: 'Table deleted successfully' };
    } catch (error) {
      // Rollback transaction if active and not already rolled back
      if (transaction) await transaction.rollback().catch(() => {});
      
      console.error('Error deleting table:', error);
      throw error;
    }
  },

  /**
   * Restore a soft-deleted table
   */
  restoreTable: async (tableId) => {
    let transaction;
    
    try {
      // Start transaction
      transaction = await sequelize.transaction();
      
      const table = await Table.findOne({
        where: { table_id: tableId, is_deleted: true },
        transaction
      });
      
      if (!table) {
        throw new Error('Deleted table not found');
      }
      
      // Check if a table with the same number now exists for this restaurant
      const existingTable = await Table.findOne({
        where: {
          table_restaurant_id: table.table_restaurant_id,
          number: table.number,
          table_id: { [Op.ne]: tableId },
          is_deleted: false
        },
        transaction
      });
      
      if (existingTable) {
        throw new Error('Cannot restore table. A table with this number already exists for this restaurant.');
      }
      
      // Restore the table
      await table.update({
        is_deleted: false,
        deleted_at: null,
        updated_at: new Date()
      }, { transaction });
      
      // Reload the updated table
      await table.reload({ transaction });
      
      // Commit transaction
      await transaction.commit();
      
      return table;
    } catch (error) {
      // Rollback transaction if active and not already rolled back
      if (transaction) await transaction.rollback().catch(() => {});
      
      console.error('Error restoring table:', error);
      throw error;
    }
  },

  /**
   * Get all soft-deleted tables
   */
  getDeletedTables: async () => {
    try {
      return await Table.findAll({
        where: { is_deleted: true },
        include: [
          {
            model: Restaurant,
            as: 'restaurant',
            attributes: ['restaurant_id', 'name']
          }
        ],
        order: [['deleted_at', 'DESC']]
      });
    } catch (error) {
      console.error('Error fetching deleted tables:', error);
      throw error;
    }
  }
};

export default tableService;