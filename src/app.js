const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const errorHandler = require('./middleware/error.middleware');
const notFoundHandler = require('./middleware/notFound.middleware');

const userRoutes = require('./modules/user/user.routes');
const productRoutes = require('./modules/product/product.routes');
const orderRoutes = require('./modules/order/order.routes');

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors());

// Rate Limiting (Basic setup)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', apiLimiter);

// Parse JSON payload (with limit)
app.use(express.json({ limit: '10kb' }));

// Logging
if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// Handle unknown routes
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
