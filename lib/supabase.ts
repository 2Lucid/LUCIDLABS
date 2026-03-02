
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a mock client if credentials are missing to prevent build/runtime crashes during UI dev
const createSupabaseClient = () => {
    if (!supabaseUrl || !supabaseKey) {
        console.warn("Missing Supabase environment variables. Using mock client.");
        return {
            from: () => ({
                select: () => Promise.resolve({ data: [], error: null }),
                insert: () => Promise.resolve({ data: [], error: null }),
                update: () => Promise.resolve({ data: [], error: null }),
                delete: () => Promise.resolve({ data: [], error: null }),
                eq: () => ({
                    select: () => Promise.resolve({ data: [], error: null }),
                    update: () => Promise.resolve({ data: [], error: null }),
                    delete: () => Promise.resolve({ data: [], error: null }),
                })
            })
        } as any;
    }
    return createClient(supabaseUrl, supabaseKey);
};

export const supabase = createSupabaseClient();
