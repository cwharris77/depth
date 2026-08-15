-- Native editing saves exactly one ordered position group per request. The RPC derives
-- ownership from auth.uid() so a client can never select another user's row, validates
-- the complete group before the single upsert statement, and relies on the table's
-- existing owner-only RLS policy as a second authorization boundary.

create or replace function public.upsert_depth_override_group(
  p_team_id text,
  p_position text,
  p_player_ids text[]
)
returns public.depth_overrides
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  normalized_player_ids text[] := array(
    select trim(player_id)
    from unnest(p_player_ids) as player_id
  );
  saved public.depth_overrides;
begin
  if owner_id is null then
    raise insufficient_privilege using message = 'authentication required';
  end if;

  if nullif(trim(p_team_id), '') is null or nullif(trim(p_position), '') is null then
    raise invalid_parameter_value using message = 'team and position are required';
  end if;

  if coalesce(cardinality(normalized_player_ids), 0) = 0 then
    raise invalid_parameter_value using message = 'at least one player is required';
  end if;

  if exists (
    select 1
    from unnest(normalized_player_ids) as player_id
    where nullif(player_id, '') is null
  ) then
    raise invalid_parameter_value using message = 'player ids must not be empty';
  end if;

  if cardinality(normalized_player_ids) <> (
    select count(distinct player_id)
    from unnest(normalized_player_ids) as player_id
  ) then
    raise invalid_parameter_value using message = 'player ids must be unique';
  end if;

  insert into public.depth_overrides (user_id, team_id, position, player_ids, updated_at)
  values (owner_id, trim(p_team_id), trim(p_position), normalized_player_ids, now())
  on conflict (user_id, team_id, position)
  do update set
    player_ids = excluded.player_ids,
    updated_at = excluded.updated_at
  returning * into saved;

  return saved;
end;
$$;

revoke all on function public.upsert_depth_override_group(text, text, text[]) from public, anon;
grant execute on function public.upsert_depth_override_group(text, text, text[]) to authenticated;
