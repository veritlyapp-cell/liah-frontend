import { NextRequest, NextResponse } from 'next/server';

// GET handler for health check
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        endpoint: '/api/admin/create-user',
        method: 'POST',
        requiredFields: ['email', 'displayName', 'role'],
        optionalFields: ['holdingId', 'marcaId', 'storeId', 'storeName', 'marcaName'],
        message: 'Usa POST para crear un usuario. Ejemplo: { "email": "test@example.com", "displayName": "Test User", "role": "store_manager" }'
    });
}

// Default password for new users
const DEFAULT_PASSWORD = 'Liah2025!';

interface CreateUserRequest {
    email: string;
    displayName: string;
    role: string;
    holdingId?: string;
    marcaId?: string;
    zonaId?: string;
    storeId?: string;
    storeName?: string;
    marcaName?: string;
    selectedMarcas?: { marcaId: string; marcaNombre: string }[]; // For recruiters with multiple brands
}

export async function POST(request: NextRequest) {
    try {
        const body: CreateUserRequest = await request.json();

        // Validate required fields
        if (!body.email || !body.displayName || !body.role) {
            return NextResponse.json(
                { error: 'Missing required fields: email, displayName, role' },
                { status: 400 }
            );
        }

        // Dynamically import firebase-admin to avoid Turbopack symlink issues
        const admin = (await import('firebase-admin')).default;
        const { getApps, cert } = await import('firebase-admin/app');
        const { getAuth } = await import('firebase-admin/auth');
        const { getFirestore } = await import('firebase-admin/firestore');

        // Initialize Firebase Admin if not already initialized
        if (getApps().length === 0) {
            // Try to load service account from file
            const fs = await import('fs');
            const path = await import('path');

            const possiblePaths = [
                path.join(process.cwd(), '../firebase-service-account.json'),
                path.join(process.cwd(), 'firebase-service-account.json'),
            ];

            let initialized = false;
            for (const filePath of possiblePaths) {
                if (fs.existsSync(filePath)) {
                    console.log('[API] Using service account:', filePath);
                    const serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    admin.initializeApp({
                        credential: cert(serviceAccount),
                    });
                    initialized = true;
                    break;
                }
            }

            if (!initialized) {
                // Try environment variables
                if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
                    admin.initializeApp({
                        credential: cert({
                            projectId: process.env.FIREBASE_PROJECT_ID,
                            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                        }),
                    });
                    initialized = true;
                }
            }

            if (!initialized) {
                throw new Error('Firebase Admin SDK: No credentials found');
            }
        }

        const auth = getAuth();
        const db = getFirestore();

        // 1. Create Firebase Auth user
        let userRecord;
        try {
            userRecord = await auth.createUser({
                email: body.email,
                password: DEFAULT_PASSWORD,
                displayName: body.displayName,
                emailVerified: true,
                disabled: false,
            });
        } catch (authError: any) {
            if (authError.code === 'auth/email-already-exists') {
                // Get existing user
                userRecord = await auth.getUserByEmail(body.email);
                // Update password to default
                await auth.updateUser(userRecord.uid, {
                    password: DEFAULT_PASSWORD,
                    displayName: body.displayName
                });
            } else {
                throw authError;
            }
        }

        // 2. Set custom claims for role-based access
        const customClaims: Record<string, any> = {
            role: body.role,
        };
        if (body.holdingId) customClaims.holdingId = body.holdingId;
        if (body.marcaId) customClaims.marcaId = body.marcaId;
        if (body.storeId) customClaims.storeId = body.storeId;

        await auth.setCustomUserClaims(userRecord.uid, customClaims);

        // 3. Create/Update Firestore userAssignment document
        const userAssignmentData: Record<string, any> = {
            userId: userRecord.uid,
            email: body.email,
            displayName: body.displayName,
            role: body.role,
            holdingId: body.holdingId || null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Add role-specific assignment structures
        if (body.role === 'jefe_marca') {
            if (body.marcaId) {
                userAssignmentData.assignedMarca = {
                    marcaId: body.marcaId,
                    marcaNombre: body.marcaName || body.marcaId
                };
            }
        } else if (body.role === 'recruiter') {
            // Recruiters can have multiple marcas
            if (body.selectedMarcas && body.selectedMarcas.length > 0) {
                userAssignmentData.assignedMarcas = body.selectedMarcas;
                // Also set first as primary for backwards compatibility
                userAssignmentData.assignedMarca = body.selectedMarcas[0];
            } else if (body.marcaId) {
                // Fallback to single marca
                userAssignmentData.assignedMarca = {
                    marcaId: body.marcaId,
                    marcaNombre: body.marcaName || body.marcaId
                };
            }
        } else if (body.role === 'store_manager') {
            if (body.storeId) {
                userAssignmentData.assignedStore = {
                    tiendaId: body.storeId,
                    tiendaNombre: body.storeName || body.storeId,
                    marcaId: body.marcaId || null
                };
            }
        } else if (body.role === 'supervisor') {
            if (body.storeId) {
                userAssignmentData.assignedStores = [{
                    tiendaId: body.storeId,
                    tiendaNombre: body.storeName || body.storeId,
                    marcaId: body.marcaId || null
                }];
            }
        }

        await db.collection('userAssignments').doc(userRecord.uid).set(userAssignmentData, { merge: true });

        return NextResponse.json({
            success: true,
            uid: userRecord.uid,
            email: body.email,
            message: `Usuario creado exitosamente. Contraseña temporal: ${DEFAULT_PASSWORD}`,
        });

    } catch (error: any) {
        console.error('Error creating user:', error);
        return NextResponse.json(
            { error: error.message || 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
