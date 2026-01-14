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
    role?: 'super_admin' | 'client_admin' | 'admin' | 'gerente' | 'jefe_marca' | 'supervisor' | 'brand_recruiter' | 'recruiter' | 'store_manager';
    tenant_id?: string | null;
    holdingId?: string | null;
    marcaId?: string | null;
    storeId?: string | null;
    authorized_entities?: string[] | null;
    entity_id?: string | null;
    authorized_stores?: string[] | null;
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
    async function getRoleFromFirestore(userId: string): Promise<UserClaims | null> {
        try {
            if (!db) {
                console.error('❌ Firestore not initialized');
                return null;
            }
            const assignmentsRef = collection(db, 'userAssignments');
            // Search by userId only, then check active status in code (supports both 'active' and 'isActive' fields)
            const q = query(assignmentsRef, where('userId', '==', userId));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const userData = snapshot.docs[0].data();
                // Check if user is active (support both field names for backward compatibility)
                const isUserActive = userData.isActive === true || userData.active === true;
                if (!isUserActive) {
                    console.log('⚠️ User found but not active:', userId);
                    return null;
                }
                return {
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
            console.log('⚠️ No userAssignment found for userId:', userId);
            return null;
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
                    const firestoreClaims = await getRoleFromFirestore(user.uid);
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
                const firestoreClaims = await getRoleFromFirestore(userCredential.user.uid);
                if (firestoreClaims) {
                    userClaims = firestoreClaims;
                    console.log('✅ Role loaded from Firestore:', userClaims.role);
                }
            }

            console.log('🔐 Login successful, role:', userClaims.role);

            // Redirect según rol
            switch (userClaims.role) {
                case 'super_admin':
                    router.push('/super-admin');
                    break;
                case 'client_admin':
                case 'admin':
                case 'gerente':
                    router.push('/admin');
                    break;
                case 'jefe_marca':
                    router.push('/jefe-marca');
                    break;
                case 'supervisor':
                    router.push('/supervisor');
                    break;
                case 'brand_recruiter':
                case 'recruiter':
                    router.push('/recruiter');
                    break;
                case 'store_manager':
                    router.push('/store-manager');
                    break;
                default:
                    console.warn('⚠️ Unknown role:', userClaims.role, '- redirecting to /');
                    router.push('/');
            }
        } catch (error: any) {
            console.error('Login error:', error);
            // Map Firebase error codes to user-friendly messages
            const errorCode = error.code || '';
            let errorMessage = 'Error al iniciar sesión';

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
