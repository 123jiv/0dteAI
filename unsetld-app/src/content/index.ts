// All editable content lives in JSON next to this file. Edit the JSON, not the code.
import type { LaneId, Line, RankConfig } from '../core/types';
import backYourself from './lines/back-yourself.json';
import bagTalk from './lines/bag-talk.json';
import cutItOff from './lines/cut-it-off.json';
import gymRat from './lines/gym-rat.json';
import lockIn from './lines/lock-in.json';
import showUp from './lines/show-up.json';
import lanesJson from './lanes.json';
import legalJson from './legal.json';
import missionsJson from './missions.json';
import notificationsJson from './notifications.json';
import onboardingJson from './onboarding.json';
import rankJson from './rank.json';
import stoicJson from './stoic.json';
import themesJson from './themes.json';

export interface Lane {
  id: LaneId;
  name: string;
  category: string;
  blurb: string;
}

export interface ThemeDef {
  id: string;
  name: string;
  free: boolean;
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  texture: 'grain' | 'heavy-grain' | 'marble' | 'carbon' | 'brushed' | null;
}

export interface Mission {
  id: string;
  text: string;
  tags: string[];
}

export interface NotificationLine {
  id: string;
  text: string;
  tone: 'clean' | 'unfiltered';
  kind: string;
}

interface StoicJson {
  id: string;
  text: string;
  author: string;
  translator: string;
  work: string;
  ref: string;
  url?: string;
}

export interface LegalDoc {
  title: string;
  updated: string;
  sections: { h: string; p: string }[];
}

const stoicLines: Line[] = (stoicJson as StoicJson[]).map(q => ({
  id: q.id,
  lane: 'stoic',
  text: q.text,
  tone: 'clean',
  author: q.author,
  translator: q.translator,
  ref: q.ref,
}));

export const LINES: Line[] = [
  ...(showUp as Line[]),
  ...(bagTalk as Line[]),
  ...(gymRat as Line[]),
  ...(lockIn as Line[]),
  ...(backYourself as Line[]),
  ...(cutItOff as Line[]),
  ...stoicLines,
];

export const LINES_BY_ID: Record<string, Line> = Object.fromEntries(LINES.map(l => [l.id, l]));
export const LANES = lanesJson as Lane[];
export const LANE_NAMES: Record<string, string> = {
  ...Object.fromEntries(LANES.map(l => [l.id, l.name])),
  custom: 'Your line',
};
export const THEMES = themesJson as ThemeDef[];
export const MISSIONS = missionsJson as Mission[];
export const NOTIFICATION_LINES = notificationsJson as NotificationLine[];
export const ONBOARDING = onboardingJson;
export const RANK_CONFIG = rankJson as RankConfig;
export const LEGAL = legalJson as Record<'privacy' | 'terms' | 'rewards', LegalDoc>;
