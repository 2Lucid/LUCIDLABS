// Run this with: node --loader ts-node/esm check-models.ts
// Or: npx tsx check-models.ts

import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = "AIzaSyBF4sR0rJHbb2MzsNgt3ozXtk5oOTS41ws";

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        console.log("Fetching available models...\n");

        // Note: The SDK might not have a direct listModels method exposed
        // So we'll try a different approach - test common models

        const modelsToTest = [
            "gemini-2.0-flash",
            "gemini-2.5-flash",
            "gemini-2.0-flash-lite",
            "gemini-1.5-pro",
            "gemini-1.5-flash",
            "gemini-pro",
            "models/gemini-2.0-flash",
            "models/gemini-pro"
        ];

        for (const modelName of modelsToTest) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Test");
                console.log(`✅ ${modelName} - WORKS`);
            } catch (error: any) {
                console.log(`❌ ${modelName} - ${error.message.substring(0, 100)}`);
            }
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
