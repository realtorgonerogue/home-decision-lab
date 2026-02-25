# Supabase Setup

1. Create a Supabase project.
2. In the SQL editor, run:

```sql
create table if not exists public.home_decision_lab_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  properties jsonb not null default '[]'::jsonb,
  raw_weights jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.home_decision_lab_data enable row level security;

create policy "Users can read own data"
on public.home_decision_lab_data
for select
using (auth.uid() = user_id);

create policy "Users can write own data"
on public.home_decision_lab_data
for insert
with check (auth.uid() = user_id);

create policy "Users can update own data"
on public.home_decision_lab_data
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

3. Copy `.env.example` to `.env` and fill values:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Restart the Vite dev server.

Without these env vars, the app still works in local-only mode via localStorage.
