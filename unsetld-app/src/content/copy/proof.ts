// How each mission is proven, said the same way everywhere (cards, mission page, plans,
// proof history). Sentence case, short: it sits on a one-line meta row.
import type { ProofType } from '../../core/types';
import type { IconName } from '../../ui/icons';

export const PROOF_KIND: Record<ProofType, { label: string; a11y: string; icons: IconName[] }> = {
  PHOTO: { label: 'Photo', a11y: 'photo proof', icons: ['camera'] },
  PHOTO_AFTER: { label: 'Photo', a11y: 'photo proof', icons: ['camera'] },
  TIMER: { label: 'Timer', a11y: 'proven with the timer', icons: ['timer'] },
  TIMER_AND_PHOTO: { label: 'Timer + photo', a11y: 'proven with the timer and a photo', icons: ['timer', 'camera'] },
  BEFORE_AFTER: { label: 'Before + after', a11y: 'proven with before and after photos', icons: ['before-after'] },
};
