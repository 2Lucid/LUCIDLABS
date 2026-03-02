
"use client";

import { StatsCard } from "@/components/StatsCard";
import { ActivityGraph } from "@/components/ActivityGraph";
import { calculateCO2, formatNumber } from "@/lib/utils";
import { Database, FileJson, Leaf, Zap, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface DashboardStats {
  totalEntries: number;
  validatedEntries: number;
  totalTokensEstimate: number;
  datasetSizeMB: number;
  co2Grams: number;
  co2Impact: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEntries: 0,
    validatedEntries: 0,
    totalTokensEstimate: 0,
    datasetSizeMB: 0,
    co2Grams: 0,
    co2Impact: "Low"
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch all entries
        const { data: entries, error } = await supabase
          .from('lucid_labs_entries')
          .select('*');

        if (error) throw error;

        const totalEntries = entries.length;
        const validatedEntries = entries.filter((e: any) => e.is_validated).length;

        // Calculate REAL tokens from metadata (when available)
        const totalTokens = entries.reduce((acc: any, entry: any) => {
          // If metadata has tokens field (from new system), use it
          if (entry.metadata?.tokens?.total) {
            return acc + entry.metadata.tokens.total;
          }
          // Otherwise entry was created before tracking, skip it
          return acc;
        }, 0);

        // Count how many entries have token data
        const entriesWithTokens = entries.filter((e: any) => e.metadata?.tokens?.total).length;

        // Estimate dataset size
        const jsonString = JSON.stringify(entries);
        const datasetSizeBytes = new Blob([jsonString]).size;
        const datasetSizeMB = datasetSizeBytes / (1024 * 1024);

        // Calculate CO2 impact (real data!)
        // Gemini API: ~0.2g CO2 per 1000 tokens (conservative estimate for cloud ML)
        const co2Grams = (totalTokens / 1000) * 0.2;
        const co2Impact = co2Grams > 100 ? "High" : co2Grams > 50 ? "Medium" : "Low";

        console.log(`[Dashboard] ${entriesWithTokens}/${totalEntries} entries have real token data`);

        setStats({
          totalEntries,
          validatedEntries,
          totalTokensEstimate: totalTokens,
          datasetSizeMB,
          co2Grams,
          co2Impact
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const validationRate = stats.totalEntries > 0
    ? ((stats.validatedEntries / stats.totalEntries) * 100).toFixed(1)
    : "0";

  return (
    <motion.div
      className="space-y-8"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item}>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Production Overview</h2>
        <p className="text-muted-foreground mt-2">Métriques en temps réel de votre factory de dataset.</p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item}>
          <StatsCard
            title="Entrées Totales"
            value={loading ? "..." : stats.totalEntries.toString()}
            icon={Database}
            description="Ressources dans le dataset"
            color="primary"
          />
        </motion.div>
        <motion.div variants={item}>
          <StatsCard
            title="Taux Validation"
            value={loading ? "..." : `${validationRate}%`}
            icon={TrendingUp}
            description={loading ? "Calcul..." : `${stats.validatedEntries} sur ${stats.totalEntries} validées`}
            color="green"
          />
        </motion.div>
        <motion.div variants={item}>
          <StatsCard
            title="Tokens Consommés"
            value={loading ? "..." : formatNumber(stats.totalTokensEstimate)}
            icon={Zap}
            description="Estimation tokens Gemini"
            color="blue"
          />
        </motion.div>
        <motion.div variants={item}>
          <StatsCard
            title="Impact CO2"
            value={loading ? "..." : `${stats.co2Grams.toFixed(2)}g`}
            icon={Leaf}
            description={`Niveau: ${stats.co2Impact}`}
            color={stats.co2Impact === "High" ? "red" : stats.co2Impact === "Medium" ? "secondary" : "green"}
          />
        </motion.div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <motion.div className="col-span-4 bg-card/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl" variants={item}>
          <h3 className="text-lg font-semibold mb-6 text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Activity Pulse
          </h3>
          <ActivityGraph />
        </motion.div>

        <motion.div className="col-span-3 bg-card/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden" variants={item}>
          <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
            <div className="w-32 h-32 bg-primary/30 rounded-full blur-3xl" />
          </div>

          <h3 className="text-lg font-semibold mb-6 text-white">Infos Système</h3>

          <div className="space-y-4">
            {/* Dataset Size Info */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Taille Dataset</span>
                <span className="text-lg font-bold text-primary">
                  {loading ? "..." : `${stats.datasetSizeMB.toFixed(2)} MB`}
                </span>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-secondary w-[65%]" />
              </div>
            </div>

            {/* CO2 Efficiency */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Efficacité Carbone</span>
                <span className="text-lg font-bold text-green-400">
                  {loading ? "..." : `${(stats.co2Grams / Math.max(stats.totalEntries, 1)).toFixed(3)}g/entrée`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Impact écologique optimisé grâce au batch processing
              </p>
            </div>

            {/* Storage Info */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Stockage Vectoriel</span>
                <span className="text-lg font-bold text-accent">
                  {loading ? "..." : stats.totalEntries}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Embeddings 768D pour déduplication sémantique
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-white/5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Système: Opérationnel
            </div>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary via-secondary to-accent w-[92%] animate-pulse-glow" />
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
