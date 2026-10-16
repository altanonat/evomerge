-- Evolution Game — global leaderboard table for Supabase (free tier is enough)
-- Run this once in Supabase Dashboard → SQL Editor → New query → Run.

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) >= 1 and char_length(name) <= 20),
  score integer not null check (score >= 0 and score <= 100000),
  created_at timestamptz not null default now()
);

-- Public read + public insert (no login needed, suitable for a GitHub Pages game).
-- Delete/update are NOT allowed from the anon key.
alter table public.scores enable row level security;

drop policy if exists "scores_select_all" on public.scores;
create policy "scores_select_all"
  on public.scores for select
  to anon, authenticated
  using (true);

drop policy if exists "scores_insert_all" on public.scores;
create policy "scores_insert_all"
  on public.scores for insert
  to anon, authenticated
  with check (
    char_length(name) >= 1 and char_length(name) <= 20
    and score >= 0 and score <= 100000
  );

-- Helpful index for the ORDER BY score DESC leaderboard query
create index if not exists scores_score_idx on public.scores (score desc, created_at asc);
