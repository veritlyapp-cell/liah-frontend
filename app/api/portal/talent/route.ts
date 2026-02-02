import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, getAdminStorage, getFieldValue } from '@/lib/firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const payloadStr = formData.get('payload') as string;
        const holdingSlug = formData.get('holdingSlug') as string || 'ngr';

        if (!file || !payloadStr) {
            return NextResponse.json({ error: 'Missing file or data' }, { status: 400 });
        }

        const candidateData = JSON.parse(payloadStr);
        const { nombre, apellidos, dni, email, telefono, expectativa } = candidateData;

        // 1. Convert file to buffer for upload and AI
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64File = buffer.toString('base64');

        // 2. Upload to Firebase Storage via Admin SDK
        const bucket = getAdminStorage();
        const timestamp = Date.now();
        const extension = file.name.split('.').pop() || 'pdf';
        const filePath = `cvs/talent_pool/${holdingSlug}/${dni}_${timestamp}.${extension}`;
        const storageFile = bucket.file(filePath);

        await storageFile.save(buffer, {
            metadata: {
                contentType: file.type,
                metadata: {
                    candidateName: `${nombre} ${apellidos}`,
                    dni,
                    holdingSlug
                }
            }
        });

        // Make it public or get signed URL? Let's use getDownloadURL style but via Admin
        // For simplicity in this project, we often use public URLs or signed ones.
        // Let's use a standard public URL format if the bucket allows, or just store the path.
        const cvUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

        // 3. AI Analysis - Keyword Extraction
        let keywords: string[] = [];
        let summary_ai = '';

        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); // Use flash for speed
            const prompt = `Analiza este CV para una base de datos de talento.
            Extrae una lista de hasta 10 etiquetas/keywords (habilidades técnicas, blandas, años de experiencia clave).
            También genera un resumen profesional de 2 líneas.
            
            Responde SOLO en formato JSON:
            {
                "keywords": ["tag1", "tag2", ...],
                "summary": "resumen..."
            }`;

            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        mimeType: file.type,
                        data: base64File
                    }
                }
            ]);

            const aiResponse = result.response.text();
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                keywords = parsed.keywords || [];
                summary_ai = parsed.summary || '';
            }
        } catch (aiError) {
            console.error('AI Analysis failed:', aiError);
            // Non-blocking, we still save the candidate
        }

        // 4. Save to Firestore
        const db = getAdminFirestore();
        const FieldValue = getFieldValue();

        const talentRef = db.collection('talent_pool').doc();
        await talentRef.set({
            nombre: nombre || '',
            apellidos: apellidos || '',
            nombreCompleto: `${nombre} ${apellidos}`.trim(),
            dni: dni || '',
            email: (email || '').toLowerCase(),
            telefono: telefono || '',
            expectativa: expectativa || '',
            holdingSlug,
            cvUrl,
            cvPath: filePath,
            ai_keywords: keywords,
            ai_summary: summary_ai,
            appliedAt: FieldValue.serverTimestamp(),
            status: 'new',
            source: 'portal_talent_pool'
        });

        return NextResponse.json({
            success: true,
            id: talentRef.id,
            message: 'Perfil registrado correctamente'
        });

    } catch (error: any) {
        console.error('Error in Talent Intake API:', error);
        return NextResponse.json({
            error: 'Error interno al procesar la solicitud',
            details: error.message
        }, { status: 500 });
    }
}
