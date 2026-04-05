"use server";

export async function evaluateGeneration(promptText: string, generationText: string): Promise<number | null> {
    if (!promptText || !generationText) return null;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY is not defined in env");
        // Fallback for demo purposes if no key is configured
        return Math.floor(Math.random() * 30) + 60; // 60-90
    }

    try {
        const payload = {
            contents: [{
                parts: [{
                    text: `Tu es un juge impitoyable spécialisé dans l'évaluation d'IA. Évalue la pertinence de la réponse générée par rapport au prompt.
Critères : 
- Ignore totalement la vitesse, le temps ou les performances matérielles.
- Juge la logique, la structuration, et l'absence d'hallucinations.
- Donne une note stricte entre 0 et 100.
Réponds UNIQUEMENT par la note globale finale (juste le nombre entier, rien d'autre). Ne donne aucune explication.

Prompt initial : 
${promptText}

Réponse générée :
${generationText}`
                }]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 10,
            }
        };

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
        const score = parseInt(scoreStr, 10);
        return isNaN(score) ? 50 : Math.min(100, Math.max(0, score));
    } catch (err) {
        console.error("Autopilot evaluation failed", err);
        return null;
    }
}
