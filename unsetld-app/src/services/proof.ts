// Proof photos: taken live with the camera, kept inside the app on this phone,
// never uploaded. Each photo is re-encoded on save (which drops EXIF, including
// any location) and fingerprinted so the same photo can't count twice.
// The browser preview has no camera, so it picks a file and keeps a small copy
// in local storage.
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { fingerprint } from '../core/proofs';

export type Capture = { ok: true; uri: string } | { ok: false; reason: 'cancelled' | 'denied' | 'failed' };

const web = Platform.OS === 'web';
const WEB_PREFIX = 'web-proof:';
/** Proof photos live in <Documents>/proof. */
const PROOF_DIR = 'proof';

/**
 * This install's proof folder. iOS gives the app a new container path after an
 * update or a restore, so it's looked up each time, never kept.
 */
function proofDir(): Directory {
  return new Directory(Paths.document, PROOF_DIR);
}

/** The file name of a stored proof URI ("…/proof/2026-10-09-focus-lock-in-25-after.jpg"), or null if it isn't one. */
function proofFileName(uri: string): string | null {
  const m = /\/proof\/([A-Za-z0-9_-]+\.[A-Za-z0-9]+)$/.exec(uri);
  return m ? m[1] : null;
}

/**
 * The file a stored proof URI points to on this phone, or null. Proofs are
 * stored as absolute file:// URIs, and the app's container path changes after
 * updates and restores, so a path that no longer exists is looked up by its
 * file name in this install's proof folder. What's stored is never changed.
 */
function proofFile(uri: string): File | null {
  try {
    const stored = new File(uri);
    if (stored.exists) return stored;
    const name = proofFileName(uri);
    if (!name) return null;
    const here = new File(proofDir(), name);
    return here.uri !== stored.uri && here.exists ? here : null;
  } catch {
    return null;
  }
}

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
  if (!web && uri.startsWith('file:')) return proofFile(uri)?.uri ?? null;
  return uri;
}

/** Whether proof photos come straight from the camera (false in the browser preview). */
export const PROOF_FROM_CAMERA = !web;

export interface SavedPhoto {
  /** What to store on the proof (a file URI, or a web storage key). */
  uri: string;
  /** Fingerprint of the saved image. */
  hash: string;
}

/**
 * Saves a captured photo for a mission proof: resized to 1600 px, re-encoded as
 * JPEG without metadata, stored in the app's own folder, and fingerprinted.
 * `key` names the file, e.g. "2026-10-09-focus-lock-in-25-after".
 */
export async function savePhoto(uri: string, key: string): Promise<SavedPhoto> {
  const safe = key.replace(/[^a-z0-9-]/gi, '');
  if (web) {
    const data = await shrinkForWeb(uri).catch(() => uri);
    const hash = fingerprint(data);
    try {
      globalThis.localStorage?.setItem(`${WEB_PREFIX}${safe}`, data);
      return { uri: `${WEB_PREFIX}${safe}`, hash };
    } catch {
      return { uri: data.length < 200_000 ? data : '', hash };
    }
  }
  const ref = await ImageManipulator.manipulate(uri).resize({ width: 1600 }).renderAsync();
  const out = await ref.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
  const dir = proofDir();
  dir.create({ intermediates: true, idempotent: true });
  // Never over an existing file: a proof stored before an update can still
  // point at that name (see proofFile), so a retake gets a name of its own.
  let dest = new File(dir, `${safe}.jpg`);
  for (let n = 2; dest.exists && n < 100; n++) dest = new File(dir, `${safe}-${n}.jpg`);
  if (dest.exists) dest.delete();
  await new File(out.uri).copy(dest);
  return { uri: dest.uri, hash: fingerprint(out.base64 ?? dest.uri) };
}

/** Deletes a saved proof photo (retention policy, or a retake), wherever this install keeps it. Missing files are fine. */
export function deletePhoto(uri: string): void {
  if (!uri) return;
  try {
    if (uri.startsWith(WEB_PREFIX)) globalThis.localStorage?.removeItem(uri);
    else if (!web && uri.startsWith('file:')) proofFile(uri)?.delete();
  } catch {
    // Already gone.
  }
}
