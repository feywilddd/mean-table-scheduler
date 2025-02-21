import { User } from '../models/index.js';
import bcrypt from 'bcrypt';

// Get all users (excluding deleted ones)
export const getUsers = async (req, res) => {
    try {
        const users = await User.findAll({ where: { is_deleted: false } });
        res.json(users);
    } catch (err) {
        console.error("Error fetching users:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// Create a new user
export const createUser = async (req, res) => {
    const { name, email, password, user_role } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email,
            password_hash: hashedPassword,
            user_role
        });

        res.status(201).json({ message: "User created", user });
    } catch (err) {
        console.error("Error creating user:", err.message);
        res.status(500).json({ error: err.message });
    }
};
