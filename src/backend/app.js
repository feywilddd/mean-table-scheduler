import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import tableRoutes from './routes/tableRoutes.js';
import restaurantRoutes from './routes/restaurantRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/services', serviceRoutes);
export default app;
