// ====================================
// 🌍 ENVIRONMENT CONSTANTS
// ====================================

import dotenv from 'dotenv';

// Load environment variables from .env file first
dotenv.config();

export const ENV = {
    // Server Configuration
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 3002,

    // Database Configuration
    MONGODB_URI: process.env.MONGODB_URI || `mongodb+srv://${process.env.MONGO_DB_USER}:${process.env.MONGO_DB_PASSWORD}@${process.env.MONGO_CLUSTER}/${process.env.MONGO_DATABASE}?retryWrites=true&w=majority`,
    MONGO_DB_USER: process.env.MONGO_DB_USER,
    MONGO_DB_PASSWORD: process.env.MONGO_DB_PASSWORD,
    MONGO_CLUSTER: process.env.MONGO_CLUSTER,
    MONGO_DATABASE: process.env.MONGO_DATABASE,

    // API Configuration
    WEATHER_API_BASE_URL: process.env.WEATHER_API_BASE_URL || 'http://localhost:3000/',
    ALERTS_API_BASE_URL: process.env.ALERTS_API_BASE_URL || 'http://localhost:3001/',

    // JWT Configuration
    JWT: {
        SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
        EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
        SERVICE_EXPIRES_IN: process.env.JWT_SERVICE_EXPIRES_IN || '1h', // Shorter expiry for service tokens
    },

    // Service Configuration
    SERVICE: {
        NAME: process.env.SERVICE_NAME || 'alerts-trigger',
        VERSION: process.env.SERVICE_VERSION || '1.0.0',
        ENVIRONMENT: process.env.SERVICE_ENVIRONMENT || process.env.NODE_ENV || 'development',
    },

    // Cron Configuration
    CRON_JOB_INTERVAL: process.env.CRON_JOB_INTERVAL || '*/10 * * * *', // Every 10 minutes by default
} as const;