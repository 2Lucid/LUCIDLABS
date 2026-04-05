import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import BenchmarkDashboard from "./BenchmarkDashboard";

export const revalidate = 0;

export default async function BenchmarkPage() {
    // Fetch benchmark data
    const supabaseUrl = process.env.NEXT_PUBLIC_BENCHMARK_SUPABASE_URL!;
    const supabaseKey = process.env.BENCHMARK_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_BENCHMARK_SUPABASE_ANON_KEY!;
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
