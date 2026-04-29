'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface UserClaims {
    role?: 'super_admin' | 'kam' | 'client_admin' | 'admin' | 'gerente' | 'jefe_marca' | 'supervisor' | 'brand_recruiter' | 'recruiter' | 'store_manager' | 'lider_reclutamiento' | 'hiring_manager' | 'approver' | 'compensaciones';
    tenant_id?: string | null;
    holdingId?: string | null;
    marcaId?: string | null;
    storeId?: string | null;
    authorized_entities?: string[] | null;
    entity_id?: string | null;
    authorized_stores?: string[] | null;
    capacidades?: string[];
    // Trial Mode Metadata
    isTrial?: boolean;
    trialExpiresAt?: any;
    trialStatus?: 'active' | 'expired';
    plan?: 'bot_only' | 'rq_only' | 'full_stack';
}

interface AuthContextType {
    user: User | null;
    claims: UserClaims | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [claims, setClaims] = useState<UserClaims | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Helper function to get role from Firestore
    async function getRoleFromFirestore(userId: string, userEmail?: string): Promise<UserClaims | null> {
        try {
            if (!db) {
                console.error('❌ Firestore not initialized');
                return null;
            }

            let baseClaims: UserClaims | null = null;

            // 1. Try userAssignments collection (for Flow users)
            const assignmentsRef = collection(db, 'userAssignments');
            const q = query(assignmentsRef, where('userId', '==', userId));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const userData = snapshot.docs[0].data();
                const isUserActive = userData.isActive === true || userData.active === true;
                if (isUserActive) {
                    baseClaims = {
                        role: userData.role as any,
                        tenant_id: userData.holdingId || null,
                        holdingId: userData.holdingId || null,
                        marcaId: userData.marcaId || userData.assignedMarca?.marcaId || null,
                        storeId: userData.storeId || userData.assignedStore?.tiendaId || null,
                        authorized_entities: userData.assignedMarca ? [userData.assignedMarca.marcaId] : null,
                        entity_id: userData.assignedMarca?.marcaId || null,
                        authorized_stores: userData.assignedStores?.map((s: any) => s.tiendaId) || null
                    };
                }
            }

            // 2. Try talent_users collection (for Talent users)
            if (!baseClaims && userEmail) {
                const talentRef = collection(db, 'talent_users');
                const talentQ = query(talentRef, where('email', '==', userEmail.toLowerCase()));
                const talentSnap = await getDocs(talentQ);

                if (!talentSnap.empty) {
                    const talentData = talentSnap.docs[0].data();
                    if (talentData.activo) {
                        const capacidades = talentData.capacidades || [talentData.rol];
                        let role: any = 'hiring_manager';
                        if (capacidades.includes('admin')) role = 'admin';
                        else if (capacidades.includes('lider_reclutamiento')) role = 'lider_reclutamiento';
                        else if (capacidades.includes('recruiter')) role = 'recruiter';
                        else if (capacidades.includes('hiring_manager')) role = 'hiring_manager';

                        baseClaims = {
                            role,
                            tenant_id: talentData.holdingId || null,
                            holdingId: talentData.holdingId || null,
                            marcaId: null,
                            storeId: null,
                            authorized_entities: null,
                            entity_id: null,
                            authorized_stores: null,
                            capacidades
                        };
                    }
                }
            }

            // 3. Try legacy users collection
            if (!baseClaims && userEmail) {
                const usersRef = collection(db, 'users');
                const userQ = query(usersRef, where('email', '==', userEmail));
                const userSnap = await getDocs(userQ);
                if (!userSnap.empty) {
                    const userData = userSnap.docs[0].data();
                    if (userData.activo !== false && userData.active !== false) {
                        baseClaims = {
                            role: userData.role as any,
                            tenant_id: userData.tenant_id || userData.holdingId || null,
                            holdingId: userData.tenant_id || userData.holdingId || null,
                            marcaId: userData.marcaId || null,
                            storeId: userData.storeId || null,
                            authorized_entities: userData.authorized_entities || null,
                            entity_id: userData.entity_id || null,
                            authorized_stores: userData.authorized_stores || null
                        };
                    }
                }
            }

            // 4. If found a holdingId, fetch holding trial status
            if (baseClaims?.holdingId) {
                const { getDoc, doc } = await import('firebase/firestore');
                const holdingDoc = await getDoc(doc(db, 'holdings', baseClaims.holdingId));
                if (holdingDoc.exists()) {
                    const hData = holdingDoc.data();
                    if (hData.isTrial) {
                        baseClaims.isTrial = true;
                        baseClaims.trialExpiresAt = hData.trialExpiresAt;

                        // Check if expired
                        const expiresAt = hData.trialExpiresAt?.toDate ? hData.trialExpiresAt.toDate() : new Date(hData.trialExpiresAt);
                        baseClaims.trialStatus = expiresAt < new Date() ? 'expired' : 'active';
                        console.log('🕒 Trial Status:', baseClaims.trialStatus, 'expires at:', expiresAt);
                    }
                }
            }

            return baseClaims;
        } catch (error) {
            console.error('Error fetching role from Firestore:', error);
            return null;
        }
    }

    useEffect(() => {
        if (!auth) {
            console.error('❌ Firebase Auth not initialized. Check your environment variables.');
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);

            if (user) {
                // Obtener custom claims
                const idTokenResult = await user.getIdTokenResult();
                let userClaims = idTokenResult.claims as UserClaims;

                // Si no hay role en custom claims, buscar en Firestore
                if (!userClaims.role) {
                    console.log('No custom claims found, checking Firestore...');
                    const firestoreClaims = await getRoleFromFirestore(user.uid, user.email || undefined);
                    if (firestoreClaims) {
                        userClaims = firestoreClaims;
                        console.log('✅ Role loaded from Firestore:', userClaims.role);
                    }
                }

                setClaims(userClaims);
            } else {
                setClaims(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        if (!auth) throw new Error('Firebase Auth no está inicializado');
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const idTokenResult = await userCredential.user.getIdTokenResult();
            let userClaims = idTokenResult.claims as UserClaims;

            // Si no hay role en custom claims, buscar en Firestore
            if (!userClaims.role) {
                console.log('No custom claims on login, checking Firestore...');
                const firestoreClaims = await getRoleFromFirestore(userCredential.user.uid, userCredential.user.email || undefined);
                if (firestoreClaims) {
                    userClaims = firestoreClaims;
                    console.log('✅ Role loaded from Firestore:', userClaims.role);
                }
            }

            console.log('🔐 Login successful, role:', userClaims.role);

            // Log activity
            try {
                const { logAction } = await import('@/lib/firestore/logs');
                await logAction({
                    userId: userCredential.user.uid,
                    userEmail: userCredential.user.email || '',
                    userName: userCredential.user.displayName || 'Usuario',
                    holdingId: userClaims.holdingId || 'N/A',
                    marcaId: userClaims.marcaId || undefined,
                    action: 'login',
                    details: `Login exitoso con rol ${userClaims.role}`,
                    metadata: {
                        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
                        timestamp: new Date().toISOString()
                    }
                });
            } catch (logErr) {
                console.warn('Logging failed (non-blocking):', logErr);
            }

            // Redirect según rol
            switch (userClaims.role) {
                case 'super_admin':
                    router.push('/super-admin');
                    break;
                case 'kam':
                    router.push('/kam');
                    break;
                case 'client_admin':
                case 'admin':
                case 'gerente':
                    router.push('/launcher');
                    break;
                case 'jefe_marca':
                    router.push('/jefe-marca');
                    break;
                case 'supervisor':
                    router.push('/supervisor');
                    break;
                case 'brand_recruiter':
                case 'recruiter':
                    // Redirect directly to recruiter dashboard to avoid launcher loops
                    router.push('/recruiter');
                    break;
                case 'store_manager':
                    router.push('/store-manager');
                    break;
                // Talent users - redirect to Talent dashboard
                case 'lider_reclutamiento':
                case 'hiring_manager':
                case 'approver':
                case 'compensaciones':
                    router.push('/admin');
                    break;
                default:
                    console.warn('⚠️ Unknown role:', userClaims.role, '- redirecting to /talent');
                    router.push('/talent');
            }
        } catch (error: any) {
            console.error('Login error full:', error);
            // Map Firebase error codes to user-friendly messages
            const errorCode = error.code || 'UNKNOWN_CODE';
            const originalMsg = error.message || 'Sin mensaje original';
            let errorMessage = `Error [${errorCode}]: ${originalMsg}`;

            if (errorCode === 'auth/invalid-credential' ||
                errorCode === 'auth/wrong-password' ||
                errorCode === 'auth/user-not-found') {
                errorMessage = 'Correo o contraseña errónea';
            } else if (errorCode === 'auth/too-many-requests') {
                errorMessage = 'Demasiados intentos. Intenta más tarde';
            } else if (errorCode === 'auth/invalid-email') {
                errorMessage = 'El formato del correo no es válido';
            }

            throw new Error(errorMessage);
        }
    };

    const signOut = async () => {
        if (!auth) return;
        try {
            await firebaseSignOut(auth);
            router.push('/login');
        } catch (error: any) {
            console.error('Logout error:', error);
            throw new Error(error.message || 'Error al cerrar sesión');
        }
    };

    return (
        <AuthContext.Provider value={{ user, claims, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
