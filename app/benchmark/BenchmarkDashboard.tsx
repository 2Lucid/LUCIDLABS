"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { Activity, Battery, Cpu, Smartphone, Target, Zap, Clock, TrendingDown, Layers, Box, Fingerprint, PieChart as PieIcon, LineChart as LineIcon, Scale, CheckCircle, X, Bot } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { evaluateGeneration } from "./autopilot";
import BarChart3DViewer from "@/components/benchmark/BarChart3D";
import TokenSimulator from "@/components/benchmark/TokenSimulator";
import { clsx } from "clsx";

interface BenchmarkData {
    id: string;
    model_name: string;
    single_tokens_per_sec: number;
    stress_degradation_pct: number;
    score_global: number;
    score_speed: number;
    score_stability: number;
    score_memory: number;
    device_model: string;
    device_brand: string;
    os_name: string;
    os_version: string;
    platform_api_level: number;
    total_memory_bytes: number;
    supported_cpu_architectures: string[];
    created_at: string;
    load_time_ms: number;
    single_time_to_first_token_ms: number;
    raw_metadata: any;
}

const COLORS = ['#06B6D4', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E', '#3B82F6'];

export default function BenchmarkDashboard({ initialData }: { initialData: any[] }) {
    const benchmarks = initialData as BenchmarkData[];

    const [selectedDevice, setSelectedDevice] = useState<string>('all');
    const [selectedModel, setSelectedModel] = useState<string>('all');

    // State for Drilldown & Judge mode
    const [selectedTest, setSelectedTest] = useState<BenchmarkData | null>(null);
    const [hoveredTest, setHoveredTest] = useState<BenchmarkData | null>(null);
    const [judgeScore, setJudgeScore] = useState<number>(50);
    const [isJudged, setIsJudged] = useState(false);
    const [isAutopilotLoading, setIsAutopilotLoading] = useState(false);

    // Reset judge panel when opening a new test
    useEffect(() => {
        setJudgeScore(50);
        setIsJudged(false);
        setIsAutopilotLoading(false);
    }, [selectedTest]);

    const handleAutopilot = async () => {
        if (!selectedTest) return;
        setIsAutopilotLoading(true);
        const promptText = selectedTest.raw_metadata?.prompt || "Évalue globalement la qualité de ces différents formats d'enseignement générés.";

        let genText = "Aucune génération...";
        if (selectedTest.raw_metadata?.outputs) {
            genText = JSON.stringify(selectedTest.raw_metadata.outputs, null, 2);
        } else if (selectedTest.raw_metadata?.response) {
            genText = selectedTest.raw_metadata.response;
        }

        const score = await evaluateGeneration(promptText, genText);
        if (score !== null) {
            setJudgeScore(score);
            setIsJudged(true);
        } else {
            alert("L'évaluation Autopilot a échoué. Vérifiez la connexion ou l'API Key Gemini.");
        }
        setIsAutopilotLoading(false);
    };

    // Extract unique filters
    const devices = useMemo(() => Array.from(new Set(benchmarks.map(b => b.device_model).filter(Boolean))), [benchmarks]);
    const models = useMemo(() => Array.from(new Set(benchmarks.map(b => b.model_name).filter(Boolean))), [benchmarks]);

    // Apply filters
    const filteredData = useMemo(() => {
        return benchmarks.filter(b => {
            const matchDevice = selectedDevice === 'all' || b.device_model === selectedDevice;
            const matchModel = selectedModel === 'all' || b.model_name === selectedModel;
            return matchDevice && matchModel;
        });
    }, [benchmarks, selectedDevice, selectedModel]);

    // 1. Evolution Data (Area Chart) over time
    const evolutionData = useMemo(() => {
        return filteredData.map(b => {
            const date = new Date(b.created_at);
            return {
                timeLabel: `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`,
                speed: b.single_tokens_per_sec || 0,
                score: b.score_global || 0,
                ttft: b.single_time_to_first_token_ms || 0,
                fullObj: b
            };
        });
    }, [filteredData]);

    // 2. Radar Chart Data (Metrics per Model)
    const radarData = useMemo(() => {
        const aggs: Record<string, any> = {};
        benchmarks.forEach(b => {
            if (!b.model_name) return;
            if (!aggs[b.model_name]) aggs[b.model_name] = { count: 0, speed: 0, stability: 0, memory: 0, score: 0 };
            aggs[b.model_name].speed += b.score_speed || 0;
            aggs[b.model_name].stability += b.score_stability || 0;
            aggs[b.model_name].memory += b.score_memory || 0;
            aggs[b.model_name].score += b.score_global || 0;
            aggs[b.model_name].count++;
        });

        const topModels = Object.keys(aggs).slice(0, 3); // max 3 to keep chart readable
        return [
            { metric: 'Vitesse', ...topModels.reduce((acc, m) => ({ ...acc, [m]: aggs[m].speed / aggs[m].count }), {}) },
            { metric: 'Stabilité', ...topModels.reduce((acc, m) => ({ ...acc, [m]: aggs[m].stability / aggs[m].count }), {}) },
            { metric: 'Optimisation RAM', ...topModels.reduce((acc, m) => ({ ...acc, [m]: aggs[m].memory / aggs[m].count }), {}) },
            { metric: 'Efficacité Globale', ...topModels.reduce((acc, m) => ({ ...acc, [m]: aggs[m].score / aggs[m].count }), {}) },
        ];
    }, [benchmarks]);
    const radarModels = Object.keys(radarData[0] || {}).filter(k => k !== 'metric');

    // 3. Base vs Finetuned (Projection)
    const tuningData = useMemo(() => {
        const aggs: Record<string, { speedSum: number, count: number }> = {};
        benchmarks.forEach(b => {
            if (!b.model_name) return;
            if (!aggs[b.model_name]) aggs[b.model_name] = { speedSum: 0, count: 0 };
            aggs[b.model_name].speedSum += b.single_tokens_per_sec || 0;
            aggs[b.model_name].count++;
        });
        return Object.keys(aggs).map(m => {
            const baseAvg = aggs[m].speedSum / aggs[m].count;
            return {
                name: m.substring(0, 15),
                "Base Model": Math.round(baseAvg),
                "Finetuned (Projeté)": Math.round(baseAvg * 1.35) // +35% projection
            };
        });
    }, [benchmarks]);

    // 4. Device Brand Distribution (PieChart)
    const brandData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredData.forEach(b => {
            const brand = b.device_brand || 'Unknown';
            counts[brand] = (counts[brand] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [filteredData]);

    // 5. Memory vs Speed Scatter
    const scatterData = useMemo(() => {
        return filteredData
            .filter(b => b.total_memory_bytes && b.single_tokens_per_sec)
            .map(b => ({
                name: b.device_model,
                ramGb: Math.round(b.total_memory_bytes / 1073741824),
                speed: b.single_tokens_per_sec,
                score: b.score_global,
                fullObj: b
            }));
    }, [filteredData]);

    // KPIs Extended
    const runsCount = filteredData.length;
    const avgSpeed = runsCount ? Math.round(filteredData.reduce((acc, b) => acc + (b.single_tokens_per_sec || 0), 0) / runsCount) : 0;
    const avgScore = runsCount ? Math.round(filteredData.reduce((acc, b) => acc + (b.score_global || 0), 0) / runsCount) : 0;
    const avgDegradation = runsCount ? (filteredData.reduce((acc, b) => acc + (b.stress_degradation_pct || 0), 0) / runsCount).toFixed(1) : 0;
    const avgTTFT = runsCount ? Math.round(filteredData.reduce((acc, b) => acc + (b.single_time_to_first_token_ms || 0), 0) / runsCount) : 0;

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.08 } }
    };
    const item = {
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0 }
    };

    const parseBattery = (meta: any) => {
        const data = typeof meta === 'string' ? JSON.parse(meta) : meta;
        if (!data) return 'N/A';
        return data.battery ? `${data.battery}%` : data.batteryLevel ? `${data.batteryLevel}%` : data.battery_level ? `${data.battery_level}%` : 'Inconnu';
    };

    return (
        <motion.div className="space-y-6 relative" variants={container} initial="hidden" animate="show">

            {/* Header & Filters */}
            <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Activity className="w-8 h-8 text-primary" />
                        AI Analytics Core
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm">Dashboard de télémétrie avancée, projection de finetuning et performances matérielles</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <select
                        value={selectedDevice}
                        onChange={(e) => setSelectedDevice(e.target.value)}
                        className="bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-2 hover:bg-white/10 focus:outline-none transition-colors"
                    >
                        <option value="all" className="bg-zinc-900">Tous les appareils</option>
                        {devices.map(d => <option key={d} value={d} className="bg-zinc-900">{d}</option>)}
                    </select>
                    <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-2 hover:bg-white/10 focus:outline-none transition-colors"
                    >
                        <option value="all" className="bg-zinc-900">Tous les modèles</option>
                        {models.map(m => <option key={m} value={m} className="bg-zinc-900">{m}</option>)}
                    </select>
                </div>
            </motion.div>

            {/* 6 KPIs Grid */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                <motion.div variants={item}><StatsCard title="Tests Analysés" value={runsCount.toString()} icon={Target} description="Échantillons" color="primary" /></motion.div>
                <motion.div variants={item}><StatsCard title="Vitesse (Tokens/s)" value={`${avgSpeed}`} icon={Zap} description="Génération" color="green" /></motion.div>
                <motion.div variants={item}><StatsCard title="Score Global" value={avgScore.toString()} icon={Activity} description="Indice" color="purple" /></motion.div>
                <motion.div variants={item}><StatsCard title="Dégradation" value={`-${avgDegradation}%`} icon={TrendingDown} description="Stabilité" color="accent" /></motion.div>
                <motion.div variants={item}><StatsCard title="Latence (TTFT)" value={`${avgTTFT}ms`} icon={Clock} description="First Token" color="blue" /></motion.div>
                <motion.div variants={item}><StatsCard title="Résilience" value={runsCount ? (100 - Number(avgDegradation)).toFixed(1) : "0"} icon={Layers} description="Score de charge" color="primary" /></motion.div>
            </div>


            {/* Main Graphs Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. Radar Chart (Star Chart) */}
                <motion.div variants={item} className="glass-card p-6 flex flex-col items-center">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider self-start flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-purple-400" />
                        Signatures des Modèles
                    </h3>
                    <p className="text-xs text-muted-foreground self-start mb-4">Analyse multidimensionnelle en étoile</p>
                    <div className="h-[400px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                <PolarAngleAxis dataKey="metric" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                {radarModels.map((model, i) => (
                                    <Radar key={model} name={model} dataKey={model} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.4} />
                                ))}
                                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* 2. Base vs Finetuned Comparison */}
                <motion.div variants={item} className="glass-card p-6 lg:col-span-2">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                        <Box className="w-4 h-4 text-amber-500" />
                        Impact du Finetuning (Projection)
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">Comparatif : Modèle générique (Base) vs Version optimisée matériellement</p>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={tuningData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={6}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
                                <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                <Bar dataKey="Base Model" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Finetuned (Projeté)" fill="#10B981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* 3D Global Visualization & Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div variants={item} className="w-full lg:col-span-2">
                    <BarChart3DViewer
                        data={filteredData}
                        onSelect={(id) => {
                            const test = benchmarks.find(b => b.id === id);
                            if (test) setSelectedTest(test);
                        }}
                        onHover={(id) => {
                            if (id) {
                                const test = benchmarks.find(b => b.id === id);
                                if (test) setHoveredTest(test);
                            } else {
                                setHoveredTest(null);
                            }
                        }}
                    />
                </motion.div>
                <motion.div variants={item} className="w-full lg:col-span-1">
                    <TokenSimulator
                        speed={(hoveredTest || selectedTest)?.single_tokens_per_sec || 0}
                        modelName={(hoveredTest || selectedTest)?.model_name || ''}
                    />
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 3. Area Chart - Temporal Volume */}
                <motion.div variants={item} className="glass-card p-6 lg:col-span-2">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                        <LineIcon className="w-4 h-4 text-cyan-400" />
                        Volume & Vitesse Temporelle (Cliquez pour inspecter)
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">Évolution fluide des performances IA par lancement continu</p>
                    <div className="h-[250px] w-full cursor-pointer">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} onClick={(e: any) => { if (e?.activePayload) setSelectedTest(e.activePayload[0].payload.fullObj); }}>
                                <defs>
                                    <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="timeLabel" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} />
                                <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} />
                                <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                <Area type="monotone" dataKey="speed" stroke="#06B6D4" fillOpacity={1} fill="url(#colorSpeed)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* 4. Pie Chart - Device Brands */}
                <motion.div variants={item} className="glass-card p-6 flex flex-col items-center">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider self-start flex items-center gap-2 mb-2">
                        <PieIcon className="w-4 h-4 text-emerald-400" />
                        Écosystème Matériel
                    </h3>
                    <p className="text-xs text-muted-foreground self-start mb-4">Marques Android utilisées</p>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={brandData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                    {brandData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* 5. Memory vs Speed Scatter & 6. Telemetry Table */}
            <motion.div variants={item} className="glass-card p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-primary" />
                            Logs de Télémétrie & RAM Impact (Cliquez pour inspecter)
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">Détails granulaires des exécutions et dépendance à la mémoire matérielle.</p>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Scatter Chart */}
                    <div className="w-full lg:w-1/3 h-[300px] border border-white/5 rounded-xl p-4 bg-white/[0.01] cursor-pointer">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -20 }} onClick={(e: any) => { if (e?.activePayload) setSelectedTest(e.activePayload[0].payload.fullObj); }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis type="number" dataKey="ramGb" name="RAM (GB)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                                <YAxis type="number" dataKey="speed" name="Speed" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                                <ZAxis type="number" dataKey="score" range={[30, 200]} />
                                <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                <Scatter name="Devices" data={scatterData} fill="#F43F5E" fillOpacity={0.7} />
                            </ScatterChart>
                        </ResponsiveContainer>
                        <p className="text-center text-[10px] text-muted-foreground mt-2">RAM (GB) vs Génération Tokens/s</p>
                    </div>

                    {/* Table */}
                    <div className="w-full lg:w-2/3 overflow-x-auto border border-white/5 rounded-xl bg-white/[0.01]">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="border-b border-white/10 text-[10px] tracking-wider uppercase text-muted-foreground bg-white/[0.02]">
                                    <th className="p-3 font-medium">Timestamp</th>
                                    <th className="p-3 font-medium">Appareil & OS</th>
                                    <th className="p-3 font-medium">Modèle IA</th>
                                    <th className="p-3 font-medium flex items-center gap-1"><Battery className="w-3 h-3" /> État</th>
                                    <th className="p-3 font-medium text-right">TTFT</th>
                                    <th className="p-3 font-medium text-right">Tokens/sec</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm text-white">
                                {filteredData.slice().reverse().slice(0, 10).map((b) => (
                                    <tr
                                        key={b.id}
                                        onClick={() => setSelectedTest(b)}
                                        className="border-b border-white/5 hover:bg-white/[0.05] transition-colors cursor-pointer"
                                    >
                                        <td className="p-3 whitespace-nowrap text-muted-foreground text-xs">{new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                                        <td className="p-3">
                                            <div className="font-medium flex items-center gap-2 text-xs">
                                                <Smartphone className="w-3 h-3 text-secondary/70" />
                                                {b.device_brand} {b.device_model}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                                                Android {b.os_version} (API {b.platform_api_level}) — RAM: {b.total_memory_bytes ? (b.total_memory_bytes / 1073741824).toFixed(1) + 'GB' : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="p-3 text-xs">{b.model_name}</td>
                                        <td className="p-3 font-mono text-[11px] text-green-400">{parseBattery(b.raw_metadata)}</td>
                                        <td className="p-3 text-right font-mono text-[11px] text-amber-400">{b.single_time_to_first_token_ms ? `${b.single_time_to_first_token_ms}ms` : 'N/A'}</td>
                                        <td className="p-3 text-right font-mono text-cyan-400 font-bold">{b.single_tokens_per_sec?.toFixed(1) || 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </motion.div>

            {/* Drilldown Modal / Judge Mode */}
            <AnimatePresence>
                {selectedTest && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
                        onClick={() => setSelectedTest(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-white/10 flex justify-between items-start sticky top-0 bg-zinc-950/90 backdrop-blur z-10">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Fingerprint className="text-primary w-6 h-6" />
                                        Analyse Détaillée — ID: {selectedTest.id.slice(0, 8)}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                        <Smartphone className="w-3 h-3" /> {selectedTest.device_brand} {selectedTest.device_model}
                                        <span className="text-white/20">|</span>
                                        <Box className="w-3 h-3" /> {selectedTest.model_name}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedTest(null)} className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 grid gap-6 md:grid-cols-2">

                                {/* Left/Top : Telemetry Summary */}
                                <div className="space-y-6">
                                    <div className="glass-card p-5 border border-white/5">
                                        <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                                            <Cpu className="w-4 h-4 text-cyan-400" /> Spécifications Matérielles
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase">OS Version</p>
                                                <p className="text-sm font-mono text-zinc-300">Android {selectedTest.os_version}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase">Niveau API</p>
                                                <p className="text-sm font-mono text-zinc-300">API {selectedTest.platform_api_level}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase">RAM Totale</p>
                                                <p className="text-sm font-mono text-amber-400">{selectedTest.total_memory_bytes ? (selectedTest.total_memory_bytes / 1073741824).toFixed(2) + ' GB' : 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase">État Batterie</p>
                                                <p className="text-sm font-mono text-green-400">{parseBattery(selectedTest.raw_metadata)}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-[10px] text-muted-foreground uppercase">Architectures CPU</p>
                                                <p className="text-sm font-mono text-zinc-300">{selectedTest.supported_cpu_architectures?.join(', ') || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="glass-card p-5 border border-white/5">
                                        <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-yellow-400" /> Profil de Performance
                                        </h4>
                                        <div className="flex items-end gap-6">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase">Vitesse (Tokens/s)</p>
                                                <p className="text-3xl font-bold text-cyan-400">{selectedTest.single_tokens_per_sec?.toFixed(1) || '0'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase">Score Global</p>
                                                <p className="text-3xl font-bold text-purple-400">{selectedTest.score_global || '0'}</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase">Time To First Token</p>
                                                <p className="text-sm font-mono text-amber-500">{selectedTest.single_time_to_first_token_ms || '0'} ms</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase">Temps de Chargement</p>
                                                <p className="text-sm font-mono text-zinc-300">{selectedTest.load_time_ms || '0'} ms</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-[10px] text-muted-foreground uppercase">Dégradation en charge (Stress)</p>
                                                <p className="text-sm font-mono text-red-400">{selectedTest.stress_degradation_pct ? `-${selectedTest.stress_degradation_pct}%` : 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right/Bottom : Judge Mode */}
                                <div className="glass-card p-5 border-2 border-primary/20 bg-primary/5 flex flex-col">
                                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                                        <Scale className="w-4 h-4 text-primary" />
                                        Mode Judge - Évaluation IA
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground mb-4">Évaluez la qualité de la génération : cohérence, hallucinations, formatage.</p>

                                    <div className="flex-1 bg-black/40 p-4 rounded-xl border border-white/5 mb-6 text-sm font-mono text-zinc-300 overflow-y-auto max-h-[300px]">
                                        <div className="mb-4">
                                            <span className="text-primary font-bold text-[10px] uppercase tracking-wider block mb-1">Prompt</span>
                                            {selectedTest.raw_metadata?.prompt || <span className="italic text-zinc-600">Prompt générique de benchmark de performance...</span>}
                                        </div>
                                        <div className="border-t border-white/10 pt-4">
                                            <span className="text-green-400 font-bold text-[10px] uppercase tracking-wider block mb-1">Génération ({selectedTest.model_name})</span>
                                            {(() => {
                                                const meta = selectedTest.raw_metadata;
                                                const outputs = meta?.outputs || meta?.response || meta?.generation;
                                                if (!outputs) return <span className="italic text-zinc-600">Aucun résultat d'inférence en base pour ce test.</span>;

                                                // If outputs is a string, try to parse it if it looks like JSON
                                                let data = outputs;
                                                if (typeof outputs === 'string' && (outputs.trim().startsWith('{') || outputs.trim().startsWith('['))) {
                                                    try { data = JSON.parse(outputs); } catch (e) { }
                                                }

                                                // If it's the structured 'outputs' object from recent benchmarks
                                                if (typeof data === 'object' && data !== null) {
                                                    const entries = Object.entries(data);
                                                    if (entries.length > 0) {
                                                        return (
                                                            <div className="mt-2 space-y-4">
                                                                {entries.map(([key, value]) => {
                                                                    let parsedValue = value;
                                                                    if (typeof value === 'string') {
                                                                        try { parsedValue = JSON.parse(value); } catch (e) { }
                                                                    }

                                                                    // Check for Quiz/Flashcard arrays
                                                                    const isArray = Array.isArray(parsedValue);
                                                                    const items = isArray ? (parsedValue as any[]) : [];

                                                                    return (
                                                                        <div key={key} className="bg-black/50 p-4 rounded-xl border border-white/10 shadow-inner">
                                                                            <h5 className="text-primary text-[10px] uppercase font-bold mb-3 flex items-center gap-2">
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                                                {key}
                                                                            </h5>

                                                                            <div className="text-zinc-300 text-[11px] leading-relaxed">
                                                                                {isArray && items.length > 0 && (items[0].question || items[0].front || items[0].intitule) ? (
                                                                                    <div className="space-y-3">
                                                                                        {items.map((item: any, idx: number) => (
                                                                                            <div key={idx} className="bg-white/5 p-3 rounded-lg border border-white/5">
                                                                                                <div className="font-bold text-white mb-1">
                                                                                                    {idx + 1}. {item.intitule || item.question || item.front}
                                                                                                </div>
                                                                                                {item.propositions && (
                                                                                                    <div className="pl-4 mt-2 grid grid-cols-1 gap-1">
                                                                                                        {item.propositions.map((p: string, pi: number) => (
                                                                                                            <div key={pi} className={clsx("px-2 py-1 rounded border text-[10px]", item.reponses?.includes(p) ? "bg-green-500/20 border-green-500/30 text-green-400" : "bg-white/5 border-transparent opacity-60")}>
                                                                                                                {p}
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                )}
                                                                                                {(item.back || item.answer || item.explication) && (
                                                                                                    <div className="mt-2 text-primary/80 italic text-[10px] border-l border-primary/30 pl-3">
                                                                                                        {item.back || item.answer || item.explication}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="whitespace-pre-wrap">{typeof parsedValue === 'object' ? JSON.stringify(parsedValue, null, 2) : String(value)}</div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    }
                                                }

                                                return <div className="whitespace-pre-wrap">{String(outputs)}</div>;
                                            })()}
                                        </div>
                                    </div>

                                    {/* Judge Interaction */}
                                    <div className="mt-auto">
                                        {isJudged ? (
                                            <motion.div
                                                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                                className="flex flex-col items-center justify-center p-4 bg-green-500/10 text-green-400 rounded-xl border border-green-500/20"
                                            >
                                                <CheckCircle className="w-8 h-8 mb-2" />
                                                <span className="font-bold text-2xl">{judgeScore} / 100</span>
                                                <span className="text-xs uppercase tracking-wider mt-1 text-green-400/80">Pertinence Enregistrée</span>
                                            </motion.div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-end text-white font-bold px-1">
                                                    <span className="text-xs text-muted-foreground">0</span>
                                                    <div className="text-center">
                                                        <span className="text-3xl text-primary">{judgeScore}</span>
                                                        <span className="text-sm text-muted-foreground">/100</span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">100</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="100"
                                                    value={judgeScore}
                                                    onChange={e => setJudgeScore(Number(e.target.value))}
                                                    className="w-full accent-primary h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                                />
                                                <div className="flex gap-2 mt-2 w-full">
                                                    <button
                                                        onClick={() => setIsJudged(true)}
                                                        className="flex-1 py-3 bg-primary/20 hover:bg-primary/40 text-primary font-bold text-[10px] sm:text-xs tracking-wider rounded-xl transition-all border border-primary/30 hover:scale-[1.02]"
                                                    >
                                                        JUDGE MANUEL
                                                    </button>
                                                    <button
                                                        onClick={handleAutopilot}
                                                        disabled={isAutopilotLoading}
                                                        className="flex-1 py-3 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 font-bold text-[10px] sm:text-xs tracking-wider rounded-xl transition-all border border-blue-500/30 flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isAutopilotLoading ? (
                                                            <span className="animate-pulse">ANALYSE...</span>
                                                        ) : (
                                                            <>
                                                                <Bot className="w-4 h-4" />
                                                                AUTOPILOT IA
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </motion.div>
    );
}
