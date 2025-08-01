// ====================================
// 🔧 EXPRESS MIDDLEWARE SETUP
// ====================================

import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { Logging } from '../utils/logging';
import { ENV } from '../config/constants';

// ====================================
// 🛡️ SECURITY MIDDLEWARE
// ====================================

const setupSecurityMiddleware = (app: Application): void => {
    // Essential security headers with Helmet
    app.use(helmet({
        contentSecurityPolicy: false, // Disable for API - can be enabled later if needed
        crossOriginEmbedderPolicy: false, // Disable for API compatibility
    }));

    // CORS configuration
    const corsOptions = {
        origin: ENV.NODE_ENV === 'production' 
            ? ['https://your-frontend-domain.com'] // Add your production domains
            : true, // Allow all origins in development
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Origin',
            'X-Requested-With',
            'Content-Type',
            'Accept',
            'Authorization',
            'X-Request-Id',
        ],
        optionsSuccessStatus: 200,
    };

    app.use(cors(corsOptions));

    // Remove server information disclosure
    app.use((req, res, next) => {
        res.removeHeader('X-Powered-By');
        res.setHeader('X-API-Version', '1.0.0');
        next();
    });

    Logging.startup('🛡️ Security middleware configured');
};

// ====================================
// 📝 REQUEST LOGGING MIDDLEWARE
// ====================================

const setupRequestLogging = (app: Application): void => {
    app.use((req, res, next) => {
        const startTime = Date.now();

        Logging.http(`📥 ${req.method} ${req.url}`, {
            method: req.method,
            url: req.url,
            ip: req.socket.remoteAddress,
            userAgent: req.get('User-Agent'),
            contentType: req.get('Content-Type')
        });

        res.on('finish', () => {
            const responseTime = Date.now() - startTime;
            Logging.request(req.method, req.url, res.statusCode, responseTime, req.socket.remoteAddress);
        });

        next();
    });

    Logging.startup('📝 Request logging middleware configured');
};

// ====================================
// 📦 BODY PARSING MIDDLEWARE
// ====================================

const setupBodyParsing = (app: Application): void => {
    // Apply body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    // Removed detailed startup log
};

// ====================================
// 🚀 MAIN MIDDLEWARE SETUP FUNCTION
// ====================================

/**
 * Configure all Express middleware in the correct order
 * @param app - Express application instance
 */
export const setupMiddleware = (app: Application): void => {
    Logging.info('🔧 Setting up Express middleware...');

    // Order matters! Security first, then logging, then body parsing
    setupSecurityMiddleware(app);
    setupRequestLogging(app);
    setupBodyParsing(app);

    Logging.info('✅ All middleware configured successfully');
};