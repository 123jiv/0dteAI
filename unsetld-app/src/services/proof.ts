// Proof photos: taken live with the camera, kept inside the app on this phone,
// never uploaded. Each photo is re-encoded on save (which drops EXIF, including
// any location) and fingerprinted so the same photo can't count twice.
// The browser preview has no camera, so it picks a file and keeps a small copy
// in local storage.
// The only copy kept is the one in the proof folder: the camera's original and the resized
// copy go once it's made, startup clears what's left in those caches and deletes proof files
// nothing points to (core/proofs orphans), and the photo views keep images in memory only.
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { fingerprint, proofFileName, type ProofFile } from '../core/proofs';
import { isQuotaError, makeRoom } from '../state/storage';

export type Capture = { ok: true; uri: string } | { ok: false; reason: 'cancelled' | 'denied' | 'failed' };

const web = Platform.OS === 'web';
const WEB_PREFIX = 'web-proof:';
/** Proof photos live in <Documents>/proof. */
const PROOF_DIR = 'proof';
/** Where the camera (expo-image-picker) and the resize (expo-image-manipulator) leave their files, in <Caches>. */
const CACHE_DIRS = ['ImagePicker', 'ImageManipulator'] as const;

/**
 * This install's proof folder. iOS gives the app a new container path after an
 * update or a restore, so it's looked up each time, never kept.
 */
function proofDir(): Directory {
  return new Directory(Paths.document, PROOF_DIR);
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
    // Storage full: the oldest photos make room (state/storage makeRoom); when nothing more can
    // go, the photo isn't saved and the Mission screen says so. Storage blocked (a sandboxed
    // frame, some private windows): the store lives in memory, and the photo goes in the record.
    for (;;) {
      try {
        globalThis.localStorage.setItem(`${WEB_PREFIX}${safe}`, data);
        return { uri: `${WEB_PREFIX}${safe}`, hash };
      } catch (e) {
        if (!isQuotaError(e)) return { uri: data.length < 200_000 ? data : '', hash };
        if (!makeRoom()) return { uri: '', hash };
      }
    }
  }
  let resized: string | null = null;
  try {
    const ref = await ImageManipulator.manipulate(uri).resize({ width: 1600 }).renderAsync();
    const out = await ref.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
    resized = out.uri;
    const dir = proofDir();
    dir.create({ intermediates: true, idempotent: true });
    // Never over an existing file: a proof stored before an update can still
    // point at that name (see proofFile), so a retake gets a name of its own.
    let dest = new File(dir, `${safe}.jpg`);
    for (let n = 2; dest.exists && n < 100; n++) dest = new File(dir, `${safe}-${n}.jpg`);
    if (dest.exists) dest.delete();
    await new File(out.uri).copy(dest);
    return { uri: dest.uri, hash: fingerprint(out.base64 ?? dest.uri) };
  } finally {
    // The full-size original from the camera and the resized copy: the proof folder's is the one kept.
    deleteCached(uri);
    if (resized) deleteCached(resized);
  }
}

/** A file the camera or the resize left in their cache folders (and nothing anywhere else). Missing files are fine. */
function deleteCached(uri: string): void {
  if (!CACHE_DIRS.some(d => uri.includes(`/Caches/${d}/`))) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // Already gone.
  }
}

/** Browser preview: the names of the proof photos kept in local storage (none in the app). */
export function webPhotoKeys(): string[] {
  if (!web) return [];
  try {
    const ls = globalThis.localStorage;
    const out: string[] = [];
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k?.startsWith(WEB_PREFIX)) out.push(k);
    }
    return out;
  } catch {
    return [];
  }
}

/** The files in this install's proof folder, with when each was last written (none in the preview). */
export function listProofFiles(): ProofFile[] {
  if (web) return [];
  try {
    const dir = proofDir();
    if (!dir.exists) return [];
    return dir
      .list()
      .filter((x): x is File => x instanceof File)
      .map(f => ({ name: f.name, modified: f.modificationTime ?? null }));
  } catch {
    return [];
  }
}

/** Deletes files in the proof folder by name (the startup sweep's orphans). Missing files are fine. */
export function deleteProofFiles(names: readonly string[]): void {
  if (web) return;
  for (const name of names) {
    try {
      const f = new File(proofDir(), name);
      if (f.exists) f.delete();
    } catch {
      // Already gone.
    }
  }
}

/**
 * The camera's and the resize's cache folders: files older than `olderThan` ms go (startup, so a
 * photo being saved right now stays), or everything (Delete data on this phone).
 */
export function clearPhotoCaches(olderThan?: number, now = Date.now()): void {
  if (web) return;
  for (const name of CACHE_DIRS) {
    try {
      const dir = new Directory(Paths.cache, name);
      if (!dir.exists) continue;
      if (olderThan === undefined) {
        dir.delete();
        continue;
      }
      for (const f of dir.list()) {
        if (!(f instanceof File)) continue;
        const at = f.modificationTime ?? null;
        if (at !== null && now - at >= olderThan) f.delete();
      }
    } catch {
      // Nothing there, or it went already.
    }
  }
}

/**
 * Delete data on this phone: every proof photo (the whole proof folder, orphans included) and the
 * camera's and the resize's caches. The preview's photos are in local storage: the store's reset
 * removes them.
 */
export function deleteAllPhotos(): void {
  if (web) return;
  try {
    const dir = proofDir();
    if (dir.exists) dir.delete();
  } catch {
    // Already gone.
  }
  clearPhotoCaches();
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
