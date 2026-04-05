"use server";

import { createClient } from "@supabase/supabase-js";

export async function evaluateGeneration(promptText: string, generationText: string): Promise<{ score: number, reasoning: string } | null> {
    if (!promptText || !generationText) return null;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY is not defined in env");
        // Fallback for demo purposes if no key is configured
        return { score: Math.floor(Math.random() * 30) + 60, reasoning: "Fallback local test sans clé API" };
    }

    try {
        const payload = {
            contents: [{
                parts: [{
                    text: `Tu es un juge IA pointu, spécialisé dans l'évaluation de matériel pédagogique (quiz, flashcards, synthèses). Évalue la PERTINENCE de la réponse générée par rapport au prompt.
Critères : 
- Ignore la vitesse de génération. Concentre-toi sur le contenu.
- Les réponses fausses, illogiques ou "hors-sujet" doivent être sévèrement punies (hallucinations = note < 30).
- Le format demandé (JSON structuré, liste de questions) doit être respecté (pénalité si non respecté).
- Donne une note stricte entre 0 et 100.
Explique brièvement ton raisonnement dans le champ 'reasoning' EN FRANCAIS.

Prompt initial : 
${promptText}

Réponse générée :
${generationText}`
                }]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1024,  // Laisse la place pour la "pensée" interne
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        score: {
                            type: "INTEGER",
                            description: "La note globale sur 100"
                        },
                        reasoning: {
                            type: "STRING",
                            description: "Explication courte en français de la note"
                        }
                    },
                    required: ["score", "reasoning"]
                }
            }
        };

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            console.error("Gemini API Error", await res.text());
            return null;
        }

        const data = await res.json();
        const scoreStr = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!scoreStr) return null;

        try {
            const cleanStr = scoreStr.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanStr);
            const score = parseInt(parsed.score, 10);
            return {
                score: isNaN(score) ? 50 : Math.min(100, Math.max(0, score)),
                reasoning: parsed.reasoning || "Aucune explication fournie."
            };
        } catch (e) {
            console.error("Failed to parse Gemini JSON:", scoreStr);
            return { score: 50, reasoning: "Erreur de parsing de l'explication" };
        }
    } catch (err) {
        console.error("Autopilot evaluation failed", err);
        return null;
    }
}

export async function saveScoreToSupabase(id: string, newGlobalScore: number, rawMetadata: any) {
    const supabaseUrl = process.env.NEXT_PUBLIC_BENCHMARK_SUPABASE_URL;
    const supabaseKey = process.env.BENCHMARK_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) { return { error: { message: "Server configuration missing keys" } }; }

    const supabase = createClient(supabaseUrl, supabaseKey);
    return await supabase.from('ai_benchmarks').update({
        score_global: newGlobalScore,
        ai_judged: true,
        auto_judge_score: rawMetadata.auto_judge_score,
        auto_judge_reasoning: rawMetadata.auto_judge_reasoning,
        manual_judge_score: rawMetadata.manual_judge_score,
        raw_metadata: rawMetadata
    }).eq('id', id);
}

export async function resetAllJudgeScores() {
    const supabaseUrl = process.env.NEXT_PUBLIC_BENCHMARK_SUPABASE_URL;
    const supabaseKey = process.env.BENCHMARK_SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) { return { error: { message: "Server configuration missing keys" } }; }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // High-performance Postgres function that handles all rows in one transaction
    const { error } = await supabase.rpc('reset_benchmarks');

    if (error) {
        console.error("RPC reset_benchmarks failed:", error);
        return { error };
    }

    return { success: true };
}
