-- Watchlists are private user data. Auth must be configured before the UI
-- exposes them; public sharing stays disabled until a separate token design.
alter table public.watchlists
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Production was verified to contain no watchlists, so ownership can be made
-- mandatory without assigning legacy rows to an arbitrary account.
alter table public.watchlists alter column user_id set not null;
alter table public.watchlists alter column is_public set default false;
update public.watchlists set is_public = false where is_public is distinct from false;
alter table public.watchlists alter column is_public set not null;

alter table public.watchlist_companies
  drop constraint if exists watchlist_companies_watchlist_id_fkey;
alter table public.watchlist_companies
  add constraint watchlist_companies_watchlist_id_fkey
  foreign key (watchlist_id) references public.watchlists(id) on delete cascade;

create index if not exists watchlists_user_id_created_at_idx
  on public.watchlists(user_id, created_at desc);

drop policy if exists "watchlist owners read lists" on public.watchlists;
create policy "watchlist owners read lists"
  on public.watchlists for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "watchlist owners create private lists" on public.watchlists;
create policy "watchlist owners create private lists"
  on public.watchlists for insert to authenticated
  with check (auth.uid() = user_id and is_public = false);

drop policy if exists "watchlist owners update private lists" on public.watchlists;
create policy "watchlist owners update private lists"
  on public.watchlists for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and is_public = false);

drop policy if exists "watchlist owners delete lists" on public.watchlists;
create policy "watchlist owners delete lists"
  on public.watchlists for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "watchlist owners read members" on public.watchlist_companies;
create policy "watchlist owners read members"
  on public.watchlist_companies for select to authenticated
  using (exists (
    select 1 from public.watchlists w
    where w.id = watchlist_id and w.user_id = auth.uid()
  ));

drop policy if exists "watchlist owners add active companies" on public.watchlist_companies;
create policy "watchlist owners add active companies"
  on public.watchlist_companies for insert to authenticated
  with check (
    exists (select 1 from public.watchlists w
      where w.id = watchlist_id and w.user_id = auth.uid() and w.is_public = false)
    and exists (select 1 from public.companies c
      where c.id = company_id and c.is_active = true)
  );

drop policy if exists "watchlist owners remove members" on public.watchlist_companies;
create policy "watchlist owners remove members"
  on public.watchlist_companies for delete to authenticated
  using (exists (
    select 1 from public.watchlists w
    where w.id = watchlist_id and w.user_id = auth.uid()
  ));
