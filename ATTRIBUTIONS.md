# Attributions

Third-party assets and references used under their licenses.

## Uniform figure proportions

The generated vector uniform (`components/UniformFigure.tsx`) has its proportions modeled
on the blank template **"NFL-Uniform-template-V3"** by Wikipedia user **JohnnySeoul**,
used under the **Creative Commons Attribution 3.0 Unported (CC BY 3.0)** license
(https://creativecommons.org/licenses/by/3.0/).

- Source: https://commons.wikimedia.org/wiki/File:NFL-Uniform-template-V3.png
- Changes made: the template was vectorized into region-separated SVG geometry (front helmet +
  jersey + pants + legs) and adapted into a parametric, color-driven renderer
  (`components/UniformFigure.tsx`); each region is recolored per kit from `TeamColors`.
  Manufacturer logos, patches, wordmarks, and back views are omitted.

## Team marks

Some team modules under `lib/uniforms/teams/` include a helmet decal path; the set grows as teams
are added, so run `grep -rln "surface: 'helmet'" lib/uniforms/teams` for the current list rather
than relying on an enumeration here. These reproduce team marks and are used for identification of
the team only.

Team names, logos, and uniform marks are trademarks of their respective clubs and of the National
Football League. This project is not affiliated with, endorsed by, or sponsored by the NFL or any
of its clubs. Attribution alone does not grant any right to reproduce these marks; see the
disclaimer in the app footer and `docs/uniform-model-brief.md` for the trace-then-stylize workflow
that is intended to replace traced marks with original stylized geometry.

Manufacturer logos, league shields, chest wordmarks, and sponsor marks are reproduced nowhere in
this project.
