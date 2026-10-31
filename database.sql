-- KeyChanger: tabel voor opgeslagen teksten
-- Plak dit in Supabase: linksboven "SQL Editor" > "New query" > plakken > "Run".
-- Je mag het gerust twee keer uitvoeren, er gaat niets kapot.

create table if not exists public.saved_texts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null,
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists saved_texts_user_idx on public.saved_texts (user_id, created_at desc);

-- Beveiliging: iedereen ziet en verandert ALLEEN zijn eigen teksten.
alter table public.saved_texts enable row level security;

drop policy if exists "eigen teksten lezen"      on public.saved_texts;
drop policy if exists "eigen teksten opslaan"    on public.saved_texts;
drop policy if exists "eigen teksten aanpassen"  on public.saved_texts;
drop policy if exists "eigen teksten verwijderen" on public.saved_texts;

create policy "eigen teksten lezen"       on public.saved_texts for select using (auth.uid() = user_id);
create policy "eigen teksten opslaan"     on public.saved_texts for insert with check (auth.uid() = user_id);
create policy "eigen teksten aanpassen"   on public.saved_texts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "eigen teksten verwijderen" on public.saved_texts for delete using (auth.uid() = user_id);
