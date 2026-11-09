import { describe, expect, it, vi } from 'vitest';
import { createUniqueId } from '../lib/ids';

describe('generator identyfikatorów', () => {
  it('tworzy unikalne identyfikatory w formacie UUID', () => {
    const first = createUniqueId();
    const second = createUniqueId();
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(second).not.toBe(first);
  });

  it('ma fallback dla przeglądarek bez randomUUID', () => {
    const fallbackCrypto = {
      randomUUID: undefined,
      getRandomValues: vi.fn((bytes: Uint8Array) => {
        bytes.fill(7);
        return bytes;
      }),
    };
    vi.stubGlobal('crypto', fallbackCrypto);
    try {
      expect(createUniqueId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(fallbackCrypto.getRandomValues).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
