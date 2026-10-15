// Deep links: the Next mission widget links to unsetld://mission/<id>, and the approved ids are
// short capitals (D1, P12). The id is passed on exactly as written.
import { describe, expect, it } from 'vitest';
import { parseUrl } from '../intents';

describe('deep links', () => {
  it('opens an approved mission by its id', () => {
    expect(parseUrl('unsetld://mission/D1')).toEqual({ kind: 'mission', missionId: 'D1' });
    expect(parseUrl('unsetld://mission/P12?from=widget')).toEqual({ kind: 'mission', missionId: 'P12' });
    expect(parseUrl('unsetld://mission/custom-k2x9')).toEqual({ kind: 'mission', missionId: 'custom-k2x9' });
  });

  it('ignores a mission link without an id; Today and Progress links as before', () => {
    expect(parseUrl('unsetld://mission/')).toBeNull();
    expect(parseUrl('unsetld://today')).toEqual({ kind: 'today' });
    expect(parseUrl('unsetld://line/412')).toEqual({ kind: 'today' });
    expect(parseUrl('unsetld://progress')).toEqual({ kind: 'record' });
  });
});
