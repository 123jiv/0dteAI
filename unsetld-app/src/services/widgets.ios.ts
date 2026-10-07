import Constants, { ExecutionEnvironment } from 'expo-constants';
import { buildPool, dailyLine } from '../core/lines';
import { addDays, startOfDay } from '../core/time';
import { LANE_NAMES } from '../content';
import type { WidgetSnapshotInput } from './widgets.types';

// expo-widgets isn't in Expo Go, so load the widget modules lazily and skip
// quietly there. Dev builds and TestFlight builds get real widgets.
type HomeWidget = typeof import('../../widgets/UnsetldHome').default;
type LockWidget = typeof import('../../widgets/UnsetldLock').default;

let widgets: { home: HomeWidget; lock: LockWidget } | null | undefined;

function load() {
  if (widgets !== undefined) return widgets;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    widgets = null;
    return widgets;
  }
  try {
    widgets = {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      home: require('../../widgets/UnsetldHome').default,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      lock: require('../../widgets/UnsetldLock').default,
    };
  } catch {
    widgets = null;
  }
  return widgets;
}

export const widgetsAvailable = () => Boolean(load());

const DAYS_AHEAD = 30;

function shortText(text: string): string {
  return text.length <= 40 ? text : `${text.slice(0, 38).trimEnd()}…`;
}

/**
 * Writes a month of timeline entries (one per local midnight) so the widget
 * keeps rotating even if the app isn't opened for weeks.
 */
export function updateWidgets(input: WidgetSnapshotInput) {
  const w = load();
  if (!w) return;
  const pool = buildPool(input.lines, {
    lanes: input.lanes,
    tone: input.tone,
    cleanOnly: input.lockScreenClean,
    custom: input.custom,
  });
  const homeEntries = [];
  const lockEntries = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const day = addDays(input.today, i);
    const line = dailyLine(pool, input.salt, day);
    if (!line) break;
    const date = i === 0 ? new Date() : startOfDay(day);
    homeEntries.push({
      date,
      props: {
        text: line.text,
        lane: LANE_NAMES[line.lane] ?? 'UNSETLD',
        streak: input.streak,
        rank: input.rankName,
        bg: input.theme.bg,
        fg: input.theme.text,
        muted: input.theme.muted,
        accent: input.theme.accent,
      },
    });
    lockEntries.push({ date, props: { text: line.text, short: shortText(line.text), streak: input.streak } });
  }
  try {
    if (homeEntries.length) w.home.updateTimeline(homeEntries);
    if (lockEntries.length) w.lock.updateTimeline(lockEntries);
  } catch {
    // Widget extension not installed in this build.
  }
}
