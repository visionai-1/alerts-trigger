import { Request, Response, NextFunction } from 'express';
import { 
    extractToken, 
    validateToken, 
    isTokenExpired, 
    decodeJWT 
} from '../utils/token';
import { DecodedToken } from '../interfaces';
import HttpError from '../utils/httpError';

/**
 * 🔐 Simple Authentication Middleware
 * Just validates JWT signature - accepts any token payload structure
 */

// Extend Request interface to include auth data
declare global {
    namespace Express {
        interface Request {
            auth?: DecodedToken;
            authToken?: string;
        }
    }
}

/**
 * Extract token from multiple sources (header, query, cookies)
 */
const extractTokenFromRequest = (req: Request): string | null => {
    // Try Authorization header first (recommended for access tokens)
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = extractToken(authHeader);
        if (token) return token;
    }

    // Try query parameter (for refresh token endpoints)
    const queryToken = req.query.token as string;
    if (queryToken && typeof queryToken === 'string') {
        return queryToken;
    }

    // Try cookies (secure storage for refresh tokens)
    const cookieToken = req.cookies?.token;
    if (cookieToken && typeof cookieToken === 'string') {
        return cookieToken;
    }

    return null;
};

/**
 * 🔐 Simple Authentication Middleware
 * Validates any JWT token signed with JWT_SECRET
 * Use for: Any endpoint that requires authentication
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const token = extractTokenFromRequest(req);
        
        if (!token) {
            throw HttpError.unauthorized('Authentication token required');
        }

        // Just validate JWT signature - accept any payload structure
        const decoded = validateToken(token);
        
        // Add auth info to request object
        req.auth = decoded;
        req.authToken = token;
        
        next();
    } catch (error) {
        if (error instanceof HttpError) {
            error.sendError(res);
        } else {
            HttpError.unauthorized('Invalid token').sendError(res);
        }
    }
};

/**
 * 🔓 Optional Authentication Middleware
 * Adds auth data if token is present and valid
 * Use for: Public endpoints that benefit from auth context
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const token = extractTokenFromRequest(req);
        
        if (token && !isTokenExpired(token)) {
            try {
                const decoded = validateToken(token);
                req.auth = decoded;
                req.authToken = token;
            } catch {
                // Invalid token, but it's optional so we continue without auth
            }
        }
        
        next();
    } catch {
        // Any error in optional auth should not stop the request
        next();
    }
};

/**
 * 🔍 Get Auth Data Helper
 * Extract auth data from request (for use in controllers)
 */
export const getAuth = (req: Request): DecodedToken | null => {
    return req.auth || null;
};

/**
 * 🔍 Get Token Helper
 * Extract token from request (for use in controllers)
 */
export const getToken = (req: Request): string | null => {
    return req.authToken || null;
};

/**
 * ✅ Check if request is authenticated
 */
export const isAuthenticated = (req: Request): boolean => {
    return !!req.auth;
};

/**
 * ⚠️ Token Expiry Check Middleware
 * Warns if token expires soon (useful for frontend to refresh)
 */
export const checkTokenExpiry = (thresholdMinutes: number = 15) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (req.auth && req.authToken) {
            const decoded = decodeJWT(req.authToken);
            if (decoded && decoded.exp) {
                const currentTime = Math.floor(Date.now() / 1000);
                const timeUntilExpiry = decoded.exp - currentTime;
                const thresholdSeconds = thresholdMinutes * 60;
                
                if (timeUntilExpiry <= thresholdSeconds) {
                    res.setHeader('X-Token-Expiry-Warning', 'true');
                    res.setHeader('X-Token-Expires-In', timeUntilExpiry.toString());
                }
            }
        }
        next();
    };
};

// Backwards compatibility aliases
export const requireUserAuth = requireAuth;
