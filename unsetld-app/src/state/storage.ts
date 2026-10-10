import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import type { StateStorage } from 'zustand/middleware';

// On web (the browser preview) storage can be blocked, e.g. inside a sandboxed
// iframe or a private window. Fall back to memory so the app still runs.
const memory = new Map<string, string>();

/** The browser's storage is full (about 5 MB), as Chromium, Safari and Firefox say it. */
export function isQuotaError(e: unknown): boolean {
  const { name, code } = (e ?? {}) as { name?: string; code?: number };
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || code === 22 || code === 1014;
}

let freeRoom: () => boolean = () => false;

/** Browser preview: what frees space when storage is full (state/store gives up the oldest proof photos). */
export function setRoomMaker(fn: () => boolean) {
  freeRoom = fn;
}

/** Frees some space in the browser's storage. False when nothing more can go. */
export function makeRoom(): boolean {
  return freeRoom();
}

/** Browser preview: the last save of the app's state didn't fit, even after making room. */
export const useSaveFailed = create<{ failed: boolean }>(() => ({ failed: false }));

function webStorage(): StateStorage {
  const ls = (() => {
    let s: Storage | undefined;
    try {
      s = globalThis.localStorage;
      const k = '__unsetld_probe__';
      s.setItem(k, '1');
      s.removeItem(k);
      return s;
    } catch (e) {
      // Full to the last byte still holds the app's state (a save makes room); storage that
      // takes nothing at all and holds nothing (an old private window) is blocked.
      return s && isQuotaError(e) && s.length > 0 ? s : null;
    }
  })();
  return {
    getItem: name => {
      try {
        return ls ? ls.getItem(name) : memory.get(name) ?? null;
      } catch {
        return memory.get(name) ?? null;
      }
    },
    setItem: (name, value) => {
      memory.set(name, value);
      if (!ls) return;
      // Full: proof photos make room, oldest first, until the state fits.
      for (;;) {
        try {
          ls.setItem(name, value);
          if (useSaveFailed.getState().failed) useSaveFailed.setState({ failed: false });
          return;
        } catch (e) {
          // Blocked some other way: the memory copy is enough.
          if (!isQuotaError(e)) return;
          if (!makeRoom()) break;
        }
      }
      useSaveFailed.setState({ failed: true });
    },
    removeItem: name => {
      memory.delete(name);
      try {
        ls?.removeItem(name);
      } catch {
        // ignore
      }
    },
  };
}

export const appStorage: StateStorage =
  Platform.OS === 'web'
    ? webStorage()
    : {
        getItem: name => AsyncStorage.getItem(name),
        setItem: (name, value) => AsyncStorage.setItem(name, value),
        removeItem: name => AsyncStorage.removeItem(name),
      };
