import { getCollections } from './collections';
import Logger from './logger';

class TenantService {
    // Cache for origin_id to tenant_id mapping (per execution)
    static originToTenantCache: Record<string, string> = {};

    /**
     * Get tenant_id from origin_id
     */
    static async getTenantIdFromOrigin(origin_id: string): Promise<string> {
        try {
            // Check cache first
            if (this.originToTenantCache[origin_id]) {
                return this.originToTenantCache[origin_id];
            }

            // Fallback mappings for development/testing
            const fallbackMappings: Record<string, string> = {
                'ngr-whatsapp': 'ngr',
                'ngr-web': 'ngr',
                'test-whatsapp': 'ngr',
                'demo': 'ngr'
            };

            if (fallbackMappings[origin_id]) {
                const tenant_id = fallbackMappings[origin_id];
                this.originToTenantCache[origin_id] = tenant_id;
                Logger.info(`📍 Fallback mapping: ${origin_id} → ${tenant_id}`);
                return tenant_id;
            }

            const collections = await getCollections();
            // Query Firestore for tenant with this origin_id
            const tenantsSnapshot = await collections.tenants()
                .where('webhook_origin', '==', origin_id)
                .limit(1)
                .get();

            if (tenantsSnapshot.empty) {
                // Return 'ngr' as default if not found, to avoid breaking the bot during setup
                Logger.warn(`⚠️ No tenant found for origin_id: ${origin_id}. Falling back to 'ngr'.`);
                return 'ngr';
            }

            const tenantDoc = tenantsSnapshot.docs[0];
            const tenant_id = tenantDoc.id;

            // Cache the mapping
            this.originToTenantCache[origin_id] = tenant_id;

            Logger.info(`📍 Mapped origin ${origin_id} → tenant ${tenant_id}`);
            return tenant_id;

        } catch (error) {
            Logger.error(`❌ Error mapping origin_id to tenant_id:`, error);
            return 'ngr'; // Default to avoid crash
        }
    }

    /**
     * Get tenant configuration
     */
    static async getTenantConfig(tenant_id: string): Promise<any> {
        try {
            const collections = await getCollections();
            const tenantDoc = await collections.tenantConfig(tenant_id).get();

            if (!tenantDoc.exists) {
                throw new Error(`Tenant not found: ${tenant_id}`);
            }

            return {
                tenant_id,
                ...tenantDoc.data()
            };

        } catch (error) {
            Logger.error(`❌ Error getting tenant config:`, error);
            throw error;
        }
    }
}

export default TenantService;
