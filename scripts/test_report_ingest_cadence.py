import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).with_name('report-ingest-cadence.py')
spec = importlib.util.spec_from_file_location('report', SCRIPT)
report = importlib.util.module_from_spec(spec)
if SCRIPT.exists():
    spec.loader.exec_module(report)


class ReportTests(unittest.TestCase):
    def test_queue_and_runner_duration_use_separate_timestamps(self):
        runs = [{'id': 1, 'event': 'schedule', 'created_at': '2026-10-12T18:20:00Z',
                 'conclusion': 'success', 'jobs': [
                     {'name': 'ingest', 'started_at': '2026-10-12T18:22:00Z',
                      'completed_at': '2026-10-12T18:26:00Z', 'conclusion': 'success'}]}]
        result = report.summarize(runs)
        self.assertEqual(result['runs'][0]['runner_queue_seconds'], 120)
        self.assertEqual(result['runner_seconds'], 240)
        self.assertEqual(result['runs'][0]['schedule_delivery_delay_seconds'], None)

    def test_overlap_is_counted_between_import_jobs_not_gate_jobs(self):
        runs = [
            {'id': 1, 'jobs': [{'name': 'ingest', 'started_at': '2026-10-12T18:00:00Z',
                               'completed_at': '2026-10-12T18:05:00Z'}]},
            {'id': 2, 'jobs': [{'name': 'ingest', 'started_at': '2026-10-12T18:04:00Z',
                               'completed_at': '2026-10-12T18:10:00Z'}]},
            {'id': 3, 'jobs': [{'name': 'cadence', 'started_at': '2026-10-12T18:04:00Z',
                               'completed_at': '2026-10-12T18:10:00Z'}]},
        ]
        self.assertEqual(report.summarize(runs)['overlapping_import_pairs'], [[1, 2]])

    def test_missing_job_times_are_reported_without_inventing_duration(self):
        result = report.summarize([{'id': 1, 'conclusion': 'cancelled',
                                   'jobs': [{'name': 'ingest', 'started_at': None}]}])
        self.assertEqual(result['incomplete_job_timestamps'], 1)
        self.assertEqual(result['runner_seconds'], 0)
        self.assertEqual(result['runs'][0]['conclusion'], 'cancelled')

    def test_source_to_database_gap_and_whistle_are_distinct(self):
        observations = [
            {'observed_at': '2026-10-13T04:00:00Z', 'source_scores': [
                {'game_id': 'game', 'home_score': 34, 'away_score': 37}]},
            {'observed_at': '2026-10-13T04:05:00Z', 'scores': [
                {'game_id': 'game', 'source': {'home_score': 34, 'away_score': 37},
                 'database': {'home_score': 34, 'away_score': 37}, 'matches': True}]},
        ]
        result = report.freshness(observations)
        self.assertEqual(result[0]['observed_source_to_database_seconds'], 300)
        self.assertEqual(result[0]['final_whistle_at'], None)

    def test_freshness_does_not_mutate_observations(self):
        observations = [{'observed_at': '2026-10-13T04:00:00Z', 'scores': [],
                         'source_scores': [{'game_id': 'game', 'home_score': 34,
                                            'away_score': 37}]}]
        report.freshness(observations)
        self.assertEqual(observations[0]['scores'], [])

    def test_trigger_counts_normalize_offsets_to_utc(self):
        result = report.trigger_counts('espn', '2026-10-12T08:17:00-07:00',
                                       '2026-10-12T10:17:00-07:00', 1)
        self.assertEqual(result['expected_triggers'], 2)

    def test_unplayed_zero_score_and_mismatched_score_do_not_prove_freshness(self):
        observations = [{'observed_at': '2026-10-13T04:00:00Z', 'scores': [
            {'game_id': 'future', 'source': {'home_score': None, 'away_score': None},
             'database': {'home_score': None, 'away_score': None}, 'matches': True},
            {'game_id': 'game', 'source': {'home_score': 0, 'away_score': 7},
             'database': {'home_score': None, 'away_score': None}, 'matches': False},
        ]}]
        result = report.freshness(observations)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['game_id'], 'game')
        self.assertIsNone(result[0]['database_first_final_observed_at'])

    def test_expected_triggers_have_exact_interval_boundaries(self):
        result = report.trigger_counts('espn', '2026-10-12T15:17:00Z',
                                       '2026-10-12T17:17:00Z', 1)
        self.assertEqual(result['expected_triggers'], 2)
        self.assertEqual(result['observed_trigger_count_deficit'], 1)
        self.assertTrue(result['delayed_delivery_possible'])
        self.assertEqual(result['individual_slot_attribution'], 'unavailable')

    def test_cli_excludes_observations_outside_reporting_interval(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'runs.json').write_text('[]')
            (root / 'observations.json').write_text(json.dumps([
                {'observed_at': '2026-10-12T17:00:00Z', 'reason': 'old', 'run': True,
                 'source_scores': [{'game_id': 'old', 'home_score': 34, 'away_score': 37}]},
                {'observed_at': '2026-10-13T18:00:00Z', 'reason': 'no_games', 'run': False},
                {'observed_at': '2026-10-14T00:00:00Z', 'reason': 'future', 'run': True},
            ]))
            result = subprocess.run([
                'python3', str(SCRIPT), '--runs', str(root / 'runs.json'),
                '--observations', str(root / 'observations.json'), '--workflow', 'nflverse',
                '--since', '2026-10-13T00:00:00Z', '--until', '2026-10-14T00:00:00Z',
                '--output', str(root / 'report.json')
            ], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            data = json.loads((root / 'report.json').read_text())
            self.assertEqual(data['freshness'], [])
            self.assertEqual(len(data['gate_decisions']), 1)
            self.assertEqual(data['gate_decisions'][0]['reason'], 'no_games')


if __name__ == '__main__':
    unittest.main()
