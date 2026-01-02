import { NextRequest, NextResponse } from 'next/server';
import GeminiChatbot from '@/lib/bot/gemini-bot';
import { sendWhatsAppMessage } from '@/lib/bot/whatsapp';
import TenantService from '@/lib/bot/tenant-service';
import Logger from '@/lib/bot/logger';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// Initialize chatbot instance (shared across requests in this execution)
const chatbot = new GeminiChatbot();

/**
 * Handle Webhook Verification (GET request from Meta)
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        Logger.success('✅ Webhook verified successfully');
        return new NextResponse(challenge, { status: 200 });
    } else {
        Logger.error('❌ Webhook verification failed: Token mismatch or missing');
        return new NextResponse('Forbidden', { status: 403 });
    }
}

/**
 * Handle Incoming Webhook Events (POST request from Meta)
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Check if it's a WhatsApp message event
        if (body.object === 'whatsapp_business_account') {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const message = value?.messages?.[0];

            if (message && message.type === 'text') {
                const phone = message.from; // Phone sender
                const text = message.text.body;

                // Use default origin_id for now or derive from metadata
                const origin_id = 'ngr-whatsapp';

                Logger.info(`📱 Message from ${phone}: "${text}"`);

                // 1. Map origin to tenant
                const tenant_id = await TenantService.getTenantIdFromOrigin(origin_id);

                // 2. Process with AI Chatbot
                const result = await chatbot.processMessage(phone, text, origin_id, tenant_id);

                // 3. Send response back via WhatsApp
                if (result.response) {
                    await sendWhatsAppMessage(phone, result.response);
                }

                // 4. (Optional) Process Actions
                // if (result.actions) { ... }
            }

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false, error: 'Not a WhatsApp message event' });

    } catch (error: any) {
        Logger.error('❌ Webhook Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
