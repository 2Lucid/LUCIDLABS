import { z } from "zod";

// Schéma pour le contenu du quiz (format Gemini)
export const QuizContentSchema = z.object({
    question: z.string()
        .min(20, "Question trop courte (min 20 caractères)")
        .max(500, "Question trop longue (max 500 caractères)"),

    options: z.array(z.string())
        .length(4, "Il faut exactement 4 options"),

    // Gemini génère "correctAnswer" en camelCase
    correctAnswer: z.string()
        .min(1, "La réponse correcte ne peut pas être vide"),

    explanation: z.string()
        .min(50, "L'explication est trop courte (min 50 caractères)"),
});

// Schéma pour les métadonnées
export const QuizMetadataSchema = z.object({
    subject: z.string(),
    level: z.string(),
    topic: z.string(),
    difficulty: z.enum(["Facile", "Moyen", "Difficile", "Expert"]),
});

// Schéma complet du quiz
export const QuizItemSchema = z.object({
    resource_type: z.literal("quiz"),
    metadata: QuizMetadataSchema,
    content: QuizContentSchema,
});

// Type TypeScript dérivé du schéma
export type QuizItem = z.infer<typeof QuizItemSchema>;

/**
 * Valide un quiz et retourne le résultat avec erreurs si présentes
 */
export function validateQuiz(data: unknown): {
    success: boolean;
    data?: QuizItem;
    errors?: string[]
} {
    const result = QuizItemSchema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    // Extraire les erreurs de manière lisible
    const errors = result.error.issues.map((err: any) =>
        `${err.path.join('.')}: ${err.message}`
    );

    return { success: false, errors };
}
