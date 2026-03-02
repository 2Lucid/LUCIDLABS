
"use server";

import { model, generateWithFallback } from "@/lib/gemini";
import { supabase } from "@/lib/supabase";

function cleanJson(text: string) {
    // Remove markdown code blocks if present
    let clean = text.replace(/```json\n/g, "").replace(/```/g, "");
    return clean;
}

export async function generateQuiz(topic: string, difficulty: string) {
    const systemPrompt = `Tu es un assistant pédagogique niveau Terminale.
    Tu priorises le contexte réel fourni (cours/devoirs).
    Si le contexte est insuffisant, tu complètes strictement avec le programme officiel de Terminale des matières concernées (pas d'invention hors programme).
    Pour les Quiz, tu retournes strictement du JSON valide conforme au schéma fourni.`;

    // Strategy C: Quiz par Matière (Focus) from ANALYSE_IA_COMPLETE.md
    const prompt = `
    ${systemPrompt}

    EXIGENCES POUR LE QUIZ :
    - Génère EXACTEMENT 5 questions de type QCM uniquement.
    - Focus uniquement sur le sujet : "${topic}".
    - Niveau attendu : Terminale.
    - Difficulté attendue : ${difficulty}.
    - Chaque question QCM doit contenir : intitule (string), options (array de 4 strings), correctAnswer (string - l'une des options), explanation (string).
    - TITRE DU QUIZ : Doit être explicite, par exemple "Quiz de ${topic}".
    - GESTION DU MANQUE DE CONTENU : Tu DOIS te baser sur le NIVEAU SCOLAIRE (Terminale) pour générer des questions pertinentes du programme officiel.
    - Assure une répartition équitable des bonnes réponsess.

    FORMAT JSON STRICT :
    {
      "questions": [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctAnswer": "string",
          "explanation": "string"
        }
      ]
    }
    Retourne UNIQUEMENT le JSON valide.
  `;

    try {
        const { result, tokensUsed, promptTokens, responseTokens, modelUsed } = await generateWithFallback(prompt);
        const response = await result.response;
        const text = response.text();
        return {
            data: JSON.parse(cleanJson(text)),
            tokens: {
                total: tokensUsed,
                prompt: promptTokens,
                response: responseTokens
            },
            model: modelUsed
        };
    } catch (error) {
        console.error("Quiz generation error:", error);
        throw new Error("Failed to generate quiz");
    }
}

export async function generateFlashcards(sourceText: string) {
    const systemPrompt = `Tu es un assistant pédagogique niveau Terminale. 
    Tu crées des cartes mémoire (Flash Cards) efficaces pour la révision active.`;

    const prompt = `
    ${systemPrompt}

    SOURCE : "${sourceText.substring(0, 1000)}..."

    OBJECTIF :
    - Créer des cartes mémoire efficaces selon les principes de révision espacée.
    
    EXIGENCES :
    - Génère 5-10 cartes de révision pertinentes.
    - Focus sur : définitions clés, formules, dates importantes, vocabulaire, relations cause-effet.
    - "front" : Question courte ou terme à définir.
    - "back" : Réponse adaptée.
    - Si le contexte est léger, complète avec les connaissances générales du programme officiel.

    FORMAT JSON STRICT :
    {
      "cards": [
        {
          "front": "string",
          "back": "string"
        }
      ]
    }
    Retourne UNIQUEMENT le JSON valide.
    `;

    try {
        const { result } = await generateWithFallback(prompt);
        const response = await result.response;
        const text = response.text();
        return JSON.parse(cleanJson(text));
    } catch (error) {
        console.error("Flashcard generation error:", error);
        throw new Error("Failed to generate flashcards");
    }
}

export async function generateTutorChat(subject: string, persona: string) {
    const prompt = `
    Simulate a short educational chat (3 exchanges) between a user and a tutor with persona "${persona}" about "${subject}".
    Structure:
    {
      "conversation": [
        { "role": "tutor", "content": "string" },
        { "role": "user", "content": "string" },
        { "role": "tutor", "content": "string" }
      ]
    }
    Return ONLY valid JSON.
    `;

    try {
        const { result } = await generateWithFallback(prompt);
        const response = await result.response;
        const text = response.text();
        return JSON.parse(cleanJson(text));
    } catch (error) {
        console.error("Tutor chat generation error:", error);
        throw new Error("Failed to generate tutor chat");
    }
}

export async function saveEntry(type: 'quiz' | 'flashcard' | 'tutor_chat', subject: string, content: any) {
    const { data, error } = await supabase
        .from('lucid_labs_entries')
        .insert([
            {
                type,
                subject,
                content,
                is_validated: true,
                metadata: { source: "Lucid Forge AI" }
            }
        ])
        .select();

    if (error) {
        console.error("Supabase Save Error:", error);
        throw new Error(error.message);
    }
    return data;
}


export async function getDatasets() {
    const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Fetch Datasets Error:", error);
        return [];
    }
    return data;
}

export async function createDataset(name: string, description?: string) {
    const { data, error } = await supabase
        .from('datasets')
        .insert([{ name, description }])
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function getEntries(datasetId?: string) {
    let query = supabase
        .from('lucid_labs_entries')
        .select('*')
        .order('created_at', { ascending: false });

    // Filter by dataset if provided
    if (datasetId && datasetId !== 'all') {
        query = query.eq('dataset_id', datasetId);
    }

    const { data, error } = await query;

    if (error) {
        console.error("[getEntries] Fetch Error:", error);
        return [];
    }

    return data;
}

export async function deleteEntry(id: string) {
    const { error } = await supabase
        .from('lucid_labs_entries')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
    return { success: true };
}

export async function validateEntry(id: string) {
    const { error } = await supabase
        .from('lucid_labs_entries')
        .update({ is_validated: true })
        .eq('id', id);

    if (error) throw new Error(error.message);
    return { success: true };
}
