import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from datetime import datetime
from unittest.mock import patch


SCRIPT = Path(__file__).with_name('ingest-cadence.py')
spec = importlib.util.spec_from_file_location('cadence', SCRIPT)
cadence = importlib.util.module_from_spec(spec)
if SCRIPT.exists():
    spec.loader.exec_module(cadence)


def instant(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00'))


class CadenceTests(unittest.TestCase):
    def test_game_day_windows_follow_pacific_date_and_dst(self):
        cases = [
            ('2026-10-12T15:59:00Z', '2026-10-12', 'REG', False),
            ('2026-10-12T16:00:00Z', '2026-10-12', 'REG', True),
            ('2026-10-13T05:59:00Z', '2026-10-12', 'REG', True),
            ('2026-10-13T06:00:00Z', '2026-10-12', 'REG', False),
            ('2026-11-02T16:59:00Z', '2026-11-02', 'REG', False),
            ('2026-11-02T17:00:00Z', '2026-11-02', 'REG', True),
            ('2026-11-03T06:59:00Z', '2026-11-02', 'REG', True),
            ('2026-11-03T07:00:00Z', '2026-11-02', 'REG', False),
            ('2027-01-09T18:00:00Z', '2027-01-09', 'WC', True),
            ('2026-12-23T18:00:00Z', '2026-12-23', 'REG', True),
            ('2026-10-11T17:00:00Z', '2026-10-11', 'REG', True),
            ('2026-10-12T18:00:00Z', '2026-10-11', 'REG', False),
            ('2026-08-12T18:00:00Z', '2026-08-12', 'PRE', False),
        ]
        for now, gameday, game_type, expected in cases:
            with self.subTest(now=now, game_type=game_type):
                rows = [{'game_id': 'game', 'gameday': gameday, 'game_type': game_type}]
                result = cadence.decide(instant(now), rows, instant('2027-02-01T00:00:00Z'))
                self.assertEqual(result['run'], expected)

    def test_expiry_is_exclusive_and_checked_before_fetch(self):
        now = instant('2026-10-28T18:00:00Z')
        self.assertEqual(cadence.decide(now, [], now)['reason'], 'expired')
        with patch.object(cadence, 'fetch_games', side_effect=AssertionError('must not fetch')):
            result = cadence.evaluate('hourly', now, now)
        self.assertFalse(result['run'])

    def test_game_ids_are_deduplicated(self):
        rows = [{'game_id': 'game', 'gameday': '2026-10-12', 'game_type': 'REG'}] * 2
        self.assertEqual(cadence.decide(instant('2026-10-12T18:00:00Z'), rows,
                                      instant('2026-10-28T07:00:00Z'))['game_ids'], ['game'])

    def test_naive_timestamps_are_rejected(self):
        with self.assertRaises(ValueError):
            cadence.decide(datetime(2026, 10, 12), [], instant('2026-10-28T07:00:00Z'))

    def test_schedule_parser_rejects_malformed_data(self):
        for csv in ['bad,headers\n1,2\n',
                    'game_id,gameday,game_type\nx,2026-02-30,REG\n',
                    'game_id,gameday,game_type\n,2026-10-12,REG\n']:
            with self.subTest(csv=csv), self.assertRaises(ValueError):
                cadence.parse_games(csv)
        self.assertEqual(cadence.parse_games('game_id,gameday,game_type\n'), [])

    def test_csv_quotes_and_scores_are_preserved(self):
        rows = cadence.parse_games('game_id,gameday,game_type,home_score,away_score,stadium\n'
                                   '2026_05_BUF_LA,2026-10-12,REG,34,37,"A, B"\n')
        self.assertEqual(rows[0]['home_score'], '34')

    def test_daily_and_manual_do_not_depend_on_schedule(self):
        for mode in ['daily', 'manual']:
            with patch.object(cadence, 'fetch_games', side_effect=AssertionError('must not fetch')):
                self.assertTrue(cadence.evaluate(mode, instant('2026-10-29T00:00:00Z'),
                                                instant('2026-10-28T07:00:00Z'))['run'])

    def test_unknown_trigger_cannot_bypass_gate(self):
        self.assertEqual(cadence.trigger_mode('espn', 'schedule', '17 15,20 * * *'), 'daily')
        self.assertEqual(cadence.trigger_mode('nflverse', 'schedule', '17 16,21 * * *'), 'daily')
        self.assertEqual(cadence.trigger_mode('espn', 'workflow_dispatch', ''), 'manual')
        self.assertEqual(cadence.trigger_mode('espn', 'schedule', '17 0-7,16-19,21-23 * * *'), 'hourly')
        with self.assertRaises(ValueError):
            cadence.trigger_mode('espn', 'push', '')
        with self.assertRaises(ValueError):
            cadence.trigger_mode('espn', 'schedule', 'arbitrary')

    def test_fetch_retries_and_fails_visibly(self):
        with patch.object(cadence, 'urlopen', side_effect=OSError('offline')), \
             patch.object(cadence.time, 'sleep'):
            with self.assertRaises(OSError):
                cadence.fetch_games()

    def test_score_observations_distinguish_missing_and_final_scores(self):
        source = [{'game_id': 'game', 'home_score': '34', 'away_score': '37'}]
        result = cadence.compare_scores(source, [{'game_id': 'game', 'home_score': None,
                                                 'away_score': None}])
        self.assertFalse(result[0]['matches'])
        result = cadence.compare_scores(source, [{'game_id': 'game', 'home_score': 34,
                                                 'away_score': 37}])
        self.assertTrue(result[0]['matches'])
        self.assertEqual(cadence.compare_scores(source, [])[0]['database'], None)

    def test_zero_is_a_score_not_missing_data(self):
        self.assertTrue(cadence.compare_scores(
            [{'game_id': 'game', 'home_score': 0, 'away_score': 7}],
            [{'game_id': 'game', 'home_score': 0, 'away_score': 7}])[0]['matches'])

    def test_observation_reads_only_public_scores_and_requires_hosted_url(self):
        source = [{'game_id': 'game', 'gameday': '2026-10-12', 'game_type': 'REG',
                   'home_score': '34', 'away_score': '37'}]
        with patch.object(cadence, 'fetch_games', return_value=source), \
             patch.dict(os.environ, {'SUPABASE_URL': 'http://example.com',
                                     'SUPABASE_SECRET_KEY': 'test-only'}):
            with self.assertRaises(ValueError):
                cadence.observe(instant('2026-10-13T18:00:00Z'))

    def test_cli_outputs_decision_and_skips_outside_window(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'output'
            decision = Path(directory) / 'decision.json'
            result = subprocess.run([
                'python3', str(SCRIPT), '--workflow', 'espn', '--event', 'schedule',
                '--schedule', '17 0-7,16-19,21-23 * * *', '--now', '2026-10-12T08:00:00Z',
                '--expires-at', '2026-10-28T07:00:00Z', '--output', str(decision)
            ], env={**os.environ, 'GITHUB_OUTPUT': str(output)}, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('run=false', output.read_text())
            self.assertEqual(json.loads(decision.read_text())['reason'], 'outside_window')


if __name__ == '__main__':
    unittest.main()
