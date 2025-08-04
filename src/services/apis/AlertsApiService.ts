import axios, { AxiosInstance } from 'axios';
import { Logging } from '../../utils/logging';
import { ENV } from '../../config/constants';
import { WeatherAlert } from '../../interfaces/weather';
const API_VERSION = 'v1';
const API_PREFIX = 'api';

const ALERTS_API_PROTOCOL = `${API_PREFIX}/${API_VERSION}`;
/**
 * 🚨 Alerts API Service
 * Functional service to interact with the alerts-service microservice
 */

// Create API client instance
const createApiClient = (): AxiosInstance => {
    const apiClient = axios.create({
        baseURL: ENV.ALERTS_API_BASE_URL,
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': `${ENV.SERVICE.NAME}/${ENV.SERVICE.VERSION}`,
        },
    });

    // Add request interceptor for logging
    apiClient.interceptors.request.use(
        (config) => {
            Logging.info(`📤 Alerts API Request: ${config.method?.toUpperCase()} ${config.url}`);
            return config;
        },
        (error) => {
            Logging.error('❌ Alerts API Request Error', { error: error.message });
            return Promise.reject(error);
        }
    );

    // Add response interceptor for logging
    apiClient.interceptors.response.use(
        (response) => {
            Logging.info(`📥 Alerts API Response: ${response.status} ${response.config.url}`);
            return response;
        },
        (error) => {
            Logging.error('❌ Alerts API Response Error', {
                status: error.response?.status,
                message: error.message,
                url: error.config?.url,
            });
            return Promise.reject(error);
        }
    );

    return apiClient;
};

// Shared API client instance
const apiClient = createApiClient();

/**
 * Fetch all alerts from alerts-service using promise chains
 */
export const getAllAlerts = (): Promise<WeatherAlert[]> => {
    Logging.info('🔍 Fetching all alerts from alerts-service...');
    
    return apiClient.get(`${ALERTS_API_PROTOCOL}/alerts`)
        .then(response => {
            if (response.data.success && Array.isArray(response.data.data)) {
                Logging.info(`✅ Successfully fetched ${response.data.data.length} alerts`);
                return response.data.data;
            } else {
                Logging.warn('⚠️ Unexpected response format from alerts-service', {
                    response: response.data
                });
                return [];
            }
        })
        .catch(error => {
            Logging.error('💥 Failed to fetch alerts from alerts-service', {
                error: error.message,
                baseURL: ENV.ALERTS_API_BASE_URL
            });
            throw new Error(`Failed to fetch alerts: ${error.message}`);
        });
};

/**
 * Fetch all not-triggered alerts from alerts-service without pagination
 */
export const getNotTriggeredAlerts = (queryParams?: {
    type?: 'realtime' | 'forecast';
    parameter?: string;
    sortBy?: 'createdAt' | 'name' | 'parameter' | 'lastState';
    sortOrder?: 'asc' | 'desc';
}): Promise<WeatherAlert[]> => {
    Logging.info('🔍 Fetching all not-triggered alerts from alerts-service...');
    
    // Build query parameters - no pagination, just filtering
    const params = new URLSearchParams({
        lastState: 'not_triggered',
        sortBy: queryParams?.sortBy || 'createdAt',
        sortOrder: queryParams?.sortOrder || 'desc'
    });

    // Add optional parameters
    if (queryParams?.type) {
        params.append('type', queryParams.type);
    }
    if (queryParams?.parameter) {
        params.append('parameter', queryParams.parameter);
    }

    const queryString = params.toString();
    
    return apiClient.get(`${ALERTS_API_PROTOCOL}/alerts?${queryString}`)
        .then(response => {
            if (response.data.success && Array.isArray(response.data.data)) {
                Logging.info(`✅ Successfully fetched ${response.data.data.length} not-triggered alerts (all from database)`);
                return response.data.data;
            } else {
                Logging.warn('⚠️ Unexpected response format from alerts-service', {
                    response: response.data
                });
                return [];
            }
        })
        .catch(error => {
            Logging.error('💥 Failed to fetch not-triggered alerts from alerts-service', {
                error: error.message,
                baseURL: ENV.ALERTS_API_BASE_URL,
                queryParams
            });
            throw new Error(`Failed to fetch not-triggered alerts: ${error.message}`);
        });
};

/**
 * Update alert state in alerts-service using promise chains
 */
export const updateAlertState = async (alertId: string, newState: 'triggered' | 'not_triggered'): Promise<boolean> => {
    Logging.info(`🔄 Updating alert state: ${alertId} -> ${newState}`);
    
    return apiClient.put(`${ALERTS_API_PROTOCOL}/alerts/${alertId}`, {
        lastState: newState
    })
    .then(response => {
        if (response.data.success) {
            Logging.info(`✅ Successfully updated alert ${alertId} state to ${newState}`);
            return true;
        } else {
            Logging.warn(`⚠️ Failed to update alert ${alertId} state`, {
                response: response.data
            });
            return false;
        }
    })
    .catch(error => {
        Logging.error(`💥 Failed to update alert ${alertId} state`, {
            error: error.message,
            alertId,
            newState
        });
        return false;
    });
};

/**
 * Utility function to handle fallback to individual updates when batch fails
 */
const updateAlertsIndividually = (updates: AlertStateUpdate[]): Promise<{
    success: boolean;
    successfulUpdates: string[];
    failedUpdates: string[];
}> => {
    Logging.info(`🔄 Falling back to individual updates for ${updates.length} alerts...`);
    
    // Create individual update promises
    const updatePromises = updates.map(({ alertId, newState }) =>
        updateAlertState(alertId, newState)
            .then(success => ({ alertId, success }))
            .catch(() => ({ alertId, success: false }))
    );

    return Promise.allSettled(updatePromises)
        .then(results => {
            const successfulUpdates: string[] = [];
            const failedUpdates: string[] = [];

            results.forEach((result, index) => {
                const alertId = updates[index].alertId;
                
                if (result.status === 'fulfilled' && result.value.success) {
                    successfulUpdates.push(alertId);
                } else {
                    failedUpdates.push(alertId);
                }
            });

            Logging.info(`✅ Individual updates completed`, {
                total: updates.length,
                successful: successfulUpdates.length,
                failed: failedUpdates.length
            });

            return {
                success: failedUpdates.length === 0,
                successfulUpdates,
                failedUpdates
            };
        });
};

/**
 * Update multiple alert states in a single API call using the bulk update schema
 */
export interface AlertStateUpdate {
    alertId: string;
    newState: 'triggered' | 'not_triggered';
}

// Helper function to create batch update request
const createBatchUpdateRequest = async (state: string, alertIds: string[]) => {
    const updateBody = {
        filter: { ids: alertIds },
        update: {
            lastState: state,
            lastEvaluated: new Date().toISOString(),
            evaluatedBy: 'alerts-trigger-service'
        }
    };

    return apiClient.patch(`${ALERTS_API_PROTOCOL}/alerts/bulk-update`, updateBody)
        .then(response => ({
            state,
            alertIds,
            response: response.data,
            success: true
        }))
        .catch(error => ({
            state,
            alertIds,
            error: error.message,
            success: false
        }));
};

// Helper function to process batch update results
const processBatchUpdateResult = (result: any) => {
    const { state, alertIds, response, error, success } = result;
    const successful: string[] = [];
    const failed: string[] = [];

    if (success && response?.success) {
        const { modifiedCount = 0, matchedCount = 0 } = response.data || {};
        
        Logging.info(`✅ Batch update completed for state '${state}'`, {
            alertIds: alertIds.length,
            matched: matchedCount,
            modified: modifiedCount,
            message: response.message
        });

        // Track successfully updated alerts
        if (modifiedCount > 0) {
            successful.push(...alertIds.slice(0, modifiedCount));
            
            // Log individual successes
            alertIds.slice(0, modifiedCount).forEach(alertId => {
                Logging.info(`✅ Updated alert ${alertId} -> ${state}`);
            });
        }

        // Track failed alerts
        if (modifiedCount < alertIds.length) {
            failed.push(...alertIds.slice(modifiedCount));
            
            // Log individual failures
            alertIds.slice(modifiedCount).forEach(alertId => {
                Logging.warn(`⚠️ Failed to update alert ${alertId} -> ${state}`);
            });
        }
    } else {
        // All alerts in this batch failed
        failed.push(...alertIds);
        
        const errorMessage = error || 'API response indicated failure';
        Logging.error(`💥 Batch update failed for state '${state}'`, {
            error: errorMessage,
            alertIds: alertIds.length,
            response: response || 'No response data'
        });
    }

    return { successful, failed };
};

export const updateMultiAlerts = async (updates: AlertStateUpdate[]): Promise<{
    success: boolean;
    successfulUpdates: string[];
    failedUpdates: string[];
}> => {
    if (updates.length === 0) {
        return { success: true, successfulUpdates: [], failedUpdates: [] };
    }

    // Group updates by state to minimize API calls
    const updatesByState = new Map<string, string[]>();
    updates.forEach(({ alertId, newState }) => {
        if (!updatesByState.has(newState)) {
            updatesByState.set(newState, []);
        }
        updatesByState.get(newState)!.push(alertId);
    });

    Logging.info(`🔄 Batch updating ${updates.length} alerts in ${updatesByState.size} state groups...`);

    // Create all batch update promises concurrently
    const batchPromises = Array.from(updatesByState.entries()).map(([state, alertIds]) => 
        createBatchUpdateRequest(state, alertIds)
    );

    try {
        // Execute all batch updates concurrently using Promise.allSettled
        const results = await Promise.allSettled(batchPromises);
        
        // Process results and aggregate success/failure data
        const allSuccessfulUpdates: string[] = [];
        const allFailedUpdates: string[] = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const { successful, failed } = processBatchUpdateResult(result.value);
                allSuccessfulUpdates.push(...successful);
                allFailedUpdates.push(...failed);
            } else {
                // Promise itself was rejected (network error, etc.)
                const [state, alertIds] = Array.from(updatesByState.entries())[index];
                allFailedUpdates.push(...alertIds);
                
                Logging.error(`💥 Batch update promise rejected for state '${state}'`, {
                    error: result.reason?.message || result.reason,
                    alertIds: alertIds.length
                });
            }
        });

        const totalSuccessful = allSuccessfulUpdates.length;
        const totalFailed = allFailedUpdates.length;

        Logging.info(`✅ All concurrent batch updates completed`, {
            total: updates.length,
            successful: totalSuccessful,
            failed: totalFailed,
            successRate: `${Math.round((totalSuccessful / updates.length) * 100)}%`
        });

        return {
            success: totalFailed === 0,
            successfulUpdates: allSuccessfulUpdates,
            failedUpdates: allFailedUpdates
        };

    } catch (error) {
        // This should rarely happen with Promise.allSettled
        Logging.error('💥 Unexpected error in batch alert updates', {
            error: error.message,
            updates: updates.length
        });

        return {
            success: false,
            successfulUpdates: [],
            failedUpdates: updates.map(u => u.alertId)
        };
    }
};

/**
 * Health check for alerts-service connectivity using promise-based approach
 */
export const checkAlertsServiceHealth = (): Promise<boolean> => {
    return apiClient.get('/health')
        .then(response => {
            const isHealthy = response.status === 200;
            if (isHealthy) {
                Logging.info('✅ Alerts-service health check passed');
            } else {
                Logging.warn(`⚠️ Alerts-service health check failed with status: ${response.status}`);
            }
            return isHealthy;
        })
        .catch(error => {
            Logging.error('💥 Alerts-service health check failed', {
                error: error.message,
                baseURL: ENV.ALERTS_API_BASE_URL
            });
            return false;
        });
};