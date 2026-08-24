-- Curated uniform ids include the kit's start year. Populate the era fields before
-- re-keying rows, then enforce the workflow invariant used by current-kit reads.

-- Home and away share the current construction era documented in each team's GUD archive.
update uniforms
set year_start = case team_id
  when 'ravens' then 1996
  when 'bengals' then 2021
  when 'browns' then 2020
  when 'steelers' then 1997
  when 'bills' then 2011
  when 'dolphins' then 2018
  when 'patriots' then 2020
  when 'jets' then 2024
  when 'texans' then 2024
  when 'colts' then 2004
  when 'jaguars' then 2018
  when 'titans' then 2018
  when 'broncos' then 2024
  when 'chiefs' then 1963
  when 'raiders' then 1963
  when 'chargers' then 2020
  when 'bears' then 1984
  when 'lions' then 2024
  when 'packers' then 1959
  when 'vikings' then 2013
  when 'cowboys' then 1964
  when 'giants' then 2000
  when 'eagles' then 1996
  when 'commanders' then 2022
  when 'falcons' then 2020
  when 'panthers' then 2012
  when 'saints' then 2002
  when 'buccaneers' then 2020
  when 'cardinals' then 2023
  when 'rams' then 2020
  when '49ers' then 2022
  when 'seahawks' then 2012
end
where year_start is null and kind in ('home', 'away');

-- Starts for the previously undated alternates, cross-checked against GUD.
update uniforms
set year_start = case id
  when 'bears-orange-alternate' then 2005
  when 'saints-color-rush' then 2022
  when 'jets-black-alt' then 2024
  when 'bengals-orange-alt' then 2021
  when 'ravens-black-alt' then 2004
  when 'texans-battle-red' then 2024
  when 'jaguars-black-alt' then 2018
  when 'titans-navy-alt' then 2018
  when 'broncos-orange-alt' then 2024
  when 'eagles-black-alt' then 2003
  when 'lions-gridiron-gray' then 2017
  when 'vikings-winter-warrior' then 2024
  when 'packers-winter-warning' then 2025
  when 'falcons-red-alt' then 2020
  when 'panthers-black-alt' then 2012
  when 'cardinals-black-alt' then 2023
  when 'rams-bone' then 2020
end
where year_start is null;

-- Reconciler-created retired home snapshots already end in their retirement year. Keep
-- those rows as history and use that known year as the missing start-year backstop.
update uniforms
set
  year_start = coalesce(year_start, (regexp_match(id, '-([0-9]{4})$'))[1]::int),
  year_end = coalesce(year_end, (regexp_match(id, '-([0-9]{4})$'))[1]::int)
where source = 'espn' and not is_current;

-- Normalize the two workflow fields before installing the database check.
update uniforms set year_end = null where is_current;
update uniforms set year_end = coalesce(year_end, year_start) where not is_current;

-- Every committed curated row still has the old id shape at this point, including slugs
-- that contain a year themselves (for example rivalries-2025), so append unconditionally.
update uniforms
set
  id = id || '-' || year_start,
  image_path = 'https://depth-ashen.vercel.app/uniforms/' || id || '-' || year_start || '.webp'
where source = 'curated';

-- The one machine-owned current home row per team becomes the curated home row's stable id.
update uniforms
set
  id = id || '-' || year_start,
  image_path = 'https://depth-ashen.vercel.app/uniforms/' || id || '-' || year_start || '.webp'
where source = 'espn' and is_current;

alter table uniforms alter column year_start set not null;
alter table uniforms drop column source;

create index if not exists uniforms_team_id_is_current_idx on uniforms(team_id, is_current);
create index if not exists uniforms_team_id_idx on uniforms(team_id);
create index if not exists uniforms_year_start_year_end_idx on uniforms(year_start, year_end);

alter table uniforms
  add constraint uniforms_current_year_end_consistent
  check (is_current = (year_end is null));
