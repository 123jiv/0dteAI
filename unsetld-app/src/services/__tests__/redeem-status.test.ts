// Taking a status code goes through the same redeem call as a points reward, marked as status
// so unsetld.com counts the user's active days itself (docs/ACCESS.md).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { statusReward } from '../../core/rewards';
import type { RewardTier, StatusTier } from '../../core/types';

const app = vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  return { status: null as StatusTier[] | null };
});
vi.mock('react-native', () => ({ Platform: { OS: 'ios' }, Linking: {} }));
vi.mock('../../state/store', () => ({ useApp: { getState: () => ({ remote: { status: app.status }, signOut() {} }) } }));
vi.mock('../account', () => ({ sessionToken: async () => 'session', saveSession: async () => true, signOutApple: async () => {} }));
vi.mock('../notifications', () => ({}));

const { redeem, STATUS_DEFAULTS } = await import('../access');

let sent: { url: string; body: Record<string, unknown>; auth: string | undefined }[] = [];
function reply(json: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: { body: string; headers: Record<string, string> }) => {
      sent.push({ url, body: JSON.parse(init.body), auth: init.headers.Authorization });
      return { ok: status < 400, status, json: async () => json };
    }),
  );
}

beforeEach(() => {
  sent = [];
  app.status = null;
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('redeem', () => {
  it('sends a status code as status, with its day, so the server counts active days', async () => {
    reply({ code: 'UNSETLD10-ABC123', url: 'https://www.unsetld.com/discount/UNSETLD10-ABC123' });
    const r = await redeem(statusReward(STATUS_DEFAULTS[0]));
    expect(r).toEqual({ ok: true, code: 'UNSETLD10-ABC123', url: 'https://www.unsetld.com/discount/UNSETLD10-ABC123' });
    expect(sent).toEqual([
      {
        url: 'https://www.unsetld.com/api/app/redeem',
        body: { rewardId: 'status-7', kind: 'status', day: 7, percent: 10, maxOff: 25, codeValidDays: 30 },
        auth: 'Bearer session',
      },
    ]);
  });

  it("sends the config's day for a tier the config moved", async () => {
    app.status = [{ ...STATUS_DEFAULTS[0], day: 10 }];
    reply({ error: 'short' });
    expect(await redeem(statusReward(app.status[0]))).toEqual({ ok: false, reason: 'short' });
    expect(sent[0].body).toMatchObject({ rewardId: 'status-7', kind: 'status', day: 10 });
  });

  it('passes on the code a repeat status redeem sends back, with its own last day', async () => {
    // The first reply was lost to the timeout; unsetld.com sends the code it already minted.
    reply({ code: 'UNSETLD10-ABC123', url: 'https://www.unsetld.com/discount/UNSETLD10-ABC123', expires: '2026-11-09' });
    expect(await redeem(statusReward(STATUS_DEFAULTS[0]))).toEqual({
      ok: true,
      code: 'UNSETLD10-ABC123',
      url: 'https://www.unsetld.com/discount/UNSETLD10-ABC123',
      expires: '2026-11-09',
    });
  });

  it("still reads an older server's used for a status code as used", async () => {
    reply({ error: 'used' });
    expect(await redeem(statusReward(STATUS_DEFAULTS[1]))).toEqual({ ok: false, reason: 'used' });
  });

  it('sends a points reward as before', async () => {
    const ten: RewardTier = { id: 'ten-off', title: '10% off', detail: '', type: 'discount', points: 600, percent: 10, maxOff: 25, active: true, codeValidDays: 30, perCollection: 1 };
    reply({ error: 'used' });
    expect(await redeem(ten)).toEqual({ ok: false, reason: 'used' });
    expect(sent[0].body).toEqual({ rewardId: 'ten-off', points: 600, type: 'discount', percent: 10, minimumPurchase: null });
  });
});
