
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

// Load env from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;

if (!supabaseUrl || !supabaseKey || !geminiKey) {
    console.error("❌ Missing environment variables in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiKey);

// --- SCHEMAS ---
const QuizContentSchema = z.object({
    question: z.string().min(20).max(500),
    options: z.array(z.string()).length(4),
    correctAnswer: z.string().min(1),
    explanation: z.string().min(50),
});

// --- LOGGING ---
const log = (msg: string) => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);

async function generateWithFallback(prompt: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    return result;
}

async function judgeQuiz(quiz: any, topic: string) {
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { temperature: 0.3, responseMimeType: "application/json" }
    });

    const prompt = `Tu es un expert pédagogue français. Évalue ce quiz sur "${topic}".
    Question : ${quiz.question}
    Options : ${quiz.options.join(' | ')}
    Réponse : ${quiz.correctAnswer}
    
    Réponds en JSON :
    {
      "factual_accuracy": 0-5,
      "distractor_quality": 0-5,
      "pedagogical_value": 0-5,
      "overall_score": 0-5,
      "feedback": "string"
    }`;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
}

async function runMiningCycle() {
    log("🎲 Début du cycle...");

    // 1. Tirer un sujet pseudo-aléatoire (Simulé ici, pourrait appeler gemini-curriculum logic)
    const subjects = ["Mathématiques", "Physique", "SVT", "Histoire", "Géographie", "SES", "Philo"];
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    const topic = `${subject} - Sujet Aléatoire (Terminale)`;

    log(`📚 Sujet : ${topic}`);

    // 2. Générer
    const prompt = `Génère un quiz de 5 questions sur "${topic}" pour Terminale. Format JSON strict : {"questions": [...]}.`;
    const genResult = await generateWithFallback(prompt);
    const rawData = JSON.parse(genResult.response.text().replace(/```json|```/g, '').trim());

    const questions = rawData.questions || [];
    log(`🤖 ${questions.length} questions générées.`);

    for (const q of questions) {
        try {
            // 3. Valider structure
            const valid = QuizContentSchema.safeParse(q);
            if (!valid.success) {
                log("❌ Échec validation structurelle");
                continue;
            }

            // 4. Juge
            const evaluation = await judgeQuiz(q, topic);
            log(`⚖️ Score Juge : ${evaluation.overall_score}/5`);

            if (evaluation.overall_score >= 4.0) {
                // 5. Sauvegarder
                const { error } = await supabase.from('lucid_labs_entries').insert([{
                    type: 'quiz',
                    subject: topic,
                    content: q,
                    is_validated: true,
                    metadata: {
                        source: "Miner Studio",
                        judge_score: evaluation.overall_score,
                        judge_feedback: evaluation.feedback
                    }
                }]);

                if (error) log(`❌ Erreur Supabase : ${error.message}`);
                else log("✅ Question sauvegardée !");
            } else {
                log("⚠️ Question rejetée par le juge.");
            }
        } catch (e: any) {
            log(`⚠️ Erreur question : ${e.message}`);
        }
    }
}

// Main loop
async function main() {
    log("🚀 Lancement du Miner Headless...");
    while (true) {
        try {
            await runMiningCycle();
        } catch (e: any) {
            log(`🛑 Erreur critique cycle : ${e.message}`);
        }
        log("⏳ Attente 5s avant prochain cycle...");
        await new Promise(r => setTimeout(r, 5000));
    }
}

main();
