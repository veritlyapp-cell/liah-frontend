/**
 * Liah Talent - AI Configuration
 * Uses Gemini 2.5+ models for corporate recruitment
 * SEPARATE from Liah Flow to avoid context mixing
 */
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// ============ SINGLETON INSTANCES ============
let talentAI: GoogleGenerativeAI | null = null;

/**
 * Get Talent-specific Gemini instance
 */
export function getTalentAI(): GoogleGenerativeAI {
    if (!talentAI) {
        const apiKey = process.env.GEMINI_API_KEY_TALENT || process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('GEMINI_API_KEY_TALENT is not configured');
        }

        talentAI = new GoogleGenerativeAI(apiKey);
    }

    return talentAI;
}

// ============ MODEL GETTERS BY TASK TYPE ============

/**
 * Pro model for complex reasoning with JSON output (CV Matching)
 */
export function getTalentModelPro(): GenerativeModel {
    const ai = getTalentAI();
    const modelName = process.env.GEMINI_MODEL_TALENT_PRO || 'gemini-2.5-pro';

    return ai.getGenerativeModel({
        model: modelName,
        generationConfig: {
            temperature: 0.3,        // Deterministic for scoring
            maxOutputTokens: 8192,
            responseMimeType: 'application/json'
        }
    });
}

/**
 * Pro model for text generation (JD Generation)
 */
export function getTalentModelProText(): GenerativeModel {
    const ai = getTalentAI();
    const modelName = process.env.GEMINI_MODEL_TALENT_PRO || 'gemini-2.5-pro';

    return ai.getGenerativeModel({
        model: modelName,
        generationConfig: {
            temperature: 0.7,        // More creative for JD writing
            maxOutputTokens: 8192,
        }
    });
}

/**
 * Flash model for speed (KQ evaluation, quick tasks)
 */
export function getTalentModelFast(): GenerativeModel {
    const ai = getTalentAI();
    const modelName = process.env.GEMINI_MODEL_TALENT_FAST || 'gemini-2.5-flash';

    return ai.getGenerativeModel({
        model: modelName,
        generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
        }
    });
}

/**
 * Lite model for high frequency simple tasks
 */
export function getTalentModelLite(): GenerativeModel {
    const ai = getTalentAI();
    const modelName = process.env.GEMINI_MODEL_TALENT_LITE || 'gemini-2.5-flash-lite';

    return ai.getGenerativeModel({
        model: modelName,
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
        }
    });
}

// ============ TALENT-SPECIFIC PROMPTS ============

export const TALENT_PROMPTS = {
    CV_MATCHING: `
Eres un experto reclutador senior con 20 años de experiencia evaluando candidatos corporativos.

## TU TAREA
Analizar la compatibilidad entre un CV y un Job Description (JD), considerando también las respuestas del candidato a las preguntas filtro.

## INPUT
### Job Description (Perfil del Puesto):
{JD_CONTENT}

### CV del Candidato (o datos extraídos):
{CV_CONTENT}

### Respuestas a Killer Questions:
{KILLER_RESPUESTAS}

## REGLAS DE EVALUACIÓN:
1. Analiza experiencia, habilidades y formación frente a los requisitos.
2. Si el candidato FALLA en un requisito obligatorio (ej: no tiene licencia requerida, no cumple disponibilidad), el matchScore debe ser < 30%.
3. Sé objetivo y basa tu análisis en evidencia.

## OUTPUT (JSON estricto)
{
  "matchScore": <número 0-100>,
  "summary_rationale": "<resumen ejecutivo de 2-3 oraciones>",
  "puntosFuertes": ["Fortaleza 1", "Fortaleza 2"],
  "puntosDebiles": ["Gap 1", "Gap 2"],
  "recomendacion": "Entrevistar / En espera / Descartar",
  "skill_breakdown": {
    "technical": {
      "score": <0-100>,
      "matched": ["skill1", "skill2"],
      "missing": ["skill3"]
    },
    "experience": {
      "score": <0-100>,
      "years_found": <número>,
      "relevant_roles": ["rol1", "rol2"]
    }
  }
}
`,

    JD_GENERATION: `
Genera una publicación de empleo profesional y atractiva para la siguiente posición.

## REGLAS IMPORTANTES:
1. NO uses introducciones como "Como experto...", "Aquí está el JD...", etc.
2. Empieza DIRECTAMENTE con el contenido de la publicación
3. El primer párrafo debe empezar con: "En {HOLDING_NAME} estamos en búsqueda de..."
4. Usa el nombre de la empresa real, no genérico
5. Tono: {TONO}
6. Slogan: {SLOGAN}
7. Instrucciones adicionales: {INSTRUCCIONES_IA}

## INPUT
### Empresa:
{HOLDING_NAME}

### Título del Puesto:
{TITULO}

### Perfil/Requisitos Base:
{DESCRIPCION_BASE}

### Beneficios Estándar:
{BENEFICIOS_ESTANDAR}

### JDs de Referencia (opcional):
{JDS_SIMILARES}

## OUTPUT (FORMATO EXACTO)
Genera el texto de la publicación con estas secciones:

**Resumen del puesto** (2-3 líneas que enganchen al candidato)

**¿Qué harás?**
• [Responsabilidad 1]
• [Responsabilidad 2]
• [5-8 bullets en total]

**¿Qué buscamos?**
• [Requisito obligatorio 1]
• [Requisito obligatorio 2]
• [4-6 bullets]

**Deseable:**
• [Requisito deseable 1]
• [3-4 bullets]

**¿Qué ofrecemos?**
• [Beneficio 1]
• [4-6 bullets, incluye los beneficios estándar si son relevantes]

IMPORTANTE: Genera SOLO el contenido de la publicación, sin comentarios adicionales.
`,

    CANDIDATE_SUMMARY: `
Resume el perfil del candidato en 3-5 bullet points destacando:
- Años de experiencia relevante
- Competencias principales
- Logros cuantificables
- Fit cultural potencial

CV:
{CV_CONTENT}

Puesto:
{JOB_TITLE}
`,

    KQ_EVALUATION: `
Evalúa si la respuesta del candidato cumple con el criterio esperado.

Pregunta: {QUESTION}
Respuesta esperada: {EXPECTED}
Respuesta del candidato: {ANSWER}

Responde solo con JSON:
{
  "passed": true/false,
  "reason": "<breve explicación>"
}
`
};

// ============ HELPER FUNCTIONS ============

export interface CVMatchResult {
    matchScore: number;
    summary_rationale: string;
    skill_breakdown: {
        technical: { score: number; matched: string[]; missing: string[] };
        experience: { score: number; years_required: number; years_found: number; relevant_roles: string[] };
        education: { score: number; required: string; found: string };
    };
    red_flags: string[];
    green_flags: string[];
}

/**
 * Analyze CV against JD
 */
export async function analyzeCVMatch(
    cvContent: string,
    jdContent: string,
    killerAnswers?: any
): Promise<any> {
    const model = getTalentModelPro();

    const prompt = TALENT_PROMPTS.CV_MATCHING
        .replace('{JD_CONTENT}', jdContent)
        .replace('{CV_CONTENT}', cvContent)
        .replace('{KILLER_RESPUESTAS}', killerAnswers ? JSON.stringify(killerAnswers) : 'No proporcionadas');

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        console.error('AI Raw Response:', text);
        throw new Error('Invalid AI response format');
    }

    return JSON.parse(jsonMatch[0]);
}

/**
 * Generate optimized JD
 */
export async function generateJD(
    titulo: string,
    descripcionBase: string,
    jdsSimilares: string[],
    holdingName?: string,
    publishConfig?: any
): Promise<string> {
    const model = getTalentModelProText();

    let tono = 'Profesional pero cercano, atractivo para candidatos';
    if (publishConfig?.tono === 'formal') tono = 'Corporativo, serio y muy profesional';
    if (publishConfig?.tono === 'dinamico') tono = 'Energético, moderno y ágil';

    const prompt = TALENT_PROMPTS.JD_GENERATION
        .replace(/{HOLDING_NAME}/g, holdingName || 'Nuestra empresa')
        .replace('{TITULO}', titulo)
        .replace('{DESCRIPCION_BASE}', descripcionBase)
        .replace('{TONO}', tono)
        .replace('{SLOGAN}', publishConfig?.slogan || '')
        .replace('{INSTRUCCIONES_IA}', publishConfig?.instruccionesIA || 'Sigue los estándares de la industria')
        .replace('{BENEFICIOS_ESTANDAR}', publishConfig?.beneficiosEstandar?.join(', ') || 'No especificados')
        .replace('{JDS_SIMILARES}', jdsSimilares.join('\n---\n') || 'No hay JDs de referencia');

    const result = await model.generateContent(prompt);
    return result.response.text();
}

/**
 * Generate candidate summary
 */
export async function generateCandidateSummary(cvContent: string, jobTitle: string): Promise<string> {
    const model = getTalentModelFast();

    const prompt = TALENT_PROMPTS.CANDIDATE_SUMMARY
        .replace('{CV_CONTENT}', cvContent)
        .replace('{JOB_TITLE}', jobTitle);

    const result = await model.generateContent(prompt);
    return result.response.text();
}
