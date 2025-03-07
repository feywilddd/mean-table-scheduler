// controllers/tableController.js
import tableService from '../services/tableService.js';

/**
 * @route   GET /api/tables
 * @desc    Get all tables with restaurant info
 * @access  Admin
 */
export const getAllTables = async (req, res) => {
  try {
    const tables = await tableService.getAllTables();
    return res.status(200).json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération des tables' });
  }
};

/**
 * @route   GET /api/tables/restaurant/:restaurantId
 * @desc    Get tables for a specific restaurant
 * @access  Admin
 */
export const getTablesByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const tables = await tableService.getTablesByRestaurant(restaurantId);
    return res.status(200).json(tables);
  } catch (error) {
    console.error('Error fetching restaurant tables:', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération des tables du restaurant' });
  }
};

/**
 * @route   GET /api/tables/:tableId
 * @desc    Get a single table by ID
 * @access  Admin
 */
export const getTableById = async (req, res) => {
  try {
    const { tableId } = req.params;
    const table = await tableService.getTableById(tableId);
    
    if (!table) {
      return res.status(404).json({ message: 'Table non trouvée' });
    }
    
    return res.status(200).json(table);
  } catch (error) {
    console.error('Error fetching table:', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération de la table' });
  }
};

/**
 * @route   POST /api/tables
 * @desc    Create a new table
 * @access  Admin
 */
export const createTable = async (req, res) => {
  try {
    const { table_restaurant_id, number, seats } = req.body;
    
    // Validate input
    if (!table_restaurant_id || !number || !seats) {
      return res.status(400).json({ message: 'L\'ID du restaurant, le numéro de table et le nombre de places sont requis' });
    }
    
    // Check if number and seats are positive integers
    if (number <= 0 || seats <= 0) {
      return res.status(400).json({ message: 'Le numéro de table et le nombre de places doivent être des nombres entiers positifs' });
    }
    
    const newTable = await tableService.createTable({
      table_restaurant_id,
      number: parseInt(number, 10),
      seats: parseInt(seats, 10)
    });
    
    return res.status(201).json(newTable);
  } catch (error) {
    console.error('Error creating table:', error);
    
    if (error.message === 'Restaurant not found') {
      return res.status(404).json({ message: 'Restaurant non trouvé' });
    }
    
    if (error.message === 'Table number already exists for this restaurant') {
      return res.status(409).json({ message: 'Ce numéro de table existe déjà pour ce restaurant' });
    }
    
    return res.status(500).json({ message: 'Erreur lors de la création de la table' });
  }
};

/**
 * @route   PUT /api/tables/:tableId
 * @desc    Update a table
 * @access  Admin
 */
export const updateTable = async (req, res) => {
  try {
    const { tableId } = req.params;
    const { table_restaurant_id, number, seats } = req.body;
    
    // Validate input
    if (!table_restaurant_id || !number || !seats) {
      return res.status(400).json({ message: 'L\'ID du restaurant, le numéro de table et le nombre de places sont requis' });
    }
    
    // Check if number and seats are positive integers
    if (number <= 0 || seats <= 0) {
      return res.status(400).json({ message: 'Le numéro de table et le nombre de places doivent être des nombres entiers positifs' });
    }
    
    const updatedTable = await tableService.updateTable(tableId, {
      table_restaurant_id,
      number: parseInt(number, 10),
      seats: parseInt(seats, 10)
    });
    
    return res.status(200).json(updatedTable);
  } catch (error) {
    console.error('Error updating table:', error);
    
    if (error.message === 'Table not found') {
      return res.status(404).json({ message: 'Table non trouvée' });
    }
    
    if (error.message === 'Restaurant not found') {
      return res.status(404).json({ message: 'Restaurant non trouvé' });
    }
    
    if (error.message === 'Table number already exists for this restaurant') {
      return res.status(409).json({ message: 'Ce numéro de table existe déjà pour ce restaurant' });
    }
    
    return res.status(500).json({ message: 'Erreur lors de la mise à jour de la table' });
  }
};

/**
 * @route   DELETE /api/tables/:tableId
 * @desc    Soft delete a table
 * @access  Admin
 */
export const deleteTable = async (req, res) => {
  try {
    const { tableId } = req.params;
    const result = await tableService.deleteTable(tableId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error deleting table:', error);
    
    if (error.message === 'Table not found') {
      return res.status(404).json({ message: 'Table non trouvée' });
    }
    
    return res.status(500).json({ message: 'Erreur lors de la suppression de la table' });
  }
};

/**
 * @route   POST /api/tables/:tableId/restore
 * @desc    Restore a soft-deleted table
 * @access  Admin
 */
export const restoreTable = async (req, res) => {
  try {
    const { tableId } = req.params;
    const restoredTable = await tableService.restoreTable(tableId);
    return res.status(200).json(restoredTable);
  } catch (error) {
    console.error('Error restoring table:', error);
    
    if (error.message === 'Deleted table not found') {
      return res.status(404).json({ message: 'Table supprimée non trouvée' });
    }
    
    if (error.message.includes('Cannot restore table')) {
      return res.status(409).json({ message: 'Impossible de restaurer la table: un conflit existe' });
    }
    
    return res.status(500).json({ message: 'Erreur lors de la restauration de la table' });
  }
};

/**
 * @route   GET /api/tables/deleted/all
 * @desc    Get all soft-deleted tables
 * @access  Admin
 */
export const getDeletedTables = async (req, res) => {
  try {
    const tables = await tableService.getDeletedTables();
    return res.status(200).json(tables);
  } catch (error) {
    console.error('Error fetching deleted tables:', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération des tables supprimées' });
  }
};