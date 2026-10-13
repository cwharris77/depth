import json
import os
from pathlib import Path
import subprocess
import tempfile
import textwrap
import unittest


ROOT = Path(__file__).resolve().parents[1]


class NotificationGateTests(unittest.TestCase):
    def run_gate(self, jobs, event='workflow_run', api_failure=False):
        workflow = (ROOT / '.github/workflows/send-team-notifications.yml').read_text()
        step = workflow.split('      - name: Check completed import\n', 1)[1]
        script = textwrap.dedent(step.split('        run: |\n', 1)[1].split('\n  send:', 1)[0])
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'jobs.json').write_text(json.dumps({'jobs': jobs}))
            gh = root / 'gh'
            gh.write_text('#!/bin/sh\nexit 1\n' if api_failure else
                          '#!/bin/sh\nexec jq "$4" "$GH_FIXTURE"\n')
            gh.chmod(0o755)
            output = root / 'output'
            result = subprocess.run(['bash', '-e', '-c', script], capture_output=True, text=True,
                                    env={**os.environ, 'PATH': f'{root}:{os.environ["PATH"]}',
                                         'GH_FIXTURE': str(root / 'jobs.json'), 'EVENT': event,
                                         'RUN_ID': '123', 'GITHUB_REPOSITORY': 'example/depth',
                                         'GITHUB_OUTPUT': str(output)})
            return result.returncode, output.read_text() if output.exists() else ''

    def test_skipped_ingest_and_stat_file_only_do_not_start_sender(self):
        for jobs in [[], [{'name': 'ingest', 'conclusion': 'skipped'}],
                     [{'name': 'stat-files', 'conclusion': 'success'}],
                     [{'name': 'ingest', 'conclusion': 'failure'}]]:
            with self.subTest(jobs=jobs):
                self.assertEqual(self.run_gate(jobs), (0, 'run=false\n'))

    def test_successful_ingest_starts_sender(self):
        self.assertEqual(self.run_gate([{'name': 'ingest', 'conclusion': 'success'}]),
                         (0, 'run=true\n'))

    def test_manual_sender_does_not_depend_on_import_api(self):
        self.assertEqual(self.run_gate([], event='workflow_dispatch', api_failure=True),
                         (0, 'run=true\n'))

    def test_api_failure_does_not_start_sender(self):
        code, output = self.run_gate([], api_failure=True)
        self.assertNotEqual(code, 0)
        self.assertEqual(output, '')


if __name__ == '__main__':
    unittest.main()
