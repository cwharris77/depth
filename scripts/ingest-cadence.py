#!/usr/bin/env python3
"""Gate extra imports and record public game-score observations."""

import argparse
import csv
import io
import json
import os
from pathlib import Path
import sys
import time
from datetime import date, datetime, timedelta, timezone
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo


GAMES_URL = 'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv'
SCHEDULES = {
    'espn': {'daily': '17 15,20 * * *', 'hourly': '17 0-7,16-19,21-23 * * *'},
    'nflverse': {'daily': '17 16,21 * * *', 'hourly': '47 0-7,16-23 * * *'},
}
PACIFIC = ZoneInfo('America/Los_Angeles')


def timestamp(value):
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('timestamps require a timezone')
    return parsed


def trigger_mode(workflow, event, schedule):
    if event == 'workflow_dispatch':
        return 'manual'
    if event == 'schedule':
        for mode, cron in SCHEDULES[workflow].items():
            if schedule == cron:
                return mode
    raise ValueError('unknown ingest trigger')


def parse_games(text):
    reader = csv.DictReader(io.StringIO(text))
    if not {'game_id', 'gameday', 'game_type'}.issubset(reader.fieldnames or []):
        raise ValueError('missing game schedule columns')
    rows = list(reader)
    for row in rows:
        if not row['game_id'] or not row['game_type']:
            raise ValueError('missing game identity')
        date.fromisoformat(row['gameday'])
    return rows


def fetch_games():
    for attempt in range(3):
        try:
            with urlopen(GAMES_URL, timeout=20) as response:
                return parse_games(response.read().decode('utf-8-sig'))
        except (OSError, ValueError):
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)


def decide(now, rows, expires_at):
    if now.tzinfo is None or expires_at.tzinfo is None:
        raise ValueError('timestamps require a timezone')
    local = now.astimezone(PACIFIC)
    result = {'run': False, 'reason': 'no_games', 'pacific_date': local.date().isoformat(),
              'game_ids': [], 'observed_at': now.isoformat(),
              'expires_at': expires_at.isoformat()}
    if now >= expires_at:
        result['reason'] = 'expired'
    elif not 9 <= local.hour < 23:
        result['reason'] = 'outside_window'
    else:
        result['game_ids'] = sorted({row['game_id'] for row in rows
                                    if row['game_type'] in {'REG', 'WC', 'DIV', 'CON', 'SB'}
                                    and row['gameday'] == result['pacific_date']})
        result['run'] = bool(result['game_ids'])
        if result['run']:
            result['reason'] = 'game_day'
    return result


def evaluate(mode, now, expires_at):
    result = decide(now, [], expires_at)
    if mode in {'daily', 'manual'}:
        result.update(run=True, reason=mode)
    elif result['reason'] not in {'expired', 'outside_window'}:
        rows = fetch_games()
        result = decide(now, rows, expires_at)
        result['source_scores'] = [row for row in score_rows(rows)
                                   if row['game_id'] in result['game_ids']]
    result['mode'] = mode
    return result


def score_rows(rows):
    return [{'game_id': row['game_id'],
             'home_score': int(row['home_score']) if row.get('home_score') not in (None, '') else None,
             'away_score': int(row['away_score']) if row.get('away_score') not in (None, '') else None}
            for row in rows]


def compare_scores(source, database):
    by_id = {row['game_id']: row for row in database}
    return [{'game_id': row['game_id'], 'source': row, 'database': by_id.get(row['game_id']),
             'matches': row == by_id.get(row['game_id'])} for row in score_rows(source)]


def observe(now):
    local_day = now.astimezone(PACIFIC).date()
    rows = [row for row in fetch_games()
            if local_day - timedelta(days=1) <= date.fromisoformat(row['gameday']) <= local_day
            and row['game_type'] in {'REG', 'WC', 'DIV', 'CON', 'SB'}]
    base_url = os.environ['SUPABASE_URL'].rstrip('/')
    parsed = urlparse(base_url)
    if parsed.scheme != 'https' or not parsed.hostname.endswith('.supabase.co'):
        raise ValueError('score observations require a hosted Supabase URL')
    query = urlencode({'select': 'game_id,home_score,away_score',
                       'gameday': f'gte.{local_day - timedelta(days=1)}'})
    request = Request(f'{base_url}/rest/v1/games?{query}',
                      headers={'apikey': os.environ['SUPABASE_SECRET_KEY']})
    with urlopen(request, timeout=20) as response:
        database = json.load(response)
    return {'observed_at': now.isoformat(), 'scores': compare_scores(rows, database),
            'final_whistle_at': None}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workflow', choices=SCHEDULES)
    parser.add_argument('--event', default=os.environ.get('GITHUB_EVENT_NAME', ''))
    parser.add_argument('--schedule', default=os.environ.get('INGEST_SCHEDULE', ''))
    parser.add_argument('--expires-at')
    parser.add_argument('--now')
    parser.add_argument('--observe', action='store_true')
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    now = timestamp(args.now) if args.now else datetime.now(timezone.utc)
    if args.observe:
        result = observe(now)
    else:
        if not args.workflow or not args.expires_at:
            parser.error('--workflow and --expires-at are required for gating')
        mode = trigger_mode(args.workflow, args.event, args.schedule)
        result = evaluate(mode, now, timestamp(args.expires_at))
        result.update(workflow=args.workflow, schedule=args.schedule,
                      run_id=os.environ.get('GITHUB_RUN_ID'))
        if os.environ.get('GITHUB_OUTPUT'):
            with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
                output.write(f"run={str(result['run']).lower()}\nmode={mode}\n")
    Path(args.output).write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
            summary.write('```json\n' + json.dumps(result, indent=2) + '\n```\n')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError) as error:
        # Network exceptions can include URLs; never include request headers.
        print(f'Ingest cadence failed: {type(error).__name__}', file=sys.stderr)
        sys.exit(1)
