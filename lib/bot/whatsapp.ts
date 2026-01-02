import Logger from './logger';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
// Debug log (Safe: only shows prefixes)
console.log(`[DEBUG] [WHATSAPP] Attempting to send message to: ${to}`);
console.log(`[DEBUG] [WHATSAPP] Phone ID: ${PHONE_NUMBER_ID}`);
console.log(`[DEBUG] [WHATSAPP] Token Prefix: ${WHATSAPP_TOKEN?.substring(0, 15)}...`);

try {
    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
        console.error('[ERROR] [WHATSAPP] Missing Token or Phone ID in environment variables');
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
