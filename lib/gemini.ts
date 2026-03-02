
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;

if (!apiKey) {
    console.warn("Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(apiKey || "dummy-key");

// Try these models in order (user specified)
const modelsToTry = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.0-flash-lite"];

let selectedModel = modelsToTry[0];
console.log(`[Gemini] Using model: ${selectedModel}`);

export const model = genAI.getGenerativeModel({ model: selectedModel });

// Helper function to try generating with fallback
export async function generateWithFallback(prompt: string) {
    for (const modelName of modelsToTry) {
        try {
            console.log(`[Gemini] Attempting generation with: ${modelName}`);
            const tempModel = genAI.getGenerativeModel({ model: modelName });
            const result = await tempModel.generateContent(prompt);

            // Extract real token usage
            const usage = result.response.usageMetadata;
            console.log(`[Gemini] Success with model: ${modelName}`);
            console.log(`[Gemini] Tokens: ${usage?.totalTokenCount || 'unknown'} (prompt: ${usage?.promptTokenCount}, response: ${usage?.candidatesTokenCount})`);

            return {
                result,
                modelUsed: modelName,
                tokensUsed: usage?.totalTokenCount || 0,
                promptTokens: usage?.promptTokenCount || 0,
                responseTokens: usage?.candidatesTokenCount || 0
            };
        } catch (error: any) {
            console.warn(`[Gemini] Model ${modelName} failed:`, error.message);
            if (modelName === modelsToTry[modelsToTry.length - 1]) {
                throw error; // Last model failed, throw
            }
            // Continue to next model
        }
    }
    throw new Error("All models failed"); // Fallback error
}
