// A mission of the user's own earns points and its title shows on Today, in widgets and in
// reminders, so its title goes through the same text check as the goal (core/safety): the form
// can't add one the check refuses, "Use again" doesn't offer an old one it would refuse, and the
// store won't make one. One kept from before the check, already in a plan, still loads: a plan,
// a timer or a before photo may point at it.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeCustomMission } from '../../../core/custom';
import type { DayPlan, Mission, TrackId } from '../../../core/types';
import { draftInput, recentOwn, type OwnDraft } from '../logic';

const mem = vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  return { map: new Map<string, string>() };
});

vi.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
  Platform: { OS: 'ios' },
}));
vi.mock('../../../state/storage', () => ({
  appStorage: {
    getItem: (k: string) => mem.map.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.map.set(k, v),
    removeItem: (k: string) => void mem.map.delete(k),
  },
}));
vi.mock('../../../services/proof', () => ({ deletePhoto: () => undefined }));
vi.mock('../../../services/timerNotify', () => ({ cancelTimerDone: () => Promise.resolve() }));

const TODAY = '2026-10-12';
const NOW = new Date(2026, 9, 12, 15, 0, 0);
const TRACKS: TrackId[] = ['school', 'fitness', 'discipline'];
const PLAN: DayPlan = {
  day: TODAY,
  missions: [
    { slot: 'easy', missionId: 'D4', area: 'discipline' },
    { slot: 'main', missionId: 'F1', area: 'fitness' },
  ],
  rerolls: 0,
  replaced: [],
};
const REFUSED = ['Smoke weed', 'Buy a vape', 'Skip lunch', 'Lose 2 pounds', 'Pull an all-nighter', 'Do a dare'];
const FINE = ['Practice guitar', 'Quit vaping', 'Do my abs workout', 'Call 555-123-4567'];

describe('the form refuses a title the check refuses', () => {
  const d: OwnDraft = { title: '', track: 'school', proofType: 'TIMER', minutes: 30 };

  it('draftInput is null for it, so "Add to today" stays off', () => {
    for (const title of REFUSED) expect(draftInput({ ...d, title }), title).toBeNull();
    for (const title of FINE) expect(draftInput({ ...d, title })?.title, title).toBe(title);
  });

  it('makeCustomMission makes nothing from it', () => {
    for (const title of REFUSED) expect(makeCustomMission({ title, track: 'fitness', proofType: 'PHOTO' }, 'custom-x'), title).toBeNull();
    expect(makeCustomMission({ title: 'Quit vaping', track: 'discipline', proofType: 'PHOTO' }, 'custom-y')?.title).toBe('Quit vaping');
  });

  it('"Use again" skips one kept from before the check', () => {
    const old = (id: string, title: string): Mission => ({ ...makeCustomMission({ title: 'Placeholder', track: 'school', proofType: 'PHOTO' }, id)!, title });
    const list = [old('custom-1', 'Practice guitar'), old('custom-2', 'Buy a vape'), old('custom-3', 'Read 20 pages')];
    expect(recentOwn(list, PLAN, TRACKS).map(m => m.id)).toEqual(['custom-3', 'custom-1']);
  });
});

describe('the store', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  async function load(extra: object = {}) {
    mem.map.clear();
    const profile = { tracks: TRACKS, school: true, age: '18plus', minutes: 45, intensity: 'lockin' };
    const state = { installSalt: 'salt-safe', settings: { onboarded: true }, profile, plans: { [TODAY]: PLAN }, ...extra };
    mem.map.set('unsetld-v2', JSON.stringify({ state, version: 8 }));
    vi.resetModules();
    const store = await import('../../../state/store');
    const content = await import('../../../content');
    await new Promise(r => setTimeout(r, 0));
    return { ...store, ...content };
  }

  it("won't make a mission of the user's own from a refused title", async () => {
    const { useApp } = await load();
    for (const title of REFUSED) expect(useApp.getState().createCustomMission({ title, track: 'fitness', proofType: 'PHOTO' }), title).toBeNull();
    expect(useApp.getState().customMissions).toEqual([]);
    expect(useApp.getState().createCustomMission({ title: 'Practice guitar', track: 'school', proofType: 'TIMER', timerMinutes: 30 })?.title).toBe('Practice guitar');
  });

  it('keeps one saved before the check that is already in a plan, through a reload', async () => {
    const kept = { ...makeCustomMission({ title: 'Placeholder', track: 'fitness', proofType: 'PHOTO' }, 'custom-old')!, title: 'Buy a vape' };
    const plan: DayPlan = { ...PLAN, missions: [PLAN.missions[0]!, { slot: 'main', missionId: 'custom-old', area: 'fitness', points: 5 }], rerolls: 1, replaced: ['F1'] };
    const { useApp, MISSION_BY_ID } = await load({ customMissions: [kept], plans: { [TODAY]: plan } });
    expect(useApp.getState().customMissions.map(m => m.id)).toEqual(['custom-old']);
    expect(useApp.getState().plans[TODAY]?.missions.map(p => p.missionId)).toEqual(['D4', 'custom-old']);
    expect(MISSION_BY_ID['custom-old']?.title).toBe('Buy a vape');
  });
});
