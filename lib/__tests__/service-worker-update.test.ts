import { describe, expect, it } from 'vitest';
import { shouldReloadForServiceWorkerUpdate } from '../service-worker-update';

describe('shouldReloadForServiceWorkerUpdate', () => {
  it('does not reload when a first-installed worker takes control', () => {
    expect(shouldReloadForServiceWorkerUpdate(false, false)).toBe(false);
  });

  it('reloads once after the user accepts an update', () => {
    expect(shouldReloadForServiceWorkerUpdate(true, false)).toBe(true);
    expect(shouldReloadForServiceWorkerUpdate(true, true)).toBe(false);
  });
});
