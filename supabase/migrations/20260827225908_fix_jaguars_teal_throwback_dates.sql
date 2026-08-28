-- Data-accuracy fix, not a rebrand: the Jaguars' curated "teal-throwback" row was seeded
-- (20260824103000) with year_start=1995/is_current=true, which reads as "worn
-- continuously since 1995." In fact teal was the primary color 1995-2008, then black took
-- over 2009-2020; the team only revived this exact 1998-2008 design as a throwback in
-- 2024 ("Prowler Throwback", jaguars.com), and it's still worn on rotation (4 games in
-- 2025). year_start now names the era the throwback recreates (1998), matching how every
-- other still-active throwback in the archive is modeled (Packers 1923 Throwback, Eagles
-- Kelly Green). The id embeds year_start, so this is an UPDATE of the existing row
-- in place, not a retire-and-reinsert — it was never actually two different kits.
-- public/uniforms/jaguars-teal-throwback-{1995,1995-full}.webp were renamed to the -1998
-- suffix in the same commit so the derived image_path still resolves.
update uniforms
set id = 'jaguars-teal-throwback-1998',
    name = 'Prowler Throwback',
    year_start = 1998,
    image_path = 'https://depth-ashen.vercel.app/uniforms/jaguars-teal-throwback-1998.webp',
    updated_at = now()
where id = 'jaguars-teal-throwback-1995';
