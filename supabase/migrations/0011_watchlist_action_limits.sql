-- Small, fixed per-user quotas for authenticated private-watchlist actions.
-- The counter table is callable only through a tightly scoped SECURITY DEFINER RPC.
create table if not exists public.watchlist_action_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('create', 'delete', 'member_write', 'import_csv', 'export_csv')),
  window_started_at timestamptz not null,
  attempts integer not null check (attempts >= 1),
  primary key (user_id, action)
);

alter table public.watchlist_action_limits enable row level security;
revoke all on public.watchlist_action_limits from anon, authenticated;

create or replace function public.consume_watchlist_rate_limit(p_action text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer;
  v_now timestamptz := clock_timestamp();
  v_attempts integer;
begin
  if v_user_id is null then
    return false;
  end if;

  v_limit := case p_action
    when 'create' then 10
    when 'delete' then 10
    when 'member_write' then 200
    when 'import_csv' then 6
    when 'export_csv' then 30
    else null
  end;
  if v_limit is null then
    return false;
  end if;

  insert into public.watchlist_action_limits as current_limit
    (user_id, action, window_started_at, attempts)
  values (v_user_id, p_action, v_now, 1)
  on conflict (user_id, action) do update set
    window_started_at = case
      when current_limit.window_started_at <= v_now - interval '1 hour' then v_now
      else current_limit.window_started_at
    end,
    attempts = case
      when current_limit.window_started_at <= v_now - interval '1 hour' then 1
      else least(current_limit.attempts + 1, v_limit + 1)
    end
  returning attempts into v_attempts;

  return v_attempts <= v_limit;
end;
$$;

revoke all on function public.consume_watchlist_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_watchlist_rate_limit(text) to authenticated;
