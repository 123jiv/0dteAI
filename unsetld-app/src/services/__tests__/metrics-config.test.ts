// unsetld.com's config.json and the usage-counts switch (launch pass P1-20; docs/METRICS.md): only
// `"metrics": true` turns sending on. A config without the field, or with anything else in it,
// reads as off; a config that can't be fetched changes nothing (the switch stays as it was:
// unknown on a new install, which records nothing unless the user turned sharing on, and sends nothing).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchConfig } from '../access';

vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
});
vi.mock('react-native', () => ({ Platform: { OS: 'ios' }, Linking: {} }));
vi.mock('../../state/store', () => ({ useApp: {} }));
vi.mock('../../services/account', () => ({}));
vi.mock('../../services/notifications', () => ({}));

const base = { accessEnabled: false, collection: '004' };

function serve(body: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => body })));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("config.json's metrics switch", () => {
  it('is on only for a literal true', async () => {
    serve({ ...base, metrics: true });
    expect(await fetchConfig()).toMatchObject({ metrics: true });
  });

  it('is off when absent or anything else', async () => {
    for (const metrics of [undefined, false, 'true', 1, null, { on: true }]) {
      serve({ ...base, metrics });
      expect(await fetchConfig(), String(metrics)).toMatchObject({ metrics: false });
    }
  });

  it('leaves the rest of the config as it was', async () => {
    serve({ ...base, accessEnabled: true, collection: '005', metrics: true });
    expect(await fetchConfig()).toEqual({ accessEnabled: true, collection: '005', rewards: null, status: null, metrics: true });
  });

  it('no config (the live 404), or one without accessEnabled: null, so nothing changes', async () => {
    serve(null, false);
    expect(await fetchConfig()).toBeNull();
    serve({ metrics: true });
    expect(await fetchConfig()).toBeNull();
  });
});
