create table if not exists public.research_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null check (char_length(topic) between 1 and 160),
  working_thesis text not null default '' check (char_length(working_thesis) <= 2000),
  alternatives text not null default '' check (char_length(alternatives) <= 2000),
  disconfirming_evidence text not null default '' check (char_length(disconfirming_evidence) <= 2000),
  evidence_links jsonb not null default '[]'::jsonb check (
    case when jsonb_typeof(evidence_links) = 'array'
      then jsonb_array_length(evidence_links) <= 40 else false end
  ),
  excluded_evidence_count integer not null default 0 check (excluded_evidence_count between 0 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists research_briefs_user_created_idx
  on public.research_briefs (user_id, created_at desc);

alter table public.research_briefs enable row level security;
revoke all on public.research_briefs from anon, authenticated;
grant select, insert, delete on public.research_briefs to authenticated;

drop policy if exists "owners read private research briefs" on public.research_briefs;
create policy "owners read private research briefs"
  on public.research_briefs for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "owners create private research briefs" on public.research_briefs;
create policy "owners create private research briefs"
  on public.research_briefs for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "owners delete private research briefs" on public.research_briefs;
create policy "owners delete private research briefs"
  on public.research_briefs for delete to authenticated
  using (auth.uid() = user_id);
