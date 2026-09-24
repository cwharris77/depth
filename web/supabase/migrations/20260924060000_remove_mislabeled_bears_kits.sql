-- The Bears home and away rows were dated 1984, but they describe the current design, which
-- dates to 2012. They are re-keyed as bears-home-2012 / bears-away-2012 by the seed that follows.
-- These rows are removed rather than retired because no 1984 kit with this construction existed.
delete from uniforms where id in ('bears-home-1984', 'bears-away-1984');
