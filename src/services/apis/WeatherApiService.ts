import axios, { AxiosInstance } from 'axios';
import { Logging } from '../../utils/logging';
import { ENV } from '../../config/constants';
import { WeatherData, ForecastData, LocationQuery } from '../../interfaces/weather';
const API_VERSION = 'v1';
const API_PREFIX = 'api';

const WEATHER_API_PROTOCOL = `${API_PREFIX}/${API_VERSION}`;
/**
 * 🌤️ Weather API Service
 * Functional service to interact with the weather-api microservice
 */

// Create API client instance
const createApiClient = (): AxiosInstance => {
    const apiClient = axios.create({
        baseURL: ENV.WEATHER_API_BASE_URL,
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': `${ENV.SERVICE.NAME}/${ENV.SERVICE.VERSION}`,
        },
    });

    // Add request interceptor for logging
    apiClient.interceptors.request.use(
        (config) => {
            Logging.info(`📤 Weather API Request: ${config.method?.toUpperCase()} ${config.url}`);
            return config;
        },
        (error) => {
            Logging.error('❌ Weather API Request Error', { error: error.message });
            return Promise.reject(error);
        }
    );

    // Add response interceptor for logging
    apiClient.interceptors.response.use(
        (response) => {
            Logging.info(`📥 Weather API Response: ${response.status} ${response.config.url}`);
            return response;
        },
        (error) => {
            Logging.error('❌ Weather API Response Error', {
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
 * Build location query string for API requests
 */
const buildLocationQuery = (location: LocationQuery): string => {
    if (location.lat !== undefined && location.lon !== undefined) {
        return `lat=${location.lat}&lon=${location.lon}`;
    }
    if (location.city) {
        return `city=${encodeURIComponent(location.city)}`;
    }
    throw new Error('Location must include either coordinates (lat, lon) or city');
};

/**
 * Fetch current/realtime weather data
 */
export const getRealTimeWeather = async (location: LocationQuery): Promise<WeatherData> => {
    try {
        const locationQuery = buildLocationQuery(location);
        Logging.info(`🌤️ Fetching current weather for location: ${JSON.stringify(location)}`);
        
        const response = await apiClient.get(`${WEATHER_API_PROTOCOL}/weather/realtime?${locationQuery}`);
        
        if (response.data.success && response.data.data) {
            Logging.info(`✅ Successfully fetched current weather for location`);
            return response.data.data as WeatherData;
        } else {
            throw new Error('Invalid response format from weather API');
        }
    } catch (error) {
        Logging.error('💥 Failed to fetch current weather', {
            error: error.message,
            location,
             baseURL: ENV.WEATHER_API_BASE_URL

        });
        throw new Error(`Failed to fetch current weather: ${error.message}`);
    }
};

/**
 * Fetch forecast weather data
 */
export const getForecastWeather = async (
    location: LocationQuery, 
    timestep: '1h' | '1d' = '1h'
): Promise<ForecastData> => {
    try {
        const locationQuery = buildLocationQuery(location);
        Logging.info(`🔮 Fetching ${timestep} forecast for location: ${JSON.stringify(location)}`);
        
        const response = await apiClient.get(`${WEATHER_API_PROTOCOL}/weather/forecast?${locationQuery}&timestep=${timestep}`);
        
        if (response.data.success && response.data.data) {
            Logging.info(`✅ Successfully fetched ${timestep} forecast for location`);
            return response.data.data as ForecastData;
        } else {
            throw new Error('Invalid response format from weather API');
        }
    } catch (error) {
        Logging.error('💥 Failed to fetch forecast weather', {
            error: error.message,
            location,
            timestep,
            baseURL: ENV.WEATHER_API_BASE_URL
        });
        throw new Error(`Failed to fetch forecast weather: ${error.message}`);
    }
};

/**
 * Health check for weather-api connectivity
 */
export const checkWeatherApiHealth = async (): Promise<boolean> => {
    try {
        const response = await apiClient.get('/health');
        return response.status === 200;
    } catch (error) {
        Logging.error('💥 Weather-api health check failed', {
            error: error.message,
            baseURL: ENV.WEATHER_API_BASE_URL
        });
        return false;
    }
};