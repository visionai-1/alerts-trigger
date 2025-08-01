import jwt from 'jsonwebtoken';
import { JWTPayload, JWTOptions, DecodedToken } from '../interfaces';
import { ENV } from '../config/constants';
import HttpError from './httpError';

/**
 * 🔐 Simple Token Utilities
 * Basic JWT token management - validates signature only
 */

/**
 * Generate JWT token
 * @param payload - Data to encode in the JWT
 * @param options - JWT options (expiry, issuer, etc.)
 * @returns Signed JWT token string
 */
export const generateJWT = (
    payload: JWTPayload,
    options: JWTOptions = {}
): string => {
    if (!ENV.JWT.SECRET) {
        throw HttpError.internalServerError('JWT secret not configured');
    }

    const finalOptions: JWTOptions = {
        expiresIn: ENV.JWT.EXPIRES_IN || '1h',
        algorithm: 'HS256',
        ...options,
    };

    try {
        return jwt.sign(payload, ENV.JWT.SECRET, finalOptions);
    } catch (error) {
        throw HttpError.internalServerError('Failed to generate JWT token');
    }
};

/**
 * 🎯 Generate Token with Custom Payload
 * @param payload - Any data to encode in the JWT
 * @param expiresIn - Token expiry (default: 1h)
 * @returns JWT token string
 */
export const generateToken = (payload: JWTPayload, expiresIn: string = '1h'): string => {
    return generateJWT(payload, { expiresIn });
};

/**
 * Validate and decode JWT token
 * @param token - JWT token to validate
 * @returns Decoded token payload
 */
export const validateToken = (token: string): DecodedToken => {
    if (!ENV.JWT.SECRET) {
        throw HttpError.internalServerError('JWT secret not configured');
    }

    if (!token?.trim()) {
        throw HttpError.unauthorized('Token is required');
    }

    try {
        return jwt.verify(token, ENV.JWT.SECRET) as DecodedToken;
    } catch (error) {
        const jwtError = error as jwt.JsonWebTokenError;

        if (jwtError.name === 'TokenExpiredError') {
            throw HttpError.unauthorized('Token has expired');
        } else if (jwtError.name === 'JsonWebTokenError') {
            throw HttpError.unauthorized('Malformed token');
        } else if (jwtError.name === 'NotBeforeError') {
            throw HttpError.unauthorized('Token not active yet');
        }

        throw HttpError.unauthorized('Invalid token');
    }
};

/**
 * Extract Bearer token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Extracted token or null
 */
export const extractToken = (authHeader: string): string | null => {
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }
    
    const token = authHeader.slice(7).trim();
    return token || null;
};

/**
 * Check if token is expired
 * @param token - JWT token to check
 * @returns True if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
    try {
        const decoded = jwt.decode(token) as DecodedToken;
        if (!decoded?.exp) return true;
        
        return decoded.exp < Math.floor(Date.now() / 1000);
    } catch {
        return true;
    }
};

/**
 * Extract Bearer token from Express request (helper for route handlers)
 * @param req - Express request object
 * @returns Extracted token or undefined
 */
export const extractTokenFromRequest = (req: any): string | undefined => {
    const authHeader = req.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice(7).trim();
    }
    return undefined;
};

/**
 * Decode JWT token without verification
 * @param token - JWT token to decode
 * @returns Decoded token payload or null
 */
export const decodeJWT = (token: string): DecodedToken | null => {
    try {
        return jwt.decode(token) as DecodedToken;
    } catch {
        return null;
    }
};