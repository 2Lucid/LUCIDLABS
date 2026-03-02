
"use client";

import { useState } from "react";
import { Zap, Save, RefreshCw } from "lucide-react";
import { generateFlashcards, saveEntry } from "@/app/actions";

export function FlashcardGenerator() {
    const [sourceText, setSourceText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const data = await generateFlashcards(sourceText);
            setResult(data);
        } catch (e) {
            console.error(e);
            alert("Generation failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!result) return;
        try {
            // Use first 50 chars as subject for flashcards
            const subject = sourceText.substring(0, 50) + "...";
            await saveEntry('flashcard', subject, result);
            alert("Saved to database!");
            setResult(null);
            setSourceText("");
        } catch (e: any) {
            console.error(e);
            alert("Save failed: " + e.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-card border border-border p-6 rounded-xl">
                    <h3 className="font-semibold mb-4 text-foreground">Source Material</h3>
                    <textarea
                        value={sourceText}
                        onChange={(e) => setSourceText(e.target.value)}
                        className="w-full h-[300px] bg-input border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        placeholder="Paste text content here to generate flashcards..."
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !sourceText}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                    >
                        {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        Generate Flashcards
                    </button>
                </div>

                <div className="bg-card border border-border p-6 rounded-xl h-full min-h-[400px]">
                    <h3 className="font-semibold mb-4 text-foreground">Preview</h3>
                    {result ? (
                        <div className="space-y-4">
                            <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[300px] text-xs font-mono text-muted-foreground">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                            <button
                                onClick={handleSave}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" /> Save Flashcards
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                            <Zap className="w-12 h-12 mb-4 opacity-20" />
                            <p>Waiting for source text</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
