import { WeatherData, ForecastData } from '../interfaces/weather';
import { Logging } from './logging';

/**
 * 🔍 Weather Data Extraction Utilities
 * Functions to extract specific weather parameters from weather data
 */

/**
 * Extract a weather parameter value from weather data
 */
export function extractWeatherParameter(
    data: WeatherData | ForecastData, 
    parameter: string,
    isCurrentWeather: boolean = true
): number {
    try {
        if (isCurrentWeather) {
            const weatherData = data as WeatherData;
            return extractFromCurrentWeather(weatherData, parameter);
        } else {
            const forecastData = data as ForecastData;
            return extractFromForecastWeather(forecastData, parameter);
        }
    } catch (error) {
        Logging.error('💥 Failed to extract weather parameter', {
            parameter,
            isCurrentWeather,
            error: error.message
        });
        throw new Error(`Failed to extract parameter '${parameter}': ${error.message}`);
    }
}

/**
 * Extract parameter from current weather data
 */
function extractFromCurrentWeather(data: WeatherData, parameter: string): number {
    switch (parameter) {
        case 'temperature':
            return data.temperature;
        case 'humidity':
            return data.humidity;
        case 'windSpeed':
            return data.windSpeed;
        case 'windDirection':
            return data.windDirection;
        case 'precipitation.intensity':
            return data.precipitation.intensity;
        case 'precipitation.probability':
            return data.precipitation.probability;
        case 'visibility':
            return data.visibility;
        case 'uvIndex':
            return data.uvIndex || 0;
        case 'cloudCover':
            return data.cloudCover || 0;
        case 'pressure':
            return data.pressure || 0;
        case 'weatherCode':
            return data.weatherCode || 0;
        default:
            throw new Error(`Unknown weather parameter: ${parameter}`);
    }
}

/**
 * Extract parameter from forecast weather data (uses next/upcoming interval)
 */
function extractFromForecastWeather(data: ForecastData, parameter: string): number {
    if (!data.intervals || data.intervals.length === 0) {
        throw new Error('No forecast intervals available');
    }

    // Get the next upcoming interval (first one in the array)
    const nextInterval = data.intervals[0];
    
    switch (parameter) {
        case 'temperature':
            return nextInterval.temperature;
        case 'humidity':
            return nextInterval.humidity;
        case 'windSpeed':
            return nextInterval.windSpeed;
        case 'windDirection':
            // Forecast doesn't include wind direction, use 0 as default
            return 0;
        case 'precipitation.intensity':
            // For forecast, we use precipitation chance as intensity proxy
            return nextInterval.precipitationChance;
        case 'precipitation.probability':
            return nextInterval.precipitationChance;
        case 'visibility':
            // Forecast doesn't include visibility, use a default high value
            return 10000;
        case 'uvIndex':
            return nextInterval.uvIndex;
        case 'cloudCover':
            return nextInterval.cloudCover;
        case 'pressure':
            // Forecast doesn't include pressure, use 0 as default
            return 0;
        case 'weatherCode':
            return nextInterval.weatherCode;
        default:
            throw new Error(`Unknown weather parameter: ${parameter}`);
    }
}

/**
 * Validate if a parameter is supported for the given weather data type
 */
export function isParameterSupported(parameter: string, isCurrentWeather: boolean): boolean {
    const currentWeatherParams = [
        'temperature', 'humidity', 'windSpeed', 'windDirection',
        'precipitation.intensity', 'precipitation.probability',
        'visibility', 'uvIndex', 'cloudCover', 'pressure', 'weatherCode'
    ];

    const forecastWeatherParams = [
        'temperature', 'humidity', 'windSpeed',
        'precipitation.intensity', 'precipitation.probability',
        'uvIndex', 'cloudCover', 'weatherCode'
    ];

    const supportedParams = isCurrentWeather ? currentWeatherParams : forecastWeatherParams;
    return supportedParams.includes(parameter);
}

/**
 * Get human-readable description of what parameter will be extracted
 */
export function getParameterDescription(parameter: string, isCurrentWeather: boolean): string {
    const descriptions = {
        'temperature': 'Temperature',
        'humidity': 'Humidity',
        'windSpeed': 'Wind Speed',
        'windDirection': 'Wind Direction',
        'precipitation.intensity': isCurrentWeather ? 'Precipitation Intensity' : 'Precipitation Probability',
        'precipitation.probability': 'Precipitation Probability',
        'visibility': 'Visibility',
        'uvIndex': 'UV Index',
        'cloudCover': 'Cloud Cover',
        'pressure': 'Atmospheric Pressure',
        'weatherCode': 'Weather Code'
    };

    return descriptions[parameter] || parameter;
}