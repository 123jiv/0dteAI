// The share card leaves the phone only from here, and only when the user taps Share:
// the card view is captured as a Story-size image (1080 × 1920) and handed to the iOS
// share sheet. Proof photos are never part of it. The browser preview can't capture a
// view or open a share sheet, so it has neither (the screen asks for a screenshot).
import type { RefObject } from 'react';
import { PixelRatio, Platform, Share, type View } from 'react-native';

type ViewShot = typeof import('react-native-view-shot');

// Required only on iOS, so the web build leaves the module (and its html2canvas) out.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const shot: ViewShot | null = Platform.OS === 'ios' ? require('react-native-view-shot') : null;

/** The card can be captured and shared from the app (iOS). Elsewhere: a screenshot. */
export const canShareCard = shot !== null;

/** Story size in pixels: Instagram and TikTok take 9:16. */
const STORY = { width: 1080, height: 1920 } as const;

export type ShareResult = 'shared' | 'dismissed' | 'failed';

/**
 * Captures the card and opens the share sheet. 'dismissed' when the sheet was closed
 * without sharing, 'failed' when the capture or the sheet didn't work (nothing was sent).
 * The captured file is deleted again either way.
 */
export async function shareCard(ref: RefObject<View | null>): Promise<ShareResult> {
  if (!shot || !ref.current) return 'failed';
  let uri: string | null = null;
  try {
    // captureRef sizes in points and draws at the screen's scale: this comes out at 1080 × 1920.
    const scale = PixelRatio.get();
    uri = await shot.captureRef(ref, { format: 'png', result: 'tmpfile', width: STORY.width / scale, height: STORY.height / scale });
    const r = await Share.share({ url: uri });
    return r.action === Share.sharedAction ? 'shared' : 'dismissed';
  } catch {
    return 'failed';
  } finally {
    if (uri) {
      try {
        shot.releaseCapture(uri);
      } catch {
        // A temporary file: iOS clears it anyway.
      }
    }
  }
}
