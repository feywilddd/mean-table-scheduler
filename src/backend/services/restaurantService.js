// services/restaurantService.js
import { sequelize } from '../config/database.js';
import Restaurant from '../models/Restaurant.js';

const restaurantService = {
  /**
   * Get all restaurants
   */
  getAllRestaurants: async () => {
    try {
      return await Restaurant.findAll({
        order: [['name', 'ASC']]
      });
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      throw error;
    }
  },

  /**
   * Get a single restaurant by ID
   */
  getRestaurantById: async (restaurantId) => {
    try {
      return await Restaurant.findByPk(restaurantId);
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      throw error;
    }
  },

  /**
   * Create a new restaurant
   */
  createRestaurant: async (restaurantData) => {
    const t = await sequelize.transaction();
    
    try {
      // Create the restaurant
      const newRestaurant = await Restaurant.create({
        ...restaurantData,
        created_at: new Date(),
        updated_at: new Date()
      }, { transaction: t });
      
      await t.commit();
      return newRestaurant;
    } catch (error) {
      await t.rollback();
      console.error('Error creating restaurant:', error);
      throw error;
    }
  },

  /**
   * Update a restaurant
   */
  updateRestaurant: async (restaurantId, restaurantData) => {
    const t = await sequelize.transaction();
    
    try {
      // Check if restaurant exists
      const restaurant = await Restaurant.findByPk(restaurantId, { transaction: t });
      
      if (!restaurant) {
        await t.rollback();
        throw new Error('Restaurant not found');
      }
      
      // Update the restaurant
      await restaurant.update({
        ...restaurantData,
        updated_at: new Date()
      }, { transaction: t });
      
      // Reload the updated restaurant
      await restaurant.reload({ transaction: t });
      
      await t.commit();
      return restaurant;
    } catch (error) {
      await t.rollback();
      console.error('Error updating restaurant:', error);
      throw error;
    }
  },

  /**
   * Delete a restaurant
   */
  deleteRestaurant: async (restaurantId) => {
    const t = await sequelize.transaction();
    
    try {
      // Check if restaurant exists
      const restaurant = await Restaurant.findByPk(restaurantId, { transaction: t });
      
      if (!restaurant) {
        await t.rollback();
        throw new Error('Restaurant not found');
      }
      
      // Check if restaurant has associated tables
      const tableCount = await sequelize.query(
        'SELECT COUNT(*) as count FROM tables WHERE table_restaurant_id = :restaurantId AND is_deleted = FALSE',
        {
          replacements: { restaurantId },
          type: sequelize.QueryTypes.SELECT,
          transaction: t
        }
      );
      
      if (tableCount[0].count > 0) {
        await t.rollback();
        throw new Error('Cannot delete restaurant with associated tables');
      }
      
      // Delete the restaurant
      await restaurant.destroy({ transaction: t });
      
      await t.commit();
      return { message: 'Restaurant deleted successfully' };
    } catch (error) {
      await t.rollback();
      console.error('Error deleting restaurant:', error);
      throw error;
    }
  }
};

export default restaurantService;