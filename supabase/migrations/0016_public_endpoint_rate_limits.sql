-- Shared, short-lived rate limits for anonymous server-side research bridges.
create table if not exists public.public_endpoint_rate_limits (
  route_name text not null check (route_name in ('gdelt')),
  bucket_kind text not null check (bucket_kind in ('client', 'global')),
  bucket_hash text not null check (bucket_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  attempts integer not null check (attempts >= 1),
  primary key (route_name, bucket_kind, bucket_hash)
);

alter table public.public_endpoint_rate_limits enable row level security;
revoke all on public.public_endpoint_rate_limits from public, anon, authenticated;
grant all on public.public_endpoint_rate_limits to service_role;

create or replace function public.consume_public_endpoint_rate_limit(
  p_route_name text,
  p_client_hash text,
  p_global_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_client_attempts integer;
  v_global_attempts integer;
begin
  if p_route_name <> 'gdelt'
    or p_client_hash !~ '^[a-f0-9]{64}$'
    or p_global_hash !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  insert into public.public_endpoint_rate_limits as current_limit
    (route_name, bucket_kind, bucket_hash, window_started_at, attempts)
  values (p_route_name, 'client', p_client_hash, v_now, 1)
  on conflict (route_name, bucket_kind, bucket_hash) do update set
    window_started_at = case
      when current_limit.window_started_at <= v_now - interval '1 minute' then v_now
      else current_limit.window_started_at
    end,
    attempts = case
      when current_limit.window_started_at <= v_now - interval '1 minute' then 1
      else least(current_limit.attempts + 1, 11)
    end
  returning attempts into v_client_attempts;

  insert into public.public_endpoint_rate_limits as current_limit
    (route_name, bucket_kind, bucket_hash, window_started_at, attempts)
  values (p_route_name, 'global', p_global_hash, v_now, 1)
  on conflict (route_name, bucket_kind, bucket_hash) do update set
    window_started_at = case
      when current_limit.window_started_at <= v_now - interval '1 minute' then v_now
      else current_limit.window_started_at
    end,
    attempts = case
      when current_limit.window_started_at <= v_now - interval '1 minute' then 1
      else least(current_limit.attempts + 1, 31)
    end
  returning attempts into v_global_attempts;

  -- Keep only the current window and one previous window; stored keys are HMACs,
  -- never raw client IP addresses.
  delete from public.public_endpoint_rate_limits
    where window_started_at < v_now - interval '2 minutes';

  return v_client_attempts <= 10 and v_global_attempts <= 30;
end;
$$;

revoke all on function public.consume_public_endpoint_rate_limit(text, text, text)
  from public, anon, authenticated;
grant execute on function public.consume_public_endpoint_rate_limit(text, text, text)
  to service_role;
