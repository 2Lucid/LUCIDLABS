
"use client";

import { useState } from "react";
import { QuizGenerator } from "@/components/generator/QuizGenerator";
import { FlashcardGenerator } from "@/components/generator/FlashcardGenerator";
import { TutorGenerator } from "@/components/generator/TutorGenerator";
import { clsx } from "clsx";
import { motion } from "framer-motion";

type Tab = "quiz" | "flashcard" | "tutor";

export default function GeneratorPage() {
    const [activeTab, setActiveTab] = useState<Tab>("quiz");

    const tabs: { id: Tab; label: string }[] = [
        { id: "quiz", label: "Quiz Forge" },
        { id: "flashcard", label: "Flashcard Factory" },
        { id: "tutor", label: "Tutor Simulator" },
    ];

    return (
        <div className="space-y-8 pb-10">
            <div className="relative">
                <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-secondary/20 rounded-full blur-[100px] pointer-events-none" />

                <h2 className="text-4xl font-bold tracking-tight text-white relative z-10 drop-shadow-lg">
                    Generator <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Studio</span>
                </h2>
                <p className="text-muted-foreground mt-2 relative z-10 max-w-lg text-lg">
                    Initialize AI fabrication sequences. Select a module to begin data synthesis.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                            "relative group p-6 rounded-2xl border transition-all duration-500 overflow-hidden text-left",
                            activeTab === tab.id
                                ? "bg-primary/10 border-primary/50 shadow-[0_0_30px_rgba(6,182,212,0.3)]"
                                : "bg-card/40 border-white/10 hover:bg-white/5 hover:border-white/20"
                        )}
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${activeTab === tab.id ? 'from-primary/20 to-secondary/20 opacity-100' : 'from-white/5 to-transparent'}`} />

                        <div className="relative z-10 flex flex-col h-full">
                            <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors", activeTab === tab.id ? "bg-primary text-white shadow-lg" : "bg-white/10 text-muted-foreground group-hover:text-white")}>
                                {tab.id === 'quiz' && <div className="font-bold text-xl">Q</div>}
                                {tab.id === 'flashcard' && <div className="font-bold text-xl">F</div>}
                                {tab.id === 'tutor' && <div className="font-bold text-xl">T</div>}
                            </div>
                            <h3 className={clsx("text-lg font-bold mb-1 transition-colors", activeTab === tab.id ? "text-white" : "text-gray-300 group-hover:text-white")}>{tab.label}</h3>
                            <p className="text-xs text-muted-foreground">Launch {tab.label.toLowerCase()} generation info-stream.</p>

                            {activeTab === tab.id && (
                                <motion.div layoutId="glow" className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
                            )}
                        </div>
                    </button>
                ))}
            </div>

            <div className="pt-4 relative min-h-[500px]">
                {activeTab === "quiz" && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <QuizGenerator />
                    </motion.div>
                )}
                {activeTab === "flashcard" && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <FlashcardGenerator />
                    </motion.div>
                )}
                {activeTab === "tutor" && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <TutorGenerator />
                    </motion.div>
                )}
            </div>
        </div>
    );
}
