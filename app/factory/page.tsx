"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Database, Zap, Scale, ArrowRight, BrainCircuit, Rocket } from "lucide-react";
import { getDashboardStats } from "@/app/actions";
import clsx from "clsx";

export default function FactoryHubPage() {
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        getDashboardStats().then(setStats);
        // Refresh every 10s
        const interval = setInterval(() => getDashboardStats().then(setStats), 10000);
        return () => clearInterval(interval);
    }, []);

    const cards = [
        {
            title: "Phase 1 : Contextes",
            description: "Génération de matériel scolaire brut depuis Pronote.",
            href: "/factory/contexts",
            icon: Database,
            color: "var(--phase-1)",
            bg: "from-cyan-500/20 to-cyan-500/0",
            border: "group-hover:border-cyan-500/50",
            stat: stats ? `${stats.totalContexts} contextes` : "...",
        },
        {
            title: "Phase 2 : Exemples",
            description: "Transformation des contextes en tâches d'entraînement.",
            href: "/factory/examples",
            icon: Zap,
            color: "var(--phase-2)",
            bg: "from-violet-500/20 to-violet-500/0",
            border: "group-hover:border-violet-500/50",
            stat: stats ? `${stats.totalExamples} générés` : "...",
        },
        {
            title: "Phase 3 : Tribunal IA",
            description: "Évaluation draconienne et filtrage final (Gold Data).",
            href: "/factory/judge",
            icon: Scale,
            color: "var(--phase-3)",
            bg: "from-orange-500/20 to-orange-500/0",
            border: "group-hover:border-orange-500/50",
            stat: stats ? `${stats.goldExamples} Gold / ${stats.unjudgedExamples} attente` : "...",
        }
    ];

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="relative">
                <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute -top-10 right-0 w-60 h-60 bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <BrainCircuit className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-white">
                            Dataset <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Factory Hub</span>
                        </h2>
                        <p className="text-muted-foreground mt-1">
                            Tour de contrôle de la production de données d'entraînement.
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                    { label: 'Total Exemples', value: stats?.totalExamples || 0, color: 'text-white' },
                    { label: 'Gold Data ✅', value: stats?.goldExamples || 0, color: 'text-green-400' },
                    { label: 'Non Jugés 🕒', value: stats?.unjudgedExamples || 0, color: 'text-yellow-400' },
                    { label: 'Tokens', value: (stats?.totalTokens || 0).toLocaleString(), color: 'text-blue-400' },
                    { label: 'Coût Estimé', value: stats ? `$${stats.estimatedCost.toFixed(2)}` : '...', color: 'text-orange-400' },
                    { label: 'Bilan Carbone 🍃', value: stats ? `${(stats.estimatedCo2Grams / 1000).toFixed(2)} kg` : '...', color: 'text-emerald-400' },
                ].map((stat, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={stat.label}
                        className="glass-card p-4 text-center"
                    >
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{stat.label}</p>
                        <p className={clsx("text-2xl font-bold", stat.color)}>{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Autopilot Card */}
            <Link href="/factory/autopilot">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="group relative overflow-hidden glass-card p-6 transition-all duration-300 hover:bg-white/[0.04] border-2 border-orange-500/20 hover:border-orange-500/40 rounded-2xl"
                >
                    <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-orange-500/15 to-transparent rounded-bl-full opacity-60 transition-transform duration-500 group-hover:scale-110" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center justify-center">
                                <Rocket className="w-7 h-7 text-orange-400 group-hover:animate-bounce" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    Mode Autopilot
                                    <span className="text-[10px] font-bold uppercase tracking-widest bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30">AUTO</span>
                                </h3>
                                <p className="text-sm text-muted-foreground mt-0.5">Un bouton. Zéro intervention. Complétion automatique et intelligente du dataset.</p>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                            <ArrowRight className="w-5 h-5 text-orange-400" />
                        </div>
                    </div>
                </motion.div>
            </Link>

            {/* Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((card, i) => (
                    <Link key={card.href} href={card.href}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 + 0.2 }}
                            className={clsx(
                                "group relative overflow-hidden glass-card p-6 h-full transition-all duration-300 hover:bg-white/[0.04]",
                                card.border
                            )}
                        >
                            <div className={clsx(
                                "absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-50 transition-transform duration-500 group-hover:scale-110",
                                "bg-gradient-to-bl", card.bg
                            )} />
                            
                            <card.icon className="w-8 h-8 mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1" style={{ color: card.color }} />
                            
                            <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
                            <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{card.description}</p>
                            
                            <div className="mt-auto flex items-center justify-between">
                                <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-white/5 text-muted-foreground group-hover:text-white transition-colors">
                                    {card.stat}
                                </span>
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                    <ArrowRight className="w-4 h-4 text-white" />
                                </div>
                            </div>
                        </motion.div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
