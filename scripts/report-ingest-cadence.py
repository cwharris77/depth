#!/usr/bin/env python3
"""Report ingest timing from saved GitHub run/job JSON and score observations."""

import argparse
import json
from pathlib import Path
import runpy
from datetime import timedelta, timezone


cadence = runpy.run_path(str(Path(__file__).with_name('ingest-cadence.py')))
timestamp = cadence['timestamp']


def summarize(runs):
    result = {'runs': [], 'runner_seconds': 0, 'incomplete_job_timestamps': 0,
              'overlapping_import_pairs': [], 'billed_minutes': None}
    imports = []
    for run in runs:
        delays = []
        for job in run.get('jobs', []):
            start, end = job.get('started_at'), job.get('completed_at')
            if not start or not end:
                if job.get('conclusion') != 'skipped':
                    result['incomplete_job_timestamps'] += 1
                continue
            start, end = timestamp(start), timestamp(end)
            result['runner_seconds'] += max(0, (end - start).total_seconds())
            if run.get('created_at'):
                delays.append((start - timestamp(run['created_at'])).total_seconds())
            if job['name'] == 'ingest':
                imports.append((run['id'], start, end))
        result['runs'].append({
            'id': run['id'], 'event': run.get('event'), 'created_at': run.get('created_at'),
            'conclusion': run.get('conclusion'),
            'runner_queue_seconds': min(delays) if delays else None,
            'schedule_delivery_delay_seconds': None,
            'import_conclusion': next((job.get('conclusion') for job in run.get('jobs', [])
                                       if job['name'] == 'ingest'), None),
        })
    for index, (run_id, start, end) in enumerate(imports):
        for other_id, other_start, other_end in imports[index + 1:]:
            if max(start, other_start) < min(end, other_end):
                result['overlapping_import_pairs'].append([run_id, other_id])
    return result


def freshness(observations):
    games = {}
    for observation in sorted(observations, key=lambda item: timestamp(item['observed_at'])):
        when = observation['observed_at']
        scores = list(observation.get('scores', []))
        scores += [{'game_id': row['game_id'], 'source': row, 'matches': False}
                   for row in observation.get('source_scores', [])]
        for score in scores:
            source = score['source']
            if source.get('home_score') is None or source.get('away_score') is None:
                continue
            game = games.setdefault(score['game_id'], {
                'game_id': score['game_id'], 'source_first_final_observed_at': when,
                'database_first_final_observed_at': None,
                'observed_source_to_database_seconds': None, 'final_whistle_at': None,
            })
            if score.get('matches') and not game['database_first_final_observed_at']:
                game['database_first_final_observed_at'] = when
                game['observed_source_to_database_seconds'] = (
                    timestamp(when) - timestamp(game['source_first_final_observed_at'])
                ).total_seconds()
    return list(games.values())


def trigger_counts(workflow, since, until, observed):
    start = timestamp(since).astimezone(timezone.utc)
    end = timestamp(until).astimezone(timezone.utc)
    if end <= start or end - start > timedelta(days=31):
        raise ValueError('report interval must be positive and no longer than 31 days')
    expected = set()
    for cron in cadence['SCHEDULES'][workflow].values():
        minute, hours, *_ = cron.split()
        allowed = set()
        for part in hours.split(','):
            bounds = part.split('-')
            allowed.update(range(int(bounds[0]), int(bounds[-1]) + 1))
        cursor = start.replace(minute=int(minute), second=0, microsecond=0)
        while cursor < end:
            if cursor >= start and cursor.hour in allowed:
                expected.add(cursor)
            cursor += timedelta(hours=1)
    return {'expected_triggers': len(expected), 'observed_scheduled_runs': observed,
            'observed_trigger_count_deficit': max(0, len(expected) - observed),
            'delayed_delivery_possible': True,
            'individual_slot_attribution': 'unavailable'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--runs', required=True, help='JSON array of runs with nested jobs')
    parser.add_argument('--observations', help='JSON array of gate/post-import observations')
    parser.add_argument('--workflow', choices=cadence['SCHEDULES'], required=True)
    parser.add_argument('--since', required=True)
    parser.add_argument('--until', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    runs = json.loads(Path(args.runs).read_text())
    since, until = timestamp(args.since), timestamp(args.until)
    runs = [run for run in runs if run.get('created_at')
            and since <= timestamp(run['created_at']) < until]
    report = summarize(runs)
    report['trigger_counts'] = trigger_counts(args.workflow, args.since, args.until,
                                             sum(run.get('event') == 'schedule' for run in runs))
    observations = json.loads(Path(args.observations).read_text()) if args.observations else []
    observations = [row for row in observations
                    if since <= timestamp(row['observed_at']) < until]
    report['freshness'] = freshness(observations)
    report['gate_decisions'] = [{'observed_at': row['observed_at'], 'reason': row['reason'],
                                 'run': row['run']} for row in observations if 'reason' in row]
    Path(args.output).write_text(json.dumps(report, indent=2) + '\n')
    print('| Run | Conclusion | Runner wait (seconds) | Import |')
    print('| --- | --- | --- | --- |')
    for run in report['runs']:
        print(f"| {run['id']} | {run['conclusion']} | {run['runner_queue_seconds']} | "
              f"{run['import_conclusion']} |")
    print(f"Observed runner seconds: {report['runner_seconds']}; billed minutes unavailable.")
    print('Cron delivery delay and individual missing-slot attribution are unavailable; '
          'GitHub does not include the intended slot timestamp in these records.')


if __name__ == '__main__':
    main()
