// ====================================
// 🛣️ API ROUTES V1
// ====================================

import { Router } from 'express';
import { Logging } from '../../utils/logging';
import { ENV } from '../../config/constants';
import { getServiceStats } from '../../services/AlertsTriggerService';

// ====================================
// 🔧 ROUTER SETUP
// ====================================

export const router = Router();

// ====================================
// 📊 SERVICE STATS ENDPOINT
// ====================================

router.get('/stats', async (req, res) => {
    try {
        const stats = await getServiceStats();
        res.status(200).json({
            success: true,
            data: stats,
            message: 'Service statistics retrieved successfully'
        });
    } catch (error) {
        Logging.error('Failed to get service stats', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve service statistics',
            message: error.message
        });
    }
});

// ====================================
// 🔍 SERVICE INFO ENDPOINT
// ====================================

router.get('/info', (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            name: ENV.SERVICE.NAME,
            version: ENV.SERVICE.VERSION,
            environment: ENV.SERVICE.ENVIRONMENT,
            alertsApiUrl: ENV.ALERTS_API_BASE_URL,
            weatherApiUrl: ENV.WEATHER_API_BASE_URL,
            cronInterval: ENV.CRON_JOB_INTERVAL,
            uptime: process.uptime(),
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
            }
        },
        message: 'Service information retrieved successfully'
    });
});

// ====================================
// 🏓 PING ENDPOINT
// ====================================

router.get('/ping', (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            message: 'pong',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        },
        message: 'Service is alive'
    });
});

// ====================================
// 📋 API DOCUMENTATION ENDPOINT
// ====================================

router.get('/docs', (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            name: 'Alerts Trigger Service API',
            version: '1.0.0',
            description: 'Weather alert evaluation service with cron job functionality',
            endpoints: {
                'GET /api/v1/stats': 'Get service statistics and health status',
                'GET /api/v1/info': 'Get service information and configuration',
                'GET /api/v1/ping': 'Simple health check endpoint',
                'GET /api/v1/docs': 'This API documentation'
            },
            features: [
                'Scheduled weather alert evaluation',
                'Real-time and forecast weather data processing',
                'Alert state management',
                'Health monitoring and statistics'
            ]
        },
        message: 'API documentation retrieved successfully'
    });
}); 