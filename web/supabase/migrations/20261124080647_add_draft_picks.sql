create table public.draft_picks (
  player_id text primary key references public.players(id) on delete cascade,
  season smallint not null,
  round smallint,
  pick smallint,
  team_abbrev text,
  college text
);

create index draft_picks_team_season_idx on public.draft_picks (team_abbrev, season);

alter table public.draft_picks enable row level security;
create policy "public read" on public.draft_picks
  for select to anon, authenticated using (true);
grant select on public.draft_picks to anon, authenticated;
grant all on public.draft_picks to service_role;
