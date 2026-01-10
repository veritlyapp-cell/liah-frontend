/**
 * Server-side authentication verification for API routes.
 * Verifies Firebase ID tokens and extracts user claims.
 */

import { getAdminAuth } from '../firebase-admin';

export interface VerifiedUser {
    uid: string;
    email?: string;
    role?: string;
    holdingId?: string;
    marcaId?: string;
    tiendaId?: string;
}

export interface AuthResult {
    authenticated: boolean;
    user?: VerifiedUser;
    error?: string;
}

/**
 * Verify a Firebase ID token from the Authorization header.
 * @param request - The incoming request
 * @returns AuthResult with user data if valid, error if not
 */
export async function verifyAuth(request: Request): Promise<AuthResult> {
    try {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader) {
            return { authenticated: false, error: 'No authorization header' };
        }

        // Extract token from "Bearer <token>"
        const token = authHeader.replace('Bearer ', '').trim();

        if (!token) {
            return { authenticated: false, error: 'No token provided' };
        }

        // Verify with Firebase Admin
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(token);

        return {
            authenticated: true,
            user: {
                uid: decodedToken.uid,
                email: decodedToken.email,
                role: decodedToken.role,
                holdingId: decodedToken.holdingId,
                marcaId: decodedToken.marcaId,
                tiendaId: decodedToken.tiendaId
            }
        };
    } catch (error: any) {
        console.error('[AUTH] Token verification failed:', error.message);
        return {
            authenticated: false,
            error: error.code === 'auth/id-token-expired'
                ? 'Token expired'
                : 'Invalid token'
        };
    }
}

/**
 * Check if the verified user has one of the allowed roles.
 */
export function hasRole(user: VerifiedUser, allowedRoles: string[]): boolean {
    if (!user.role) return false;
    return allowedRoles.includes(user.role);
}

/**
 * Check if user is any type of admin.
 */
export function isAdmin(user: VerifiedUser): boolean {
    return hasRole(user, ['super_admin', 'client_admin', 'brand_admin']);
}

/**
 * Check if user can access a specific brand.
 */
export function canAccessBrand(user: VerifiedUser, marcaId: string): boolean {
    if (isAdmin(user)) return true;
    return user.marcaId === marcaId;
}

/**
 * Check if user can access a specific tenant/holding.
 */
export function canAccessTenant(user: VerifiedUser, holdingId: string): boolean {
    if (isAdmin(user)) return true;
    return user.holdingId === holdingId;
}
