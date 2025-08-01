import mongoose from 'mongoose';
import { Logging } from '../utils/logging';
import { ENV } from './constants';

/**
 * 🗄️ Global Database Configuration
 * Simple functional approach with global database access
 */

// Connection state
let isConnected = false;

/**
 * Global database instance - available after connection
 * Import this in other services to use the connected database
 */
export const DB = mongoose;

/**
 * Global connection instance for direct access
 */
export const connection = mongoose.connection;

/**
 * Connect to MongoDB database and make it globally available
 */
export const connectDB = async (): Promise<void> => {
    if (isConnected) {
        Logging.info('Database already connected');
        return;
    }

    try {
        Logging.info('🔌 Connecting to MongoDB...', {
            uri: ENV.MONGODB_URI,
            environment: ENV.NODE_ENV
        });

        await DB.connect(ENV.MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferCommands: false,
            autoIndex: ENV.NODE_ENV === 'development',
            autoCreate: ENV.NODE_ENV === 'development',
        });

        isConnected = true;

        // Connection event listeners
        connection.on('connected', () => {
            Logging.info('✅ MongoDB connected successfully - Database globally available');
        });

        connection.on('error', (err) => {
            Logging.error('❌ MongoDB connection error', { error: err.message });
            isConnected = false;
        });

        connection.on('disconnected', () => {
            Logging.warn('⚠️ MongoDB disconnected');
            isConnected = false;
        });

        connection.on('reconnected', () => {
            Logging.info('🔄 MongoDB reconnected');
            isConnected = true;
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await disconnectDB();
            process.exit(0);
        });

        Logging.info('✅ Database connection established - Global DB instance ready');

    } catch (error) {
        Logging.error('💥 Database connection failed', {
            error: error.message,
            uri: ENV.MONGODB_URI
        });
        throw error;
    }
};

/**
 * Disconnect from MongoDB database
 */
export const disconnectDB = async (): Promise<void> => {
    if (connection && isConnected) {
        try {
            await DB.disconnect();
            isConnected = false;
            Logging.info('✅ Database disconnected successfully');
        } catch (error) {
            Logging.error('❌ Error disconnecting from database', { error: error.message });
            throw error;
        }
    }
};

/**
 * Get database connection status
 */
export const getConnectionStatus = () => {
    if (!connection) {
        return {
            connected: false,
            readyState: 0,
            host: 'not connected',
            name: 'not connected'
        };
    }

    return {
        connected: isConnected,
        readyState: connection.readyState,
        host: connection.host || 'unknown',
        name: connection.name || 'unknown'
    };
};

/**
 * Check if database connection is active
 */
export const isConnectionActive = (): boolean => {
    return isConnected && connection?.readyState === 1;
};

/**
 * Database utilities object (for convenience)
 */
export const db = {
    connect: connectDB,
    disconnect: disconnectDB,
    getStatus: getConnectionStatus,
    isActive: isConnectionActive,
    connection,
    // Global database instance
    DB,
} as const;

// Legacy export for compatibility
export const database = DB; 