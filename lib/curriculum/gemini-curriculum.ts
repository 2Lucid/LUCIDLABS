"use server";

import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export interface CurriculumTopic {
    id?: string;
    topic: string;
    subject: string;
    level: string;
    difficulty?: string;
}

// Track recently used topics to avoid repetition within a session
let recentTopics: string[] = [];
const MAX_RECENT = 30;

function addToRecent(topic: string) {
    recentTopics.push(topic);
    if (recentTopics.length > MAX_RECENT) {
        recentTopics = recentTopics.slice(-MAX_RECENT);
    }
}

/**
 * Génère un nouveau sujet de curriculum avec Gemini (SERVER ACTION)
 * Envoie la liste des sujets récents pour éviter les répétitions
 */
export async function generateRandomTopic(): Promise<CurriculumTopic> {
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
            temperature: 1.2, // Plus de créativité
            responseMimeType: "application/json",
        },
    });

    // Build avoid list from recent topics
    const avoidList = recentTopics.length > 0
        ? `\n\n**SUJETS DÉJÀ TRAITÉS (NE PAS RÉPÉTER)** :\n${recentTopics.map(t => `- ${t}`).join('\n')}`
        : '';

    const prompt = `Tu es un expert du système éducatif français.

**TÂCHE** : Génère UN sujet aléatoire du programme scolaire français (Collège 6ème → Terminale).

**RÈGLES STRICTES** :
1. Le sujet DOIT être tiré du programme officiel de l'Éducation Nationale
2. Varie les matières : Mathématiques, Français, Histoire, Géographie, SVT, Physique-Chimie, SES, Philosophie, HGGSP, Arts, Musique, EPS, Technologie, Langues (Anglais, Espagnol, Allemand), NSI, EMC...
3. Varie les niveaux : 6ème, 5ème, 4ème, 3ème, 2nde, 1ère, Terminale
4. Sois TRÈS SPÉCIFIQUE (pas "Les maths", mais "Les équations du second degré - Discriminant et racines")
5. INTERDICTION de répéter un sujet déjà traité (voir liste ci-dessous)
6. Privilégie des sujets ORIGINAUX et VARIÉS${avoidList}

**FORMAT JSON STRICT** :
{
  "topic": "<Matière> - <Sujet précis> (<Niveau>)",
  "subject": "<Matière>",
  "level": "<Collège ou Lycée>",
  "difficulty": "<Facile, Moyen ou Difficile>"
}

Génère MAINTENANT un nouveau sujet unique et DIFFÉRENT de tous ceux listés ci-dessus :`;

    try {
        const result = await model.generateContent(prompt);
        const text = await result.response.text();
        const cleanText = text.replace(/```json|```/g, '').trim();
        const topicData = JSON.parse(cleanText);

        console.log(`[Curriculum] Sujet généré: ${topicData.topic}`);
        addToRecent(topicData.topic);
        return topicData;

    } catch (error) {
        console.error("[Curriculum] Erreur génération sujet:", error);
        return {
            topic: "Mathématiques - Théorème de Pythagore (4ème)",
            subject: "Mathématiques",
            level: "Collège",
            difficulty: "Moyen",
        };
    }
}

/**
 * Sauvegarde un nouveau sujet dans la base de données (SERVER ACTION)
 */
export async function saveTopic(topic: CurriculumTopic): Promise<string | null> {
    try {
        const { data: existing } = await supabase
            .from('french_curriculum')
            .select('id, topic')
            .eq('topic', topic.topic)
            .single();

        if (existing) {
            console.log(`[Curriculum] Sujet déjà existant, réutilisation`);
            return existing.id;
        }

        const { data, error } = await supabase
            .from('french_curriculum')
            .insert([{
                topic: topic.topic,
                subject: topic.subject,
                level: topic.level,
                difficulty: topic.difficulty || 'Moyen',
                source: 'gemini',
                is_validated: false,
            }])
            .select('id')
            .single();

        if (error) {
            console.error("[Curriculum] Erreur sauvegarde:", error);
            return null;
        }

        console.log(`[Curriculum] ✅ Nouveau sujet sauvegardé: ${topic.topic}`);
        return data.id;

    } catch (error) {
        console.error("[Curriculum] Erreur:", error);
        return null;
    }
}

/**
 * Incrémente le compteur d'utilisation (SERVER ACTION)
 */
export async function incrementTopicUsage(topicId: string): Promise<void> {
    try {
        await supabase.rpc('increment_topic_usage', { topic_id: topicId });
    } catch (error) {
        console.error("[Curriculum] Erreur incrément usage:", error);
    }
}

/**
 * Met à jour les statistiques (SERVER ACTION)
 */
export async function updateTopicStats(
    topic: string,
    judgeScore: number,
    success: boolean
): Promise<void> {
    try {
        await supabase.rpc('update_topic_stats', {
            p_topic: topic,
            p_judge_score: judgeScore,
            p_success: success,
        });
    } catch (error) {
        console.error("[Curriculum] Erreur update stats:", error);
    }
}

/**
 * Récupère un sujet équilibré depuis la BDD (SERVER ACTION)
 * Priorise les sujets les moins utilisés et évite les récents
 */
export async function getBalancedTopic(): Promise<CurriculumTopic | null> {
    try {
        // Fetch multiple candidates and filter out recent ones
        const { data, error } = await supabase
            .from('french_curriculum')
            .select('*')
            .order('usage_count', { ascending: true })
            .limit(20);

        if (error || !data || data.length === 0) {
            console.log("[Curriculum] Aucun sujet en BDD, génération par Gemini");
            return null;
        }

        // Filter out recently used topics
        const available = data.filter((t: any) => !recentTopics.includes(t.topic));

        if (available.length === 0) {
            console.log("[Curriculum] Tous les sujets BDD sont récents, génération par Gemini");
            return null;
        }

        // Pick a random one from the least-used candidates
        const picked = available[Math.floor(Math.random() * Math.min(available.length, 5))];
        addToRecent(picked.topic);
        return picked;

    } catch (error) {
        console.error("[Curriculum] Erreur get balanced:", error);
        return null;
    }
}

/**
 * Stratégie hybride (SERVER ACTION)
 * 70% BDD (mais avec filtre anti-doublons) / 30% Gemini (nouveaux sujets)
 */
export async function getOrGenerateTopic(): Promise<CurriculumTopic> {
    const useDatabase = Math.random() < 0.7;

    if (useDatabase) {
        const dbTopic = await getBalancedTopic();
        if (dbTopic) {
            console.log(`[Curriculum] 🗂️ Sujet depuis BDD: ${dbTopic.topic}`);
            return dbTopic;
        }
    }

    console.log(`[Curriculum] 🤖 Gemini génère un nouveau sujet...`);
    const newTopic = await generateRandomTopic();

    const topicId = await saveTopic(newTopic);
    if (topicId) {
        newTopic.id = topicId;
    }

    return newTopic;
}
