
"use client";

import { useState, useMemo, useEffect } from "react";
import { Check, Trash2, FileJson, Download, Search, Filter, Database, CheckCircle, Target, TrendingUp, Plus } from "lucide-react";
import { deleteEntry, validateEntry, getDatasets, getEntries } from "@/app/actions";
import { clsx } from "clsx";
import { StatsCard } from "@/components/StatsCard";
import { motion } from "framer-motion";

interface Entry {
    id: string;
    created_at: string;
    type: string;
    subject: string;
    content: any;
    metadata?: any;
    is_validated: boolean;
    dataset_id?: string;
}

export function DatasetView({ initialData }: { initialData: Entry[] }) {
    const [data, setData] = useState<Entry[]>(initialData);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");

    // Dataset Filter
    const [datasets, setDatasets] = useState<any[]>([]);
    const [selectedDatasetId, setSelectedDatasetId] = useState<string>("all");

    // Fetch Datasets on Mount
    useEffect(() => {
        getDatasets().then(d => setDatasets(d || []));
    }, []);

    // Fetch Enties when Dataset Changes
    useEffect(() => {
        getEntries(selectedDatasetId).then(d => {
            if (d) setData(d);
        });
    }, [selectedDatasetId]);

    // Calculate stats
    const stats = useMemo(() => {
        const total = data.length;
        const validated = data.filter(e => e.is_validated).length;
        const quizzes = data.filter(e => e.type === 'quiz').length;
        const avgScore = data.filter(e => e.metadata?.judge_score)
            .reduce((acc, e) => acc + (e.metadata.judge_score || 0), 0) / data.filter(e => e.metadata?.judge_score).length || 0;

        return {
            total,
            validated,
            validatedPercent: total > 0 ? ((validated / total) * 100).toFixed(1) : "0",
            quizzes,
            avgScore: avgScore.toFixed(2)
        };
    }, [data]);

    // Filter data
    const filteredData = useMemo(() => {
        return data.filter(entry => {
            const matchesSearch = entry.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                entry.content?.question?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = filterType === "all" || entry.type === filterType;
            const matchesStatus = filterStatus === "all" ||
                (filterStatus === "validated" && entry.is_validated) ||
                (filterStatus === "pending" && !entry.is_validated);
            return matchesSearch && matchesType && matchesStatus;
        });
    }, [data, searchQuery, filterType, filterStatus]);

    const handleDelete = async (id: string) => {
        if (!confirm("Supprimer cette entrée ?")) return;
        try {
            await deleteEntry(id);
            setData(data.filter(entry => entry.id !== id));
        } catch (e) {
            alert("Erreur lors de la suppression");
        }
    };

    const handleValidate = async (id: string) => {
        try {
            await validateEntry(id);
            setData(data.map(entry => entry.id === id ? { ...entry, is_validated: true } : entry));
        } catch (e) {
            alert("Erreur lors de la validation");
        }
    };

    const handleExportJSONL = () => {
        const jsonl = filteredData
            .filter(entry => entry.is_validated)
            .map(entry => JSON.stringify({
                prompt: `Generate ${entry.type} about ${entry.subject}`,
                completion: JSON.stringify(entry.content)
            }))
            .join("\n");

        const blob = new Blob([jsonl], { type: "application/jsonl" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `lucidlabs_dataset_${new Date().toISOString().split('T')[0]}.jsonl`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            className="space-y-8"
            variants={container}
            initial="hidden"
            animate="show"
        >
            {/* Header */}
            <motion.div variants={item}>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Dataset</h2>
                <p className="text-muted-foreground mt-2">Visualisez et gérez votre dataset de fine-tuning</p>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <motion.div variants={item}>
                    <StatsCard
                        title="Total Entries"
                        value={stats.total.toString()}
                        icon={Database}
                        description="Entrées dans le dataset"
                        color="primary"
                    />
                </motion.div>
                <motion.div variants={item}>
                    <StatsCard
                        title="Validated"
                        value={`${stats.validatedPercent}%`}
                        icon={CheckCircle}
                        description={`${stats.validated} sur ${stats.total} validées`}
                        color="green"
                    />
                </motion.div>
                <motion.div variants={item}>
                    <StatsCard
                        title="Quizzes"
                        value={stats.quizzes.toString()}
                        icon={Target}
                        description="Quiz générés"
                        color="purple"
                    />
                </motion.div>
                <motion.div variants={item}>
                    <StatsCard
                        title="Avg Quality"
                        value={stats.avgScore}
                        icon={TrendingUp}
                        description="Score moyen du Judge"
                        color="blue"
                    />
                </motion.div>
            </div>

            {/* Filters & Search */}
            <motion.div variants={item} className="bg-card/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Dataset Filter */}
                    <div className="relative min-w-[200px]">
                        <label className="absolute -top-2 left-3 bg-[#0f111a] px-1 text-[10px] text-muted-foreground font-bold uppercase tracking-wider z-10">
                            Dataset
                        </label>
                        <select
                            value={selectedDatasetId}
                            onChange={(e) => setSelectedDatasetId(e.target.value)}
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                        >
                            <option value="all">Tous les datasets</option>
                            {datasets.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                        <Database className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>

                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Rechercher par sujet ou question..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    {/* Type Filter */}
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="all">Tous les types</option>
                        <option value="quiz">Quiz</option>
                        <option value="flashcard">Flashcards</option>
                        <option value="tutor_chat">Tutor Chat</option>
                    </select>

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="validated">Validés</option>
                        <option value="pending">En attente</option>
                    </select>

                    {/* Export Button */}
                    <button
                        onClick={handleExportJSONL}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>

                <div className="mt-4 text-sm text-muted-foreground">
                    {filteredData.length} résultat{filteredData.length > 1 ? 's' : ''} sur {data.length} entrées
                </div>
            </motion.div>

            {/* Table */}
            <motion.div variants={item} className="border border-white/10 rounded-2xl overflow-hidden bg-card/40 backdrop-blur-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white/5 text-muted-foreground font-medium uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Sujet</th>
                                <th className="px-6 py-4">Contenu</th>
                                <th className="px-6 py-4">Score</th>
                                <th className="px-6 py-4">Statut</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredData.map((entry) => (
                                <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "px-2 py-1 rounded-lg text-xs font-medium border",
                                            {
                                                'bg-blue-500/10 text-blue-400 border-blue-500/20': entry.type === 'flashcard',
                                                'bg-purple-500/10 text-purple-400 border-purple-500/20': entry.type === 'tutor_chat',
                                                'bg-primary/10 text-primary border-primary/20': entry.type === 'quiz',
                                            }
                                        )}>
                                            {entry.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-foreground max-w-xs truncate" title={entry.subject}>
                                        {entry.subject || "Sans sujet"}
                                    </td>
                                    <td className="px-6 py-4 max-w-md truncate text-muted-foreground text-xs">
                                        {entry.content?.question || entry.content?.front || "N/A"}
                                    </td>
                                    <td className="px-6 py-4">
                                        {entry.metadata?.judge_score ? (
                                            <span className={clsx(
                                                "px-2 py-1 rounded-lg text-xs font-bold",
                                                entry.metadata.judge_score >= 4 ? "bg-green-500/10 text-green-400" :
                                                    entry.metadata.judge_score >= 3 ? "bg-yellow-500/10 text-yellow-400" :
                                                        "bg-red-500/10 text-red-400"
                                            )}>
                                                {entry.metadata.judge_score}/5
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {entry.is_validated ? (
                                            <span className="flex items-center gap-1 text-green-400 text-xs font-medium">
                                                <Check className="w-3 h-3" /> Validé
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">En attente</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground text-xs">
                                        {new Date(entry.created_at).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {!entry.is_validated && (
                                                <button
                                                    onClick={() => handleValidate(entry.id)}
                                                    className="p-2 hover:bg-green-500/10 text-muted-foreground hover:text-green-400 rounded-lg transition-colors"
                                                    title="Valider"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                className="p-2 hover:bg-blue-500/10 text-muted-foreground hover:text-blue-400 rounded-lg transition-colors"
                                                title="Voir JSON"
                                                onClick={() => alert(JSON.stringify(entry.content, null, 2))}
                                            >
                                                <FileJson className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(entry.id)}
                                                className="p-2 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 rounded-lg transition-colors"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                        <Database className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p className="font-medium">Aucune entrée trouvée</p>
                                        <p className="text-xs mt-1">Ajustez vos filtres ou créez du contenu dans Generator Studio</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </motion.div>
    );
}
