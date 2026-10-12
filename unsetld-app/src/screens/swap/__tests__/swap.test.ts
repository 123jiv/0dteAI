// The swap sheet's words and what it works out before a swap: the six reasons in the founder's
// order, never "AI", what a mission of the user's own earns in the spot (the same cap the store
// applies), one of their own a day, which of their own come back as "Use again", and the form.
import { describe, expect, it } from 'vitest';
import { SWAP } from '../../../content/copy/swap';
import { CUSTOM_POINTS_MAX, CUSTOM_PROOFS, CUSTOM_TITLE_MAX, customPoints, makeCustomMission } from '../../../core/custom';
import type { DayPlan, Mission, SwapReason, TrackId } from '../../../core/types';
import { canAddOwn, draftFrom, draftInput, ownEarns, recentOwn, sameAs, slotWorth, startDraft, type OwnDraft } from '../logic';

const PLAN: DayPlan = {
  day: '2026-10-12',
  missions: [
    { slot: 'easy', missionId: 'fitness-stretch-10', area: 'fitness' }, // TIMER 10 min, 10 pts
    { slot: 'main', missionId: 'school-study-30', area: 'school' }, // TIMER_AND_PHOTO 30 min, 15 pts
    { slot: 'main', missionId: 'organization-fix-broken', area: 'organization' }, // BEFORE_AFTER, 15 pts
  ],
  rerolls: 0,
  replaced: [],
};
const TRACKS: TrackId[] = ['school', 'fitness', 'organization'];

const own = (id: string, title: string, track: TrackId = 'school', proofType: Mission['proofType'] = 'TIMER', timerMinutes?: number) =>
  makeCustomMission({ title, track, proofType, timerMinutes: timerMinutes ?? (proofType === 'TIMER' || proofType === 'TIMER_AND_PHOTO' ? 30 : undefined) }, id)!;

/** Every string in the copy, functions called with sample values. */
function strings(v: unknown): string[] {
  if (typeof v === 'string') return [v];
  if (typeof v === 'function') return strings((v as (...a: unknown[]) => unknown)(3, 'PHOTO', 10, 'PHOTO', 10));
  if (Array.isArray(v)) return v.flatMap(strings);
  if (v && typeof v === 'object') return Object.values(v).flatMap(strings);
  return [];
}

describe('swap copy', () => {
  it('offers the six reasons, one tap each, in the order of the brief', () => {
    expect(SWAP.why.reasons.map(r => r.label)).toEqual([
      'Not relevant',
      'Can’t do this today',
      'Too easy',
      'Too hard',
      'Already did this',
      'Just give me another',
    ]);
    const all: SwapReason[] = ['not-relevant', 'cant-today', 'too-easy', 'too-hard', 'already-did', 'another'];
    expect(SWAP.why.reasons.map(r => r.id).sort()).toEqual([...all].sort());
  });

  it('never says AI, and says recommended for you', () => {
    for (const s of strings(SWAP)) expect(s, s).not.toMatch(/\bA\.?I\b/);
    expect(SWAP.choices.kicker).toBe('Recommended for you');
  });

  it('says the swaps left in words', () => {
    expect(SWAP.why.left(1)).toBe('1 swap left today');
    expect(SWAP.why.left(3)).toBe('3 swaps left today');
    expect(SWAP.why.left(0)).toBe('No swaps left today');
  });

  it('draws a choice like a card on Today, and reads it as one sentence', () => {
    expect(SWAP.choices.meta(20, 'PHOTO', 10).replace(/ /g, ' ')).toBe('20 min · Photo · +10 pts');
    expect(SWAP.choices.meta(30, 'TIMER_AND_PHOTO', 15).replace(/ /g, ' ')).toBe('30 min · Timer + photo · +15 pts');
    expect(SWAP.choices.a11y('Review Notes', 'School', 20, 'PHOTO', 10)).toBe('Review Notes. School, 20 minutes, 10 points, proven with a photo');
  });

  it('labels every proof a mission of your own can use, and keeps the earn line to one short sentence pair', () => {
    for (const p of CUSTOM_PROOFS) expect(SWAP.create.proofLabel(p)).toBeTruthy();
    expect(SWAP.create.earns(10).replace(/ /g, ' ')).toBe('Earns 10 pts. Never more than the one it replaces.');
    expect(SWAP.create.earns(10).length).toBeLessThanOrEqual(56);
    expect(SWAP.create.count(12, CUSTOM_TITLE_MAX)).toBe('12 / 40');
  });
});

describe('what a mission of your own earns in the spot', () => {
  it('is the spot’s worth: the planned mission’s points, or its own cap', () => {
    expect(slotWorth(PLAN, 0)).toBe(10);
    expect(slotWorth(PLAN, 1)).toBe(15);
    const capped: DayPlan = { ...PLAN, missions: PLAN.missions.map((p, i) => (i === 0 ? { ...p, missionId: 'custom-x', points: 5 } : p)) };
    expect(slotWorth(capped, 0)).toBe(5);
    expect(slotWorth(PLAN, 9)).toBeNull();
    expect(slotWorth({ ...PLAN, missions: [{ slot: 'main', missionId: 'gone-mission' }] }, 0)).toBeNull();
  });

  it('never more than the spot is worth, never more than the cap', () => {
    // A 30-minute timer earns 15 on its own; in a 10-point spot it earns 10.
    expect(ownEarns('TIMER', 30, 10)).toBe(10);
    expect(ownEarns('TIMER', 30, 15)).toBe(15);
    expect(ownEarns('PHOTO', 30, 15)).toBe(customPoints('PHOTO'));
    expect(ownEarns('TIMER', 15, 25)).toBe(10);
    expect(ownEarns('TIMER_AND_PHOTO', 60, null)).toBe(CUSTOM_POINTS_MAX);
    // Minutes only count for a timer.
    expect(ownEarns('BEFORE_AFTER', 60, 25)).toBe(customPoints('BEFORE_AFTER'));
  });
});

describe('one of your own a day', () => {
  it('has room when the day holds none, or only the one being swapped', () => {
    expect(canAddOwn(PLAN, 1)).toBe(true);
    const withOwn: DayPlan = { ...PLAN, missions: PLAN.missions.map((p, i) => (i === 0 ? { ...p, missionId: 'custom-a', points: 10 } : p)) };
    expect(canAddOwn(withOwn, 0)).toBe(true);
    expect(canAddOwn(withOwn, 1)).toBe(false);
    expect(canAddOwn(null, 0)).toBe(false);
    expect(canAddOwn(PLAN, 7)).toBe(false);
  });
});

describe('use again', () => {
  it('lists the newest first, at most three, none already in the day or swapped out of it', () => {
    const list = [own('custom-1', 'Practice guitar'), own('custom-2', 'Sketch for an hour'), own('custom-3', 'Clean the desk'), own('custom-4', 'Read 20 pages')];
    expect(recentOwn(list, PLAN, TRACKS).map(m => m.id)).toEqual(['custom-4', 'custom-3', 'custom-2']);
    const day: DayPlan = { ...PLAN, missions: [...PLAN.missions.slice(0, 2), { slot: 'main', missionId: 'custom-4', area: 'school' }], replaced: ['custom-3'] };
    expect(recentOwn(list, day, TRACKS).map(m => m.id)).toEqual(['custom-2', 'custom-1']);
  });

  it('leaves out ones in an area the user no longer has', () => {
    const list = [own('custom-1', 'Practice guitar', 'school'), own('custom-2', 'Run 5k', 'fitness')];
    expect(recentOwn(list, PLAN, ['school']).map(m => m.id)).toEqual(['custom-1']);
  });
});

describe('the form', () => {
  it('starts in the spot’s area with the proof and length of the mission it replaces', () => {
    expect(startDraft(PLAN, 1, TRACKS)).toEqual({ title: '', track: 'school', proofType: 'TIMER_AND_PHOTO', minutes: 30 });
    // A 10-minute timer: the nearest length offered.
    expect(startDraft(PLAN, 0, TRACKS)).toEqual({ title: '', track: 'fitness', proofType: 'TIMER', minutes: 15 });
    expect(startDraft(PLAN, 2, TRACKS).proofType).toBe('BEFORE_AFTER');
    // An area the user dropped: their first one.
    expect(startDraft(PLAN, 1, ['fitness']).track).toBe('fitness');
  });

  it('is ready with a title of 3 to 40 letters and an area', () => {
    const d: OwnDraft = { title: '  Practice   guitar ', track: 'school', proofType: 'TIMER', minutes: 30 };
    expect(draftInput(d)).toEqual({ title: 'Practice guitar', track: 'school', proofType: 'TIMER', timerMinutes: 30 });
    expect(draftInput({ ...d, title: 'ab' })).toBeNull();
    expect(draftInput({ ...d, track: null })).toBeNull();
    expect(draftInput({ ...d, minutes: 20 })).toBeNull();
    // No timer: the length is left out.
    expect(draftInput({ ...d, proofType: 'PHOTO', minutes: 20 })).toEqual({ title: 'Practice guitar', track: 'school', proofType: 'PHOTO' });
  });

  it('fills from one of your own, and knows when nothing changed so nothing new is made', () => {
    const m = own('custom-1', 'Practice guitar', 'school', 'TIMER', 45);
    const d = draftFrom(m, { title: '', track: 'fitness', proofType: 'PHOTO', minutes: 15 });
    expect(d).toEqual({ title: 'Practice guitar', track: 'school', proofType: 'TIMER', minutes: 45 });
    expect(sameAs(m, draftInput(d))).toBe(true);
    expect(sameAs(m, draftInput({ ...d, title: 'practice guitar' }))).toBe(true);
    expect(sameAs(m, draftInput({ ...d, minutes: 30 }))).toBe(false);
    expect(sameAs(m, draftInput({ ...d, track: 'fitness' }))).toBe(false);
    expect(sameAs(m, null)).toBe(false);
  });
});
