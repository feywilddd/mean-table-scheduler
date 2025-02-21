import sequelize from '../config/database.js';
import User from './userModel.js';

// Sync the database
const syncDB = async () => {
    try {
        await sequelize.authenticate();
        console.log("✅ Connected to PostgreSQL using Sequelize!");
        await sequelize.sync(); // Sync tables (alter instead of force to prevent data loss)
        console.log("✅ All models synchronized!");
    } catch (error) {
        console.error("❌ Database connection error:", error);
    }
};

export { sequelize, syncDB, User };
