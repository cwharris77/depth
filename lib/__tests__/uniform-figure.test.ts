import { describe, it, expect } from 'vitest';
import { variantSpec } from '../uniforms/figure';

describe('variantSpec', () => {
  it('jersey renders only the jersey part in a 48x48 box', () => {
    expect(variantSpec('jersey')).toEqual({
      parts: ['jersey'],
      viewBox: '0 0 48 48',
    });
  });
  it('full renders helmet + jersey + pants stacked', () => {
    const spec = variantSpec('full');
    expect(spec.parts).toEqual(['helmet', 'jersey', 'pants']);
    expect(spec.viewBox).toBe('0 0 48 96');
  });
  it('helmet renders only the helmet part', () => {
    expect(variantSpec('helmet').parts).toEqual(['helmet']);
  });
  it('an unknown variant falls back to the jersey spec (defensive)', () => {
    // @ts-expect-error exercising the runtime fallback
    expect(variantSpec('bogus')).toEqual(variantSpec('jersey'));
  });
});
