// The four tabs at the bottom of the app.
import type { TabParams } from '../../navigation/types';

export const NAV: Record<keyof TabParams, { label: string; a11y: string }> = {
  Today: { label: 'Today', a11y: 'Today' },
  Progress: { label: 'Progress', a11y: 'Progress' },
  Rewards: { label: 'Rewards', a11y: 'Rewards' },
  You: { label: 'You', a11y: 'You' },
};
