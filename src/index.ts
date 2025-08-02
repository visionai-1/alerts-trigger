// ====================================
// 🚀 ALERTS TRIGGER CRON SERVICE
// ====================================

import * as cron from 'node-cron';
import { Logging } from './utils/logging';
import { connectDB } from './config/database';
import { runEvaluationCycle, getServiceStats } from './services/AlertsTriggerService';
import { ENV } from './config/constants';

// ====================================
// 🎯 MAIN CRON SERVICE INITIALIZATION
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


const StartCronService = async (): Promise<void> => {
    try {
        Logging.info('🚀 Starting Alerts Trigger Cron Service...');

        // Step 1: Initialize database connection
        Logging.info('📚 Initializing database connection...');
        await connectDB();
        Logging.info('✅ Database connected successfully');

        // Step 2: Initial health check will be performed during first evaluation cycle
        Logging.info('⏭️ Skipping initial health check - will be performed during evaluation cycle');

        // Step 3: Setup cron job to run every 10 minutes
        Logging.info(`⏰ Setting up cron job to run every ${formatCronInterval(ENV.CRON_JOB_INTERVAL)}...`);
        
        cron.schedule(ENV.CRON_JOB_INTERVAL, async () => {
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
            scheduled: true,
            timezone: "UTC"
        });

        // Step 4: Run initial evaluation cycle immediately
        Logging.info('🔄 Running initial alert evaluation cycle...');
        try {
            await runEvaluationCycle();
            Logging.info('✅ Initial alert evaluation cycle completed');
        } catch (error) {
            Logging.error('💥 Initial alert evaluation cycle failed', {
                error: error.message
            });
        }

        Logging.info('🎉 Alerts Trigger Cron Service started successfully');
        Logging.info('📅 Service will evaluate alerts every 10 minutes');
        
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
        Logging.error('💥 Failed to start Alerts Trigger Cron Service', { 
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
    alertsApiUrl: ENV.ALERTS_API_BASE_URL,
    weatherApiUrl: ENV.WEATHER_API_BASE_URL
});

// Start the cron service
StartCronService();
