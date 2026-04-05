-- Run this entire file in the Supabase SQL editor

-- ── Tables ────────────────────────────────────────────────────────────────────

create table debates (
  id            uuid primary key default gen_random_uuid(),
  topic         text not null,
  slug          text not null unique,
  topic_hash    text not null,
  for_text      text,
  against_text  text,
  for_votes     int not null default 0,
  against_votes int not null default 0,
  category      text,
  status        text not null default 'pending',
  created_at    timestamptz default now()
);

create table votes (
  id         uuid primary key default gen_random_uuid(),
  debate_id  uuid references debates(id) on delete cascade,
  user_id    text not null,
  side       text not null check (side in ('for', 'against')),
  created_at timestamptz default now(),
  unique (debate_id, user_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index on debates (topic_hash);
create index on debates (created_at desc);
create index on debates ((for_votes + against_votes) desc);

-- ── Atomic vote increment ─────────────────────────────────────────────────────

create or replace function vote_increment(p_debate_id uuid, p_side text)
returns void
language plpgsql
as $$
begin
  if p_side = 'for' then
    update debates set for_votes = for_votes + 1 where id = p_debate_id;
  elsif p_side = 'against' then
    update debates set against_votes = against_votes + 1 where id = p_debate_id;
  end if;
end;
$$;

-- ── Enable Realtime on debates (for live vote bar) ────────────────────────────

alter publication supabase_realtime add table debates;
