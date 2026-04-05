
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Database, Zap, Scale, CheckCircle, TrendingUp, Coins,
    Target, BarChart3, FileJson, Award, BookOpen, MessageSquare,
    CreditCard, FileText, Leaf
} from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { getDashboardStats } from "@/app/actions";
import { TOTAL_TARGET, DATASET_TARGETS } from "@/lib/config/pipeline.config";
import clsx from "clsx";

const TASK_ICONS: Record<string, any> = {
    quiz: Zap,
    homework: BookOpen,
    flashcards: CreditCard,
    revision: FileText,
    tutor: MessageSquare,
};

const TASK_COLORS: Record<string, string> = {
    quiz: '#06B6D4',
    homework: '#10B981',
    flashcards: '#F59E0B',
    revision: '#8B5CF6',
    tutor: '#F97316',
};

export default function Dashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDashboardStats().then(data => {
            setStats(data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.08 } }
    };
    const item = {
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0 }
    };

    const goldProgress = stats ? (stats.goldExamples / TOTAL_TARGET) * 100 : 0;

    return (
        <motion.div className="space-y-6 pb-10" variants={container} initial="hidden" animate="show">
            {/* Header */}
            <motion.div variants={item}>
                <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard</h2>
                <p className="text-muted-foreground mt-1">Vue d'ensemble de la production de dataset</p>
            </motion.div>

            {/* Main Progress Bar */}
            <motion.div variants={item} className="glass-card p-6">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <Target className="w-5 h-5 text-primary" />
                        <span className="text-sm font-semibold text-white">Objectif : {TOTAL_TARGET.toLocaleString('en-US')} Gold Data</span>
                    </div>
                    <span className="text-2xl font-bold text-white">
                        {loading ? '...' : stats?.goldExamples?.toLocaleString() || 0}
                        <span className="text-sm text-muted-foreground font-normal ml-1">/ {TOTAL_TARGET.toLocaleString()}</span>
                    </span>
                </div>
                <div className="h-4 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-primary via-secondary to-accent rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(goldProgress, 100)}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>{goldProgress.toFixed(1)}% complété</span>
                    <span>{loading ? '...' : `${(TOTAL_TARGET - (stats?.goldExamples || 0)).toLocaleString()} restants`}</span>
                </div>
            </motion.div>

            {/* Stats Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <motion.div variants={item}>
                    <StatsCard
                        title="Total Exemples"
                        value={loading ? "..." : (stats?.totalExamples || 0).toString()}
                        icon={Database}
                        description="Exemples générés (toutes tâches)"
                        color="primary"
                    />
                </motion.div>
                <motion.div variants={item}>
                    <StatsCard
                        title="Gold Data"
                        value={loading ? "..." : (stats?.goldExamples || 0).toString()}
                        icon={Award}
                        description={`Score ≥ 9/10 — ${loading ? '...' : stats?.judgedExamples || 0} jugés`}
                        color="green"
                    />
                </motion.div>
                <motion.div variants={item}>
                    <StatsCard
                        title="Score Moyen"
                        value={loading ? "..." : `${(stats?.avgScore || 0).toFixed(1)}/10`}
                        icon={TrendingUp}
                        description="Score moyen du tribunal"
                        color="purple"
                    />
                </motion.div>
                <motion.div variants={item}>
                    <StatsCard
                        title="Coût Estimé"
                        value={loading ? "..." : `$${(stats?.estimatedCost || 0).toFixed(2)}`}
                        icon={Coins}
                        description={`${loading ? '...' : (stats?.totalTokens || 0).toLocaleString()} tokens`}
                        color="blue"
                    />
                </motion.div>
            </div>

            {/* Second row cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <motion.div variants={item}>
                    <StatsCard
                        title="Contextes"
                        value={loading ? "..." : (stats?.totalContexts || 0).toString()}
                        icon={FileJson}
                        description={`${loading ? '...' : stats?.unusedContexts || 0} non utilisés`}
                        color="primary"
                    />
                </motion.div>
                <motion.div variants={item}>
                    <StatsCard
                        title="Non Jugés"
                        value={loading ? "..." : (stats?.unjudgedExamples || 0).toString()}
                        icon={Scale}
                        description="En attente du tribunal"
                        color="accent"
                    />
                </motion.div>
                <motion.div variants={item}>
                    <StatsCard
                        title="Combinaisons"
                        value={loading ? "..." : (stats?.usedCombinations || 0).toString()}
                        icon={BarChart3}
                        description="Combinaisons uniques utilisées"
                        color="secondary"
                    />
                </motion.div>
                <motion.div variants={item}>
                    <StatsCard
                        title="Bilan Carbone"
                        value={loading ? "..." : `${((stats?.estimatedCo2Grams || 0) / 1000).toFixed(2)} kg`}
                        icon={Leaf}
                        description="Est. empreinte écologique (LLM)"
                        color="green"
                    />
                </motion.div>
            </div>

            {/* Task Distribution */}
            <motion.div variants={item} className="glass-card p-6">
                <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Répartition par tâche
                </h3>
                <div className="space-y-4">
                    {Object.entries(DATASET_TARGETS).map(([key, target]) => {
                        const count = stats?.byTask?.[key]?.total || 0;
                        const gold = stats?.byTask?.[key]?.gold || 0;
                        const percent = Math.min((count / target.count) * 100, 100);
                        const Icon = TASK_ICONS[key];
                        const color = TASK_COLORS[key];

                        return (
                            <div key={key}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4" style={{ color }} />
                                        <span className="text-sm text-white font-medium capitalize">
                                            {key === 'quiz' ? 'Quiz QCM' :
                                             key === 'homework' ? 'Aide Devoirs' :
                                             key === 'tutor' ? 'Tuteur Socratique' :
                                             key === 'revision' ? 'Fiches Révision' :
                                             'Flashcards'}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">({target.percent}%)</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="text-muted-foreground font-mono">{count} / {target.count}</span>
                                        {gold > 0 && (
                                            <span className="score-gold px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                {gold} gold
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{ width: `${percent}%`, background: color }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </motion.div>

            {/* System Info */}
            <motion.div variants={item} className="glass-card p-6">
                <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Infos Système</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Modèle cible', value: 'Qwen 3.5 4B' },
                        { label: 'Format', value: 'ChatML JSONL' },
                        { label: 'Seuil Judge', value: '≥ 9/10' },
                        { label: 'Questions/Quiz', value: '10 fixées' },
                    ].map(info => (
                        <div key={info.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{info.label}</p>
                            <p className="text-sm font-semibold text-white">{info.value}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-primary/5 to-secondary/5 border border-white/5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Supabase Projet : Dataset — Connecté
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
