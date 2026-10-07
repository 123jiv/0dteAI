import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Platform, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/** Renders the hidden story card to a 1080×1920 PNG and opens the share sheet. */
export async function shareCard(ref: RefObject<View | null>): Promise<'shared' | 'preview' | 'failed'> {
  // The browser preview can't open a share sheet or save files.
  if (Platform.OS === 'web') return 'preview';
  try {
    const uri = await captureRef(ref, { format: 'png', result: 'tmpfile', width: 1080, height: 1920 });
    if (!(await Sharing.isAvailableAsync())) return 'failed';
    await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share this line' });
    return 'shared';
  } catch {
    return 'failed';
  }
}
