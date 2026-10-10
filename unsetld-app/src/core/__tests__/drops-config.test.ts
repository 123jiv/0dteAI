// unsetld.com's drops.json: only well-formed drops reach the early-access page and the drop
// alerts, so a hand edit that leaves a null or a half-filled entry can't crash them.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { earlyDrop, nextDropChange } from '../../screens/access';
import { fetchDrops } from '../../services/access';

vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
});
vi.mock('react-native', () => ({ Platform: { OS: 'ios' }, Linking: {} }));
vi.mock('../../state/store', () => ({ useApp: {} }));
vi.mock('../../services/account', () => ({}));
vi.mock('../../services/notifications', () => ({}));

const good = { id: 'c005', collection: '005', earlyAt: '2026-10-20T16:00:00Z', publicAt: '2026-10-22T16:00:00Z' };

function serve(body: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => body })));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("unsetld.com's drops", () => {
  it('keeps well-formed drops and drops the rest', async () => {
    serve({
      drops: [
        null,
        'x',
        42,
        { id: 'a' },
        { ...good, id: 'no-dates', earlyAt: undefined },
        { ...good, id: 'bad-date', publicAt: 'soon' },
        { ...good, id: 'backwards', earlyAt: '2026-10-23T16:00:00Z' },
        { ...good, collection: 5 },
        good,
      ],
    });
    const drops = await fetchDrops();
    expect(drops).toEqual([good]);
    // What the early-access page runs on it doesn't throw.
    expect(earlyDrop(drops!, Date.parse('2026-10-21T00:00:00Z'))).toEqual(good);
    expect(nextDropChange(drops!, Date.parse('2026-10-21T00:00:00Z'))).toBe(Date.parse(good.publicAt));
  });

  it('an empty list means no drops; no list or a failed fetch keeps the alerts already set', async () => {
    serve({ drops: [] });
    expect(await fetchDrops()).toEqual([]);
    serve({ drops: [null] });
    expect(await fetchDrops()).toEqual([]);
    serve({ drops: 'none' });
    expect(await fetchDrops()).toBeNull();
    serve({});
    expect(await fetchDrops()).toBeNull();
    serve(null, false);
    expect(await fetchDrops()).toBeNull();
  });
});
