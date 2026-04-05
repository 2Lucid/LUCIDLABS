import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import BenchmarkDashboard from "./BenchmarkDashboard";

export const revalidate = 0;

export default async function BenchmarkPage() {
    // Fetch benchmark data
    const supabaseUrl = process.env.NEXT_PUBLIC_BENCHMARK_SUPABASE_URL;
    const supabaseKey = process.env.BENCHMARK_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_BENCHMARK_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return (
            <div className="p-10 text-center">
                <div className="inline-block p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400">
                    <h2 className="text-xl font-bold mb-2">Variables d'environnement manquantes sur Vercel</h2>
                    <p className="text-sm">Veuillez ajouter NEXT_PUBLIC_BENCHMARK_SUPABASE_URL et NEXT_PUBLIC_BENCHMARK_SUPABASE_ANON_KEY dans les settings Vercel.</p>
                </div>
            </div>
        );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
        .from('ai_benchmarks')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching benchmarks", error);
    }

    const benchmarks = data || [];

    return (
        <div className="pb-10">
            <BenchmarkDashboard initialData={benchmarks} />
        </div>
    );
}
