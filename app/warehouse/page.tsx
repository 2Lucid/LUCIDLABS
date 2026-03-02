
import { getEntries } from "@/app/actions";
import { DatasetView } from "@/components/warehouse/DatasetView";

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

export default async function DatasetPage() {
    const entries = await getEntries();
    console.log(`[Dataset Page] Fetched ${entries?.length || 0} entries from Supabase`);

    return <DatasetView initialData={entries || []} />;
}
