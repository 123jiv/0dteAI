// unsetld.com's drops.json: only well-formed drops reach the drop alerts (a heads-up 24 hours
// before a drop opens), so a hand edit that leaves a null or a half-filled entry can't crash them.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchDrops } from '../../services/access';

vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
});
vi.mock('react-native', () => ({ Platform: { OS: 'ios' }, Linking: {} }));
vi.mock('../../state/store', () => ({ useApp: {} }));
vi.mock('../../services/account', () => ({}));
vi.mock('../../services/notifications', () => ({}));

const good = { id: 'c005', collection: '005', publicAt: '2026-10-22T16:00:00Z' };

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
        { ...good, id: 'no-date', publicAt: undefined },
        { ...good, id: 'bad-date', publicAt: 'soon' },
        { ...good, collection: 5 },
        good,
      ],
    });
    expect(await fetchDrops()).toEqual([good]);
  });

  it("reads an older file's drop by its public time, and leaves its early window out", async () => {
    serve({ drops: [{ ...good, earlyAt: '2026-10-21T16:00:00Z' }, { ...good, id: 'late-early', earlyAt: '2026-10-23T16:00:00Z' }] });
    expect(await fetchDrops()).toEqual([good, { ...good, id: 'late-early' }]);
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
