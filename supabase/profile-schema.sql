-- Apply once in the Supabase SQL editor. No anonymous access to injection history.
create table if not exists public.injection_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  blocks jsonb not null default '[]'::jsonb,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint profile_blocks_array check (jsonb_typeof(blocks) = 'array'),
  constraint profile_blocks_count check (jsonb_array_length(blocks) <= 100),
  constraint profile_blocks_size check (octet_length(blocks::text) <= 100000)
);
alter table public.injection_profiles enable row level security;
revoke all on public.injection_profiles from anon, authenticated;
grant select on public.injection_profiles to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='injection_profiles' and policyname='Read own injection profile') then
    create policy "Read own injection profile" on public.injection_profiles
      for select to authenticated using ((select auth.uid()) = user_id);
  end if;
end $$;

-- Writes use this function to enforce ownership and avoid silently overwriting
-- another device's changes. The expected user ID binds a request to its account;
-- the authenticated identity always determines which row can be written.
create or replace function public.save_injection_profile(p_blocks jsonb, p_revision bigint, p_expected_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  saved public.injection_profiles;
  entry jsonb;
  injection_date jsonb;
  date_text text;
  dose_count integer := 0;
begin
  if owner_id is null or owner_id is distinct from p_expected_user_id then raise exception 'authentication_required'; end if;
  if p_blocks is null or jsonb_typeof(p_blocks) <> 'array' or
    jsonb_array_length(p_blocks) > 100 or octet_length(p_blocks::text) > 100000 or p_revision is null or p_revision < 0 then
    raise exception 'invalid_profile';
  end if;
  for entry in select value from jsonb_array_elements(p_blocks) loop
    if jsonb_typeof(entry) <> 'object' or
      not coalesce(entry->>'compound' = any(array['semaglutide','tirzepatide']), false) or
      not coalesce(entry->>'timeOfDay' = any(array['morning','afternoon','night']), false) or
      jsonb_typeof(entry->'dates') is distinct from 'array' or jsonb_array_length(entry->'dates') < 1 or
      jsonb_typeof(entry->'doseMg') is distinct from 'number' then raise exception 'invalid_profile'; end if;
    if entry->>'compound' = 'semaglutide' and not ((entry->>'doseMg')::numeric = any(array[0.25,0.5,1,1.7,2.4])) then raise exception 'invalid_dose'; end if;
    if entry->>'compound' = 'tirzepatide' and not ((entry->>'doseMg')::numeric = any(array[2.5,5,7.5,10,12.5,15])) then raise exception 'invalid_dose'; end if;
    for injection_date in select value from jsonb_array_elements(entry->'dates') loop
      dose_count := dose_count + 1;
      if dose_count > 100 or jsonb_typeof(injection_date) <> 'string' then raise exception 'invalid_dates'; end if;
      date_text := injection_date #>> '{}';
      if date_text <> '' and (date_text !~ '^\d{4}-\d{2}-\d{2}$' or date_text < '0001-01-01' or date_text > '9999-12-24' or to_char(date_text::date, 'YYYY-MM-DD') <> date_text) then raise exception 'invalid_date'; end if;
    end loop;
  end loop;
  if p_revision = 0 then
    insert into public.injection_profiles(user_id, blocks) values(owner_id, p_blocks)
      on conflict(user_id) do nothing returning * into saved;
  else
    update public.injection_profiles set blocks = p_blocks, revision = revision + 1, updated_at = now()
      where user_id = owner_id and revision = p_revision returning * into saved;
  end if;
  if saved.user_id is null then raise exception 'profile_conflict'; end if;
  return jsonb_build_object('blocks', saved.blocks, 'revision', saved.revision, 'updated_at', saved.updated_at);
end;
$$;
revoke all on function public.save_injection_profile(jsonb,bigint,uuid) from public, anon;
grant execute on function public.save_injection_profile(jsonb,bigint,uuid) to authenticated;
