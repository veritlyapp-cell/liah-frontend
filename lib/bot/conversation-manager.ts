import { getCollections } from './collections';
import { CONVERSATION_STATES, Conversation, Message, CandidateData, ConversationState } from './types';
import Logger from './logger';

class ConversationManager {
    /**
     * Get or create conversation for a phone number with tenant context
     */
    static async getOrCreateConversation(phone: string, tenant_id: string, origin_id: string): Promise<Conversation> {
        try {
            const collections = await getCollections();
            const conversationRef = collections.conversacion(phone);
            const conversationDoc = await conversationRef.get();

            if (conversationDoc.exists) {
                const existingData = conversationDoc.data() as Conversation;

                // If conversation exists but tenant changed, reset it
                if (existingData.tenant_id !== tenant_id) {
                    Logger.warn(`⚠️ Tenant changed for ${phone}: ${existingData.tenant_id} → ${tenant_id}`);
                    return await this.resetConversation(phone, tenant_id, origin_id);
                }

                Logger.info(`📱 Retrieved existing conversation for ${phone} (${tenant_id})`);
                return {
                    ...existingData,
                    id: conversationDoc.id,
                };
            }

            // Create new conversation
            const newConversation: Omit<Conversation, 'id'> = {
                phone,
                tenant_id,
                origin_id,
                estado: CONVERSATION_STATES.INICIO,
                mensajes: [],
                candidateData: {},
                createdAt: new Date(),
                updatedAt: new Date(),
                activo: true
            };

            await conversationRef.set(newConversation);
            Logger.success(`✅ Created new conversation for ${phone} (${tenant_id})`);

            return {
                ...newConversation,
                id: phone,
            } as Conversation;

        } catch (error) {
            Logger.error('❌ Error getting/creating conversation:', error);
            throw error;
        }
    }

    /**
     * Add message to conversation history
     */
    static async addMessage(phone: string, role: 'user' | 'assistant', content: string): Promise<void> {
        try {
            const collections = await getCollections();
            const conversationRef = collections.conversacion(phone);
            const conversationDoc = await conversationRef.get();

            if (!conversationDoc.exists) {
                Logger.warn(`⚠️ Conversation not found for ${phone}`);
                return;
            }

            const message: Message = {
                role,
                content,
                timestamp: new Date()
            };

            await conversationRef.update({
                mensajes: [...(conversationDoc.data()?.mensajes || []), message],
                updatedAt: new Date()
            });

            Logger.info(`💬 Added ${role} message to conversation ${phone}`);

        } catch (error) {
            Logger.error('❌ Error adding message:', error);
            throw error;
        }
    }

    /**
     * Update conversation state
     */
    static async updateState(phone: string, newState: ConversationState, additionalData: any = {}): Promise<void> {
        try {
            const collections = await getCollections();
            const conversationRef = collections.conversacion(phone);

            await conversationRef.update({
                estado: newState,
                ...additionalData,
                updatedAt: new Date()
            });

            Logger.info(`🔄 Updated conversation state to: ${newState} for ${phone}`);

        } catch (error) {
            Logger.error('❌ Error updating conversation state:', error);
            throw error;
        }
    }

    /**
     * Update candidate data in conversation
     */
    static async updateCandidateData(phone: string, candidateData: Partial<CandidateData>): Promise<void> {
        try {
            const collections = await getCollections();
            const conversationRef = collections.conversacion(phone);
            const conversationDoc = await conversationRef.get();

            const existingData = conversationDoc.exists
                ? conversationDoc.data()?.candidateData || {}
                : {};

            await conversationRef.update({
                candidateData: {
                    ...existingData,
                    ...candidateData
                },
                updatedAt: new Date()
            });

            Logger.info(`📝 Updated candidate data for ${phone}`, candidateData);

        } catch (error) {
            Logger.error('❌ Error updating candidate data:', error);
            throw error;
        }
    }

    /**
     * Get conversation history messages for AI context
     */
    static async getConversationHistory(phone: string, limit = 20): Promise<Message[]> {
        try {
            const collections = await getCollections();
            const conversationRef = collections.conversacion(phone);
            const conversationDoc = await conversationRef.get();

            if (!conversationDoc.exists) {
                return [];
            }

            const mensajes = conversationDoc.data()?.mensajes || [];

            // Return last N messages
            return mensajes.slice(-limit);

        } catch (error) {
            Logger.error('❌ Error getting conversation history:', error);
            throw error;
        }
    }

    /**
     * Reset conversation (start over)
     */
    static async resetConversation(phone: string, tenant_id: string, origin_id: string): Promise<Conversation> {
        try {
            const collections = await getCollections();
            const conversationRef = collections.conversacion(phone);

            const newConversation: Omit<Conversation, 'id'> = {
                phone,
                tenant_id,
                origin_id,
                estado: CONVERSATION_STATES.INICIO,
                mensajes: [],
                candidateData: {},
                activo: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await conversationRef.set(newConversation, { merge: true });

            Logger.info(`🔄 Conversation reset for ${phone} (${tenant_id})`);

            return {
                ...newConversation,
                id: phone,
            } as Conversation;

        } catch (error) {
            Logger.error('❌ Error resetting conversation:', error);
            throw error;
        }
    }
}

export default ConversationManager;
