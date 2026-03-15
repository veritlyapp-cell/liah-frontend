/**
 * LIAH Activation Engine: SMS Integration Service
 * Provider Agnostic Implementation
 */

export interface SmsMessage {
    to: string;
    name: string;
    brand: string;
    tienda: string;
    position: string;
    hash: string;
}

export interface SmsResponse {
    success: boolean;
    providerId?: string;
    error?: string;
}

export class SmsService {
    private static baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://getliah.com';

    /**
     * Send dynamic SMS for candidate activation
     */
    static async sendActivationSms(params: SmsMessage): Promise<SmsResponse> {
        const { to, name, brand, tienda, hash } = params;

        // Link construction
        const shortLink = `${this.baseUrl}/t/${hash}`;

        // Dynamic message body
        const body = `${brand}: Hola ${name}, recibimos tu postulación. Para agendar tu entrevista en la tienda ${tienda}, ingresa aquí: ${shortLink}`;

        console.log(`[SMS] Sending to ${to}: ${body}`);

        try {
            // Integration with SMS Provider (e.g. Twilio, MessageBird, AWS SNS)
            // Example using a generic fetch to a provider API
            /*
            const response = await fetch('https://api.provider.com/v1/sms', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${process.env.SMS_API_KEY}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({
                    to,
                    from: process.env.SMS_SENDER_ID || 'LIAH',
                    text: body
                })
            });
            const data = await response.json();
            return { success: response.ok, providerId: data.id };
            */

            // Mocking successful delivery for now
            return { success: true, providerId: `mock_${Date.now()}` };

        } catch (error: any) {
            console.error('[SMS] Delivery failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate unique link hashes (8 characters)
     */
    static generateHash(): string {
        return Math.random().toString(36).substring(2, 10);
    }
}
