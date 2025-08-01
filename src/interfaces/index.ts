// ====================================
// 🎯 SHARED INTERFACES
// ====================================

import { Algorithm } from 'jsonwebtoken';

/**
 * Standard API Error Interface
 * Used for consistent error handling across the application
 */
export interface ApiErrorInterface {
    title: string;
    detail: string;
    code: number;
    source?: {
        pointer?: string;
        parameter?: string;
    };
    meta?: Record<string, any>;
}

/**
 * Simple JWT Payload Interface
 * Accepts any payload structure - just validates JWT signature
 */
export interface JWTPayload {
    [key: string]: any;
}

/**
 * JWT Options Interface
 * Configuration options for JWT token generation
 */
export interface JWTOptions {
    expiresIn?: string | number;
    issuer?: string;
    audience?: string;
    subject?: string;
    algorithm?: Algorithm;
}

/**
 * Decoded Token Interface
 * Represents any decoded JWT token with standard claims
 */
export interface DecodedToken extends JWTPayload {
    iat: number;
    exp: number;
    iss?: string;
    aud?: string;
    sub?: string;
    jti?: string;
}

/**
 * User Interface
 * Basic user data structure
 */
export interface User {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Simple Token Response Interface
 */
export interface TokenResponse {
    token: string;
    expiresIn: string;
}

/**
 * API Response Interface
 * Standard structure for API responses
 */
export interface ApiResponse<T = any> {
    data?: T;
    errors?: ApiErrorInterface[];
    meta?: {
        total?: number;
        page?: number;
        limit?: number;
        [key: string]: any;
    };
}

/**
 * Token Validation Result Interface
 */
export interface TokenValidationResult {
    isValid: boolean;
    decoded?: DecodedToken;
    error?: ApiErrorInterface;
}

/**
 * Pagination Interface
 */
export interface PaginationOptions {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

/**
 * Database Query Options Interface
 */
export interface QueryOptions extends PaginationOptions {
    filter?: Record<string, any>;
    populate?: string[];
    select?: string[];
}

// Re-export weather interfaces
export * from './weather'; 