"use client";

import { useState, useMemo, useEffect } from "react";
import { Check, Trash2, FileJson, Download, Search, Database, CheckCircle, Target, TrendingUp, Award, Scale, X, Eye, BookOpen, Zap } from "lucide-react";
import { getExamples, deleteExample, getContexts, deleteContext, exportGoldDataJSONL, getDashboardStats } from "@/app/actions";
import { clsx } from "clsx";
import { StatsCard } from "@/components/StatsCard";
import { motion } from "framer-motion";
import { TASK_TYPES, STUDENT_LEVELS, SUBJECTS } from "@/lib/config/pipeline.config";

interface Example {
    id: string;
    created_at: string;
    task_type: string;
    subject: string;
    level: string;
    mode?: string;
    topic?: string;
    content: any;
    is_judged: boolean;
    judge_score?: number;
    is_gold: boolean;
    tokens_used: number;
    model_used?: string;
}

interface ContextInfo {
    id: string;
    created_at: string;
    subject: string;
    level: string;
    style: string;
    content: any;
    is_used: boolean;
}

export function DatasetView() {
    const [viewType, setViewType] = useState<'examples' | 'contexts'>('examples');
    
    // Data states
    const [examplesData, setExamplesData] = useState<Example[]>([]);
    const [contextsData, setContextsData] = useState<ContextInfo[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all"); // specific to examples OR contexts (used/unused)
    const [filterLevel, setFilterLevel] = useState<string>("all");
    
    // Global stats
    const [stats, setStats] = useState<any>(null);
    const [viewingJson, setViewingJson] = useState<any>(null);
    const [exporting, setExporting] = useState(false);

    // Fetch data
    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            
            // Standard filters
            const filters: any = {};
            if (filterLevel !== 'all') filters.level = filterLevel;
            
            if (viewType === 'examples') {
                if (filterType !== 'all') filters.taskType = filterType;
                if (filterStatus === 'gold') filters.isGold = true;
                if (filterStatus === 'rejected') { filters.isJudged = true; filters.isGold = false; }
                if (filterStatus === 'pending') filters.isJudged = false;
                
                const [ex, dashStats] = await Promise.all([ getExamples(filters), getDashboardStats() ]);
                setExamplesData(ex || []);
                setStats(dashStats);
            } else {
                if (filterStatus === 'used') filters.isUsed = true;
                if (filterStatus === 'unused') filters.isUsed = false;
                
                const [ctx, dashStats] = await Promise.all([ getContexts(filters), getDashboardStats() ]);
                setContextsData(ctx || []);
                setStats(dashStats);
            }
            
            setLoading(false);
        }
        fetchData();
    }, [viewType, filterType, filterStatus, filterLevel]);

    // Derived local filters
    const filteredExamples = useMemo(() => {
        return examplesData.filter(entry => {
            const matchesSearch = !searchQuery ||
                entry.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                entry.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                entry.task_type?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        });
    }, [examplesData, searchQuery]);

    const filteredContexts = useMemo(() => {
        return contextsData.filter(entry => {
            let parsed = entry.content;
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch(e){}
            }
            const title = parsed?.title || '';
            const matchesSearch = !searchQuery ||
                entry.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                entry.style?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                title.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        });
    }, [contextsData, searchQuery]);

    const handleDelete = async (id: string) => {
        if (!confirm("Supprimer cette entrée ?")) return;
        try {
            if (viewType === 'examples') {
                await deleteExample(id);
                setExamplesData(d => d.filter(e => e.id !== id));
            } else {
                await deleteContext(id);
                setContextsData(d => d.filter(e => e.id !== id));
            }
        } catch (e) {
            alert("Erreur lors de la suppression");
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const result = await exportGoldDataJSONL();
            if (result.count === 0) {
                alert("Aucune Gold Data à exporter");
                return;
            }
            const blob = new Blob([result.jsonl], { type: "application/jsonl" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `lucid_dataset_${new Date().toISOString().split('T')[0]}.jsonl`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            alert("Erreur lors de l'export");
        } finally {
            setExporting(false);
        }
    };

    const taskTypeColors: Record<string, string> = {
        quiz: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        homework: 'bg-green-500/10 text-green-400 border-green-500/20',
        flashcards: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        revision: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
        tutor: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    };

    const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
    const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

    return (
        <motion.div className="space-y-6 pb-10" variants={container} initial="hidden" animate="show">
            {/* Header & Tabs */}
            <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Warehouse</h2>
                    <p className="text-muted-foreground mt-1">Explorez, filtrez et exportez vos données brutes et exemples.</p>
                </div>
                
                <div className="flex bg-white/5 p-1 rounded-xl w-max">
                    <button onClick={() => { setViewType('examples'); setFilterStatus('all'); setFilterType('all'); }}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            viewType === 'examples' ? "bg-violet-500 text-white shadow-lg" : "text-muted-foreground hover:text-white"
                        )}
                    >
                        <Zap className="w-4 h-4" /> Exemples finaux
                    </button>
                    <button onClick={() => { setViewType('contexts'); setFilterStatus('all'); setFilterType('all'); }}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            viewType === 'contexts' ? "bg-cyan-500 text-black shadow-lg" : "text-muted-foreground hover:text-white"
                        )}
                    >
                        <BookOpen className="w-4 h-4" /> Contextes Bruts
                    </button>
                </div>
            </motion.div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {viewType === 'examples' ? (
                    <>
                        <motion.div variants={item}><StatsCard title="Total" value={loading ? "..." : (stats?.totalExamples || 0).toString()} icon={Database} description="Exemples générés" color="primary" /></motion.div>
                        <motion.div variants={item}><StatsCard title="Gold Data" value={loading ? "..." : (stats?.goldExamples || 0).toString()} icon={Award} description="Score ≥ 9/10" color="green" /></motion.div>
                        <motion.div variants={item}><StatsCard title="En attente" value={loading ? "..." : (stats?.unjudgedExamples || 0).toString()} icon={Scale} description="Non jugés" color="accent" /></motion.div>
                        <motion.div variants={item}><StatsCard title="Score moyen" value={loading ? "..." : `${(stats?.avgScore || 0).toFixed(1)}/10`} icon={TrendingUp} description="Qualité globale" color="blue" /></motion.div>
                    </>
                ) : (
                    <>
                        <motion.div variants={item}><StatsCard title="Contextes" value={loading ? "..." : (stats?.totalContexts || 0).toString()} icon={Database} description="Générés au total" color="cyan" /></motion.div>
                        <motion.div variants={item}><StatsCard title="Vierges" value={loading ? "..." : (stats?.unusedContexts || 0).toString()} icon={CheckCircle} description="Disponibles" color="green" /></motion.div>
                        <motion.div variants={item}><StatsCard title="Utilisés" value={loading ? "..." : ((stats?.totalContexts || 0) - (stats?.unusedContexts || 0)).toString()} icon={Target} description="Déjà absorbés" color="accent" /></motion.div>
                        <motion.div variants={item}><StatsCard title="Combos Uniques" value={loading ? "..." : (stats?.usedCombinations || 0).toString()} icon={Zap} description="Sujets traités" color="violet" /></motion.div>
                    </>
                )}
            </div>

            {/* Filters */}
            <motion.div variants={item} className="glass-card p-5">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 text-sm"
                        />
                    </div>

                    {viewType === 'examples' && (
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50">
                            <option value="all">Toutes les tâches</option>
                            <option value="quiz">Quiz QCM</option>
                            <option value="homework">Aide Devoirs</option>
                            <option value="flashcards">Flashcards</option>
                            <option value="revision">Fiches Révision</option>
                            <option value="tutor">Tuteur Socratique</option>
                        </select>
                    )}

                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50">
                        <option value="all">Tous les statuts</option>
                        {viewType === 'examples' ? (
                            <>
                                <option value="gold">Gold Data ✅</option>
                                <option value="rejected">Rejetés ❌</option>
                                <option value="pending">En attente ⏳</option>
                            </>
                        ) : (
                            <>
                                <option value="unused">Vierges (Non utilisés) 🟢</option>
                                <option value="used">Utilisés 🔴</option>
                            </>
                        )}
                    </select>

                    <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary/50">
                        <option value="all">Tous les niveaux</option>
                        {STUDENT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>

                    {viewType === 'examples' && (
                        <button onClick={handleExport} disabled={exporting} className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors whitespace-nowrap text-sm disabled:opacity-50">
                            <Download className="w-4 h-4" />
                            {exporting ? 'Export...' : 'Export JSONL'}
                        </button>
                    )}
                </div>

                <div className="mt-3 text-xs text-muted-foreground">
                    {viewType === 'examples' ? filteredExamples.length : filteredContexts.length} résultat(s)
                </div>
            </motion.div>

            {/* Table */}
            <motion.div variants={item} className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white/[0.03] text-muted-foreground font-medium uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="px-5 py-3">Type / Style</th>
                                <th className="px-5 py-3">Matière</th>
                                <th className="px-5 py-3">Niveau</th>
                                <th className="px-5 py-3">Topic / Info</th>
                                {viewType === 'examples' && <th className="px-5 py-3">Score</th>}
                                <th className="px-5 py-3">Statut</th>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {viewType === 'examples' ? filteredExamples.map(entry => (
                                <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-5 py-3">
                                        <span className={clsx("px-2 py-0.5 rounded-md text-[10px] font-semibold border", taskTypeColors[entry.task_type] || 'bg-white/5 text-white border-white/10')}>
                                            {entry.task_type}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-white text-xs font-medium">{entry.subject}</td>
                                    <td className="px-5 py-3 text-muted-foreground text-xs">{entry.level}</td>
                                    <td className="px-5 py-3 text-muted-foreground text-xs max-w-[200px] truncate" title={entry.topic || ''}>{entry.topic || '—'}</td>
                                    <td className="px-5 py-3">
                                        {entry.judge_score != null ? (
                                            <span className={clsx("px-2 py-0.5 rounded-md text-[10px] font-bold", entry.is_gold ? "score-gold" : "score-rejected")}>
                                                {entry.judge_score}/10
                                            </span>
                                        ) : (<span className="score-pending px-2 py-0.5 rounded-md text-[10px] font-bold">—</span>)}
                                    </td>
                                    <td className="px-5 py-3">
                                        {entry.is_gold ? ( <span className="flex items-center gap-1 text-green-400 text-[10px] font-semibold"><CheckCircle className="w-3 h-3" /> Gold</span> ) 
                                        : entry.is_judged ? ( <span className="text-red-400 text-[10px] font-semibold">Rejeté</span> ) 
                                        : ( <span className="text-yellow-400 text-[10px] font-semibold">En attente</span> )}
                                    </td>
                                    <td className="px-5 py-3 text-muted-foreground text-[10px]">{new Date(entry.created_at).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-5 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => setViewingJson(entry.content)} className="p-1.5 hover:bg-blue-500/10 text-muted-foreground hover:text-blue-400 rounded-lg transition-colors" title="Voir JSON"><Eye className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => handleDelete(entry.id)} className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 rounded-lg transition-colors" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </td>
                                </tr>
                            )) : filteredContexts.map(entry => {
                                let parsed = entry.content;
                                if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch(e){} }
                                const title = parsed?.title || 'Sans titre';
                                
                                return (
                                <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-5 py-3">
                                        <span className={clsx("px-2 py-0.5 rounded-md text-[10px] font-semibold border", 
                                            entry.style === 'telegraphic' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                                        )}>
                                            {entry.style}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-white text-xs font-medium">{entry.subject}</td>
                                    <td className="px-5 py-3 text-muted-foreground text-xs">{entry.level}</td>
                                    <td className="px-5 py-3 text-muted-foreground text-xs max-w-[200px] truncate" title={title}>{title}</td>
                                    <td className="px-5 py-3">
                                        {entry.is_used ? ( <span className="text-red-400 text-[10px] font-semibold">Utilisé 🔴</span> ) 
                                        : ( <span className="text-green-400 text-[10px] font-semibold">Vierge 🟢</span> )}
                                    </td>
                                    <td className="px-5 py-3 text-muted-foreground text-[10px]">{new Date(entry.created_at).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-5 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => setViewingJson(parsed)} className="p-1.5 hover:bg-blue-500/10 text-muted-foreground hover:text-blue-400 rounded-lg transition-colors" title="Voir JSON"><Eye className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => handleDelete(entry.id)} className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 rounded-lg transition-colors" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                            
                            {(viewType === 'examples' ? filteredExamples : filteredContexts).length === 0 && !loading && (
                                <tr>
                                    <td colSpan={8} className="px-5 py-16 text-center text-muted-foreground">
                                        <Database className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                        <p className="font-medium text-sm">Aucune entrée trouvée</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* JSON Viewer Modal */}
            {viewingJson && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setViewingJson(null)}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-5 w-full max-w-2xl max-h-[80vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><FileJson className="w-4 h-4 text-primary" /> Détail Raw (JSON)</h3>
                            <button onClick={() => setViewingJson(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
                        </div>
                        <pre className="text-xs font-mono text-green-400/80 bg-black/40 p-4 rounded-xl overflow-auto max-h-[60vh] whitespace-pre-wrap">
                            {JSON.stringify(viewingJson, null, 2)}
                        </pre>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}
