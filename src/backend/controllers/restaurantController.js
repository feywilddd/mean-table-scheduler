// controllers/restaurantController.js
import restaurantService from '../services/restaurantService.js';

/**
 * @route   GET /api/restaurants
 * @desc    Get all restaurants
 * @access  Admin
 */
export const getAllRestaurants = async (req, res) => {
  try {
    const restaurants = await restaurantService.getAllRestaurants();
    return res.status(200).json(restaurants);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return res.status(500).json({ message: 'Error fetching restaurants' });
  }
};

/**
 * @route   GET /api/restaurants/:restaurantId
 * @desc    Get a single restaurant by ID
 * @access  Admin
 */
export const getRestaurantById = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const restaurant = await restaurantService.getRestaurantById(restaurantId);
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    return res.status(200).json(restaurant);
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    return res.status(500).json({ message: 'Error fetching restaurant' });
  }
};

/**
 * @route   POST /api/restaurants
 * @desc    Create a new restaurant
 * @access  Admin
 */
export const createRestaurant = async (req, res) => {
  try {
    const { name, address, phone } = req.body;
    
    // Validate input
    if (!name || !address || !phone) {
      return res.status(400).json({ message: 'Name, address, and phone are required' });
    }
    
    // Validate phone format
    const phoneRegex = /^\+?[0-9\s-\(\)]{8,20}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }
    
    const newRestaurant = await restaurantService.createRestaurant({
      name,
      address,
      phone
    });
    
    return res.status(201).json(newRestaurant);
  } catch (error) {
    console.error('Error creating restaurant:', error);
    return res.status(500).json({ message: 'Error creating restaurant' });
  }
};

/**
 * @route   PUT /api/restaurants/:restaurantId
 * @desc    Update a restaurant
 * @access  Admin
 */
export const updateRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { name, address, phone } = req.body;
    
    // Validate input
    if (!name && !address && !phone) {
      return res.status(400).json({ message: 'At least one field is required for update' });
    }
    
    // Validate phone format if provided
    if (phone) {
      const phoneRegex = /^\+?[0-9\s-\(\)]{8,20}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ message: 'Invalid phone number format' });
      }
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (address) updateData.address = address;
    if (phone) updateData.phone = phone;
    
    const updatedRestaurant = await restaurantService.updateRestaurant(restaurantId, updateData);
    
    return res.status(200).json(updatedRestaurant);
  } catch (error) {
    console.error('Error updating restaurant:', error);
    
    if (error.message === 'Restaurant not found') {
      return res.status(404).json({ message: error.message });
    }
    
    return res.status(500).json({ message: 'Error updating restaurant' });
  }
};

/**
 * @route   DELETE /api/restaurants/:restaurantId
 * @desc    Delete a restaurant
 * @access  Admin
 */
export const deleteRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const result = await restaurantService.deleteRestaurant(restaurantId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    
    if (error.message === 'Restaurant not found') {
      return res.status(404).json({ message: error.message });
    }
    
    if (error.message === 'Cannot delete restaurant with associated tables') {
      return res.status(400).json({ message: error.message });
    }
    
    return res.status(500).json({ message: 'Error deleting restaurant' });
  }
};