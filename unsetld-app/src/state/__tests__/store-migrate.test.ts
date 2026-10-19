// Loading state saved by earlier builds: v3 plans, timers and before photos for missions the
// library no longer has, and old area ids in the tester snapshot and the Keychain backup; the
// updates App Store users take into v7 (3.0's v4 state, v5's minutes, 2.x's v1 state, a 3.0
// Keychain backup), from states the real builds saved (fixtures/); 3.3's v7, where Business
// folds into Projects and only the approved library is planned; and the launch pass's v8, from
// a v7 state the 3.3 build saved (fixtures/v33-state.json: ten days through the real store and
// planner). Old mission ids in the fixtures are inputs: they are planned again or dropped, and
// stay on the record.
// Hydrates the real store from a seeded storage entry.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import v1 from './fixtures/v1-state.json';
import v30 from './fixtures/v30-state.json';
import v33 from './fixtures/v33-state.json';

const mem = vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  return { map: new Map<string, string>(), secure: new Map<string, string>(), deleted: [] as string[], cancelled: 0 };
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
vi.mock('../../services/proof', () => ({ deletePhoto: (u: string) => void mem.deleted.push(u) }));
vi.mock('../../services/timerNotify', () => ({
  cancelTimerDone: () => {
    mem.cancelled++;
    return Promise.resolve();
  },
}));
vi.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => mem.secure.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => void mem.secure.set(k, v),
}));

const NOW = new Date(2026, 9, 10, 15, 0, 0); // Sat 10 Oct 2026, 3 PM local
const TODAY = '2026-10-10';
const OLD = ['focus-reset-your-desk', 'focus-lock-in-25', 'focus-one-class-no-phone'];

const accepted = (at: number) => ({ status: 'accepted', method: 'on-device', checks: [], at });
const done = (id: string, track: string, points: number, slot = 'progress') => ({
  missionId: id,
  slot,
  track,
  points,
  doneAt: NOW.getTime() - 3600_000,
  photos: [{ uri: `file:///p/${id}.jpg`, takenAt: NOW.getTime() - 3600_000, kind: 'single', hash: `h-${id}` }],
  verification: accepted(NOW.getTime() - 3600_000),
});
const rec = (missions: object, extra: object = {}) => ({ days: {}, missions, bonuses: {}, redemptions: [], legacyPoints: 0, ...extra });
const oldPlan = (rerolls: number, replaced: string[]) => ({
  day: TODAY,
  missions: [
    { slot: 'quick', missionId: OLD[0] },
    { slot: 'progress', missionId: OLD[1] },
    { slot: 'challenge', missionId: OLD[2] },
  ],
  rerolls,
  replaced,
});

/**
 * Hydrates the store from `state` saved at `version`. A release build unless `preview`: tester
 * state (time travel's snapshot) is only kept by preview and dev builds (release builds drop it as
 * they load: store-release.test.ts).
 */
async function load(state: object, version: number, { preview = false }: { preview?: boolean } = {}) {
  mem.map.clear();
  mem.deleted = [];
  mem.cancelled = 0;
  mem.map.set('unsetld-v2', JSON.stringify({ state, version }));
  vi.resetModules();
  (globalThis as { __DEV__?: boolean }).__DEV__ = preview;
  const store = await import('../store').finally(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  });
  const content = await import('../../content');
  // Clean-up after a load runs once hydration has finished.
  await new Promise(r => setTimeout(r, 0));
  return { ...store, ...content };
}

const tracksOf = (r: { missions: Record<string, Record<string, { track: string }>> }) =>
  Object.values(r.missions).flatMap(d => Object.values(d).map(m => m.track));

describe('v3 → v4: today keeps missions to prove', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  it('plans the day again when a proven day has nothing left in the library', async () => {
    const v3 = {
      installSalt: 'salt-1',
      settings: { onboarded: true, colorway: 'black' },
      profile: { tracks: ['focus', 'mindset', 'fitness'], school: true, gym: true, age: '16to17', minutes: 60, intensity: 'lockin', priority: 'reset' },
      plans: { [TODAY]: oldPlan(0, []) },
      record: rec({ [TODAY]: { [OLD[0]]: done(OLD[0], 'focus', 10, 'quick') } }),
      skips: {},
      timer: null,
      pendingBefore: null,
      program: null,
    };
    const { useApp, MISSION_BY_ID } = await load(v3, 3);
    const plan = useApp.getState().ensurePlan(TODAY);
    expect(plan.missions.length).toBe(3);
    for (const p of plan.missions) expect(MISSION_BY_ID[p.missionId]).toBeTruthy();
    expect(plan).toMatchObject({ day: TODAY, rerolls: 0, replaced: [] });
    // The old proof still counts.
    expect(useApp.getState().record.missions[TODAY][OLD[0]].points).toBe(10);
  });

  it('plans the day again after a swap, keeping the swap count and what was swapped out', async () => {
    const v3 = {
      installSalt: 'salt-2',
      settings: { onboarded: true, colorway: 'black' },
      profile: { tracks: ['school', 'fitness', 'reset'], school: true, age: '18plus', minutes: 60, intensity: 'lockin', priority: null },
      plans: { [TODAY]: oldPlan(1, ['focus-hide-the-distraction']) },
      record: rec({ '2026-10-09': { [OLD[1]]: done(OLD[1], 'focus', 15) } }),
      skips: {},
      timer: null,
      pendingBefore: null,
      program: null,
    };
    const { useApp, MISSION_BY_ID } = await load(v3, 3);
    const plan = useApp.getState().ensurePlan(TODAY);
    expect(plan.missions.length).toBe(3);
    for (const p of plan.missions) expect(MISSION_BY_ID[p.missionId]).toBeTruthy();
    expect(plan.rerolls).toBe(1);
    expect(plan.replaced).toEqual(['focus-hide-the-distraction']);
    expect(useApp.getState().plans[TODAY]).toEqual(plan);
    // Asked again, the same plan.
    expect(useApp.getState().ensurePlan(TODAY)).toBe(plan);
  });

  it('drops a saved timer and before photo for missions the library no longer has, with the notification and the photo', async () => {
    const v3 = {
      installSalt: 'salt-3',
      settings: { onboarded: true, colorway: 'black' },
      profile: { tracks: ['focus', 'fitness'], minutes: 60, intensity: 'lockin' },
      plans: { [TODAY]: oldPlan(0, []) },
      record: rec({}),
      timer: { missionId: OLD[1], day: TODAY, requiredSeconds: 1500, startedAt: NOW.getTime() - 600_000, pausedAt: null, pausedMs: 0, speed: 1 },
      pendingBefore: { missionId: 'reset-clear-one-surface', day: TODAY, photo: { uri: 'file:///p/before.jpg', takenAt: NOW.getTime() - 60_000, kind: 'before', hash: 'hb' } },
    };
    const { useApp } = await load(v3, 3);
    const s = useApp.getState();
    expect(s.timer).toBeNull();
    expect(s.pendingBefore).toBeNull();
    expect(mem.cancelled).toBe(1);
    expect(mem.deleted).toEqual(['file:///p/before.jpg']);
    expect(s.ensurePlan(TODAY).missions.length).toBe(3);
  });

  it('keeps a saved timer and before photo for missions the library has', async () => {
    const timer = { missionId: 'F3', day: TODAY, requiredSeconds: 1200, startedAt: NOW.getTime() - 60_000, pausedAt: null, pausedMs: 0, speed: 1 };
    const pendingBefore = { missionId: 'O1', day: TODAY, photo: { uri: 'file:///p/desk.jpg', takenAt: NOW.getTime() - 60_000, kind: 'before', hash: 'hd' } };
    const v4 = {
      installSalt: 'salt-4',
      settings: { onboarded: true },
      profile: { tracks: ['fitness', 'organization'], minutes: 60, intensity: 'lockin' },
      plans: {
        [TODAY]: {
          day: TODAY,
          missions: [
            { slot: 'easy', missionId: 'F3', area: 'fitness' },
            { slot: 'easy', missionId: 'O1', area: 'organization' },
          ],
          rerolls: 0,
          replaced: [],
        },
      },
      timer,
      pendingBefore,
    };
    const { useApp } = await load(v4, 4);
    expect(useApp.getState().timer).toEqual(timer);
    expect(useApp.getState().pendingBefore).toEqual(pendingBefore);
    expect(mem.cancelled).toBe(0);
    expect(mem.deleted).toEqual([]);
  });

  it("keeps the user's own missions, marked USER_CREATED, with a timer running for one", async () => {
    const own = { id: 'custom-k1', track: 'skills', title: 'Practice guitar scales', short: 'Practice guitar scales.', proof: 'The timer, run to the end.', proofType: 'TIMER', points: 10, minutes: 15, timerMinutes: 15, cooldownDays: 0, repeatable: true, tags: ['custom'], active: true, custom: true };
    const timer = { missionId: 'custom-k1', day: TODAY, requiredSeconds: 900, startedAt: NOW.getTime() - 60_000, pausedAt: null, pausedMs: 0, speed: 1 };
    const { useApp, MISSION_BY_ID } = await load({
      installSalt: 'salt-c',
      settings: { onboarded: true },
      profile: { tracks: ['skills', 'fitness'] },
      plans: { [TODAY]: { day: TODAY, missions: [{ slot: 'main', missionId: 'custom-k1', area: 'skills', points: 10 }, { slot: 'easy', missionId: 'F3', area: 'fitness' }], rerolls: 1, replaced: ['K1'] } },
      customMissions: [own],
      timer,
    }, 6);
    const s = useApp.getState();
    expect(s.customMissions).toEqual([{ ...own, source: 'USER_CREATED' }]);
    expect(MISSION_BY_ID['custom-k1']).toMatchObject({ source: 'USER_CREATED', custom: true });
    expect(s.timer).toEqual(timer);
    expect(s.ensurePlan(TODAY).missions.map(p => p.missionId)).toEqual(['custom-k1', 'F3']);
  });
});

describe('old area ids stay out of the record', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  it("maps the tester snapshot too, so Back to real today brings back today's areas", async () => {
    const v3 = {
      installSalt: 'salt-5',
      settings: { onboarded: true },
      profile: { tracks: ['focus', 'fitness'], minutes: 60, intensity: 'lockin' },
      plans: {},
      dayOffset: 6,
      record: rec({ '2026-10-08': { [OLD[1]]: done(OLD[1], 'focus', 15) } }),
      devSnapshot: rec({
        '2026-10-05': { [OLD[1]]: done(OLD[1], 'focus', 15), 'reset-x': done('reset-x', 'reset', 10) },
        '2026-10-06': { 'mindset-y': done('mindset-y', 'mindset', 25) },
      }),
    };
    const { useApp } = await load(v3, 3, { preview: true });
    expect(tracksOf(useApp.getState().record)).toEqual(['discipline']);
    useApp.getState().backToRealToday();
    const r = useApp.getState().record;
    expect(tracksOf(r)).toEqual(['discipline', 'organization', 'discipline']);
    const { trackProgress } = await import('../../core/progress');
    const levels = trackProgress(r);
    expect(levels.discipline.xp).toBe(40);
    expect(levels.organization.xp).toBe(10);
  });

  it('maps a tester snapshot that an earlier 4.0 build saved without mapping it', async () => {
    const v4 = {
      installSalt: 'salt-5b',
      settings: { onboarded: true },
      profile: { tracks: ['discipline', 'organization'], minutes: 60, intensity: 'lockin' },
      dayOffset: 3,
      record: rec({}),
      devSnapshot: rec({ '2026-10-05': { 'reset-x': done('reset-x', 'reset', 10), 'mindset-y': done('mindset-y', 'mindset', 25) } }),
    };
    const { useApp } = await load(v4, 4);
    useApp.getState().backToRealToday();
    expect(tracksOf(useApp.getState().record)).toEqual(['organization', 'discipline']);
  });

  it('maps a Keychain backup written by a 3.0 preview build', async () => {
    const { useApp } = await load({ installSalt: 'fresh', settings: { onboarded: false } }, 4);
    const backup = rec({ '2026-10-05': { [OLD[1]]: done(OLD[1], 'focus', 15), 'reset-x': done('reset-x', 'reset', 10) } });
    useApp.getState().restore('salt-6', backup as never);
    const s = useApp.getState();
    expect(s.installSalt).toBe('salt-6');
    expect(tracksOf(s.record)).toEqual(['discipline', 'organization']);
  });

  it('carries a 2.x balance over from a Keychain backup', async () => {
    const { useApp } = await load({ installSalt: 'fresh', settings: { onboarded: false } }, 4);
    const proof = { uri: '', takenAt: 0, lineNo: null };
    const twoX = {
      days: { '2025-03-01': { at: 0, verified: true } },
      work: { '2025-03-01': { a: { text: 'a', doneAt: 0, proof }, b: { text: 'b', doneAt: 0, proof }, c: { text: 'c', doneAt: 0, proof: null } } },
      codes: [{ day: '2025-03-02', collection: 'x', points: 10, percent: 10, code: 'C', url: '', expires: '2025-04-01' }],
    };
    useApp.getState().restore('salt-7', twoX as never);
    const r = useApp.getState().record;
    expect(r.legacyPoints).toBe(10);
    expect(r.missions).toEqual({});
    const { balance } = await import('../../core/rewards');
    expect(balance(r)).toBe(10);
  });

  it('leaves a current record as it is, however many times it runs', async () => {
    const { migrateRecordTracks } = await load({ installSalt: 'fresh' }, 4);
    const current = rec({ '2026-10-05': { S1: done('S1', 'school', 15), 'school-study-30': done('school-study-30', 'school', 15) } });
    expect(migrateRecordTracks(current as never)).toEqual(current);
    const old = rec({ '2026-10-05': { 'reset-x': done('reset-x', 'reset', 10) } });
    const once = migrateRecordTracks(old as never);
    expect(migrateRecordTracks(once)).toEqual(once);
  });
});

describe('updating from what the real builds saved', () => {
  const DAY = '2026-10-14';
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 14, 8, 10, 0)); // Wed 14 Oct 2026, 8:10 AM local
  });

  async function totals(r: never) {
    const { balance, pointsEarned } = await import('../../core/rewards');
    const { activeDays } = await import('../../core/progress');
    const { computeStreak } = await import('../../core/streak');
    return { balance: balance(r), earned: pointsEarned(r), active: activeDays(r).size, streak: computeStreak(activeDays(r), DAY).current };
  }

  it("3.0 (v4): points, days and codes stay, and every proof still shows; the retired mission's timer goes and today is planned from the approved library; 30–60 minutes become 45; saved as v8", async () => {
    const { useApp, isApproved, historyMission } = await load({ ...v30.state, profile: { ...v30.state.profile, priority: 'school' } }, v30.version);
    const s = useApp.getState();
    expect(await totals(s.record as never)).toEqual({ balance: 370, earned: 670, active: 20, streak: 9 });
    expect(s.record.redemptions).toHaveLength(1);
    expect(s.record.lettersShown).toEqual(['7']);
    expect(s.profile.minutes).toBe(45);
    expect(s.profile.priority).toBeNull();
    // Its timer ran on a retired mission (Do a 20-Minute Focus Session): it goes, with its notification.
    expect(v30.state.timer.missionId).toBe('discipline-focus-20');
    expect(s.timer).toBeNull();
    expect(mem.cancelled).toBe(1);
    expect(s.program?.finishedDay).toBe('2026-10-02');
    // Today's saved plan held retired missions and nothing was proven: planned again, approved only.
    expect(v30.state.plans[DAY].missions.some(p => isApproved(p.missionId))).toBe(false);
    const plan = s.ensurePlan(DAY);
    expect(plan.missions.length).toBeGreaterThan(0);
    for (const p of plan.missions) expect(isApproved(p.missionId)).toBe(true);
    // Every proof on the record still has a title and a proof line to show.
    for (const id of Object.values(s.record.missions).flatMap(d => Object.keys(d))) {
      expect(historyMission(id)?.title).toBeTruthy();
      expect(historyMission(id)?.proof).toBeTruthy();
    }
    // Its finished plan goes on the record; finished well before yesterday, its moment is seen.
    expect(s.record.plansFinished).toEqual([{ id: v30.state.program.id, finished: '2026-10-02' }]);
    expect(s.momentsShown).toEqual(expect.arrayContaining([`plan:${v30.state.program.id}:2026-10-02`, 'plan-1']));
    expect(JSON.parse(mem.map.get('unsetld-v2')!).version).toBe(8);
  });

  it('3.0 (v4): 60+ minutes become 60; v5: 60 stays 60 and the retired weekly priority goes', async () => {
    const { useApp: a } = await load({ ...v30.state, profile: { ...v30.state.profile, minutes: 90 } }, 4);
    expect(a.getState().profile.minutes).toBe(60);
    const { useApp: b } = await load({ ...v30.state, profile: { ...v30.state.profile, minutes: 60, priority: 'fitness' } }, 5);
    expect(b.getState().profile.minutes).toBe(60);
    expect(b.getState().profile.priority).toBeNull();
  });

  it('2.x (v1): areas from its chapters, its balance and codes, and only the settings 3.1 knows', async () => {
    const { useApp, DEFAULT_SETTINGS } = await load(v1.state, v1.version);
    const s = useApp.getState();
    expect(s.profile.tracks).toEqual(['discipline', 'school', 'fitness']);
    expect(s.record.legacyPoints).toBe(320);
    expect((await totals(s.record as never)).balance).toBe(320);
    // Reward history lists the 2.x codes.
    expect(s.record.codes.map(c => c.code)).toEqual(['UNS-OLD5X', 'UNS-TEN2X']);
    expect(Object.keys(s.settings).sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
    expect(s.settings).toMatchObject({ onboarded: true, dropAlerts: true, reminders: { on: true, count: 3, first: 450, last: 1290 } });
    expect(Object.keys(s.reading).sort()).toEqual(['accessIntroShown', 'remindersOffer', 'road']);
    expect(s.reading.remindersOffer).toBe('done');
    expect(s.settings).toMatchObject({ ageCheck: null, shareUsage: null });
  });

  it('a Keychain backup written by 3.0 restores into a fresh install', async () => {
    const { useApp } = await load({ installSalt: 'fresh', settings: { onboarded: false } }, 7);
    mem.secure.clear();
    mem.secure.set('unsetld.record.v2', JSON.stringify({ installSalt: v30.state.installSalt, record: v30.state.record }));
    const { readBackup } = await import('../../services/backup');
    const b = await readBackup();
    expect(b?.installSalt).toBe(v30.state.installSalt);
    useApp.getState().restore(b!.installSalt, b!.record);
    const s = useApp.getState();
    expect(s.installSalt).toBe(v30.state.installSalt);
    expect(await totals(s.record as never)).toEqual({ balance: 370, earned: 670, active: 20, streak: 9 });
    expect(s.record.lettersShown).toEqual(v30.state.record.lettersShown);
    expect(s.record.redemptions).toEqual(v30.state.record.redemptions);
  });
});

describe('v6 → v7: Business folds into Projects', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  const own = { id: 'custom-shop', track: 'business', title: 'Post one product photo', short: 'Post one product photo.', proof: 'A photo that shows it done.', proofType: 'PHOTO', points: 5, minutes: 10, cooldownDays: 0, repeatable: true, tags: ['custom'], active: true, custom: true };
  const swap = { from: 'business-post', to: 'P1', reason: 'another', area: 'business', at: NOW.getTime() - 60_000 };
  const areasOf = (p: { missions: { area?: string }[] }) => p.missions.map(m => m.area);

  it('moves every saved Business area to Projects: areas picked, plans and swaps, own missions, the record, and what tester time travel kept aside', async () => {
    const v6 = {
      installSalt: 'salt-b',
      settings: { onboarded: true },
      profile: { tracks: ['business', 'fitness', 'projects'], priority: 'business', focus: { week: '2026-10-05', id: 'business' }, minutes: 45, intensity: 'lockin' },
      plans: {
        [TODAY]: {
          day: TODAY,
          missions: [
            { slot: 'main', missionId: 'P1', area: 'business' },
            { slot: 'easy', missionId: 'F3', area: 'fitness' },
            { slot: 'easy', missionId: 'custom-shop', area: 'business', points: 5 },
          ],
          rerolls: 1,
          replaced: ['business-post'],
          swaps: [swap],
        },
        '2026-10-09': { day: '2026-10-09', missions: [{ slot: 'main', missionId: 'business-work-30', area: 'business' }], rerolls: 0, replaced: [] },
      },
      customMissions: [own],
      dayOffset: 2,
      devPlans: { '2026-10-08': { day: '2026-10-08', missions: [{ slot: 'main', missionId: 'business-content', area: 'business' }], rerolls: 1, replaced: ['business-post'], swaps: [swap] } },
      record: rec({ '2026-10-09': { 'business-work-30': done('business-work-30', 'business', 15) } }),
      devSnapshot: rec({ '2026-10-08': { 'business-content': done('business-content', 'business', 15), M1: done('M1', 'money', 5) } }),
    };
    const { useApp, MISSION_BY_ID } = await load(v6, 6, { preview: true });
    const s = useApp.getState();
    expect(s.profile.tracks).toEqual(['projects', 'fitness']);
    expect(s.profile.priority).toBe('projects');
    // The weekly focus keeps its id ("Make progress on my business"); it leans Projects now.
    expect(s.profile.focus).toEqual({ week: '2026-10-05', id: 'business' });
    expect(areasOf(s.plans[TODAY])).toEqual(['projects', 'fitness', 'projects']);
    expect(s.plans[TODAY].swaps?.map(w => w.area)).toEqual(['projects']);
    expect(areasOf(s.plans['2026-10-09'])).toEqual(['projects']);
    expect(s.customMissions.map(m => [m.track, m.source])).toEqual([['projects', 'USER_CREATED']]);
    expect(MISSION_BY_ID['custom-shop'].track).toBe('projects');
    expect(areasOf(s.devPlans!['2026-10-08'])).toEqual(['projects']);
    expect(s.devPlans!['2026-10-08'].swaps?.map(w => w.area)).toEqual(['projects']);
    expect(tracksOf(s.record)).toEqual(['projects']);
    expect(tracksOf(s.devSnapshot!)).toEqual(['projects', 'money']);
    const { trackProgress, TRACK_IDS } = await import('../../core/progress');
    expect(TRACK_IDS).not.toContain('business');
    expect(trackProgress(s.record).projects.xp).toBe(15);
    expect(JSON.parse(mem.map.get('unsetld-v2')!).version).toBe(8);

    // Back to the real today: the record and plans kept aside come back with Projects too.
    useApp.getState().backToRealToday();
    const back = useApp.getState();
    expect(tracksOf(back.record)).toEqual(['projects', 'money']);
    expect(areasOf(back.plans['2026-10-08'])).toEqual(['projects']);
  });

  it('keeps the areas picked in order, once each; none left falls back to the defaults', async () => {
    const tracksAfter = async (tracks: string[]) => {
      const { useApp } = await load({ installSalt: 'salt-o', settings: { onboarded: true }, profile: { tracks } }, 6);
      return useApp.getState().profile.tracks;
    };
    expect(await tracksAfter(['business'])).toEqual(['projects']);
    expect(await tracksAfter(['school', 'business', 'projects', 'money'])).toEqual(['school', 'projects', 'money']);
    expect(await tracksAfter(['projects', 'business'])).toEqual(['projects']);
    const { DEFAULT_PROFILE } = await import('../../core/missions');
    expect(await tracksAfter([])).toEqual(DEFAULT_PROFILE.tracks);
  });

  it('maps a Keychain backup that still says Business', async () => {
    const { useApp } = await load({ installSalt: 'fresh', settings: { onboarded: false } }, 7);
    const backup = rec({ '2026-10-05': { 'business-post': done('business-post', 'business', 10), S1: done('S1', 'school', 15) } });
    useApp.getState().restore('salt-kb', backup as never);
    expect(tracksOf(useApp.getState().record)).toEqual(['projects', 'school']);
  });

  it('a state saved as v7 loads as it is', async () => {
    const plan = { day: TODAY, missions: [{ slot: 'main', missionId: 'P1', area: 'projects' }, { slot: 'easy', missionId: 'F3', area: 'fitness' }], rerolls: 0, replaced: [] };
    const { useApp } = await load({ installSalt: 'salt-7', settings: { onboarded: true }, profile: { tracks: ['projects', 'fitness'] }, plans: { [TODAY]: plan } }, 7);
    expect(useApp.getState().profile.tracks).toEqual(['projects', 'fitness']);
    expect(useApp.getState().ensurePlan(TODAY)).toEqual(plan);
  });
});

describe('v7 → v8 (launch pass): from the state the 3.3 build saved', () => {
  const DAY = '2026-10-15';
  const PLAN_KEY = `plan:${v33.state.program.id}:${v33.state.program.finishedDay}`;
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 15, 8, 0, 0)); // Thu 15 Oct 2026, 8 AM local
  });

  /** A copy of the fixture's state with some of it changed. */
  const v33With = (patch: Record<string, unknown>) => ({ ...structuredClone(v33.state), ...patch });
  const savedState = () => JSON.parse(mem.map.get('unsetld-v2')!) as { state: Record<string, unknown>; version: number };

  /** Everything in `old` is in `now` as it was (arrays may have grown at the end): the update only adds. */
  function onlyAdds(now: unknown, old: unknown, path = ''): string[] {
    if (Array.isArray(old)) {
      if (!Array.isArray(now) || now.length < old.length) return [path];
      return old.flatMap((v, i) => onlyAdds(now[i], v, `${path}[${i}]`));
    }
    if (old && typeof old === 'object') {
      if (!now || typeof now !== 'object') return [path];
      return Object.entries(old).flatMap(([k, v]) => onlyAdds((now as Record<string, unknown>)[k], v, `${path}.${k}`));
    }
    return Object.is(now, old) ? [] : [path];
  }

  it('keeps the record, the plans, the profile and everything else as they were; saved as v8', async () => {
    expect(v33.version).toBe(7);
    const { useApp } = await load(v33.state, v33.version);
    const s = useApp.getState();
    const { plansFinished, ...record } = s.record;
    expect(record).toEqual(v33.state.record);
    expect(plansFinished).toHaveLength(1);
    expect(s.plans).toEqual(v33.state.plans);
    expect(s.profile).toEqual(v33.state.profile);
    expect(s.program).toEqual(v33.state.program);
    expect(s.customMissions).toEqual(v33.state.customMissions);
    expect(s.installSalt).toBe(v33.state.installSalt);
    const { balance, pointsEarned } = await import('../../core/rewards');
    const { activeDays } = await import('../../core/progress');
    const { computeStreak } = await import('../../core/streak');
    expect({ balance: balance(s.record), active: activeDays(s.record).size, streak: computeStreak(activeDays(s.record), DAY).current }).toEqual({
      balance: balance(v33.state.record as never),
      active: 9,
      streak: 4,
    });
    expect(pointsEarned(s.record)).toBe(pointsEarned(v33.state.record as never));
    // Today is planned as usual, and yesterday's plan (one mission proven, one open) stays.
    expect(s.ensurePlan(DAY).missions.length).toBeGreaterThan(0);
    expect(useApp.getState().plans['2026-10-14']).toEqual(v33.state.plans['2026-10-14']);
    const saved = savedState();
    expect(saved.version).toBe(8);
    // What a 3.3 (v7) build reads of it is what it saved: v8 only adds.
    expect(onlyAdds(saved.state, v33.state)).toEqual([]);
  });

  it('new settings and keys start empty: the age gate asks once, nothing is shared, no goal area or focus area', async () => {
    const { useApp, DEFAULT_SETTINGS } = await load(v33.state, 7);
    const s = useApp.getState();
    expect(s.settings).toEqual({ ...v33.state.settings, ageCheck: null, shareUsage: null });
    expect(Object.keys(s.settings).sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
    expect(DEFAULT_SETTINGS).toMatchObject({ ageCheck: null, shareUsage: null });
    expect(s.remote.metrics).toBeUndefined();
    expect(s.profile.goalArea).toBeUndefined();
    expect(s.profile.focus).toEqual({ week: '2026-10-12', id: 'exam' });
    expect(s.profile.focus?.area).toBeUndefined();
  });

  it('the reminders offer: already answered for someone onboarded, still to come for someone who is not', async () => {
    const { useApp: a } = await load(v33.state, 7);
    expect(a.getState().reading).toEqual({ ...v33.state.reading, remindersOffer: 'done' });
    const { useApp: b } = await load({ installSalt: 'salt-n', settings: { onboarded: false }, reading: { accessIntroShown: false, road: 0 } }, 7);
    expect(b.getState().reading.remindersOffer).toBeNull();
    // No reading saved at all: the defaults, with the offer answered.
    const { useApp: c } = await load({ installSalt: 'salt-r', settings: { onboarded: true } }, 7);
    expect(c.getState().reading).toEqual({ accessIntroShown: false, road: 0, remindersOffer: 'done' });
  });

  it('fills the membership with the new fields as null, keeping what was saved', async () => {
    const { useApp: a, EMPTY_PREMIUM } = await load(v33.state, 7);
    expect(a.getState().premium).toEqual({ active: false, plan: null, renews: null, mode: 'revenuecat', trialEnds: null, ends: null, productId: null });
    expect(EMPTY_PREMIUM).toEqual({ active: false, plan: null, renews: null, mode: null, trialEnds: null, ends: null, productId: null });
    const member = { active: true, plan: 'annual', renews: '2027-10-01T10:00:00Z', mode: 'revenuecat' };
    const { useApp: b } = await load(v33With({ premium: member }), 7);
    expect(b.getState().premium).toEqual({ ...member, trialEnds: null, ends: null, productId: null });
    const { useApp: c } = await load({ installSalt: 'salt-p', settings: { onboarded: true } }, 7);
    expect(c.getState().premium).toEqual(EMPTY_PREMIUM);
  });

  it('puts the finished plan on the record; finished before yesterday, its moment and First plan are marked seen', async () => {
    expect(v33.state.program).toMatchObject({ id: 'get-organized', finishedDay: '2026-10-09' });
    const { useApp } = await load(v33.state, 7);
    const s = useApp.getState();
    expect(s.record.plansFinished).toEqual([{ id: 'get-organized', finished: '2026-10-09' }]);
    expect(s.momentsShown).toEqual([...v33.state.momentsShown, PLAN_KEY, 'plan-1']);
    // Loaded again (now v8): nothing is added twice.
    const again = JSON.stringify(savedState());
    const { useApp: b } = await load(savedState().state, 8);
    expect(b.getState().record.plansFinished).toEqual([{ id: 'get-organized', finished: '2026-10-09' }]);
    expect(b.getState().momentsShown).toEqual(s.momentsShown);
    expect(JSON.stringify(savedState())).toBe(again);
  });

  it('a plan finished yesterday or today keeps its moment to come', async () => {
    for (const finished of ['2026-10-14', DAY]) {
      const program = { ...v33.state.program, doneDays: [...v33.state.program.doneDays.slice(0, 4), finished], finishedDay: finished };
      const { useApp } = await load(v33With({ program }), 7);
      const s = useApp.getState();
      expect(s.record.plansFinished).toEqual([{ id: 'get-organized', finished }]);
      expect(s.momentsShown).toEqual(v33.state.momentsShown);
    }
  });

  it('a plan with every day proven but no finish day (an earlier build) finishes on its last day proven; a running plan adds nothing', async () => {
    const { useApp: a } = await load(v33With({ program: { ...v33.state.program, finishedDay: null } }), 7);
    expect(a.getState().record.plansFinished).toEqual([{ id: 'get-organized', finished: '2026-10-09' }]);
    const running = { id: 'lock-in-7', startedDay: '2026-10-12', doneDays: ['2026-10-12', '2026-10-13'], finishedDay: null };
    const { useApp: b } = await load(v33With({ program: running }), 7);
    expect(b.getState().record.plansFinished).toBeUndefined();
    expect(b.getState().momentsShown).toEqual(v33.state.momentsShown);
    expect(b.getState().program).toEqual(running);
    const { useApp: c } = await load(v33With({ program: null }), 7);
    expect(c.getState().record.plansFinished).toBeUndefined();
  });

  it('a state saved by this build or a newer one loads as it is', async () => {
    const { migrateState } = await load({ installSalt: 'fresh' }, 8);
    const v8 = { ...structuredClone(v33.state), settings: { ...v33.state.settings, ageCheck: 'ok', shareUsage: null }, reading: { ...v33.state.reading, remindersOffer: '2026-10-14' } };
    expect(migrateState(v8 as never, 8)).toBe(v8);
    expect(migrateState(v8 as never, 9)).toBe(v8);
    // A newer build's save (v9) is read without migrating: what it set stays, and no plan is backfilled.
    const { useApp } = await load(v8, 9);
    const s = useApp.getState();
    expect(s.settings.ageCheck).toBe('ok');
    expect(s.reading.remindersOffer).toBe('2026-10-14');
    expect(s.record.plansFinished).toBeUndefined();
    expect(s.momentsShown).toEqual(v33.state.momentsShown);
  });
});
