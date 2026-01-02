import { getAdminFirestore } from '../firebase-admin';

export const getCollections = async () => {
    const db = await getAdminFirestore();

    return {
        // Tenants - top level collection
        tenants: () => db.collection('tenants'),
        tenantConfig: (tenantId: string) => db.collection('tenants').doc(tenantId),

        // Tiendas - nested under tenant
        tiendas: (tenantId: string) => db.collection('tenants').doc(tenantId).collection('tiendas'),
        tienda: (tenantId: string, tiendaId: string) => db.collection('tenants').doc(tenantId).collection('tiendas').doc(tiendaId),

        // Vacantes - nested under tienda
        vacantes: (tenantId: string, tiendaId: string) =>
            db.collection('tenants').doc(tenantId).collection('tiendas').doc(tiendaId).collection('vacantes'),
        vacante: (tenantId: string, tiendaId: string, vacanteId: string) =>
            db.collection('tenants').doc(tenantId).collection('tiendas').doc(tiendaId).collection('vacantes').doc(vacanteId),

        // Postulantes - nested under tenant
        postulantes: (tenantId: string) => db.collection('tenants').doc(tenantId).collection('postulantes'),
        postulante: (tenantId: string, postulanteId: string) =>
            db.collection('tenants').doc(tenantId).collection('postulantes').doc(postulanteId),

        // Users - top level (dashboard users)
        users: () => db.collection('users'),
        user: (userId: string) => db.collection('users').doc(userId),

        // Conversaciones - top level (shared across tenants for phone uniqueness)
        conversaciones: () => db.collection('conversaciones'),
        conversacion: (phone: string) => db.collection('conversaciones').doc(phone)
    };
};
