
"use client";

import { useState } from "react";
import { Zap, Save, RefreshCw, MessageSquare } from "lucide-react";
import { generateTutorChat, saveEntry } from "@/app/actions";

export function TutorGenerator() {
    const [subject, setSubject] = useState("");
    const [persona, setPersona] = useState("Socratic");
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const data = await generateTutorChat(subject, persona);
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
            await saveEntry('tutor_chat', subject, result);
            alert("Saved to database!");
            setResult(null);
        } catch (e: any) {
            console.error(e);
            alert("Save failed: " + e.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-card border border-border p-6 rounded-xl">
                    <h3 className="font-semibold mb-4 text-foreground">Simulation Config</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-muted-foreground">Subject</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="e.g. History of Rome"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-muted-foreground">Tutor Persona</label>
                            <select
                                value={persona}
                                onChange={(e) => setPersona(e.target.value)}
                                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option>Socratic</option>
                                <option>Direct Instruction</option>
                                <option>Debater</option>
                            </select>
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading || !subject}
                            className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                        >
                            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                            Simulate Chat
                        </button>
                    </div>
                </div>

                <div className="bg-card border border-border p-6 rounded-xl h-full min-h-[400px]">
                    <h3 className="font-semibold mb-4 text-foreground">Conversation Preview</h3>
                    {result ? (
                        <div className="space-y-4">
                            <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[300px] text-xs font-mono text-muted-foreground">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                            <button
                                onClick={handleSave}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" /> Save Simulation
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                            <p>No conversation simulated</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
