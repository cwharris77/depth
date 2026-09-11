-- Uniform archive (roadmap Phase 7). A team can be rendered in any of its kits --
-- current or historical -- and old kits are never deleted. Uniforms are their own
-- table (not an array on teams) because the archive grows over time and each kit has
-- an era. This table is 100% HAND-CURATED via lib/uniforms/data.ts + the
-- ingest-uniforms script: no structured uniform source exists (see Data Sources.md in
-- the vault), and the ESPN ingest never writes here. The team's home/primary kit is not
-- a row -- it is synthesized from teams.colors at read time (see roster-source.db.ts).
create table uniforms (
  id text primary key,                      -- stable slug: `${team_id}-${slug}`, e.g. buccaneers-creamsicle
  team_id text not null references teams(id) on delete cascade,
  name text not null,                       -- "Creamsicle", "Color Rush", "1994 Throwback"
  year_start int,
  year_end int,                             -- null = still in the active rotation
  -- Active-rotation flag. NOT unique: a team wears several kits at once (home/away/
  -- alternate/color-rush). Retired throwbacks are is_current = false.
  is_current boolean not null default false,
  color_primary text not null,
  color_secondary text not null,
  color_accent text not null,
  ui_accent text not null,                  -- curated to read on the dark app bg (#0a0e1a)
  on_accent text not null,                  -- text color painted on ui_accent
  image_path text,                          -- null -> generated jersey-SVG fallback (PR2)
  updated_at timestamptz not null default now()
);
create index uniforms_team_id_idx on uniforms(team_id);

-- Match the explicit-grant pattern of 20260701171029; a raw CLI migration doesn't
-- auto-grant the way the hosted dashboard does. RLS stays disabled pending auth design.
grant select, insert, update, delete on uniforms to anon, authenticated, service_role;
