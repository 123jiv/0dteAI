import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Platform, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

export type ShareFormat = 'story' | 'post';

/** Renders the hidden share card at 1080×1920 (story) or 1080×1080 (post) and opens the share sheet. */
export async function shareCard(ref: RefObject<View | null>, format: ShareFormat): Promise<'shared' | 'preview' | 'failed'> {
  // The browser preview can't open a share sheet or save files.
  if (Platform.OS === 'web') return 'preview';
  try {
    const uri = await captureRef(ref, {
      format: 'png',
      result: 'tmpfile',
      width: 1080,
      height: format === 'story' ? 1920 : 1080,
    });
    if (!(await Sharing.isAvailableAsync())) return 'failed';
    await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
    return 'shared';
  } catch {
    return 'failed';
  }
}
