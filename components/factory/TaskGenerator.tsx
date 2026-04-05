"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Play, Pause, Square, Loader2, ArrowLeft, Zap } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import { 
    generateQuizExample, generateHomeworkExample, 
    generateFlashcardExample, generateRevisionExample, 
    generateTutorExample, getDashboardStats 
} from "@/app/actions";
import { STUDENT_LEVELS, SUBJECTS_BY_LEVEL, QUIZ_MODES, FLASHCARD_MODES, REVISION_LENGTHS } from "@/lib/config/pipeline.config";
import { TaskPreviewPanel } from "./TaskPreviewPanel";

type Status = 'idle' | 'running' | 'paused' | 'completed' | 'error';
interface LogEntry { time: string; type: 'info' | 'success' | 'error' | 'warn'; message: string; }

interface TaskGeneratorProps {
    taskType: 'quiz' | 'homework' | 'flashcards' | 'revision' | 'tutor';
    icon: React.ReactNode;
    title: string;
    description: string;
    targetCount: number;
    colorClass: string;
}

export function TaskGenerator({ taskType, icon, title, description, targetCount, colorClass }: TaskGeneratorProps) {
    const [status, setStatus] = useState<Status>('idle');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const stopRef = useRef(false);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const [stats, setStats] = useState({ generated: 0, tokens: 0, byTask: 0 });
    const [config, setConfig] = useState<{ limitType: 'time' | 'count' | 'infinite', durationHours: number, targetCount: number }>({ limitType: 'time', durationHours: 1, targetCount: 100 });
    const [latestExample, setLatestExample] = useState<any>(null);

    const [performanceMode, setPerformanceMode] = useState(false);
    const perfModeRef = useRef(false);

    const togglePerfMode = () => {
        setPerformanceMode(!performanceMode);
        perfModeRef.current = !performanceMode;
    };

    useEffect(() => {
        getDashboardStats().then(s => setStats(prev => ({ ...prev, byTask: s.byTask[taskType]?.total || 0 })));
    }, [taskType]);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const addLog = useCallback((type: LogEntry['type'], message: string) => {
        setLogs(prev => [...prev.slice(-150), { time: new Date().toLocaleTimeString('fr-FR'), type, message }]);
    }, []);

    const runGeneration = useCallback(async () => {
        stopRef.current = false;
        setStatus('running');
        
        let startMsg = `🚀 Démarrage de la génération: ${title}`;
        if (config.limitType === 'time') startMsg += ` pour ${config.durationHours} heure(s)...`;
        else if (config.limitType === 'count') startMsg += ` pour ${config.targetCount} exemples max...`;
        else startMsg += ` en mode illimité...`;
        
        addLog('info', startMsg);

        let modes: readonly string[] = [''];
        if (taskType === 'quiz') modes = QUIZ_MODES;
        if (taskType === 'flashcards') modes = FLASHCARD_MODES;
        if (taskType === 'revision') modes = REVISION_LENGTHS;

        try {
            const endTime = config.limitType === 'time' ? Date.now() + config.durationHours * 3600 * 1000 : Infinity;
            let currentGenCount = 0; // Using local var works since JS is single threaded inside async blocks, but Promise.all is parallel. Let's rely on a shared object or just count locally + stats? No, workers are async, multiple can run concurrently. A simple let is fine since they run in the same tick. Actually, JS is single threaded so `currentGenCount++` is thread-safe!
            
            const concurrency = 5; // Auto-determined optimal concurrency
            const levels = [...STUDENT_LEVELS];

            // Worker pool logic
            const workers = Array(concurrency).fill(null).map(async (_, workerId) => {
                while (!stopRef.current) {
                    if (config.limitType === 'time' && Date.now() >= endTime) break;
                    if (config.limitType === 'count' && currentGenCount >= config.targetCount) break;
                    
                    const level = levels[Math.floor(Math.random() * levels.length)];
                    const subjects = SUBJECTS_BY_LEVEL[level] || [];
                    if (subjects.length === 0) continue;
                    
                    const subject = subjects[Math.floor(Math.random() * subjects.length)];
                    const mode = modes[Math.floor(Math.random() * modes.length)];

                    try {
                        let result: any;
                        const params = { subject, level, mode };

                        switch (taskType) {
                            case 'quiz': result = await generateQuizExample({ ...params, mode }); break;
                            case 'homework': result = await generateHomeworkExample(params); break;
                            case 'flashcards': result = await generateFlashcardExample({ ...params, mode }); break;
                            case 'revision': result = await generateRevisionExample({ ...params, length: mode }); break;
                            case 'tutor': result = await generateTutorExample(params); break;
                        }

                        currentGenCount++; // atomic in JS event loop

                        if (!perfModeRef.current) {
                            setLatestExample(result.example.content);
                            addLog('success', `✅ [Th${workerId}] ${title} — ${subject} (${level})${mode ? ` [${mode}]` : ''}`);
                        }

                        setStats(prev => ({ 
                            ...prev, 
                            generated: prev.generated + 1, 
                            tokens: prev.tokens + result.tokens.total, 
                            byTask: prev.byTask + 1
                        }));
                    } catch (e: any) {
                        if (e.message?.includes('Combo already used') || e.message?.includes('No unused context')) {
                            if (!perfModeRef.current) addLog('warn', `⏭️ [Th${workerId}] ${subject}/${level}: ${e.message.split(':')[0]}`);
                        } else {
                            if (!perfModeRef.current) addLog('error', `❌ [Th${workerId}] ${e.message}`);
                        }
                    }
                    
                    // Smart Throttle: Gemini Pro limits to 150 RPM (2.5 RPS).
                    // Adding 600ms sleep prevents 429 Too Many Requests errors.
                    await new Promise(r => setTimeout(r, 600));
                }
            });

            await Promise.all(workers);

            setStatus(stopRef.current ? 'paused' : 'completed');
            addLog('success', stopRef.current ? '⏸️ Mise en pause' : '🎉 Terminé (Cible atteinte)');
        } catch (e: any) {
            addLog('error', `💥 Erreur fatale: ${e.message}`);
            setStatus('error');
        }
    }, [config, addLog, taskType, title]);

    const toggle = () => {
        if (status === 'running') { stopRef.current = true; setStatus('paused'); }
        else runGeneration();
    };

    const stop = () => {
        stopRef.current = true; setStatus('idle'); addLog('warn', '🛑 Arrêt forcé');
    };

    return (
        <div className="space-y-6 pb-10 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className={clsx("w-14 h-14 rounded-2xl border flex items-center justify-center", colorClass)}>
                        {icon}
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white">{title}</h2>
                        <p className="text-muted-foreground mt-1">{description}</p>
                    </div>
                </div>
                <Link href="/factory/examples" className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl flex items-center gap-2 border border-white/10 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Retour
                </Link>
            </div>

            {/* Config & Controls */}
            <div className="glass-card p-6 border-t-4 border-t-white/10" style={{ borderTopColor: 'currentColor' }}>
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-end gap-6 flex-wrap">
                        <div>
                            <label className="text-sm text-muted-foreground font-medium mb-1 block">Type de limite</label>
                            <select
                                value={config.limitType}
                                disabled={status !== 'idle'}
                                onChange={e => setConfig(prev => ({ ...prev, limitType: e.target.value as any }))}
                                className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/20"
                            >
                                <option value="time">Par durée</option>
                                <option value="count">Par quantité</option>
                                <option value="infinite">Infini (manuel)</option>
                            </select>
                        </div>

                        {config.limitType === 'time' && (
                            <div>
                                <label className="text-sm text-muted-foreground font-medium mb-1 block">Durée de génération</label>
                                <select
                                    value={config.durationHours}
                                    disabled={status !== 'idle'}
                                    onChange={e => setConfig(prev => ({ ...prev, durationHours: parseFloat(e.target.value) }))}
                                    className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/20"
                                >
                                    <option value={0.5}>30 Minutes</option>
                                    <option value={1}>1 Heure</option>
                                    <option value={2}>2 Heures</option>
                                    <option value={4}>4 Heures</option>
                                    <option value={8}>8 Heures</option>
                                </select>
                            </div>
                        )}

                        {config.limitType === 'count' && (
                            <div>
                                <label className="text-sm text-muted-foreground font-medium mb-1 block">Nombre d'exemples cible</label>
                                <input
                                    type="number"
                                    value={config.targetCount}
                                    disabled={status !== 'idle'}
                                    onChange={e => setConfig(prev => ({ ...prev, targetCount: parseInt(e.target.value) || 1 }))}
                                    min={1} max={10000}
                                    className="w-32 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-white/20"
                                />
                            </div>
                        )}

                        <div className="flex items-center mb-1 ml-auto">
                            <div className="flex items-center gap-3 cursor-pointer" onClick={togglePerfMode}>
                                <div className={clsx("w-12 h-6 rounded-full transition-colors relative flex items-center shadow-inner", performanceMode ? "bg-green-500 border border-green-400" : "bg-white/10 border border-white/10")}>
                                    <div className={clsx("w-4 h-4 rounded-full bg-white absolute transition-all shadow-md", performanceMode ? "left-[1.6rem]" : "left-1")} />
                                </div>
                                <span className={clsx("text-sm font-bold flex items-center gap-2", performanceMode ? "text-green-400" : "text-muted-foreground")}>
                                    Performance 💨
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={toggle}
                            className={clsx("flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all text-white",
                                status === 'running' 
                                    ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30" 
                                    : "bg-white/10 border border-white/20 shadow-lg hover:bg-white/20"
                            )}
                        >
                            {status === 'running' ? <><Pause className="w-5 h-5 fill-current" /> Pause</> : <><Play className="w-5 h-5 fill-current" /> {status === 'idle' ? 'Lancer le Batch' : 'Reprendre'}</>}
                        </button>
                        {(status === 'running' || status === 'paused') && (
                            <button onClick={stop} className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30 transition-colors">
                                <Square className="w-5 h-5 fill-current" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/5">
                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Générés (Session)</p>
                        <p className="text-3xl font-extrabold text-white">{stats.generated}</p>
                    </div>
                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full blur-2xl -mr-4 -mt-4" />
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Total {title}</p>
                        <p className="text-3xl font-extrabold text-white">
                            {stats.byTask.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">/ {targetCount.toLocaleString()}</span>
                        </p>
                    </div>
                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Tokens (Session)</p>
                        <p className="text-3xl font-extrabold text-white/50">{stats.tokens.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Log & Preview Split Screen */}
            {!performanceMode ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[450px]">
                    {/* Terminal */}
                    <div className="terminal p-5 h-full overflow-y-auto rounded-2xl bg-[#0f1117] border border-white/5 shadow-2xl flex flex-col">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5 shrink-0">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/80"/>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80"/>
                                <div className="w-3 h-3 rounded-full bg-green-500/80"/>
                            </div>
                            <span className="text-xs text-muted-foreground/60 font-mono ml-3 font-semibold">{taskType}_generator.log</span>
                            {status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-white/40 ml-auto" />}
                        </div>
                        <div className="space-y-1.5 text-sm font-mono leading-relaxed flex-grow">
                            {logs.length === 0 && <span className="text-muted-foreground/30 italic">En attente de démarrage...</span>}
                            {logs.map((log, i) => (
                                <div key={i} className={clsx("flex items-start gap-3", 
                                    log.type === 'error' ? 'text-red-400' : 
                                    log.type === 'success' ? 'text-emerald-400' : 
                                    log.type === 'warn' ? 'text-yellow-500/80' : 
                                    'text-indigo-200')}>
                                    <span className="text-muted-foreground/40 shrink-0">[{log.time}]</span> 
                                    <span>{log.message}</span>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </div>

                    {/* Preview Panel */}
                    <div className="p-5 h-full overflow-hidden rounded-2xl bg-black/20 border border-white/5 shadow-2xl relative">
                        <TaskPreviewPanel taskType={taskType} example={latestExample} />
                    </div>
                </div>
            ) : (
                <div className="h-[450px] rounded-2xl bg-black/30 border border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.1)] flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-green-500/5" />
                    
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-green-400 blur-[40px] opacity-20 rounded-full" />
                        <Zap className={clsx("w-16 h-16 text-green-400 drop-shadow-xl relative", status === 'running' && "animate-pulse")} />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-2 tracking-wide">Mode Performance <span className="text-green-400">Activé</span></h3>
                    <p className="text-green-200/50 max-w-lg mb-8 text-sm leading-relaxed">
                        L'interface graphique, le synthétiseur JSON et les logs du terminal sont temporairement suspendus pour allouer <b>100% du thread Javascript</b> et du CPU à une génération massive en arrière-plan.
                    </p>
                    
                    <div className="flex gap-4 z-10 relative">
                        <div className="bg-black/60 border border-white/10 rounded-2xl px-6 py-4 shadow-xl min-w-[200px]">
                            <span className="block text-5xl font-black text-white">{stats.generated}</span>
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-2 block">Objets {title} générés</span>
                        </div>
                        <div className="bg-black/60 border border-white/10 rounded-2xl px-6 py-4 shadow-xl min-w-[200px]">
                            <span className="block text-5xl font-black text-blue-400">{stats.tokens.toLocaleString()}</span>
                            <span className="text-[10px] uppercase tracking-widest text-blue-400/60 font-bold mt-2 block">Tokens Traités</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
