import { WeatherData, ForecastData, WeatherAlert } from '../interfaces/weather';
import { getAllAlerts, updateAlertState, updateMultiAlerts, checkAlertsServiceHealth, AlertStateUpdate } from './apis/AlertsApiService';
import { getRealTimeWeather, getForecastWeather, checkWeatherApiHealth } from './apis/WeatherApiService';
import { evaluateAlerts, groupAlertsByLocation } from './AlertEvaluationService';
import { Logging } from '../utils/logging';

/**
 * 🎯 Alerts Trigger Service
 * Functional service that coordinates the entire alert evaluation process
 */

/**
 * Perform health checks on dependent services
 */
const performHealthChecks = async (): Promise<void> => {
    Logging.info('🏥 Performing health checks...');

    const [alertsHealthy, weatherHealthy] = await Promise.all([
        checkAlertsServiceHealth(),
        checkWeatherApiHealth()
    ]);

    if (!alertsHealthy) {
        throw new Error('Alerts-service is not healthy');
    }

    if (!weatherHealthy) {
        throw new Error('Weather-api is not healthy');
    }

    Logging.info('✅ All dependent services are healthy');
};

/**
 * Fetch all alerts from alerts-service
 */
const fetchAllAlerts = async (): Promise<WeatherAlert[]> => {
    try {
        const alerts = await getAllAlerts();
        Logging.info(`📋 Fetched ${alerts.length} alerts to evaluate`);
        return alerts;
    } catch (error) {
        Logging.error('💥 Failed to fetch alerts', { error: error.message });
        throw new Error(`Failed to fetch alerts: ${error.message}`);
    }
};

/**
 * Fetch weather data for all unique locations
 */
const fetchWeatherDataForLocations = async (
    alertsByLocation: Map<string, WeatherAlert[]>
): Promise<Map<string, WeatherData | ForecastData>> => {
    const weatherDataMap = new Map<string, WeatherData | ForecastData>();
    const fetchPromises: Promise<void>[] = [];

    Logging.info(`🌤️ Fetching weather data for ${alertsByLocation.size} unique locations...`);

    for (const [locationKey, locationAlerts] of alertsByLocation) {
        // Determine if we need realtime or forecast data (or both)
        const needsRealtime = locationAlerts.some(alert => alert.type === 'realtime');
        const needsForecast = locationAlerts.some(alert => alert.type === 'forecast');

        // Get location from first alert (all alerts in group have same location)
        const sampleAlert = locationAlerts[0];
        const location = sampleAlert.location;

        // Create promises for needed weather data types
        if (needsRealtime) {
            const realtimePromise = getRealTimeWeather(location)
                .then(data => {
                    // Store with type prefix for realtime
                    weatherDataMap.set(`realtime:${locationKey}`, data);
                    Logging.info(`✅ Fetched realtime weather for location: ${locationKey}`);
                })
                .catch(error => {
                    Logging.error(`❌ Failed to fetch realtime weather for ${locationKey}`, {
                        error: error.message,
                        location
                    });
                });
            
            fetchPromises.push(realtimePromise);
        }

        if (needsForecast) {
            // For forecast alerts, use the timestep from the alert
            const forecastAlerts = locationAlerts.filter(alert => alert.type === 'forecast');
            
            // Group forecast alerts by timestep
            const timesteps = new Set(forecastAlerts.map(alert => alert.timestep || '1h'));
            
            for (const timestep of timesteps) {
                const forecastPromise = getForecastWeather(location, timestep as '1h' | '1d')
                    .then(data => {
                        // Store with type and timestep prefix for forecast
                        weatherDataMap.set(`forecast:${timestep}:${locationKey}`, data);
                        Logging.info(`✅ Fetched ${timestep} forecast for location: ${locationKey}`);
                    })
                    .catch(error => {
                        Logging.error(`❌ Failed to fetch ${timestep} forecast for ${locationKey}`, {
                            error: error.message,
                            location,
                            timestep
                        });
                    });
                
                fetchPromises.push(forecastPromise);
            }
        }
    }

    // Wait for all weather data fetches to complete
    await Promise.allSettled(fetchPromises);

    Logging.info(`🌤️ Weather data fetching completed. Obtained data for ${weatherDataMap.size} location/type combinations`);
    return weatherDataMap;
};

/**
 * Update alert states in alerts-service using batch update
 */
const updateAlertStates = async (
    evaluationResults: Map<string, 'triggered' | 'not_triggered'>
): Promise<void> => {
    if (evaluationResults.size === 0) {
        Logging.info('ℹ️ No evaluation results to update');
        return;
    }

    // Prepare batch update payload
    const updates: AlertStateUpdate[] = Array.from(evaluationResults.entries()).map(
        ([alertId, newState]) => ({ alertId, newState })
    );

    Logging.info(`🔄 Batch updating states for ${updates.length} alerts...`);

    try {
        const result = await updateMultiAlerts(updates);

        if (result.success) {
            Logging.info(`✅ Batch alert state update completed`, {
                total: updates.length,
                successful: result.successfulUpdates.length,
                failed: result.failedUpdates.length
            });

            if (result.failedUpdates.length > 0) {
                Logging.warn(`⚠️ ${result.failedUpdates.length} alert state updates failed`, {
                    failedAlertIds: result.failedUpdates
                });
            }
        } else {
            Logging.error('💥 Batch alert state update failed completely', {
                total: updates.length,
                failedAlertIds: result.failedUpdates
            });
        }
    } catch (error) {
        Logging.error('💥 Failed to execute batch alert state update', {
            error: error.message,
            total: updates.length
        });
        
        // Fallback to individual updates if batch fails
        Logging.info('🔄 Falling back to individual alert updates...');
        await updateAlertStatesIndividually(evaluationResults);
    }
};

/**
 * Fallback function for individual alert updates
 */
const updateAlertStatesIndividually = async (
    evaluationResults: Map<string, 'triggered' | 'not_triggered'>
): Promise<void> => {
    const updatePromises: Promise<void>[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const [alertId, newState] of evaluationResults) {
        const updatePromise = updateAlertState(alertId, newState)
            .then(success => {
                if (success) {
                    successCount++;
                } else {
                    failureCount++;
                }
            })
            .catch(error => {
                failureCount++;
                Logging.error(`❌ Failed to update alert ${alertId}`, {
                    error: error.message,
                    alertId,
                    newState
                });
            });
        
        updatePromises.push(updatePromise);
    }

    // Wait for all updates to complete
    await Promise.allSettled(updatePromises);

    Logging.info(`✅ Individual alert state updates completed`, {
        total: evaluationResults.size,
        successful: successCount,
        failed: failureCount
    });

    if (failureCount > 0) {
        Logging.warn(`⚠️ ${failureCount} alert state updates failed`);
    }
};

/**
 * Main function to run the complete alert evaluation cycle
 */
export const runEvaluationCycle = async (): Promise<void> => {
    const startTime = Date.now();
    
    try {
        Logging.info('🚀 Starting alert evaluation cycle...');

        // Step 1: Health checks
        await performHealthChecks();

        // Step 2: Fetch all alerts
        const alerts = await fetchAllAlerts();
        
        if (alerts.length === 0) {
            Logging.info('ℹ️ No alerts found to evaluate');
            return;
        }

        // Step 3: Group alerts by location for efficient weather data fetching
        const alertsByLocation = groupAlertsByLocation(alerts);

        // Step 4: Fetch weather data for all unique locations
        const weatherDataMap = await fetchWeatherDataForLocations(alertsByLocation);

        // Step 5: Evaluate all alerts
        const evaluationResults = evaluateAlerts(alerts, weatherDataMap);

        // Step 6: Update alert states
        await updateAlertStates(evaluationResults);

        const endTime = Date.now();
        const duration = endTime - startTime;

        Logging.info('✅ Alert evaluation cycle completed successfully', {
            totalAlerts: alerts.length,
            uniqueLocations: alertsByLocation.size,
            duration: `${duration}ms`,
            triggered: Array.from(evaluationResults.values()).filter(r => r === 'triggered').length
        });

    } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        Logging.error('💥 Alert evaluation cycle failed', {
            error: error.message,
            duration: `${duration}ms`,
            stack: error.stack
        });
        throw error;
    }
};

/**
 * Get service statistics
 */
export const getServiceStats = async (): Promise<{
    alertsServiceHealthy: boolean;
    weatherApiHealthy: boolean;
    lastRunTime?: Date;
}> => {
    const [alertsHealthy, weatherHealthy] = await Promise.all([
        checkAlertsServiceHealth(),
        checkWeatherApiHealth()
    ]);

    return {
        alertsServiceHealthy: alertsHealthy,
        weatherApiHealthy: weatherHealthy,
        lastRunTime: new Date()
    };
};