"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Play, Pause, Square, Scale, Loader2 } from "lucide-react";
import clsx from "clsx";
import { judgeUnjudgedBatch, getDashboardStats, getRecentJudgments, overrideJudgeScore } from "@/app/actions";
import { TaskPreviewPanel } from "@/components/factory/TaskPreviewPanel";

type Status = 'idle' | 'running' | 'paused' | 'completed' | 'error';
interface LogEntry { time: string; type: 'info' | 'success' | 'error' | 'warn'; message: string; }

export default function JudgePage() {
    const [status, setStatus] = useState<Status>('idle');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const stopRef = useRef(false);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const [stats, setStats] = useState({ judgedSession: 0, goldSession: 0, rejectedSession: 0, unjudgedTotal: 0 });
    const [config, setConfig] = useState({ judgeBatchSize: 10 });
    const [recentJudgments, setRecentJudgments] = useState<any[]>([]);

    const fetchStats = useCallback(async () => {
        const s = await getDashboardStats();
        setStats(prev => ({ ...prev, unjudgedTotal: s.unjudgedExamples }));
        const rj = await getRecentJudgments(30);
        setRecentJudgments(rj);
    }, []);

    const handleOverride = async (judgmentId: string, exampleId: string, newScore: number) => {
        try {
            await overrideJudgeScore(judgmentId, exampleId, newScore);
            addLog('success', `✅ Note corrigée manuellement à ${newScore}/10 par l'humain !`);
            fetchStats();
        } catch (e: any) {
            addLog('error', `❌ Erreur lors de la correction : ${e.message}`);
        }
    };

    useEffect(() => {
        fetchStats();
        const int = setInterval(fetchStats, 10000);
        return () => clearInterval(int);
    }, [fetchStats]);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const addLog = useCallback((type: LogEntry['type'], message: string) => {
        setLogs(prev => [...prev.slice(-150), { time: new Date().toLocaleTimeString('fr-FR'), type, message }]);
    }, []);

    const runGeneration = useCallback(async () => {
        stopRef.current = false;
        setStatus('running');
        addLog('info', '⚖️ Ouverture du Tribunal LLM-as-a-Judge...');

        try {
            let hasMore = true;

            while (hasMore && !stopRef.current) {
                const batchResult = await judgeUnjudgedBatch(config.judgeBatchSize);

                if (batchResult.judged === 0) {
                    hasMore = false;
                    addLog('info', '📭 Aucun exemple en attente de jugement.');
                    break;
                }

                addLog('success', `📊 Batch de ${batchResult.judged} : ${batchResult.gold} ✅ Gold / ${batchResult.rejected} ❌ Rejetés`);

                setStats(prev => ({
                    ...prev,
                    judgedSession: prev.judgedSession + batchResult.judged,
                    goldSession: prev.goldSession + batchResult.gold,
                    rejectedSession: prev.rejectedSession + batchResult.rejected,
                    unjudgedTotal: Math.max(0, prev.unjudgedTotal - batchResult.judged)
                }));

                await new Promise(r => setTimeout(r, 1000));
            }

            setStatus(stopRef.current ? 'paused' : 'completed');
            addLog('success', stopRef.current ? '⏸️ Audience suspendue' : '🎉 Tous les exemples ont été jugés.');
        } catch (e: any) {
            addLog('error', `💥 Erreur fatale: ${e.message}`);
            setStatus('error');
        }
    }, [config, addLog]);

    const toggle = () => {
        if (status === 'running') { stopRef.current = true; setStatus('paused'); }
        else runGeneration();
    };

    const stop = () => {
        stopRef.current = true; setStatus('idle'); addLog('warn', '🛑 Arrêt forcé');
    };

    return (
        <div className="space-y-6 pb-10 max-w-4xl">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                    <Scale className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Tribunal IA</h2>
                    <p className="text-muted-foreground text-sm">Phase 3 - Évaluation et filtrage Gold Data</p>
                </div>
            </div>

            {/* Config & Controls */}
            <div className="glass-card p-5">
                <div className="flex justify-between items-start mb-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-muted-foreground font-medium mb-1 block">Taille du batch (lot)</label>
                            <input
                                type="number" value={config.judgeBatchSize} disabled={status !== 'idle'}
                                onChange={e => setConfig(c => ({ ...c, judgeBatchSize: parseInt(e.target.value) || 5 }))}
                                min={1} max={50}
                                className="w-40 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={toggle}
                            className={clsx("flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all",
                                status === 'running' ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30" : "bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:bg-orange-400"
                            )}
                        >
                            {status === 'running' ? <><Pause className="w-4 h-4" /> Suspendre</> : <><Play className="w-4 h-4 fill-current" /> {status === 'idle' ? 'Lancer Audience' : 'Reprendre'}</>}
                        </button>
                        {(status === 'running' || status === 'paused') && (
                            <button onClick={stop} className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-colors">
                                <Square className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4 border-t border-white/5 pt-4">
                    <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase">Jugés (Session)</p>
                        <p className="text-xl font-bold text-white">{stats.judgedSession}</p>
                    </div>
                    <div className="text-center border-l border-white/5">
                        <p className="text-[10px] text-muted-foreground uppercase">Gold ✅</p>
                        <p className="text-xl font-bold text-green-400">{stats.goldSession}</p>
                    </div>
                    <div className="text-center border-l border-white/5">
                        <p className="text-[10px] text-muted-foreground uppercase">Rejetés ❌</p>
                        <p className="text-xl font-bold text-red-400">{stats.rejectedSession}</p>
                    </div>
                    <div className="text-center border-l border-white/5 bg-orange-500/5 rounded-lg py-1">
                        <p className="text-[10px] text-orange-400/80 uppercase">En attente globale</p>
                        <p className="text-xl font-bold text-orange-400">{stats.unjudgedTotal}</p>
                    </div>
                </div>
            </div>

            {/* Terminal */}
            <div className="terminal p-4 h-[400px] overflow-y-auto">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                    <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500/60"/><div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60"/><div className="w-2.5 h-2.5 rounded-full bg-green-500/60"/></div>
                    <span className="text-[10px] text-muted-foreground/50 font-mono ml-2">phase3_judge.log</span>
                    {status === 'running' && <Loader2 className="w-3 h-3 animate-spin text-orange-500 ml-auto" />}
                </div>
                <div className="space-y-0.5">
                    {logs.map((log, i) => (
                        <div key={i} className={clsx("terminal-line", log.type)}>
                            <span className="text-muted-foreground/40">[{log.time}]</span> {log.message}
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>

            {/* Verdicts History Panel */}
            <div className="glass-card p-5 mt-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-orange-400" />
                    Dernières Appréciations
                </h3>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {recentJudgments.map((j) => (
                        <div key={j.id} className="bg-black/30 rounded-xl p-4 border border-white/5 relative">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        {j.examples?.task_type} • {j.examples?.subject} • {j.examples?.level}
                                    </span>
                                </div>
                                <div className={clsx("px-3 py-1 rounded-full text-xs font-bold", 
                                    j.is_gold ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                )}>
                                    Note: {j.score}/10
                                </div>
                            </div>
                            <p className="text-sm text-white/80 leading-relaxed italic mb-4">
                                "{j.reason}"
                            </p>
                            
                            {/* Expandable Content Review */}
                            <details className="mt-4 mb-4 border-t border-white/5 pt-4 group">
                                <summary className="text-xs text-orange-400/80 cursor-pointer hover:text-orange-400 font-medium mb-3 list-none flex items-center gap-2">
                                    ▶ Inspecter le contenu généré
                                </summary>
                                <div className="bg-[#0f1117] p-4 rounded-xl border border-white/5 shadow-inner">
                                    <TaskPreviewPanel taskType={j.examples.task_type} example={j.examples.content} />
                                </div>
                            </details>

                            {/* Human Override Controls */}
                            <div className="flex items-center gap-3 border-t border-white/5 pt-4 mt-2">
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Correction Manuelle :</span>
                                <input 
                                    type="number" min="0" max="10" defaultValue={j.score} id={`score-${j.id}`} 
                                    className="w-16 bg-black text-white rounded-lg px-2 py-1.5 text-sm font-bold border border-white/10 text-center" 
                                />
                                <span className="text-xs text-muted-foreground">/ 10</span>
                                <button onClick={() => {
                                    const el = document.getElementById(`score-${j.id}`) as HTMLInputElement;
                                    if (el) handleOverride(j.id, j.example_id, parseInt(el.value));
                                }} className="ml-auto px-4 py-1.5 bg-orange-500/20 hover:bg-orange-500/40 text-orange-400 text-xs font-bold rounded-lg border border-orange-500/30 transition-colors">
                                    Forcer la Note
                                </button>
                            </div>
                        </div>
                    ))}
                    {recentJudgments.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">Aucun jugement enregistré pour le moment.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
