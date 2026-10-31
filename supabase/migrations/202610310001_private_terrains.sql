create table public.terrains (
  owner_id uuid not null references auth.users(id) on delete cascade,
  terrain_id text not null check (length(terrain_id) between 1 and 80),
  revision integer not null check (revision > 0),
  document jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, terrain_id)
);
create table public.terrain_revisions (
  owner_id uuid not null references auth.users(id) on delete cascade,
  terrain_id text not null,
  revision integer not null check (revision > 0),
  document jsonb not null,
  primary key (owner_id, terrain_id, revision),
  foreign key (owner_id, terrain_id) references public.terrains(owner_id, terrain_id) on delete cascade
);
alter table public.terrains enable row level security;
alter table public.terrain_revisions enable row level security;
create policy owner_read on public.terrains for select to authenticated using ((select auth.uid()) = owner_id);
create policy owner_revision_read on public.terrain_revisions for select to authenticated using ((select auth.uid()) = owner_id);
revoke all on public.terrains, public.terrain_revisions from anon, authenticated;
grant select on public.terrains, public.terrain_revisions to authenticated;
grant select on public.terrains, public.terrain_revisions to service_role;

-- Writes only through this owner-bound, serialized transaction. No table write grant to bypass limits.
create function public.save_private_terrain(document jsonb, expected_revision integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner uuid := auth.uid();
  terrain_key text := document->>'id';
  current_revision integer;
  next_document jsonb;
begin
  if owner is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then raise exception 'account_required'; end if;
  if octet_length(document::text) > 1000000 or document->>'schemaVersion' is distinct from '2'
    or length(coalesce(terrain_key, '')) not between 1 and 80
    or length(coalesce(document->>'title', '')) not between 1 and 80
    or expected_revision < 0 or expected_revision is null
    or jsonb_typeof(document->'walls') is distinct from 'array'
    or jsonb_typeof(document->'raceSpawns') is distinct from 'array'
  then raise exception 'invalid_document'; end if;
  if jsonb_array_length(document->'walls') > 128 or jsonb_array_length(document->'raceSpawns') not between 1 and 4 then raise exception 'invalid_document'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner::text, 0));
  select revision into current_revision from public.terrains where owner_id = owner and terrain_id = terrain_key;
  if coalesce(current_revision, 0) <> expected_revision then raise exception 'revision_conflict'; end if;
  if current_revision is null and (select count(*) from public.terrains where owner_id = owner) >= 40 then raise exception 'terrain_limit'; end if;
  next_document := jsonb_set(document, '{revision}', to_jsonb(coalesce(current_revision, 0) + 1));
  insert into public.terrains(owner_id, terrain_id, revision, document) values(owner, terrain_key, coalesce(current_revision, 0) + 1, next_document)
  on conflict (owner_id, terrain_id) do update set revision = excluded.revision, document = excluded.document, updated_at = now();
  insert into public.terrain_revisions(owner_id, terrain_id, revision, document) values(owner, terrain_key, coalesce(current_revision, 0) + 1, next_document);
  return next_document;
end;
$$;
revoke all on function public.save_private_terrain(jsonb, integer) from public, anon;
grant execute on function public.save_private_terrain(jsonb, integer) to authenticated;
