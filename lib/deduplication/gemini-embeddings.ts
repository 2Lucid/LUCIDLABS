"use server";

import { supabase } from '@/lib/supabase';

/**
 * Génère un embedding vectoriel avec Gemini via REST API (SERVER ACTION)
 * Solution: L'ancien SDK ne supporte pas les embeddings, on utilise l'API REST
 */
async function generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
        throw new Error("GOOGLE_GENERATIVE_AI_API_KEY non configurée");
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: {
                        parts: [{
                            text: text
                        }]
                    },
                    taskType: "SEMANTIC_SIMILARITY",
                    outputDimensionality: 768  // Dimension optimale
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Gemini erreur ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        // Normaliser l'embedding (requis pour dimensions < 3072)
        const values = data.embedding.values;
        const norm = Math.sqrt(values.reduce((sum: number, val: number) => sum + val * val, 0));
        const normalized = values.map((val: number) => val / norm);

        console.log(`[Dedup] ✅ Embedding généré (${normalized.length} dimensions)`);
        return normalized;

    } catch (error) {
        console.error("[Dedup] Erreur génération embedding:", error);
        throw error;
    }
}

/**
 * Vérifie si une question/réponse est un doublon sémantique (SERVER ACTION)
 */
export async function isDuplicate(
    question: string,
    answer: string,
    threshold: number = 0.95
): Promise<boolean> {

    try {
        const text = `${question} ${answer}`;
        const embedding = await generateEmbedding(text);

        const { data, error } = await supabase.rpc('find_semantic_duplicates', {
            query_embedding: embedding,
            similarity_threshold: threshold,
        });

        if (error) {
            console.error("[Dedup] Erreur Supabase:", error);
            return false;
        }

        const hasDuplicate = data && data.length > 0;

        if (hasDuplicate) {
            console.log(`[Dedup] 🔁 Doublon détecté ! Similarité: ${(data[0].similarity * 100).toFixed(1)}%`);
        }

        return hasDuplicate;

    } catch (error) {
        console.error("[Dedup] Erreur vérification doublon:", error);
        return false;  // En cas d'erreur, on ne bloque pas la sauvegarde
    }
}

/**
 * Sauvegarde un quiz avec son embedding vectoriel (SERVER ACTION)
 */
export async function saveQuizWithEmbedding(quiz: any): Promise<void> {

    try {
        const text = `${quiz.content.question} ${quiz.content.correctAnswer}`;
        const embedding = await generateEmbedding(text);

        // Préparer metadata (sans redondance)
        const metadata = {
            ...quiz.metadata,
            judge_score: quiz.judge_score || null,
            judge_feedback: quiz.judge_feedback || null
        };

        console.log(`[Dedup] Saving quiz to Supabase... Type: ${quiz.resource_type}, Subject: ${quiz.metadata.topic}`);

        const { data, error } = await supabase
            .from('lucid_labs_entries')
            .insert([{
                type: quiz.resource_type,
                subject: quiz.metadata.topic,
                content: quiz.content,
                metadata: metadata,
                embedding: embedding,
                is_validated: quiz.approved || false,
                // Remplir les colonnes dédiées (votre schéma)
                tokens_total: quiz.tokens?.total || 0,
                tokens_prompt: quiz.tokens?.prompt || 0,
                tokens_response: quiz.tokens?.response || 0,
                model_used: quiz.model || 'gemini-2.5-flash'
            }])
            .select();

        if (error) {
            console.error("[Dedup] ❌ Erreur Supabase INSERT:", JSON.stringify(error, null, 2));
            throw new Error(`Erreur lors de la sauvegarde: ${error.message}`);
        }

        console.log("[Dedup] ✅ Quiz sauvegardé ! ID:", data?.[0]?.id);

    } catch (error) {
        console.error("[Dedup] Erreur sauvegarde:", error);
        throw error;
    }
}
