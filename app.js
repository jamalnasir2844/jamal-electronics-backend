const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Firebase Admin
const initializeFirebaseAdmin = require('./config/firebaseAdmin');
initializeFirebaseAdmin();

// Initialize Cloudinary
const { connectCloudinary } = require('./config/cloudinary');
connectCloudinary();

const app = express();

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/purchases', require('./routes/purchaseRoutes'));
app.use('/api/sales', require('./routes/saleRoutes'));
app.use('/api/withdrawals', require('./routes/withdrawalRoutes'));
app.use('/api/deposits', require('./routes/depositRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Jamal Electronics API is running.' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// Centralized error handler
app.use(require('./middleware/errorMiddleware'));

module.exports = app;
