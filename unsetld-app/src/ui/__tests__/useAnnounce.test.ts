// VoiceOver on iOS reads no accessibilityLiveRegion, so ui/useAnnounce says a changed line
// there: once per change, only on iOS (TalkBack and the browser read the live region).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { announce, nextAnnouncement } from '../useAnnounce';

// vi.hoisted and vi.mock run before the import above.
const rn = vi.hoisted(() => ({ Platform: { OS: 'ios' }, AccessibilityInfo: { announceForAccessibilityWithOptions: (() => {}) as (t: string, o: object) => void } }));
vi.mock('react-native', () => rn);

describe('announce', () => {
  const said: [string, object][] = [];
  beforeEach(() => {
    said.length = 0;
    rn.AccessibilityInfo.announceForAccessibilityWithOptions = (t, o) => said.push([t, o]);
  });

  it('speaks on iOS, after what VoiceOver is saying', () => {
    rn.Platform.OS = 'ios';
    announce('Time. Mark it done.');
    expect(said).toEqual([['Time. Mark it done.', { queue: true }]]);
  });

  it('says nothing on Android or the web, which read the live region', () => {
    for (const os of ['android', 'web']) {
      rn.Platform.OS = os;
      announce('Time. Mark it done.');
    }
    expect(said).toEqual([]);
  });

  it('says nothing for an empty line', () => {
    rn.Platform.OS = 'ios';
    announce('');
    expect(said).toEqual([]);
  });
});

describe('nextAnnouncement (one step of useAnnounce)', () => {
  it('says a new line once', () => {
    let s = nextAnnouncement(null, 'Checking proof…', false);
    expect(s).toEqual({ said: 'Checking proof…', say: 'Checking proof…' });
    s = nextAnnouncement(s.said, 'Checking proof…', false);
    expect(s.say).toBeNull();
    s = nextAnnouncement(s.said, 'Not counted. That photo was already used. Take a new one.', false);
    expect(s.say).toBe('Not counted. That photo was already used. Take a new one.');
  });

  it('a line that goes and comes back is said again; going says nothing', () => {
    let s = nextAnnouncement('That didn’t work. Nothing was shared. Try again.', null, false);
    expect(s).toEqual({ said: null, say: null });
    s = nextAnnouncement(s.said, 'That didn’t work. Nothing was shared. Try again.', false);
    expect(s.say).toBe('That didn’t work. Nothing was shared. Try again.');
  });

  it('holds while the screen is covered, then says what changed', () => {
    let s = nextAnnouncement('Day 1 is in your missions today.', 'Today’s day is proven.', true);
    expect(s).toEqual({ said: 'Day 1 is in your missions today.', say: null });
    s = nextAnnouncement(s.said, 'Today’s day is proven.', false);
    expect(s.say).toBe('Today’s day is proven.');
  });

  it('a change undone while held says nothing', () => {
    let s = nextAnnouncement('Day 1 is in your missions today.', 'Today’s day is proven.', true);
    s = nextAnnouncement(s.said, 'Day 1 is in your missions today.', false);
    expect(s.say).toBeNull();
  });
});
