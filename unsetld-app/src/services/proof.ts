// Proof photos: taken live with the camera, kept inside the app on this phone,
// never uploaded. The browser preview has no camera, so it picks a file and
// keeps a small copy in local storage.
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import type { DayKey } from '../core/time';

export type Capture = { ok: true; uri: string } | { ok: false; reason: 'cancelled' | 'denied' | 'failed' };

const web = Platform.OS === 'web';
const WEB_PREFIX = 'web-proof:';

export async function cameraPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (web) return 'granted';
  const p = await ImagePicker.getCameraPermissionsAsync();
  return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
}

/** Opens the camera (the photo library is never offered on iOS). */
export async function capture(): Promise<Capture> {
  try {
    if (web) {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (r.canceled || !r.assets?.length) return { ok: false, reason: 'cancelled' };
      return { ok: true, uri: r.assets[0].uri };
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { ok: false, reason: 'denied' };
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, exif: false, allowsEditing: false });
    if (r.canceled || !r.assets?.length) return { ok: false, reason: 'cancelled' };
    return { ok: true, uri: r.assets[0].uri };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/** Downscales a picked image to a 720 px JPEG data URL (browser preview only). */
async function shrinkForWeb(uri: string): Promise<string> {
  const doc = (globalThis as { document?: Document }).document;
  if (!doc) return uri;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new (globalThis as unknown as { Image: typeof HTMLImageElement }).Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = uri;
  });
  const scale = Math.min(1, 720 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = doc.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.7);
}

/** Moves a captured photo into the app's own storage and returns what to save on the proof. */
export async function keepPhoto(uri: string, day: DayKey): Promise<string> {
  if (web) {
    const data = await shrinkForWeb(uri).catch(() => uri);
    try {
      globalThis.localStorage?.setItem(`${WEB_PREFIX}${day}`, data);
      return `${WEB_PREFIX}${day}`;
    } catch {
      return data.length < 200_000 ? data : '';
    }
  }
  const dir = new Directory(Paths.document, 'proof');
  dir.create({ intermediates: true, idempotent: true });
  const dest = new File(dir, `${day}.jpg`);
  if (dest.exists) dest.delete();
  await new File(uri).copy(dest);
  return dest.uri;
}

/** An image source for a saved proof, or null if the photo isn't on this device. */
export function proofImage(uri: string): string | null {
  if (!uri) return null;
  if (uri.startsWith(WEB_PREFIX)) {
    try {
      return globalThis.localStorage?.getItem(uri) ?? null;
    } catch {
      return null;
    }
  }
  if (!web && uri.startsWith('file:')) {
    try {
      return new File(uri).exists ? uri : null;
    } catch {
      return null;
    }
  }
  return uri;
}
