-- ESPN brand colors are identity data, not jersey data. Preserve the last ingested values
-- in their own machine-owned table before removing the overloaded columns from teams.
create table brand_colors (
  team_id text primary key references teams(id) on delete cascade,
  color_primary text,
  color_secondary text,
  color_accent text,
  ui_accent text,
  on_accent text,
  updated_at timestamptz not null default now()
);

insert into brand_colors (
  team_id,
  color_primary,
  color_secondary,
  color_accent,
  ui_accent,
  on_accent,
  updated_at
)
select
  id,
  color_primary,
  color_secondary,
  color_accent,
  ui_accent,
  on_accent,
  updated_at
from teams;

alter table teams
  drop column color_primary,
  drop column color_secondary,
  drop column color_accent,
  drop column ui_accent,
  drop column on_accent;

alter table brand_colors enable row level security;
create policy "public read" on brand_colors for select to anon, authenticated using (true);
grant select, insert, update, delete on brand_colors to anon, authenticated, service_role;
