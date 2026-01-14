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
        const apiKey = process.env.GEMINI_API_KEY_TALENT || process.env.GEMINI_API_KEY;

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
    const modelName = process.env.GEMINI_MODEL_TALENT_PRO || 'gemini-2.0-flash';

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
Analizar la compatibilidad entre un CV y un Job Description (JD).

## INPUT
### Job Description:
{JD_CONTENT}

### CV del Candidato:
{CV_CONTENT}

## OUTPUT (JSON estricto)
{
  "matchScore": <número 0-100>,
  "summary_rationale": "<2-3 oraciones explicando el match>",
  "skill_breakdown": {
    "technical": {
      "score": <0-100>,
      "matched": ["skill1", "skill2"],
      "missing": ["skill3"]
    },
    "experience": {
      "score": <0-100>,
      "years_required": <número>,
      "years_found": <número>,
      "relevant_roles": ["rol1", "rol2"]
    },
    "education": {
      "score": <0-100>,
      "required": "<requisito del JD>",
      "found": "<lo que tiene el candidato>"
    }
  },
  "red_flags": ["<alertas>"],
  "green_flags": ["<aspectos destacados>"]
}

## SCORING GUIDELINES
- 85-100: Excelente match, cumple o excede todos los requisitos
- 70-84: Buen match, cumple requisitos principales
- 50-69: Match parcial, faltan algunas competencias
- 30-49: Match bajo, gaps significativos
- 0-29: No apto para el puesto

## IMPORTANTE
- Sé objetivo y basado en evidencia del CV
- No inventes información no presente
- Considera transferable skills
- Penaliza si faltan requisitos "obligatorios"
`,

    JD_GENERATION: `
Eres un experto en redacción de Job Descriptions corporativos para empresas líderes.

## TU TAREA
Generar un JD profesional y atractivo basado en el perfil proporcionado.

## INPUT
### Título del Puesto:
{TITULO}

### Descripción Base:
{DESCRIPCION_BASE}

### JDs Exitosos Similares (referencia):
{JDS_SIMILARES}

## OUTPUT
Genera un JD optimizado que incluya:
1. **Resumen del puesto** (2-3 líneas atractivas)
2. **Responsabilidades principales** (5-8 bullets)
3. **Requisitos obligatorios** (4-6 bullets)
4. **Requisitos deseables** (3-4 bullets)
5. **Beneficios** (4-6 bullets)

Tono: Profesional pero accesible. Evita jerga excesiva.
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
export async function analyzeCVMatch(cvContent: string, jdContent: string): Promise<CVMatchResult> {
    const model = getTalentModelPro();

    const prompt = TALENT_PROMPTS.CV_MATCHING
        .replace('{JD_CONTENT}', jdContent)
        .replace('{CV_CONTENT}', cvContent);

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Invalid AI response format');
    }

    return JSON.parse(jsonMatch[0]) as CVMatchResult;
}

/**
 * Generate optimized JD
 */
export async function generateJD(titulo: string, descripcionBase: string, jdsSimilares: string[]): Promise<string> {
    const model = getTalentModelProText();

    const prompt = TALENT_PROMPTS.JD_GENERATION
        .replace('{TITULO}', titulo)
        .replace('{DESCRIPCION_BASE}', descripcionBase)
        .replace('{JDS_SIMILARES}', jdsSimilares.join('\n---\n'));

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
