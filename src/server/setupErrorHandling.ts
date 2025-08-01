// ====================================
// ⚠️ EXPRESS ERROR HANDLING SETUP
// ====================================

import { Application, Request, Response, NextFunction } from 'express';
import { Logging } from '../utils/logging';
import HttpError from '../utils/httpError';
import { ENV } from '../config/constants';

// ====================================
// 🔍 404 NOT FOUND HANDLER
// ====================================

export const setup404Handler = (app: Application): void => {
    app.use('*', (req: Request, res: Response) => {
        res.status(404).json({
            success: false,
            message: 'Route not found',
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
        });
    });
};

// ====================================
// 💥 GLOBAL ERROR HANDLER
// ====================================

const setupGlobalErrorHandler = (app: Application): void => {
    app.use((error: any, req: Request, res: Response, next: NextFunction) => {
        if (error instanceof HttpError) {
            const { title, detail, code } = error.opts;
            
            // Enhanced logging for HttpError instances
            const logLevel = code >= 500 ? 'error' : 'warn';
            Logging[logLevel](`HTTP Error ${code}: ${title}`, {
                detail,
                path: req.path,
                method: req.method,
                userAgent: req.get('User-Agent'),
                ip: req.ip
            });

            return res.status(code).json({
                success: false,
                error: {
                    title,
                    detail,
                    code
                },
                timestamp: new Date().toISOString(),
                path: req.path
            });
        }

        // Handle other types of errors
        Logging.error('Unhandled error occurred', {
            message: error.message,
            stack: error.stack,
            path: req.path,
            method: req.method,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });

        const statusCode = error.statusCode || error.status || 500;
        const message = ENV.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : error.message || 'Something went wrong';

        res.status(statusCode).json({
            success: false,
            error: {
                title: 'Internal Server Error',
                detail: message,
                code: statusCode
            },
            timestamp: new Date().toISOString(),
            path: req.path
        });
    });
};

// ====================================
// 🚨 PROCESS ERROR HANDLERS
// ====================================

const setupProcessErrorHandlers = (): void => {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
        Logging.error('💥 Uncaught Exception - Server will exit', {
            error: error.message,
            stack: error.stack
        });
        
        process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
        Logging.error('💥 Unhandled Promise Rejection', {
            reason: reason?.message || reason,
            stack: reason?.stack,
            promise
        });
        
        // Optionally exit the process
        // process.exit(1);
    });

    // Handle SIGTERM gracefully
    process.on('SIGTERM', () => {
        Logging.info('🔄 SIGTERM received - Starting graceful shutdown...');
        process.exit(0);
    });

    // Handle SIGINT (Ctrl+C) gracefully  
    process.on('SIGINT', () => {
        Logging.info('🔄 SIGINT received - Starting graceful shutdown...');
        process.exit(0);
    });
};

/**
 * Configure all error handling for the Express application
 */
export const setupErrorHandling = (app: Application): void => {
    // Removed introductory log message
    
    setup404Handler(app);
    setupGlobalErrorHandler(app);
    setupProcessErrorHandlers();
    
    Logging.info('✅ All error handling configured successfully');
};
