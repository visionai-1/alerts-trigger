import { WeatherData, ForecastData, WeatherAlert } from '../interfaces/weather';
import { extractWeatherParameter, isParameterSupported, getParameterDescription } from '../utils/weatherDataExtractor';
import { Logging } from '../utils/logging';

/**
 * ⚖️ Alert Evaluation Service
 * Functional service to evaluate weather alert conditions against weather data
 */

/**
 * Evaluate a condition using the specified operator
 */
const evaluateCondition = (
    actualValue: number, 
    operator: string, 
    threshold: number
): boolean => {
    switch (operator) {
        case '>':
            return actualValue > threshold;
        case '<':
            return actualValue < threshold;
        case '>=':
            return actualValue >= threshold;
        case '<=':
            return actualValue <= threshold;
        case '==':
            return Math.abs(actualValue - threshold) < 0.01; // Handle floating point precision
        case '!=':
            return Math.abs(actualValue - threshold) >= 0.01; // Handle floating point precision
        default:
            Logging.error(`❌ Unknown operator: ${operator}`);
            return false;
    }
};

/**
 * Evaluate a single alert against weather data
 */
export const evaluateAlert = (
    alert: WeatherAlert, 
    weatherData: WeatherData | ForecastData
): 'triggered' | 'not_triggered' => {
    try {
        const isCurrentWeather = alert.type === 'realtime';
        
        Logging.info(`🔍 Evaluating alert: ${alert.name || alert._id}`, {
            type: alert.type,
            parameter: alert.parameter,
            operator: alert.operator,
            threshold: alert.threshold,
            location: alert.location
        });

        // Validate parameter is supported for this weather type
        if (!isParameterSupported(alert.parameter, isCurrentWeather)) {
            Logging.warn(`⚠️ Parameter '${alert.parameter}' not supported for ${alert.type} weather data`);
            return 'not_triggered';
        }

        // Extract the weather parameter value
        const actualValue = extractWeatherParameter(weatherData, alert.parameter, isCurrentWeather);
        
        // Evaluate the condition
        const isTriggered = evaluateCondition(
            actualValue, 
            alert.operator, 
            alert.threshold
        );

        const result = isTriggered ? 'triggered' : 'not_triggered';
        
        Logging.info(`📊 Alert evaluation result: ${result}`, {
            alertId: alert._id,
            parameter: getParameterDescription(alert.parameter, isCurrentWeather),
            actualValue,
            operator: alert.operator,
            threshold: alert.threshold,
            result
        });

        return result;

    } catch (error) {
        Logging.error('💥 Failed to evaluate alert', {
            alertId: alert._id,
            error: error.message,
            parameter: alert.parameter
        });
        
        // Return not_triggered on evaluation errors to be safe
        return 'not_triggered';
    }
};

/**
 * Create a unique key for location-based weather data lookup
 */
export const createLocationKey = (location: { lat?: number; lon?: number; city?: string }): string => {
    if (location.lat !== undefined && location.lon !== undefined) {
        return `${location.lat},${location.lon}`;
    }
    if (location.city) {
        return location.city.toLowerCase().trim();
    }
    throw new Error('Invalid location for key generation');
};

/**
 * Batch evaluate multiple alerts
 */
export const evaluateAlerts = (
    alerts: WeatherAlert[],
    weatherDataMap: Map<string, WeatherData | ForecastData>
): Map<string, 'triggered' | 'not_triggered'> => {
    const results = new Map<string, 'triggered' | 'not_triggered'>();

    Logging.info(`🔄 Batch evaluating ${alerts.length} alerts`);

    for (const alert of alerts) {
        try {
            // Create a location key for weather data lookup
            const locationKey = createLocationKey(alert.location);
            
            // Create the correct weather data key based on alert type
            let weatherDataKey: string;
            if (alert.type === 'realtime') {
                weatherDataKey = `realtime:${locationKey}`;
            } else {
                // For forecast alerts, include the timestep
                const timestep = alert.timestep || '1h';
                weatherDataKey = `forecast:${timestep}:${locationKey}`;
            }

            const weatherData = weatherDataMap.get(weatherDataKey);

            if (!weatherData) {
                Logging.warn(`⚠️ No weather data found for alert ${alert._id}`, {
                    location: alert.location,
                    locationKey,
                    weatherDataKey,
                    alertType: alert.type,
                    timestep: alert.timestep
                });
                results.set(alert._id!, 'not_triggered');
                continue;
            }

            const result = evaluateAlert(alert, weatherData);
            results.set(alert._id!, result);

        } catch (error) {
            Logging.error(`💥 Failed to evaluate alert ${alert._id}`, {
                error: error.message
            });
            results.set(alert._id!, 'not_triggered');
        }
    }

    const triggeredCount = Array.from(results.values()).filter(r => r === 'triggered').length;
    
    Logging.info(`✅ Batch evaluation completed`, {
        totalAlerts: alerts.length,
        triggered: triggeredCount,
        notTriggered: alerts.length - triggeredCount
    });

    return results;
};

/**
 * Group alerts by location for efficient weather data fetching
 */
export const groupAlertsByLocation = (alerts: WeatherAlert[]): Map<string, WeatherAlert[]> => {
    const grouped = new Map<string, WeatherAlert[]>();

    for (const alert of alerts) {
        try {
            const locationKey = createLocationKey(alert.location);
            
            if (!grouped.has(locationKey)) {
                grouped.set(locationKey, []);
            }
            
            grouped.get(locationKey)!.push(alert);
            
        } catch (error) {
            Logging.warn(`⚠️ Skipping alert with invalid location: ${alert._id}`, {
                location: alert.location,
                error: error.message
            });
        }
    }

    Logging.info(`📍 Grouped ${alerts.length} alerts into ${grouped.size} unique locations`);
    return grouped;
};