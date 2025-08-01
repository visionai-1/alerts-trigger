// ====================================
// 🚀 HTTP SERVER SETUP
// ====================================

import http from 'http';
import { Application } from 'express';
import { Logging } from '../utils/logging';
import { ENV } from '../config/constants';

// ====================================
// 🔧 SERVER STARTUP
// ====================================

const displayStartupUrls = (): void => {
    Logging.separator('DEVELOPMENT URLS');
    Logging.forceOutput(`🌐 Server: http://localhost:${ENV.PORT}`, 'green');
    Logging.forceOutput(`❤️ Health: http://localhost:${ENV.PORT}/health`, 'cyan');
    Logging.forceOutput(`🏓 Ping: http://localhost:${ENV.PORT}/ping`, 'yellow');
    Logging.forceOutput(`🔌 API: http://localhost:${ENV.PORT}/api/v1`, 'blue');
    Logging.separator();
};

// ====================================
// 🛑 GRACEFUL SHUTDOWN
// ====================================

const setupGracefulShutdown = (server: http.Server): void => {
    const gracefulShutdown = (signal: string) => {
        Logging.shutdown(`${signal} received, shutting down gracefully`);
        
        server.close(() => {
            Logging.shutdown('HTTP server closed');
            
            // Give some time for cleanup
            setTimeout(() => {
                Logging.shutdown('Process terminated gracefully');
                process.exit(0);
            }, 1000);
        });

        // Force shutdown after 10 seconds
        setTimeout(() => {
            Logging.error('⚠️ Forced shutdown after timeout');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    Logging.startup('🛑 Graceful shutdown handlers configured');
};

// ====================================
// 🚀 MAIN HTTP SERVER SETUP FUNCTION
// ====================================

/**
 * Start the HTTP server with proper configuration
 * @param app - Express application instance
 */
export const startHttpServer = (app: Application): void => {
    Logging.info('🚀 Starting HTTP server...');

    const server = http.createServer(app);

    const port = typeof ENV.PORT === 'string' ? parseInt(ENV.PORT, 10) : ENV.PORT;
    server.listen(port, () => {
        // Display startup banner
        Logging.banner('Alerts Trigger Service', '1.0.0', port);
        
        Logging.startup(`Server is running on port ${port}`, {
            port: port,
            environment: ENV.NODE_ENV,
            nodeVersion: process.version,
            processId: process.pid,
            uptime: process.uptime()
        });
    });

    // Handle server errors
    server.on('error', (error: any) => {
        if (error.syscall !== 'listen') {
            throw error;
        }

        const bind = typeof ENV.PORT === 'string' ? 'Pipe ' + ENV.PORT : 'Port ' + ENV.PORT;

        switch (error.code) {
            case 'EACCES':
                Logging.error(`💥 ${bind} requires elevated privileges`);
                process.exit(1);
                break;
            case 'EADDRINUSE':
                Logging.error(`💥 ${bind} is already in use`);
                process.exit(1);
                break;
            default:
                throw error;
        }
    });

    // Setup graceful shutdown
    setupGracefulShutdown(server);

    Logging.info('✅ HTTP server started successfully');
};

// ====================================
// 📤 INDIVIDUAL EXPORTS (for testing/debugging)
// ====================================

export {
    displayStartupUrls,
    setupGracefulShutdown,
}; 