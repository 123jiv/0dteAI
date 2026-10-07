// Small deterministic PRNG utilities so "today's line" and reminder times are
// stable for a given install and day, without storing every pick.

/** 32-bit FNV-1a hash of a string. */
export function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32: tiny, fast, good enough for shuffles. Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const out = items.slice();
  const rand = mulberry32(hash32(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function randomSalt(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Short uppercase code from a string, avoiding look-alike characters. */
export function shortCode(input: string, length = 6): string {
  let h = hash32(input);
  let h2 = hash32(`${input}#2`);
  let out = '';
  for (let i = 0; i < length; i++) {
    const src = i % 2 === 0 ? h : h2;
    out += B32[src % B32.length];
    if (i % 2 === 0) h = Math.floor(h / B32.length) ^ hash32(out);
    else h2 = Math.floor(h2 / B32.length) ^ hash32(out + i);
    h >>>= 0;
    h2 >>>= 0;
  }
  return out;
}
