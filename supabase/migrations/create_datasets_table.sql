
-- Create datasets table
CREATE TABLE IF NOT EXISTS public.datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    color TEXT DEFAULT '#06B6D4'
);

-- Initial default dataset
INSERT INTO public.datasets (name, description, color)
VALUES ('Default Dataset', 'Dataset principal par défaut', '#06B6D4')
ON CONFLICT (name) DO NOTHING;

-- Add dataset_id to entries table
ALTER TABLE public.lucid_labs_entries 
ADD COLUMN IF NOT EXISTS dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE;

-- Update existing entries to belong to default dataset
UPDATE public.lucid_labs_entries
SET dataset_id = (SELECT id FROM public.datasets WHERE name = 'Default Dataset')
WHERE dataset_id IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_entries_dataset ON public.lucid_labs_entries(dataset_id);
