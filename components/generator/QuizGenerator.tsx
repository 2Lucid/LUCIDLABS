
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Zap, Save, RefreshCw, Cpu, BrainCircuit, CheckCircle, Sparkles, Pause, Play, Database, Plus, Users } from "lucide-react";
import { generateQuiz, saveEntry, getDatasets, createDataset } from "@/app/actions";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

// Quality Control Imports
import { validateQuiz } from "@/lib/schemas/quiz.schema";
import { judgeQuiz } from "@/lib/judge/gemini-judge";
import { isDuplicate, saveQuizWithEmbedding } from "@/lib/deduplication/gemini-embeddings";

// Dynamic Curriculum
import { getOrGenerateTopic, incrementTopicUsage, updateTopicStats } from "@/lib/curriculum/gemini-curriculum";

export function QuizGenerator() {
    const [status, setStatus] = useState<'idle' | 'mining' | 'success' | 'paused'>('idle');
    const [currentTopic, setCurrentTopic] = useState("");
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [generatedCount, setGeneratedCount] = useState(0);
    const [result, setResult] = useState<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Workers
    const [workerCount, setWorkerCount] = useState(2);
    const [activeWorkers, setActiveWorkers] = useState(0);
    const workerRefs = useRef<{ stop: boolean }>({ stop: false });

    // Dataset Selection
    const [datasets, setDatasets] = useState<any[]>([]);
    const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
    const [showDatasetModal, setShowDatasetModal] = useState(false);
    const [newDatasetName, setNewDatasetName] = useState("");

    // Recent results feed
    const [resultsFeed, setResultsFeed] = useState<any[]>([]);

    useEffect(() => {
        getDatasets().then(data => {
            setDatasets(data || []);
            if (data && data.length > 0) setSelectedDatasetId(data[0].id);
        });
    }, []);

    const handleCreateDataset = async () => {
        if (!newDatasetName) return;
        try {
            const newDataset = await createDataset(newDatasetName, "Créé depuis le Generator Studio");
            setDatasets([newDataset, ...datasets]);
            setSelectedDatasetId(newDataset.id);
            setNewDatasetName("");
            setShowDatasetModal(false);
        } catch (e) {
            console.error("Failed to create dataset", e);
        }
    };

    const addLog = useCallback((msg: string, workerId?: number) => {
        const prefix = workerId !== undefined ? `[W${workerId}]` : '';
        setLogs(prev => [...prev.slice(-8), `[${new Date().toLocaleTimeString()}] ${prefix} ${msg}`]);
    }, []);

    // Single mining cycle that processes ALL questions from one API call
    const miningCycle = useCallback(async (workerId: number) => {
        if (workerRefs.current.stop) return;

        try {
            // 1. SÉLECTION DYNAMIQUE DU SUJET
            addLog(`🎲 Sélection sujet...`, workerId);
            const selectedTopic = await getOrGenerateTopic();
            setCurrentTopic(prev => selectedTopic.topic);
            addLog(`📚 ${selectedTopic.topic}`, workerId);
            setProgress(10);

            if (selectedTopic.id) {
                await incrementTopicUsage(selectedTopic.id);
            }

            // 2. Génération via Gemini (returns 5 questions)
            addLog(`🤖 Gemini génère 5 questions...`, workerId);
            const { data: rawData, tokens, model: modelUsed } = await generateQuiz(selectedTopic.topic, "Medium");
            addLog(`📊 Tokens: ${tokens.total}`, workerId);
            setProgress(30);

            const questions = rawData.questions || [rawData];
            addLog(`📦 ${questions.length} questions reçues`, workerId);

            let successCount = 0;

            // 3. Process EACH question individually
            for (let i = 0; i < questions.length; i++) {
                if (workerRefs.current.stop) break;

                const question = questions[i];
                const qLabel = `Q${i + 1}/${questions.length}`;

                try {
                    // VALIDATION ZOD
                    const validation = validateQuiz({
                        resource_type: "quiz",
                        metadata: {
                            subject: selectedTopic.subject,
                            level: selectedTopic.level,
                            topic: selectedTopic.topic,
                            difficulty: selectedTopic.difficulty || "Moyen",
                        },
                        content: question,
                    });

                    if (!validation.success) {
                        addLog(`❌ ${qLabel} Zod: ${validation.errors?.[0]}`, workerId);
                        continue;
                    }

                    const validatedQuiz = validation.data!;

                    // GEMINI JUDGE
                    const judgeResult = await judgeQuiz(
                        validatedQuiz,
                        selectedTopic.topic,
                        selectedTopic.difficulty || "Moyen"
                    );

                    if (!judgeResult.approved) {
                        addLog(`❌ ${qLabel} Score: ${judgeResult.overall_score.toFixed(1)}/5`, workerId);
                        await updateTopicStats(selectedTopic.topic, judgeResult.overall_score, false);
                        continue;
                    }

                    // VÉRIFICATION DOUBLON
                    const duplicate = await isDuplicate(
                        validatedQuiz.content.question,
                        validatedQuiz.content.correctAnswer
                    );
                    if (duplicate) {
                        addLog(`⚠️ ${qLabel} Doublon`, workerId);
                        continue;
                    }

                    // SAUVEGARDE
                    await saveQuizWithEmbedding({
                        ...validatedQuiz,
                        approved: judgeResult.approved,
                        judge_score: judgeResult.overall_score,
                        judge_feedback: judgeResult.feedback,
                        tokens: tokens,
                        model: modelUsed,
                        dataset_id: selectedDatasetId
                    });

                    await updateTopicStats(selectedTopic.topic, judgeResult.overall_score, true);

                    successCount++;
                    setGeneratedCount(prev => prev + 1);
                    setResult(validatedQuiz);
                    setResultsFeed(prev => [validatedQuiz, ...prev].slice(0, 10));
                    addLog(`✅ ${qLabel} Score: ${judgeResult.overall_score.toFixed(1)}/5`, workerId);

                } catch (qError: any) {
                    addLog(`⚠️ ${qLabel} ${qError.message}`, workerId);
                }
            }

            setProgress(100);
            addLog(`🎉 ${successCount}/${questions.length} quiz validés !`, workerId);

        } catch (e: any) {
            console.error(e);
            addLog(`⚠️ ${e.message || String(e)}`, workerId);
        }
    }, [selectedDatasetId, addLog]);

    // Worker loop
    const workerLoop = useCallback(async (workerId: number) => {
        setActiveWorkers(prev => prev + 1);
        while (!workerRefs.current.stop) {
            await miningCycle(workerId);
            // Small delay between cycles
            await new Promise(r => setTimeout(r, 1500));
        }
        setActiveWorkers(prev => Math.max(0, prev - 1));
    }, [miningCycle]);

    // Start/Stop mining
    useEffect(() => {
        if (status === 'mining') {
            workerRefs.current.stop = false;
            for (let i = 0; i < workerCount; i++) {
                // Stagger worker starts to avoid rate limiting
                setTimeout(() => {
                    if (!workerRefs.current.stop) {
                        workerLoop(i + 1);
                    }
                }, i * 2000);
            }
        } else if (status === 'paused' || status === 'idle') {
            workerRefs.current.stop = true;
        }

        return () => {
            workerRefs.current.stop = true;
        };
    }, [status, workerCount, workerLoop]);

    const toggleMining = () => {
        if (status === 'mining') setStatus('paused');
        else setStatus('mining');
    };

    return (
        <div className="relative min-h-[600px] flex items-center justify-center p-6">
            <AnimatePresence mode="wait">
                {status === 'idle' ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="text-center space-y-8 max-w-lg"
                    >
                        <div className="relative w-32 h-32 mx-auto">
                            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                            <BrainCircuit className="w-32 h-32 text-white/80 relative z-10" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-bold text-white mb-4">Curriculum Mining</h2>
                            <p className="text-muted-foreground text-lg mb-6">
                                Automated dataset generation based on the French National Curriculum.
                            </p>

                            {/* Dataset Selector */}
                            <div className="bg-card/50 border border-white/10 rounded-xl p-4 max-w-sm mx-auto mb-4">
                                <label className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-2 block text-left">
                                    Target Dataset
                                </label>
                                <div className="flex gap-2">
                                    <select
                                        value={selectedDatasetId}
                                        onChange={(e) => setSelectedDatasetId(e.target.value)}
                                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                                    >
                                        {datasets.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => setShowDatasetModal(true)}
                                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
                                        title="Create New Dataset"
                                    >
                                        <Plus className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            </div>

                            {/* Workers Selector */}
                            <div className="bg-card/50 border border-white/10 rounded-xl p-4 max-w-sm mx-auto mb-6">
                                <label className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-3 block text-left">
                                    <Users className="w-3.5 h-3.5 inline mr-1.5" />
                                    Parallel Workers
                                </label>
                                <div className="flex gap-2">
                                    {[1, 2, 3].map(n => (
                                        <button
                                            key={n}
                                            onClick={() => setWorkerCount(n)}
                                            className={clsx(
                                                "flex-1 py-2.5 rounded-lg font-bold text-sm transition-all border",
                                                workerCount === n
                                                    ? "bg-primary/20 text-primary border-primary/40 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]"
                                                    : "bg-black/20 text-muted-foreground border-white/10 hover:border-white/20"
                                            )}
                                        >
                                            {n}x
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 text-left">
                                    {workerCount === 1 && "1 worker → ~5 quiz/cycle"}
                                    {workerCount === 2 && "2 workers → ~10 quiz/cycle"}
                                    {workerCount === 3 && "3 workers → ~15 quiz/cycle (max)"}
                                </p>
                            </div>
                        </div>

                        {/* New Dataset Modal */}
                        <AnimatePresence>
                            {showDatasetModal && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="bg-[#0f111a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                                    >
                                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                            <Database className="w-5 h-5 text-primary" />
                                            New Dataset
                                        </h3>
                                        <input
                                            type="text"
                                            placeholder="Dataset Name (e.g., 'Math Exams 2024')"
                                            value={newDatasetName}
                                            onChange={(e) => setNewDatasetName(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white mb-6 focus:outline-none focus:border-primary"
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-3">
                                            <button
                                                onClick={() => setShowDatasetModal(false)}
                                                className="px-4 py-2 text-sm text-muted-foreground hover:text-white transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleCreateDataset}
                                                disabled={!newDatasetName}
                                                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Create Dataset
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>

                        <button
                            onClick={() => setStatus('mining')}
                            disabled={!selectedDatasetId}
                            className="bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-4 rounded-full font-bold text-xl shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] transition-all flex items-center gap-3 mx-auto"
                        >
                            <Play className="w-6 h-6 fill-current" /> Start Auto-Mining
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8"
                    >
                        {/* Control Panel */}
                        <div className="bg-card/30 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col justify-between h-[500px]">
                            <div>
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx("w-3 h-3 rounded-full animate-pulse", status === 'mining' ? "bg-green-500" : "bg-yellow-500")} />
                                        <span className="text-sm font-medium text-white uppercase tracking-wider">
                                            {status === 'mining' ? 'System Active' : 'System Paused'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="px-3 py-1 rounded-full bg-blue-500/10 text-xs font-mono text-blue-400 border border-blue-500/20">
                                            <Users className="w-3 h-3 inline mr-1" />
                                            {activeWorkers}/{workerCount} workers
                                        </div>
                                        <div className="px-3 py-1 rounded-full bg-white/10 text-xs font-mono text-white/70">
                                            {generatedCount} generated
                                        </div>
                                    </div>
                                </div>

                                <div className="text-center space-y-2 mb-12">
                                    <h3 className="text-muted-foreground text-sm uppercase tracking-widest">Current Target</h3>
                                    <p className="text-2xl font-bold text-white leading-tight min-h-[4rem]">
                                        {currentTopic || "Initializing..."}
                                    </p>
                                </div>

                                {/* Progress Visualization */}
                                <div className="relative h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-primary to-accent"
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground font-mono mb-8">
                                    <span>0%</span>
                                    <span>PROCESSING</span>
                                    <span>100%</span>
                                </div>

                                {/* Terminal Logs */}
                                <div className="bg-black/40 rounded-xl p-4 font-mono text-xs text-green-400/80 h-40 overflow-y-auto mb-6 border border-white/5">
                                    {logs.map((log, i) => (
                                        <div key={i} className="mb-1">{log}</div>
                                    ))}
                                    {status === 'mining' && <span className="animate-pulse">_</span>}
                                </div>
                            </div>

                            <button
                                onClick={toggleMining}
                                className={clsx(
                                    "w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all",
                                    status === 'mining'
                                        ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
                                        : "bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30"
                                )}
                            >
                                {status === 'mining' ? <><Pause className="w-5 h-5" /> Pause Mining</> : <><Play className="w-5 h-5" /> Resume Mining</>}
                            </button>
                        </div>

                        {/* Result Preview (The "Watch" part) */}
                        <div className="relative">
                            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-primary" /> Live Output Feed
                                <span className="ml-auto text-xs text-muted-foreground font-mono">{resultsFeed.length} recent</span>
                            </h3>

                            <div className="h-[500px] overflow-y-auto pr-2 space-y-4 rounded-3xl" ref={scrollRef}>
                                <AnimatePresence mode="popLayout">
                                    {resultsFeed.length > 0 ? (
                                        resultsFeed.map((item, index) => (
                                            <motion.div
                                                key={`result-${index}-${item.content?.question?.substring(0, 20)}`}
                                                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.8, y: -50 }}
                                                className={clsx(
                                                    "bg-white/5 border border-white/10 rounded-2xl p-5",
                                                    index === 0 && "ring-1 ring-primary/30"
                                                )}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded-md">
                                                        ✅ {item.metadata?.topic?.split(' - ')[0] || 'Quiz'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">{item.metadata?.difficulty}</span>
                                                </div>

                                                <div className="mb-3 p-3 rounded-xl bg-black/20 border border-white/5">
                                                    <p className="text-white text-sm font-medium mb-2">{item.content?.question}</p>
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                        {item.content?.options?.map((opt: string, idx: number) => (
                                                            <div key={idx} className={clsx(
                                                                "text-xs p-1.5 rounded border border-white/5",
                                                                opt === item.content?.correctAnswer ? "bg-green-500/10 text-green-400 border-green-500/20" : "text-muted-foreground"
                                                            )}>
                                                                {opt}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))
                                    ) : (
                                        /* Skeleton / Waiting State */
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30">
                                            <Sparkles className="w-12 h-12 mb-4 animate-pulse" />
                                            <p>Waiting for data stream...</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
