"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, ListChecks, Layers, BookOpen, FileText, MessageSquare, ArrowRight } from "lucide-react";
import clsx from "clsx";
import { getDashboardStats } from "@/app/actions";

const TASKS = [
    {
        id: 'quiz',
        name: 'Quiz QCM',
        description: 'Évaluation ciblée de connaissances à choix multiples.',
        target: 3000,
        href: '/factory/examples/quiz',
        icon: ListChecks,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20'
    },
    {
        id: 'tutor',
        name: 'Tuteur Socratique',
        description: 'Simulations conversationnelles (Multi-Turn) pour la pédagogie socratique.',
        target: 3000,
        href: '/factory/examples/tutor',
        icon: MessageSquare,
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/20'
    },
    {
        id: 'flashcards',
        name: 'Flashcards',
        description: 'Création de cartes mémoire recto-verso pour la répétition espacée.',
        target: 1500,
        href: '/factory/examples/flashcards',
        icon: Layers,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20'
    },
    {
        id: 'revision',
        name: 'Fiches de Révision',
        description: 'Synthèses de cours et fiches de mémorisation.',
        target: 1500,
        href: '/factory/examples/revision',
        icon: FileText,
        color: 'text-pink-400',
        bg: 'bg-pink-500/10',
        border: 'border-pink-500/20'
    },
    {
        id: 'homework',
        name: 'Aide aux Devoirs',
        description: 'Génération d\'exercices d\'application basés sur les devoirs.',
        target: 1000,
        href: '/factory/examples/homework',
        icon: BookOpen,
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20'
    }
];

export default function ExamplesOverviewPage() {
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        getDashboardStats().then(setStats);
    }, []);

    const totalTarget = TASKS.reduce((acc, t) => acc + t.target, 0);
    const globalProgress = stats ? (stats.totalExamples / totalTarget) * 100 : 0;

    return (
        <div className="space-y-8 pb-10 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Zap className="w-7 h-7 text-violet-400" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Usine de Génération</h2>
                    <p className="text-muted-foreground mt-1">Gérez le lancement des tâches IA individuellement (Phase 2)</p>
                </div>
            </div>

            {/* Global Stats */}
            <div className="glass-card p-6 border-violet-500/20 border flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white">Progression Globale Dataset</h3>
                    <p className="text-sm text-muted-foreground">Avancement vers l'objectif de {totalTarget.toLocaleString()} Gold Data.</p>
                </div>
                <div className="text-right flex items-center gap-6">
                    <div className="w-64">
                        <div className="flex justify-between text-xs font-bold text-white mb-2">
                            <span>{stats?.totalExamples?.toLocaleString() || 0}</span>
                            <span className="text-muted-foreground">{totalTarget.toLocaleString()}</span>
                        </div>
                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-violet-500 rounded-full transition-all duration-1000"
                                style={{ width: `${Math.min(100, globalProgress)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Task Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {TASKS.map(task => {
                    const taskGenerated = stats?.byTask[task.id]?.total || 0;
                    const progress = Math.min(100, (taskGenerated / task.target) * 100);

                    return (
                        <Link 
                            key={task.id} 
                            href={task.href}
                            className="glass-card p-6 hover:bg-white/5 transition-all group flex flex-col h-full border border-white/5 hover:border-white/20 active:scale-[0.98]"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center border", task.bg, task.border, task.color)}>
                                    <task.icon className="w-6 h-6" />
                                </div>
                                <div className="p-2 bg-white/5 rounded-full group-hover:bg-white/10 transition-colors">
                                    <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white" />
                                </div>
                            </div>
                            
                            <h3 className="text-xl font-bold text-white mb-2">{task.name}</h3>
                            <p className="text-sm text-muted-foreground mb-6 flex-grow">{task.description}</p>
                            
                            <div className="mt-auto">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-2xl font-black text-white">{taskGenerated.toLocaleString()}</span>
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">/ {task.target.toLocaleString()} Objectif</span>
                                </div>
                                <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                                    <div 
                                        className={clsx("h-full rounded-full opacity-80", task.bg.replace('/10', ''))} 
                                        style={{ width: `${progress}%`, backgroundColor: 'currentColor' }}
                                    />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
