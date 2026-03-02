"use server";

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export interface JudgeResult {
    factual_accuracy: number;
    distractor_quality: number;
    pedagogical_value: number;
    instruction_adherence: number;
    overall_score: number;
    feedback: string;
    approved: boolean;
}

/**
 * Évalue la qualité pédagogique d'un quiz (SERVER ACTION)
 */
export async function judgeQuiz(
    quiz: any,
    expectedTopic: string,
    expectedDifficulty: string
): Promise<JudgeResult> {

    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
        },
    });

    const prompt = `Tu es un expert pédagogue français chargé d'évaluer la qualité d'un quiz éducatif.

**Sujet attendu** : ${expectedTopic}
**Difficulté attendue** : ${expectedDifficulty}

**Quiz à évaluer** :
Question : ${quiz.content.question}
Options : ${quiz.content.options.join(' | ')}
Réponse correcte : ${quiz.content.correctAnswer}
Explication : ${quiz.content.explanation}

**Grille d'évaluation (0-5 par critère)** :

1. **Exactitude factuelle** (0-5) :
   - La réponse marquée comme correcte est-elle rigoureusement exacte ?
   - Y a-t-il des erreurs scientifiques, historiques ou factuelles ?
   - L'explication est-elle factuellement correcte ?

2. **Qualité des distracteurs** (0-5) :
   - Les mauvaises réponses sont-elles plausibles mais fausses ?
   - Évitent-elles les pièges trop évidents (dates absurdes, anachronismes) ?
   - Testent-elles vraiment la compréhension du sujet ?

3. **Valeur pédagogique** (0-5) :
   - La question teste-t-elle la compréhension profonde ou juste la mémorisation ?
   - L'explication apporte-t-elle une réelle valeur éducative ?
   - Le vocabulaire est-il adapté au niveau scolaire visé ?

4. **Respect des consignes** (0-5) :
   - Le sujet demandé est-il bien abordé ?
   - Le niveau de difficulté "${expectedDifficulty}" est-il respecté ?
   - La question est-elle pertinente pour le programme français ?

**IMPORTANT** : Réponds UNIQUEMENT en JSON valide (sans markdown) :

{
  "factual_accuracy": <note de 0 à 5>,
  "distractor_quality": <note de 0 à 5>,
  "pedagogical_value": <note de 0 à 5>,
  "instruction_adherence": <note de 0 à 5>,
  "overall_score": <moyenne des 4 notes>,
  "feedback": "<Explication concise en 2-3 phrases>"
}`;

    try {
        const result = await model.generateContent(prompt);
        const text = await result.response.text();

        const cleanText = text.replace(/```json|```/g, '').trim();
        const rubric = JSON.parse(cleanText);

        rubric.approved = rubric.overall_score >= 4.0;

        console.log(`[Gemini Judge] Score: ${rubric.overall_score.toFixed(1)}/5 | Approuvé: ${rubric.approved}`);

        return rubric;

    } catch (error) {
        console.error("[Gemini Judge] Erreur:", error);
        throw new Error("Erreur lors de l'évaluation par le juge");
    }
}
