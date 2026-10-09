// Proof photo paths on iOS. expo-file-system, the image modules and
// react-native are replaced by a small in-memory file system, so this runs in
// node; it checks where proofImage, deletePhoto and savePhoto look, not the
// native module itself.
import { beforeEach, describe, expect, it, vi } from 'vitest';
// vi.hoisted and vi.mock below run before this import.
import { deletePhoto, proofImage, savePhoto } from '../proof';

const { files, DOCUMENTS } = vi.hoisted(() => ({
  files: new Set<string>(),
  // This install's Documents folder (the container path after an update).
  DOCUMENTS: 'file:///var/mobile/Containers/Data/Application/NEW/Documents/',
}));

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-image-picker', () => ({}));
vi.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => ({ resize: () => ({ renderAsync: async () => ({ saveAsync: async () => ({ uri: 'file:///tmp/manipulated.jpg', base64: 'abc' }) }) }) }),
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
    get exists() {
      return files.has(this.uri);
    }
    delete() {
      if (!files.delete(this.uri)) throw new Error('missing');
    }
    async copy(dest: File) {
      files.add(dest.uri);
    }
  }
  class Directory {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = `${join(parts).replace(/\/+$/, '')}/`;
    }
    create() {}
  }
  return { File, Directory, Paths: { document: new Directory(DOCUMENTS) } };
});

const HERE = `${DOCUMENTS}proof/`;
// The same folder before an app update or a restore moved the container.
const BEFORE = 'file:///var/mobile/Containers/Data/Application/OLD/Documents/proof/';

describe('proof photos after the app container moves', () => {
  beforeEach(() => files.clear());

  it('finds a photo stored under the old path by its file name, without changing what is stored', () => {
    files.add(`${HERE}2026-10-09-focus-lock-in-25-after.jpg`);
    expect(proofImage(`${BEFORE}2026-10-09-focus-lock-in-25-after.jpg`)).toBe(`${HERE}2026-10-09-focus-lock-in-25-after.jpg`);
    expect(proofImage(`${HERE}2026-10-09-focus-lock-in-25-after.jpg`)).toBe(`${HERE}2026-10-09-focus-lock-in-25-after.jpg`);
    // A 2.x proof (named by its day) is found the same way.
    files.add(`${HERE}2026-09-01.jpg`);
    expect(proofImage(`${BEFORE}2026-09-01.jpg`)).toBe(`${HERE}2026-09-01.jpg`);
  });

  it('is null when the photo is on neither path, or the path is not a proof folder', () => {
    expect(proofImage(`${BEFORE}gone.jpg`)).toBeNull();
    expect(proofImage(`${HERE}gone.jpg`)).toBeNull();
    files.add(`${HERE}x.jpg`);
    expect(proofImage('file:///var/mobile/elsewhere/x.jpg')).toBeNull();
    expect(proofImage('')).toBeNull();
  });

  it('deletes the photo wherever this install keeps it, and a second delete is fine', () => {
    files.add(`${HERE}a-after.jpg`);
    deletePhoto(`${BEFORE}a-after.jpg`);
    expect(files.has(`${HERE}a-after.jpg`)).toBe(false);
    expect(() => deletePhoto(`${BEFORE}a-after.jpg`)).not.toThrow();
  });

  it('never saves over an existing file, so deleting the photo a retake replaced keeps the new one', async () => {
    // A before photo saved ahead of an update, still waiting under its old path.
    files.add(`${HERE}2026-10-09-reset-desk-before.jpg`);
    const retake = await savePhoto('file:///tmp/camera.jpg', '2026-10-09-reset-desk-before');
    expect(retake.uri).toBe(`${HERE}2026-10-09-reset-desk-before-2.jpg`);
    deletePhoto(`${BEFORE}2026-10-09-reset-desk-before.jpg`);
    expect([...files]).toEqual([`${HERE}2026-10-09-reset-desk-before-2.jpg`]);
    // Once that name is free again, it's used again.
    const next = await savePhoto('file:///tmp/camera.jpg', '2026-10-09-reset-desk-before');
    expect(next.uri).toBe(`${HERE}2026-10-09-reset-desk-before.jpg`);
  });
});
