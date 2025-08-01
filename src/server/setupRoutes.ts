// ====================================
// 🛣️ EXPRESS ROUTES SETUP
// ====================================

import { Application } from 'express';
import mongoose from 'mongoose';
import { Logging } from '../utils/logging';
import { ENV } from '../config/constants';
import { router as routes } from '../routes/v1/index.route';


export const setupApiRoutes = (app: Application): void => {
    // Configure API routes
    app.use('/api/v1', routes);
    // Removed detailed startup log
};

// ====================================
// ❤️ HEALTH CHECK ROUTES
// ====================================

export const setupHealthCheck = (app: Application): void => {
    // Health check endpoint
    app.get('/health', async (req, res) => {
        try {
            // Check database connection
            await mongoose.connection.db.admin().ping();
            
            const healthStatus = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: ENV.NODE_ENV,
                database: 'connected',
                memory: {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
                }
            };
            
            res.status(200).json(healthStatus);
        } catch (error) {
            res.status(503).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: 'Database connection failed'
            });
        }
    });
    // Removed detailed startup log
};

// ====================================
// 🏠 ROOT ROUTE
// ====================================

export const setupRootRoute = (app: Application): void => {
    // Root endpoint
    app.get('/', (req, res) => {
        res.json({
            message: 'Tomorrow.io Weather API',
            version: '1.0.0',
            environment: ENV.NODE_ENV,
            timestamp: new Date().toISOString(),
            endpoints: {
                health: '/health',
                api: '/api/v1',
                docs: '/api/v1/docs'
            }
        });
    });
    // Removed detailed startup log
};

// ====================================
// 🚀 MAIN ROUTES SETUP FUNCTION
// ====================================

/**
 * Configure all Express routes
 */
export const setupRoutes = (app: Application): void => {
    // Removed introductory log message
    
    setupApiRoutes(app);
    setupHealthCheck(app);
    setupRootRoute(app);
    
    Logging.info('✅ All routes configured successfully');
};