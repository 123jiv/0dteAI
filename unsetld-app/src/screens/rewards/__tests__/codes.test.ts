import { describe, expect, it } from 'vitest';
import { emptyRecord } from '../../../core/record';
import type { CodeClaim, RecordState, Redemption } from '../../../core/types';
import { codeCount, holdsLiveCode } from '../codes';

const redemption = (expires: string): Redemption => ({ rewardId: 'ten-off', points: 600, collection: '004', day: '2026-10-20', code: 'UNSETLD-10-TEST', url: 'https://www.unsetld.com', expires });
const legacy = (expires: string): CodeClaim => ({ day: '2026-01-02', collection: '002', points: 500, percent: 10, code: 'OLD10', url: 'https://www.unsetld.com', expires });

describe('codes taken with points (the Rewards tab while rewards are off)', () => {
  it('a code still works through its last day, and not after', () => {
    const r: RecordState = { ...emptyRecord(), redemptions: [redemption('2026-11-19')] };
    expect(holdsLiveCode(r, '2026-10-21')).toBe(true);
    expect(holdsLiveCode(r, '2026-11-19')).toBe(true);
    expect(holdsLiveCode(r, '2026-11-20')).toBe(false);
  });

  it('counts 2.x codes too', () => {
    const r: RecordState = { ...emptyRecord(), codes: [legacy('2026-12-01')] };
    expect(holdsLiveCode(r, '2026-11-30')).toBe(true);
    expect(codeCount(r)).toBe(1);
  });

  it('one live code among expired ones is enough', () => {
    const r: RecordState = { ...emptyRecord(), redemptions: [redemption('2026-09-01'), redemption('2026-11-19')], codes: [legacy('2026-02-01')] };
    expect(holdsLiveCode(r, '2026-10-14')).toBe(true);
    expect(codeCount(r)).toBe(3);
  });

  it('no codes, or a record from before either list existed', () => {
    expect(holdsLiveCode(emptyRecord(), '2026-10-14')).toBe(false);
    expect(codeCount(emptyRecord())).toBe(0);
    const old = { ...emptyRecord(), redemptions: undefined, codes: undefined } as unknown as RecordState;
    expect(holdsLiveCode(old, '2026-10-14')).toBe(false);
    expect(codeCount(old)).toBe(0);
  });
});
