// Reminders are offered on Today after the first proof (launch pass P1-3), once, instead of in
// onboarding. Store v8 marks the offer answered for everyone onboarded before it (store-migrate).
import { describe, expect, it } from 'vitest';
import { HOME } from '../../../content/copy/home';
import { nextOffer, shouldOfferReminders } from '../remindersOffer';

const DAY = '2026-10-19';
const base = { provenToday: true, remindersOn: false, permission: 'undetermined' as const, offer: null, day: DAY, focusAsked: false };

describe('shouldOfferReminders', () => {
  it('the first day with a proof, reminders off, not yet offered', () => {
    expect(shouldOfferReminders(base)).toBe(true);
    expect(shouldOfferReminders({ ...base, permission: 'granted' })).toBe(true);
    // The browser preview has no notifications to ask for; testers still see the card.
    expect(shouldOfferReminders({ ...base, permission: 'unsupported' })).toBe(true);
  });

  it('nothing proven today: not yet', () => {
    expect(shouldOfferReminders({ ...base, provenToday: false })).toBe(false);
  });

  it('reminders already on (You › Reminders): never', () => {
    expect(shouldOfferReminders({ ...base, remindersOn: true })).toBe(false);
  });

  it('notifications turned off for the app: never; still reading the permission: not yet', () => {
    expect(shouldOfferReminders({ ...base, permission: 'denied' })).toBe(false);
    expect(shouldOfferReminders({ ...base, permission: null })).toBe(false);
  });

  it('first shown today: it stays through today, and is gone tomorrow', () => {
    expect(shouldOfferReminders({ ...base, offer: DAY })).toBe(true);
    expect(shouldOfferReminders({ ...base, offer: '2026-10-18' })).toBe(false);
    expect(shouldOfferReminders({ ...base, offer: DAY, day: '2026-10-20' })).toBe(false);
  });

  it('answered (or onboarded before 3.3): never again', () => {
    expect(shouldOfferReminders({ ...base, offer: 'done' })).toBe(false);
  });

  it('an older save without the field reads as not offered', () => {
    expect(shouldOfferReminders({ ...base, offer: undefined })).toBe(true);
  });

  it('never in place of the weekly focus question', () => {
    expect(shouldOfferReminders({ ...base, focusAsked: true })).toBe(false);
  });
});

describe('nextOffer: what the card saves', () => {
  it('the day, the first time it shows; nothing after that', () => {
    expect(nextOffer(base)).toBe(DAY);
    expect(nextOffer({ ...base, offer: DAY })).toBeUndefined();
    expect(nextOffer({ ...base, offer: 'done' })).toBeUndefined();
    expect(nextOffer({ ...base, offer: '2026-10-18' })).toBeUndefined();
  });

  it('nothing before the first proof, or while the permission is being read', () => {
    expect(nextOffer({ ...base, provenToday: false })).toBeUndefined();
    expect(nextOffer({ ...base, permission: null })).toBeUndefined();
    expect(nextOffer({ ...base, focusAsked: true })).toBeUndefined();
  });

  it('reminders already on at the first proof: answered, so turning them off later never brings it back', () => {
    expect(nextOffer({ ...base, remindersOn: true })).toBe('done');
    expect(nextOffer({ ...base, remindersOn: true, provenToday: false })).toBeUndefined();
  });
});

describe('the card says what Turn on does', () => {
  it('with the saved count and times', () => {
    const C = HOME.remindersCard;
    expect(C.title).toBe('Get reminded about open missions?');
    expect(C.body(3, '7:00 AM', '10:00 PM')).toBe('Up to 3 a day, 7:00 AM to 10:00 PM. None once the day is proven.');
    expect(C.body(1, '8:00 AM', '10:00 PM')).toBe('One a day at 8:00 AM. None once the day is proven.');
    expect(C.on).toBe('Turn on');
    expect(C.notNow).toBe('Not now');
  });
});
