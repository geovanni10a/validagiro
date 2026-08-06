import { describe, expect, it } from 'vitest';
import { requestHash } from './idempotency';

describe('requestHash', () => {
  it('is stable across object property ordering', () => {
    expect(requestHash('c', 's', { clientRequestId: '1', a: 1, b: { x: 2, y: 3 } }))
      .toBe(requestHash('c', 's', { b: { y: 3, x: 2 }, a: 1, clientRequestId: '2' }));
  });
  it('includes tenant scope', () => {
    expect(requestHash('c1', 's', { a: 1 })).not.toBe(requestHash('c2', 's', { a: 1 }));
  });
});
