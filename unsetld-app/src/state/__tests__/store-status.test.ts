// UNSETLD status in the store: a status code is taken like a points reward but for no points,
// a letter seen covers every lower tier, and what an earlier build saved (an early-access
// status list, a claimed patch, the old letter keys) still loads.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import milestonesJson from '../../content/milestones.json';

const mem = vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  return { map: new Map<string, string>() };
});

vi.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
  Platform: { OS: 'ios' },
}));
vi.mock('../storage', () => ({
  appStorage: {
    getItem: (k: string) => mem.map.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.map.set(k, v),
    removeItem: (k: string) => void mem.map.delete(k),
  },
}));
vi.mock('../../services/proof', () => ({ deletePhoto: () => {} }));
vi.mock('../../services/timerNotify', () => ({ cancelTimerDone: () => Promise.resolve() }));

const NOW = new Date(2026, 9, 10, 15, 0, 0); // Sat 10 Oct 2026, 3 PM local
const TODAY = '2026-10-10';

/** `n` days on record, ending today. */
function days(n: number) {
  const out: Record<string, { verified: boolean }> = {};
  for (let i = 0; i < n; i++) {
    const d = new Date(2026, 9, 10 - i, 12);
    out[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`] = { verified: true };
  }
  return out;
}

async function load(state: object, version = 6) {
  mem.map.clear();
  mem.map.set('unsetld-v2', JSON.stringify({ state, version }));
  vi.resetModules();
  const store = await import('../store');
  const rewards = await import('../../core/rewards');
  await new Promise(r => setTimeout(r, 0));
  return { ...store, ...rewards, STATUS_DEFAULTS: rewards.statusFromMilestones(milestonesJson) };
}

/** The built-in tiers (content/milestones.json), as services/access STATUS_DEFAULTS reads them. */
const BUILT_IN = milestonesJson;

const oldStatus = [
  { id: 'early-access', day: 7, title: 'Early access', short: '', detail: '', active: true, pausable: true, action: 'Turn on drop alerts' },
  { id: 'patch', day: 90, title: 'The patch', short: '', detail: '', active: true, pausable: false, action: 'Add it to my next order' },
];

describe('status in the store', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  it("loads an earlier build's status list, patch and letter keys, and falls back to the built-in tiers", async () => {
    const { useApp, STATUS_DEFAULTS, effectiveStatus } = await load({
      installSalt: 'salt-s',
      settings: { onboarded: true },
      remote: { accessEnabled: true, collection: '004', status: oldStatus },
      record: { days: days(95), lettersShown: ['7', '90'], patchClaimed: '2026-08-01', redemptions: [], missions: {}, bonuses: {}, legacyPoints: 0 },
    });
    const s = useApp.getState();
    expect(s.remote.status).toBeNull();
    expect(s.remote.accessEnabled).toBe(true);
    expect(effectiveStatus(STATUS_DEFAULTS, s.remote.status).map(t => t.id)).toEqual(['status-7', 'status-30', 'status-90', 'status-365']);
    expect(s.record.patchClaimed).toBe('2026-08-01');
    expect(s.record.lettersShown).toEqual(['7', '90']);
    expect('claimPatch' in s).toBe(false);
  });

  it('keeps a saved status list that is still good', async () => {
    const { useApp } = await load({ installSalt: 'salt-k', remote: { accessEnabled: true, collection: '004', status: [BUILT_IN[1]] } });
    expect(useApp.getState().remote.status).toEqual([BUILT_IN[1]]);
  });

  it('marks the letter and every lower tier in effect as shown', async () => {
    const { useApp, pendingStatusLetter, STATUS_DEFAULTS } = await load({ installSalt: 'salt-l', settings: { onboarded: true }, record: { days: days(31), lettersShown: ['7'] } });
    const letter = pendingStatusLetter(useApp.getState().record, TODAY, STATUS_DEFAULTS)!;
    expect(letter).toEqual({ kind: 'status', day: 30, key: 'status:30' });
    useApp.getState().letterShown(letter);
    expect(useApp.getState().record.lettersShown).toEqual(['7', 'status:30', 'status:7']);
    expect(pendingStatusLetter(useApp.getState().record, TODAY, STATUS_DEFAULTS)).toBeNull();
  });

  it('takes a status code for no points: the balance stays and the tier reads taken', async () => {
    const { useApp, balance, statusReward, statusState, STATUS_DEFAULTS } = await load({
      installSalt: 'salt-r',
      settings: { onboarded: true },
      remote: { accessEnabled: true, collection: '005' },
      record: { days: days(7), legacyPoints: 700 },
    });
    const t = STATUS_DEFAULTS[0];
    expect(statusState(useApp.getState().record, t, TODAY)).toEqual({ kind: 'ready' });
    useApp.getState().redeemReward(statusReward(t), { code: 'UNSETLD10-ABC123', url: 'https://www.unsetld.com' });
    const r = useApp.getState().record;
    expect(r.redemptions).toEqual([{ rewardId: 'status-7', points: 0, collection: '005', day: TODAY, code: 'UNSETLD10-ABC123', url: 'https://www.unsetld.com', expires: '2026-11-09' }]);
    expect(balance(r)).toBe(700);
    expect(statusState(r, t, TODAY)).toMatchObject({ kind: 'taken', code: { code: 'UNSETLD10-ABC123' }, expired: false });
  });
  it("keeps the server's last day for a code sent again, and marks a tier taken when only 'used' came back", async () => {
    const { useApp, balance, statusReward, statusState, STATUS_DEFAULTS } = await load({
      installSalt: 'salt-e',
      settings: { onboarded: true },
      remote: { accessEnabled: true, collection: '005' },
      record: { days: days(31), legacyPoints: 700 },
    });
    const [seven, thirty] = STATUS_DEFAULTS;
    // Taken on another phone on 1 Oct: the code comes back with its own last day, not 30 days from today.
    useApp.getState().redeemReward(statusReward(seven), { code: 'UNSETLD10-ABC123', url: 'https://www.unsetld.com', expires: '2026-10-31' });
    expect(useApp.getState().record.redemptions[0]).toMatchObject({ code: 'UNSETLD10-ABC123', expires: '2026-10-31' });
    // Anything that isn't a day is ignored.
    useApp.getState().redeemReward(statusReward(thirty), { code: 'UNSETLD15-DEF456', url: 'https://www.unsetld.com', expires: 'soon' });
    expect(useApp.getState().record.redemptions[1]).toMatchObject({ expires: '2026-11-09' });

    // An older server only says 'used': the tier reads taken, with no code, and no code is listed.
    const { useApp: fresh, STATUS_DEFAULTS: tiers } = await load({ installSalt: 'salt-u', remote: { accessEnabled: true, collection: '005' }, record: { days: days(7), legacyPoints: 700 } });
    const { redemptionsWithCode, codeCount, holdsLiveCode } = await import('../../screens/rewards/codes');
    fresh.getState().redeemReward(statusReward(tiers[0]), { code: '', url: '' });
    const r = fresh.getState().record;
    expect(statusState(r, tiers[0], TODAY)).toEqual({ kind: 'taken', expired: false });
    expect(balance(r)).toBe(700);
    expect(redemptionsWithCode(r)).toEqual([]);
    expect(codeCount(r)).toBe(0);
    expect(holdsLiveCode(r, TODAY)).toBe(false);
  });

  it('drops a saved reward that is not a discount', async () => {
    const { useApp } = await load({
      installSalt: 'salt-d',
      remote: {
        accessEnabled: true,
        collection: '004',
        rewards: [
          { id: 'ten-off', title: '10% off', detail: '', type: 'discount', points: 600, percent: 10, maxOff: 25, active: true, codeValidDays: 30, perCollection: 1 },
          { id: 'limited-drop', title: 'Limited piece', detail: '', type: 'limited', points: 2000, active: true, codeValidDays: 14, perCollection: 1 },
        ],
      },
    });
    expect(useApp.getState().remote.rewards?.map(t => t.id)).toEqual(['ten-off']);
  });
});
