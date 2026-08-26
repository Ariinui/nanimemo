create extension if not exists pgcrypto;

create table if not exists public.vocab_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  lesson jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.vocab_cards (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.vocab_sets(id) on delete cascade,
  term text not null,
  definition text not null,
  image_url text,
  position integer not null default 0
);

create table if not exists public.vocab_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.vocab_cards(id) on delete cascade,
  box smallint not null default 1,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  last_seen_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, card_id)
);

create index if not exists vocab_cards_set_id_idx on public.vocab_cards(set_id);
create index if not exists vocab_progress_user_card_idx on public.vocab_progress(user_id, card_id);

alter table public.vocab_sets enable row level security;
alter table public.vocab_cards enable row level security;
alter table public.vocab_progress enable row level security;

drop policy if exists "Users manage their own sets" on public.vocab_sets;
create policy "Users manage their own sets"
on public.vocab_sets
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage cards of their own sets" on public.vocab_cards;
create policy "Users manage cards of their own sets"
on public.vocab_cards
for all
using (exists (select 1 from public.vocab_sets s where s.id = set_id and s.user_id = auth.uid()))
with check (exists (select 1 from public.vocab_sets s where s.id = set_id and s.user_id = auth.uid()));

drop policy if exists "Users manage their own progress" on public.vocab_progress;
create policy "Users manage their own progress"
on public.vocab_progress
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
