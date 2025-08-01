// ====================================
// 🚀 MAIN SERVER APPLICATION
// ====================================

import express from 'express';
import { Logging } from './utils/logging';

// ====================================
// 📦 IMPORT SETUP MODULES
// ====================================

import { connectDB } from './config/database';
import { setupMiddleware } from './server/setupMiddleware';
import { setupRoutes } from './server/setupRoutes';
import { setupErrorHandling } from './server/setupErrorHandling';
import { startHttpServer } from './server/setupHttpServer';

// ====================================
// 🎯 MAIN SERVER INITIALIZATION
// ====================================

const StartServer = async (): Promise<void> => {
    try {
        Logging.info('🚀 Starting server initialization...');

        // Step 1: Initialize database connection (makes global DB const available)
        Logging.info('📚 Initializing database connection...');
        await connectDB();
        Logging.info('✅ Database connected - Global DB instance ready for services');

        // Step 2: Create Express application
        const app = express();

        // Step 3: Setup middleware (Security, CORS, Body parsing, etc.)
        setupMiddleware(app);

        // Step 4: Setup routes (API, Health checks, Root)
        setupRoutes(app);

        // Step 5: Setup error handling (404, Global errors, Process errors)
        setupErrorHandling(app);

        // Step 6: Start HTTP server
        startHttpServer(app);

        Logging.info('🎉 Server initialization completed successfully');

    } catch (error) {
        Logging.error('💥 Failed to start server', { 
            error: error.message,
            stack: error.stack 
        });
        process.exit(1);
    }
};

// ====================================
// 🚀 APPLICATION ENTRY POINT
// ====================================

// Start the server
StartServer();
