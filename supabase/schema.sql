
-- Create the main entries table
create table public.lucid_labs_entries (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  type text check (type in ('quiz', 'flashcard', 'tutor_chat')) not null,
  subject text,
  content jsonb not null, -- The generated JSON content
  is_validated boolean default false,
  metadata jsonb default '{}'::jsonb
);

-- Enable Row Level Security (RLS)
alter table public.lucid_labs_entries enable row level security;

-- Create a policy that allows all operations for now (since it's an internal tool)
-- In a real production environment with auth, you'd restrict this.
create policy "Allow full access to authenticated users"
  on public.lucid_labs_entries
  for all
  using (true)
  with check (true);

-- Create an index on created_at for faster sorting
create index idx_lucid_labs_entries_created_at on public.lucid_labs_entries (created_at desc);
