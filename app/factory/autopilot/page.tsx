"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Rocket, Square, Loader2, ArrowLeft, Zap, Scale, Database, CheckCircle2, AlertTriangle } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import { runAutopilotCycle, getDashboardStats } from "@/app/actions";
import { DATASET_TARGETS, TOTAL_TARGET } from "@/lib/config/pipeline.config";

type Status = 'idle' | 'running' | 'completed' | 'error';
type Phase = 'context' | 'generate' | 'judge' | 'done';
interface LogEntry { time: string; type: 'info' | 'success' | 'error' | 'warn' | 'phase'; message: string; }

const PHASE_LABELS: Record<Phase, string> = {
    context: '📦 Création de Contextes',
    generate: '⚡ Génération',
    judge: '⚖️ Jugement',
    done: '🏆 Terminé',
};

const PHASE_COLORS: Record<Phase, string> = {
    context: 'text-cyan-400',
    generate: 'text-violet-400',
    judge: 'text-orange-400',
    done: 'text-green-400',
};

const TASK_COLORS: Record<string, string> = {
    quiz: 'bg-blue-500',
    tutor: 'bg-purple-500',
    flashcards: 'bg-emerald-500',
    revision: 'bg-amber-500',
    homework: 'bg-pink-500',
};

export default function AutopilotPage() {
    const [status, setStatus] = useState<Status>('idle');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const stopRef = useRef(false);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [concurrency, setConcurrency] = useState(5);

    const [currentPhase, setCurrentPhase] = useState<Phase>('generate');
    const [currentTask, setCurrentTask] = useState('');
    const [cycleCount, setCycleCount] = useState(0);

    const [sessionStats, setSessionStats] = useState({ generated: 0, judged: 0, gold: 0, tokens: 0 });
    const [liveStats, setLiveStats] = useState<any>(null);

    useEffect(() => {
        getDashboardStats().then(setLiveStats);
    }, []);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const addLog = useCallback((type: LogEntry['type'], message: string) => {
        setLogs(prev => [...prev.slice(-200), { time: new Date().toLocaleTimeString('fr-FR'), type, message }]);
    }, []);

    const runLoop = useCallback(async () => {
        stopRef.current = false;
        setStatus('running');
        addLog('info', '🚀 AUTOPILOT ACTIVÉ — Production automatique lancée');

        let cycles = 0;

        while (!stopRef.current) {
            try {
                const result = await runAutopilotCycle(concurrency);

                cycles++;
                setCycleCount(cycles);
                setCurrentPhase(result.phase);
                setCurrentTask(result.taskType);

                // Update live stats from server
                setLiveStats({
                    totalExamples: result.stats.total,
                    goldExamples: result.stats.gold,
                    unjudgedExamples: result.stats.unjudged,
                    byTask: result.stats.byTask,
                });

                // Update session stats
                setSessionStats(prev => ({
                    generated: prev.generated + result.generated,
                    judged: prev.judged + result.judged,
                    gold: prev.gold + result.gold,
                    tokens: prev.tokens + result.tokensUsed,
                }));

                // Log the cycle
                if (result.phase === 'done') {
                    addLog('success', '🏆 OBJECTIF ATTEINT ! 10 000 Gold Data générés !');
                    setStatus('completed');
                    break;
                } else if (result.phase === 'context') {
                    addLog('phase', `📦 [Cycle ${cycles}] Contextes : +${result.contextsMade} créés`);
                } else if (result.phase === 'judge') {
                    addLog('phase', `⚖️ [Cycle ${cycles}] Jugement : ${result.judged} jugés, ${result.gold} Gold ✨`);
                } else if (result.phase === 'generate') {
                    addLog('success', `⚡ [Cycle ${cycles}] ${result.taskType.toUpperCase()} : +${result.generated} générés (${result.tokensUsed.toLocaleString()} tokens)`);
                }

                // Log errors if any
                for (const err of result.errors.slice(0, 3)) {
                    addLog('warn', `⚠️ ${err}`);
                }
            } catch (e: any) {
                addLog('error', `❌ Erreur de cycle: ${e.message}`);
                // Brief pause on error before retrying
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        if (stopRef.current) {
            addLog('warn', '⏸️ Autopilot arrêté par l\'utilisateur');
            setStatus('idle');
        }
    }, [concurrency, addLog]);

    const stop = () => {
        stopRef.current = true;
        addLog('warn', '🛑 Arrêt demandé... (fin du cycle en cours)');
    };

    // Build progress data
    const targets = [
        { key: 'quiz', label: 'Quiz', target: DATASET_TARGETS.quiz.count },
        { key: 'tutor', label: 'Tutor', target: DATASET_TARGETS.tutor.count },
        { key: 'flashcards', label: 'Flashcards', target: DATASET_TARGETS.flashcards.count },
        { key: 'revision', label: 'Revision', target: DATASET_TARGETS.revision.count },
        { key: 'homework', label: 'Homework', target: DATASET_TARGETS.homework.count },
    ];

    const totalGold = liveStats?.goldExamples || 0;
    const globalProgress = Math.min((totalGold / TOTAL_TARGET) * 100, 100);

    return (
        <div className="space-y-6 pb-10 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center justify-center">
                        <Rocket className="w-7 h-7 text-orange-400" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white">Mode Autopilot</h2>
                        <p className="text-muted-foreground mt-0.5">Production automatique et intelligente — un bouton, zéro intervention.</p>
                    </div>
                </div>
                <Link href="/factory" className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl flex items-center gap-2 border border-white/10 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Retour
                </Link>
            </div>

            {/* Global Progress */}
            <div className="glass-card p-6 border-t-4 border-t-orange-500/50">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Progression Globale — Gold Data</p>
                        <p className="text-4xl font-black text-white mt-1">
                            {totalGold.toLocaleString()} <span className="text-base font-medium text-muted-foreground">/ {TOTAL_TARGET.toLocaleString()}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {status !== 'running' ? (
                            <button onClick={runLoop} disabled={status === 'completed'}
                                className={clsx(
                                    "flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-base transition-all shadow-xl",
                                    status === 'completed'
                                        ? "bg-green-500/20 text-green-400 border border-green-500/30 cursor-default"
                                        : "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 hover:shadow-2xl hover:shadow-orange-500/20 active:scale-95"
                                )}
                            >
                                {status === 'completed' ? <><CheckCircle2 className="w-6 h-6" /> Objectif Atteint</> : <><Rocket className="w-6 h-6" /> Lancer l'Autopilot</>}
                            </button>
                        ) : (
                            <button onClick={stop}
                                className="flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-base bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all active:scale-95"
                            >
                                <Square className="w-5 h-5 fill-current" /> Arrêter
                            </button>
                        )}
                    </div>
                </div>

                {/* Global bar */}
                <div className="w-full h-4 bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <div
                        className="h-full bg-gradient-to-r from-orange-500 via-yellow-400 to-green-500 rounded-full transition-all duration-1000 ease-out relative"
                        style={{ width: `${globalProgress}%` }}
                    >
                        <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                    </div>
                </div>
                <p className="text-right text-xs text-muted-foreground mt-1.5 font-mono">{globalProgress.toFixed(1)}%</p>
            </div>

            {/* Task Progress Bars */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {targets.map(t => {
                    const current = liveStats?.byTask?.[t.key]?.total || 0;
                    const gold = liveStats?.byTask?.[t.key]?.gold || 0;
                    const pct = Math.min((current / t.target) * 100, 100);
                    const isActive = currentTask === t.key && status === 'running';

                    return (
                        <div key={t.key} className={clsx("glass-card p-4 transition-all", isActive && "ring-1 ring-white/20 shadow-lg")}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t.label}</span>
                                {isActive && <Loader2 className="w-3 h-3 animate-spin text-white/60" />}
                            </div>
                            <p className="text-xl font-black text-white">{current} <span className="text-xs font-medium text-muted-foreground">/ {t.target}</span></p>
                            <p className="text-xs text-green-400/80 font-mono">{gold} Gold</p>
                            <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden mt-2 border border-white/5">
                                <div className={clsx("h-full rounded-full transition-all duration-700", TASK_COLORS[t.key])} style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Live Status + Config */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Phase Actuelle</p>
                    {status === 'running' ? (
                        <p className={clsx("text-lg font-bold", PHASE_COLORS[currentPhase])}>{PHASE_LABELS[currentPhase]}</p>
                    ) : (
                        <p className="text-lg font-bold text-muted-foreground/40">En attente</p>
                    )}
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Cycles Complétés</p>
                    <p className="text-2xl font-black text-white">{cycleCount}</p>
                </div>
                <div className="glass-card p-4 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Tokens (Session)</p>
                    <p className="text-2xl font-black text-blue-400">{sessionStats.tokens.toLocaleString()}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 text-center">Concurrence</p>
                    <input
                        type="number" value={concurrency} disabled={status === 'running'}
                        onChange={e => setConcurrency(Math.max(1, Math.min(15, parseInt(e.target.value) || 1)))}
                        min={1} max={15}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                </div>
            </div>

            {/* Session counters */}
            <div className="grid grid-cols-3 gap-4">
                <div className="glass-card p-4 text-center border-l-4 border-l-violet-500/50">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Générés (Session)</p>
                    <p className="text-3xl font-black text-white">{sessionStats.generated}</p>
                </div>
                <div className="glass-card p-4 text-center border-l-4 border-l-orange-500/50">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Jugés (Session)</p>
                    <p className="text-3xl font-black text-white">{sessionStats.judged}</p>
                </div>
                <div className="glass-card p-4 text-center border-l-4 border-l-green-500/50">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Gold (Session)</p>
                    <p className="text-3xl font-black text-green-400">{sessionStats.gold}</p>
                </div>
            </div>

            {/* Terminal */}
            <div className="terminal p-5 h-[350px] overflow-y-auto rounded-2xl bg-[#0f1117] border border-white/5 shadow-2xl flex flex-col">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5 shrink-0">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/80"/>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80"/>
                        <div className="w-3 h-3 rounded-full bg-green-500/80"/>
                    </div>
                    <span className="text-xs text-muted-foreground/60 font-mono ml-3 font-semibold">autopilot.log</span>
                    {status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-orange-400 ml-auto" />}
                </div>
                <div className="space-y-1.5 text-sm font-mono leading-relaxed flex-grow">
                    {logs.length === 0 && <span className="text-muted-foreground/30 italic">Appuyez sur "Lancer l'Autopilot" pour démarrer...</span>}
                    {logs.map((log, i) => (
                        <div key={i} className={clsx("flex items-start gap-3",
                            log.type === 'error' ? 'text-red-400' :
                            log.type === 'success' ? 'text-emerald-400' :
                            log.type === 'warn' ? 'text-yellow-500/80' :
                            log.type === 'phase' ? 'text-cyan-300' :
                            'text-indigo-200')}>
                            <span className="text-muted-foreground/40 shrink-0">[{log.time}]</span>
                            <span>{log.message}</span>
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
}
