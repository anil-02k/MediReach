import express from 'express';
import cors from 'cors';
import db from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import medicineRoutes from './routes/medicineRoutes.js';
import donationRoutes from './routes/donationRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app = express();

// Middleware setup
app.use(cors({
    origin: '*',
    credentials: true
}));

// Body parsing middleware - these must come before routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, {
        body: req.body,
        headers: req.headers['content-type']
    });
    next();
});

// console.log(await db.execute('show databases;'));




app.use('/api/auth', authRoutes);
app.use('/api/medicine', medicineRoutes);
app.use('/api/donation', donationRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/test-db', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT 1 + 1 AS result');
        res.json({ 
            success: true, 
            message: 'Database connection successful',
            data: rows 
        });
    } catch (error) {
        res.json({ 
            success: false, 
            message: 'Database connection failed',
            error: error.message 
        });
    }
});


export default app;