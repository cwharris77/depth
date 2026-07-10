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
  Manufacturer/team logos, patches, wordmarks, and back views are omitted.

No NFL team or manufacturer logos are reproduced anywhere in this project.
