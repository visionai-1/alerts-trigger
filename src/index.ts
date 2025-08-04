// ====================================
// 🚀 ALERTS TRIGGER WEB SERVER
// ====================================

import express, { Application } from 'express';
import * as cron from 'node-cron';
import { Logging } from './utils/logging';
import { connectDB } from './config/database';
import { runEvaluationCycle, getServiceStats } from './services/AlertsTriggerService';
import { setupMiddleware } from './server/setupMiddleware';
import { setupRoutes } from './server/setupRoutes';
import { setupErrorHandling } from './server/setupErrorHandling';
import { startHttpServer } from './server/setupHttpServer';
import { ENV } from './config/constants';

// ====================================
// 🎯 CRON UTILITY FUNCTIONS
// ====================================

export function formatCronInterval(cron: string): string {
    const [min, hour, dayOfMonth, month, dayOfWeek] = cron.trim().split(' ');

    const isEveryX = (val: string) => val.startsWith('*/') && !isNaN(Number(val.slice(2)));

    // Handle every X minutes
    if (isEveryX(min) && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        return `every ${min.slice(2)} minutes`;
    }

    // Handle every hour at specific minute
    if (!isNaN(Number(min)) && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        return `every hour at minute ${min}`;
    }

    // Handle daily at specific time
    if (!isNaN(Number(min)) && !isNaN(Number(hour)) && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        return `every day at ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }

    // Handle weekly at specific day and time
    if (!isNaN(Number(min)) && !isNaN(Number(hour)) && dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[parseInt(dayOfWeek, 10)] ?? `day ${dayOfWeek}`;
        return `every ${dayName} at ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }

    return `cron schedule: ${cron}`;
}

// ====================================
// 🔄 CRON JOB SETUP
// ====================================

const setupCronJob = (): void => {
    Logging.info(`⏰ Setting up cron job to run ${formatCronInterval(ENV.CRON_JOB_INTERVAL)}...`);

    // Create the cron job that will run every 10 minutes
    const cronJob = cron.schedule(ENV.CRON_JOB_INTERVAL, async () => {
        const timestamp = new Date().toISOString();
        Logging.info(`🕐 [${timestamp}] Cron job triggered - Starting alert evaluation cycle`);

        try {
            await runEvaluationCycle();
            Logging.info(`✅ [${timestamp}] Alert evaluation cycle completed successfully`);
        } catch (error) {
            Logging.error(`💥 [${timestamp}] Alert evaluation cycle failed`, {
                error: error.message,
                stack: error.stack
            });
        }
    }, {
        scheduled: true, // Don't start immediately, we'll start it manually
        timezone: "UTC"
    });

    // Start the cron job immediately
    cronJob.start();
    Logging.info('✅ Cron job started immediately and will continue every 10 minutes');
};

// ====================================
// 🚀 WEB SERVER SETUP
// ====================================

const createExpressApp = (): Application => {
    const app = express();

    // Setup middleware
    setupMiddleware(app);

    // Setup routes
    setupRoutes(app);

    // Setup error handling (must be last)
    setupErrorHandling(app);

    return app;
};

// ====================================
// 🎯 MAIN APPLICATION STARTUP
// ====================================

const StartWebServer = async (): Promise<void> => {
    try {
        Logging.info('🚀 Starting Alerts Trigger Web Server...');

        // Step 1: Initialize database connection
        Logging.info('📚 Initializing database connection...');
        await connectDB();
        Logging.info('✅ Database connected successfully');

        // Step 2: Create Express application
        Logging.info('🔧 Setting up Express application...');
        const app = createExpressApp();
        Logging.info('✅ Express application configured');

        // Step 3: Start HTTP server
        startHttpServer(app);

        // Step 4: Setup cron job (will run immediately and then every 10 minutes)

        const timestamp = new Date().toISOString();
        Logging.info(`🕐 [${timestamp}] Cron job triggered - Starting alert evaluation cycle`);

        try {
            await runEvaluationCycle();
            Logging.info(`✅ [${timestamp}] Alert evaluation cycle completed successfully`);
        } catch (error) {
            Logging.error(`💥 [${timestamp}] Alert evaluation cycle failed`, {
                error: error.message,
                stack: error.stack
            });
        }
        
        setupCronJob();

        Logging.info('🎉 Alerts Trigger Web Server started successfully');
        Logging.info('📅 Cron job is running and will evaluate alerts every 10 minutes');
        Logging.info('🌐 Web server is running and ready for deployment');

        // Keep the process alive
        process.on('SIGINT', () => {
            Logging.info('👋 Received SIGINT, shutting down gracefully...');
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            Logging.info('👋 Received SIGTERM, shutting down gracefully...');
            process.exit(0);
        });

    } catch (error) {
        Logging.error('💥 Failed to start Alerts Trigger Web Server', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
};

// ====================================
// 🚀 APPLICATION ENTRY POINT
// ====================================

// Log service information
Logging.info('🏷️ Service Information', {
    name: ENV.SERVICE.NAME,
    version: ENV.SERVICE.VERSION,
    environment: ENV.SERVICE.ENVIRONMENT,
    port: ENV.PORT,
    alertsApiUrl: ENV.ALERTS_API_BASE_URL,
    weatherApiUrl: ENV.WEATHER_API_BASE_URL
});

// Start the web server
StartWebServer();
