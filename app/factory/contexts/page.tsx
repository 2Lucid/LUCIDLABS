"use client";

import { useState, useEffect, useMemo } from "react";
import { getContexts, getDashboardStats, generateContexts } from "@/app/actions";
import { Database, CheckCircle, XCircle, FileText, Search, Library, Hash, Clock, Eye, X, Shuffle, Plus, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { STUDENT_LEVELS, SUBJECTS, SUBJECTS_BY_LEVEL } from "@/lib/config/pipeline.config";

export default function ContextViewerPage() {
    const [contexts, setContexts] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [filterLevel, setFilterLevel] = useState("all");
    const [filterSubject, setFilterSubject] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all"); // 'all', 'used', 'unused'
    
    // Modals
    const [selectedContext, setSelectedContext] = useState<any>(null);
    const [showGenModal, setShowGenModal] = useState(false);
    const [genLevel, setGenLevel] = useState<string>("all");
    const [genSubject, setGenSubject] = useState<string>("all");
    const [isGenerating, setIsGenerating] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const filters: any = { limit: 1000 };
            if (filterLevel !== 'all') filters.level = filterLevel;
            if (filterSubject !== 'all') filters.subject = filterSubject;
            if (filterStatus === 'used') filters.isUsed = true;
            if (filterStatus === 'unused') filters.isUsed = false;

            const [ctxData, dashStats] = await Promise.all([
                getContexts(filters), 
                getDashboardStats()
            ]);
            setContexts(ctxData || []);
            setStats(dashStats);
        } catch(e) {
            console.error("Failed to load context data:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [filterLevel, filterSubject, filterStatus]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            let actualLevel = genLevel;
            let actualSubject = genSubject;
            
            if (actualLevel === 'all') {
                actualLevel = STUDENT_LEVELS[Math.floor(Math.random() * STUDENT_LEVELS.length)];
            }
            if (actualSubject === 'all') {
                const availableSubjects = SUBJECTS_BY_LEVEL[actualLevel as any] || SUBJECTS;
                actualSubject = availableSubjects[Math.floor(Math.random() * availableSubjects.length)];
            }
            
            const style = Math.random() > 0.5 ? 'structured' : 'telegraphic';
            await generateContexts({ level: actualLevel, subject: actualSubject, count: 5, style });
            await loadData();
            setShowGenModal(false);
        } catch (e) {
            console.error(e);
            alert("Erreur lors de la génération");
        } finally {
            setIsGenerating(false);
        }
    };

    const filteredContexts = useMemo(() => {
        return contexts.filter(c => {
            let parsed = c.content;
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch(e){}
            }
            const title = parsed?.title || '';
            const desc = parsed?.content || '';
            
            const matchesSearch = !searchQuery || 
                title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                desc.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesLevel = filterLevel === 'all' || c.level === filterLevel;
            const matchesSubject = filterSubject === 'all' || c.subject === filterSubject;
            
            let matchesStatus = true;
            if (filterStatus === 'used') matchesStatus = c.is_used === true;
            if (filterStatus === 'unused') matchesStatus = c.is_used === false;
            
            return matchesSearch && matchesLevel && matchesSubject && matchesStatus;
        });
    }, [contexts, searchQuery, filterLevel, filterSubject, filterStatus]);

    return (
        <div className="space-y-8 pb-10 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <Library className="w-7 h-7 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Bibliothèque de Contextes</h2>
                        <p className="text-muted-foreground mt-1">Génération et Stockage de la matière première (Tronc Commun)</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            const source = filteredContexts.length > 0 ? filteredContexts : contexts;
                            if (source.length > 0) {
                                const randomIdx = Math.floor(Math.random() * source.length);
                                setSelectedContext(source[randomIdx]);
                            }
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 font-medium transition-all hover:scale-105 active:scale-95"
                    >
                        <Shuffle className="w-4 h-4" />
                        Aléatoire
                    </button>
                    <button
                        onClick={() => setShowGenModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all shadow-lg hover:shadow-indigo-500/25 hover:scale-105 active:scale-95 border border-indigo-400/30"
                    >
                        <Plus className="w-4 h-4" />
                        Générer
                    </button>
                </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-card p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110" />
                    <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                        <Database className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-medium uppercase tracking-wider">Total Contextes</span>
                    </div>
                    <p className="text-4xl font-extrabold text-white">
                        {stats ? stats.totalContexts.toLocaleString() : "-"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">Matière première stockée en BDD</p>
                </div>
                
                <div className="glass-card p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110" />
                    <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-medium uppercase tracking-wider">Déjà Utilisés</span>
                    </div>
                    <p className="text-4xl font-extrabold text-emerald-400">
                        {stats ? (stats.totalContexts - stats.unusedContexts).toLocaleString() : "-"}
                    </p>
                    <p className="text-xs text-emerald-500/70 mt-2">Convertis en exemples IA</p>
                </div>

                <div className="glass-card p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110" />
                    <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-medium uppercase tracking-wider">En Attente</span>
                    </div>
                    <p className="text-4xl font-extrabold text-white">
                        {stats ? stats.unusedContexts.toLocaleString() : "-"}
                    </p>
                    <p className="text-xs text-amber-500/70 mt-2">Prêts pour la Phase 2</p>
                </div>

                <div className="glass-card p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110" />
                    <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                        <Hash className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium uppercase tracking-wider">Combos Consommés</span>
                    </div>
                    <p className="text-4xl font-extrabold text-white">
                        {stats ? stats.usedCombinations.toLocaleString() : "-"}
                    </p>
                    <p className="text-xs text-purple-400/70 mt-2">Blocages de doublons actifs</p>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                        type="text"
                        placeholder="Rechercher par titre ou contenu..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                </div>
                
                <select 
                    value={filterLevel}
                    onChange={e => setFilterLevel(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                >
                    <option value="all">Tous les niveaux</option>
                    {STUDENT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>

                <select 
                    value={filterSubject}
                    onChange={e => setFilterSubject(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                >
                    <option value="all">Toutes les matières</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <div className="flex bg-white/5 rounded-xl border border-white/10 p-1">
                    <button onClick={() => setFilterStatus('all')} className={clsx("px-3 py-1 text-xs font-medium rounded-lg transition-all", filterStatus === 'all' ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white")}>Tous</button>
                    <button onClick={() => setFilterStatus('unused')} className={clsx("px-3 py-1 text-xs font-medium rounded-lg transition-all", filterStatus === 'unused' ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground hover:text-white")}>En attente</button>
                    <button onClick={() => setFilterStatus('used')} className={clsx("px-3 py-1 text-xs font-medium rounded-lg transition-all", filterStatus === 'used' ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground hover:text-white")}>Utilisés</button>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
            ) : filteredContexts.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground glass-card">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Aucun contexte ne correspond à ces filtres.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                        {filteredContexts.map(ctx => {
                            let parsed = ctx.content;
                            if (typeof parsed === 'string') {
                                try { parsed = JSON.parse(parsed); } catch(e){}
                            }
                            
                            return (
                                <motion.div 
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={ctx.id} 
                                    className="glass-card p-5 group flex flex-col h-full hover:border-indigo-500/30 transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex gap-2 flex-wrap">
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-white/10 text-white border border-white/10">
                                                {ctx.level}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/20">
                                                {ctx.subject}
                                            </span>
                                        </div>
                                        {ctx.is_used ? (
                                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                <CheckCircle className="w-3 h-3" /> Utilisé
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                <Clock className="w-3 h-3" /> En attente
                                            </span>
                                        )}
                                    </div>
                                    
                                    <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2">
                                        {parsed?.title || "Séance sans titre"}
                                    </h3>
                                    
                                    <div className="text-xs text-muted-foreground/80 bg-black/20 p-3 rounded-lg flex-1 mb-4 border border-white/5 line-clamp-4 font-mono leading-relaxed">
                                        {parsed?.content || "-"}
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-auto">
                                        <span className="text-[10px] text-muted-foreground">
                                            {new Date(ctx.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                        <button 
                                            onClick={() => setSelectedContext(ctx)}
                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 transition-colors text-muted-foreground"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* View Modal */}
            <AnimatePresence>
                {selectedContext && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setSelectedContext(null)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="relative w-full max-w-2xl bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh]"
                        >
                            <button 
                                onClick={() => setSelectedContext(null)}
                                className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            
                            <h3 className="text-xl font-bold text-white mb-1 pr-10">Détails du Contexte</h3>
                            <p className="text-sm text-muted-foreground mb-6">ID: <span className="font-mono text-xs">{selectedContext.id}</span></p>

                            <div className="overflow-y-auto flex-1 pr-2 space-y-4 custom-scrollbar">
                                <div className="flex gap-2 mb-4">
                                    <span className="px-3 py-1 rounded bg-white/5 text-sm font-medium border border-white/10">{selectedContext.level}</span>
                                    <span className="px-3 py-1 rounded bg-indigo-500/10 text-indigo-400 text-sm font-medium border border-indigo-500/20">{selectedContext.subject}</span>
                                    {selectedContext.is_used && (
                                        <span className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 text-sm font-medium border border-emerald-500/20 flex items-center gap-1">
                                            <CheckCircle className="w-4 h-4" /> Utilisé
                                        </span>
                                    )}
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Méta-données IA</label>
                                    <div className="bg-black/40 p-3 rounded-xl border border-white/5 font-mono text-xs text-cyan-400">
                                        Modèle utilisé : {selectedContext.metadata?.model || 'Inconnu'}<br/>
                                        Tokens : {selectedContext.metadata?.tokens?.total || 0}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Payload JSON brut</label>
                                    <pre className="bg-black/60 p-4 rounded-xl border border-white/5 font-mono text-xs text-emerald-400 overflow-x-auto">
                                        {JSON.stringify(
                                            typeof selectedContext.content === 'string' 
                                                ? JSON.parse(selectedContext.content) 
                                                : selectedContext.content, 
                                        null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Generate Modal */}
            <AnimatePresence>
                {showGenModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => !isGenerating && setShowGenModal(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="relative w-full max-w-md bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl p-6"
                        >
                            {!isGenerating && (
                                <button 
                                    onClick={() => setShowGenModal(false)}
                                    className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                            
                            <h3 className="text-xl font-bold text-white mb-6">Générer des Contextes</h3>
                            
                            <div className="space-y-4 mb-8">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground mb-1 block">Niveau Scolaire</label>
                                    <select 
                                        value={genLevel}
                                        onChange={e => setGenLevel(e.target.value)}
                                        disabled={isGenerating}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    >
                                        <option value="all">Aléatoire (Auto)</option>
                                        {STUDENT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground mb-1 block">Matière</label>
                                    <select 
                                        value={genSubject}
                                        onChange={e => setGenSubject(e.target.value)}
                                        disabled={isGenerating}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    >
                                        <option value="all">Aléatoire (Auto)</option>
                                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 transition-all"
                            >
                                {isGenerating ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Création en cours... (x5)</>
                                ) : (
                                    <><Database className="w-5 h-5" /> Générer 5 Contextes</>
                                )}
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
