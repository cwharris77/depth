import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('service-worker updates', () => {
  it('activate naturally without exposing a manual update prompt', () => {
    const registrar = readFileSync('components/ServiceWorkerRegistrar.tsx', 'utf8');
    const worker = readFileSync('public/sw.js', 'utf8');

    expect(registrar).not.toContain('Update available');
    expect(registrar).not.toContain('SKIP_WAITING');
    expect(worker).not.toContain('SKIP_WAITING');
  });
});
