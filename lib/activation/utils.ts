/**
 * LIAH Activation Engine: SMS Message Builder
 */

export interface MessageTemplateParams {
    name: string;
    brand: string;
    tienda: string;
    hash: string;
}

export function buildActivationMessage(params: MessageTemplateParams): string {
    const { name, brand, tienda, hash } = params;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://getliah.com';
    const link = `${baseUrl.replace(/\/$/, '')}/t/${hash}`;

    // Compact and high-impact message for SMS
    return `${brand}: Hola ${name}, recibimos tu postulación. Para agendar tu entrevista en la tienda ${tienda}, ingresa aquí: ${link}`;
}

/**
 * Validates tracking state for conversion metrics
 */
export function isConversionValid(sentAt: Date, registeredAt: Date): boolean {
    return registeredAt.getTime() > sentAt.getTime();
}
