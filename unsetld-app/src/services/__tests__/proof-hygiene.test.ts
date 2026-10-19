// Photo hygiene on iOS: the proof folder's copy is the only one kept. Saving a proof deletes the
// camera's full-size original and the resized copy from their cache folders; startup clears what's
// left there (past the grace period) and deletes the proof files the sweep names; Delete data on
// this phone takes the whole proof folder and both caches. expo-file-system is a small in-memory
// file system here.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPhotoCaches, deleteAllPhotos, deleteProofFiles, listProofFiles, savePhoto } from '../proof';

const fs = vi.hoisted(() => ({
  files: new Map<string, number>(),
  DOCUMENTS: 'file:///var/mobile/Containers/Data/Application/APP/Documents/',
  CACHES: 'file:///var/mobile/Containers/Data/Application/APP/Library/Caches/',
}));

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-image-picker', () => ({}));
vi.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => ({
      resize: () => ({
        renderAsync: async () => ({
          saveAsync: async () => {
            const uri = `${fs.CACHES}ImageManipulator/resized.jpg`;
            fs.files.set(uri, Date.now());
            return { uri, base64: 'abc' };
          },
        }),
      }),
    }),
  },
}));
vi.mock('expo-file-system', () => {
  const join = (parts: unknown[]) =>
    parts
      .map(p => (typeof p === 'string' ? p : (p as { uri: string }).uri))
      .reduce((a, b) => (a ? `${a.replace(/\/+$/, '')}/${b.replace(/^\/+/, '')}` : b), '');
  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get name() {
      return this.uri.split('/').pop() ?? '';
    }
    get exists() {
      return fs.files.has(this.uri);
    }
    get modificationTime() {
      return fs.files.get(this.uri) ?? null;
    }
    delete() {
      if (!fs.files.delete(this.uri)) throw new Error('missing');
    }
    async copy(dest: File) {
      fs.files.set(dest.uri, Date.now());
    }
  }
  class Directory {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = `${join(parts).replace(/\/+$/, '')}/`;
    }
    get exists() {
      return [...fs.files.keys()].some(k => k.startsWith(this.uri));
    }
    create() {}
    list() {
      return [...fs.files.keys()].filter(k => k.startsWith(this.uri) && !k.slice(this.uri.length).includes('/')).map(k => new File(k));
    }
    delete() {
      for (const k of [...fs.files.keys()]) if (k.startsWith(this.uri)) fs.files.delete(k);
    }
  }
  return { File, Directory, Paths: { document: new Directory(fs.DOCUMENTS), cache: new Directory(fs.CACHES) } };
});

const PROOF = `${fs.DOCUMENTS}proof/`;
const PICKER = `${fs.CACHES}ImagePicker/`;
const RESIZED = `${fs.CACHES}ImageManipulator/`;
const NOW = new Date(2026, 9, 19, 12, 0, 0).getTime();

describe('photo hygiene', () => {
  beforeEach(() => {
    fs.files.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  it('keeps only the proof folder copy: the camera original and the resized copy go', async () => {
    fs.files.set(`${PICKER}camera.jpg`, NOW);
    const saved = await savePhoto(`${PICKER}camera.jpg`, '2026-10-19-D1-single');
    expect(saved.uri).toBe(`${PROOF}2026-10-19-D1-single.jpg`);
    expect([...fs.files.keys()]).toEqual([`${PROOF}2026-10-19-D1-single.jpg`]);
  });

  it('never deletes a file outside the two cache folders', async () => {
    fs.files.set('file:///var/mobile/elsewhere/photo.jpg', NOW);
    await savePhoto('file:///var/mobile/elsewhere/photo.jpg', '2026-10-19-D1-single');
    expect(fs.files.has('file:///var/mobile/elsewhere/photo.jpg')).toBe(true);
  });

  it('lists the proof folder with each file time, and deletes by name', () => {
    fs.files.set(`${PROOF}a.jpg`, NOW - 1000);
    fs.files.set(`${PROOF}b.jpg`, NOW - 2000);
    fs.files.set(`${PICKER}c.jpg`, NOW);
    expect(listProofFiles()).toEqual([
      { name: 'a.jpg', modified: NOW - 1000 },
      { name: 'b.jpg', modified: NOW - 2000 },
    ]);
    deleteProofFiles(['a.jpg', 'missing.jpg']);
    expect(listProofFiles().map(f => f.name)).toEqual(['b.jpg']);
  });

  it('clears the caches of files past the grace period at startup, and all of them on delete', () => {
    fs.files.set(`${PICKER}old.jpg`, NOW - 3600_000);
    fs.files.set(`${PICKER}new.jpg`, NOW - 1000);
    fs.files.set(`${RESIZED}old.jpg`, NOW - 3600_000);
    fs.files.set(`${PROOF}kept.jpg`, NOW - 3600_000);
    clearPhotoCaches(10 * 60_000);
    expect([...fs.files.keys()].sort()).toEqual([`${PROOF}kept.jpg`, `${PICKER}new.jpg`].sort());

    deleteAllPhotos();
    expect([...fs.files.keys()]).toEqual([]);
  });
});
