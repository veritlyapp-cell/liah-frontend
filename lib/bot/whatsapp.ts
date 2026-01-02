import Logger from './logger';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID; // The ID of your phone number in Meta

export const sendWhatsAppMessage = async (to: string, text: string) => {
    // Debug log (Safe: only shows prefixes)
    console.log(`[DEBUG] [WHATSAPP] Using Phone ID: ${PHONE_NUMBER_ID?.substring(0, 5)}...`);
    console.log(`[DEBUG] [WHATSAPP] Using Token: ${WHATSAPP_TOKEN?.substring(0, 10)}...`);

    try {
        if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
            throw new Error('WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured');
        }

        const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'text',
                text: {
                    preview_url: false,
                    body: text,
                },
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            Logger.error('❌ Error sending WhatsApp message:', data);
            throw new Error(data.error?.message || 'Error sending message');
        }

        Logger.success(`📤 Message sent to ${to}`);
        return data;

    } catch (error: any) {
        Logger.error('❌ WhatsApp API Error:', error.message);
        throw error;
    }
};
