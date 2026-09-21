import { describe, expect, it } from 'vitest';
import { R2_ENV, R2StatFileTarget, r2StatFileTargetFromEnv } from './targets';

const complete = {
  [R2_ENV.accountId]: 'acct',
  [R2_ENV.bucket]: 'bucket',
  [R2_ENV.accessKeyId]: 'key',
  [R2_ENV.secretAccessKey]: 'secret',
};

function envWithout(name: string): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(complete).filter(([key]) => key !== name));
}

describe('R2 target env wiring', () => {
  it('builds from the environment when every var is present', () => {
    const target = r2StatFileTargetFromEnv(complete);
    expect(target).toBeInstanceOf(R2StatFileTarget);
    target.destroy();
  });

  it('names the missing var instead of failing deep in the SDK', () => {
    expect(() => r2StatFileTargetFromEnv(envWithout(R2_ENV.secretAccessKey))).toThrow(
      R2_ENV.secretAccessKey
    );
  });

  it('never builds without an account id (the endpoint host comes from it)', () => {
    expect(() => r2StatFileTargetFromEnv(envWithout(R2_ENV.accountId))).toThrow(R2_ENV.accountId);
  });
});
