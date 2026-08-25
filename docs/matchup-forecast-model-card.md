# Depth matchup forecast model card

Model version: `depth-logit-v1-2025`  
Evaluation decision: **DECLINED**

## Intended use

This model estimates the probability of a home-team win for a scheduled NFL matchup. It is
for informational and entertainment purposes only. It is not betting advice.

## Data and attribution

Game results, weekly team statistics, and market moneylines come from nflverse data released
under CC BY 4.0. Source files used for this evaluation are pinned below:

- [games](https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv) — SHA-256 `896b1b795253d151174a526acbe2d65dde146b8912f20c6471695aae901f671f`
- [team-week-2011](https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_2011.csv) — SHA-256 `731f66ca962f8d7012548a400508bd6ea1fba373229bb8ee388584e5371efa7d`
- [team-week-2012](https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_2012.csv) — SHA-256 `f12953415da4c78cb947007fba8b6ef8a4c8e9666bd4329dd8e408979b03cfde`
- [team-week-2013](https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_2013.csv) — SHA-256 `423ddacd4b04c5d873c53aa64ee2ed7710c92ea37f350c8a8e884b395f7a51ac`
- [team-week-2014](https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_2014.csv) — SHA-256 `c3e0dabe2e5e09594d01e481c94ee1f92527f94b441e480f82c1d06b6299bb77`
- [team-week-2015](https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_2015.csv) — SHA-256 `d490bbf8817651f083d28b008b75e49714bc6998b0f2495d0df5bca75fc97fb8`
- [team-week-2016](https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_2016.csv) — SHA-256 `1a6f704d6eda8d26820ffadba05fbb42e6e60d1dc33dc93bc365c244d25349db`
- [team-week-2017](https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_2017.csv) — SHA-256 `c09fa261c37069b1ffc4ee340b8c90458d7453333321e97d13d6fb8a0aab51f4`
- [team-week-2018](https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_2018.csv) — SHA-256 `d2df3adf2fbadfb597bc334807f5020aefe2b2ae13d28155f7f01cb981f00555`
- [team-week-2019](https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_2019.csv) — SHA-256 `d3311b008de52dd95729d76d225b45f51eb91932e8fa3c38c18548397aa00a06`
- [team-week-2020](https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_2020.csv) — SHA-256 `4503b54eda88ffeb544a9fb1bc5c1eb035d262a75761a71257d44cd13dee27d5`
- [team-week-2021](https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_2021.csv) — SHA-256 `a094523217f7f351a79f5e667dbe67267e0861a3b76a7a3b62a1cfe49f289673`
- [team-week-2022](https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_2022.csv) — SHA-256 `9803875bd0b74aa49230288d45359c75e45910f1cf1953ea0f07b9d3db35e4d1`
- [team-week-2023](https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_2023.csv) — SHA-256 `dc5a387daabe8663deaddac492ad7020d47fb1a66048690b355b406cd8e4c454`
- [team-week-2024](https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_2024.csv) — SHA-256 `b207a1430c2715d03bbf1844c4eae98695f364851ff6025f422febc2c13f5255`
- [team-week-2025](https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_2025.csv) — SHA-256 `91058a59d894855377b2f39f40c4e7bdbeef96d12144289dc68215209a1c93cb`

The nflverse games source exposes a final market snapshot, not timestamped line history. This
evaluation therefore cannot reconstruct the exact market information available at every
historical kickoff and must not be described as a point-in-time odds backtest.

## Evaluation window and update timing

Preprocessing, L2 selection, and model fitting use 2012–2022 only.
The untouched holdout is 2023–2025. A future
forecast refresh must run only after the nflverse source cache is refreshed; probabilities are
pregame snapshots and do not update live during a game.

## Pooled holdout metrics

| Scope | Model | Games | Log loss | Brier | 10-bin ECE |
| --- | --- | ---: | ---: | ---: | ---: |
| Pooled | naive | 854 | 0.692160 | 0.249477 | 0.021778 |
| Pooled | market | 854 | 0.607725 | 0.210172 | 0.025006 |
| Pooled | calibratedMarket | 854 | 0.607441 | 0.210095 | 0.026835 |
| Pooled | candidate | 854 | 0.616488 | 0.213869 | 0.049754 |
| 2023 | naive | 285 | 0.685187 | 0.246023 | 0.007410 |
| 2023 | market | 285 | 0.626970 | 0.218638 | 0.042581 |
| 2023 | calibratedMarket | 285 | 0.628138 | 0.219091 | 0.043010 |
| 2023 | candidate | 285 | 0.637753 | 0.222901 | 0.071820 |
| 2024 | naive | 285 | 0.698629 | 0.252666 | 0.039953 |
| 2024 | market | 285 | 0.589214 | 0.200975 | 0.061243 |
| 2024 | calibratedMarket | 285 | 0.587088 | 0.200117 | 0.070034 |
| 2024 | candidate | 285 | 0.598437 | 0.204855 | 0.092688 |
| 2025 | naive | 284 | 0.692666 | 0.249742 | 0.027761 |
| 2025 | market | 284 | 0.606989 | 0.210906 | 0.046509 |
| 2025 | calibratedMarket | 284 | 0.607098 | 0.211080 | 0.039792 |
| 2025 | candidate | 284 | 0.613262 | 0.213850 | 0.044236 |

Paired week-block bootstrap (candidate log loss minus market): 0.001713 to 0.016097 (10000 replicates, seed 3162025).

## Promotion gates

- relativeLogLoss: FAIL
- bootstrap: FAIL
- brier: FAIL
- calibration: FAIL
- seasons: FAIL

Relative pooled log-loss improvement: -0.014419
Holdout seasons with lower candidate log loss: 0

## Feature and fallback contract

The ordered inference vector is fixed. Team statistics enter as home-minus-away differentials;
each side also has a fallback indicator. Missing current-season evidence falls back first to a
prior regular-season aggregate and then to a development-only median. Scaling and medians are
stored in the promoted artifact. The market anchor is the clipped raw `market_logit`.

1. `market_logit`
2. `neutral_site`
3. `rest_differential`
4. `postseason`
5. `offense_epa_per_opportunity_rolling4_differential`
6. `offense_epa_per_opportunity_rolling4_home_fallback`
7. `offense_epa_per_opportunity_rolling4_away_fallback`
8. `offense_epa_per_opportunity_season_differential`
9. `offense_epa_per_opportunity_season_home_fallback`
10. `offense_epa_per_opportunity_season_away_fallback`
11. `defense_epa_allowed_per_opportunity_rolling4_differential`
12. `defense_epa_allowed_per_opportunity_rolling4_home_fallback`
13. `defense_epa_allowed_per_opportunity_rolling4_away_fallback`
14. `defense_epa_allowed_per_opportunity_season_differential`
15. `defense_epa_allowed_per_opportunity_season_home_fallback`
16. `defense_epa_allowed_per_opportunity_season_away_fallback`
17. `explosive_play_rate_rolling4_differential`
18. `explosive_play_rate_rolling4_home_fallback`
19. `explosive_play_rate_rolling4_away_fallback`
20. `explosive_play_rate_season_differential`
21. `explosive_play_rate_season_home_fallback`
22. `explosive_play_rate_season_away_fallback`
23. `pressure_balance_rolling4_differential`
24. `pressure_balance_rolling4_home_fallback`
25. `pressure_balance_rolling4_away_fallback`
26. `pressure_balance_season_differential`
27. `pressure_balance_season_home_fallback`
28. `pressure_balance_season_away_fallback`
29. `turnover_margin_per_game_rolling4_differential`
30. `turnover_margin_per_game_rolling4_home_fallback`
31. `turnover_margin_per_game_rolling4_away_fallback`
32. `turnover_margin_per_game_season_differential`
33. `turnover_margin_per_game_season_home_fallback`
34. `turnover_margin_per_game_season_away_fallback`
35. `scoring_margin_per_game_rolling4_differential`
36. `scoring_margin_per_game_rolling4_home_fallback`
37. `scoring_margin_per_game_rolling4_away_fallback`
38. `scoring_margin_per_game_season_differential`
39. `scoring_margin_per_game_season_home_fallback`
40. `scoring_margin_per_game_season_away_fallback`
