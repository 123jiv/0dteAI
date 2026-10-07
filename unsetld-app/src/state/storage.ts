import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

// On web (the browser preview) storage can be blocked, e.g. inside a sandboxed
// iframe or a private window. Fall back to memory so the app still runs.
const memory = new Map<string, string>();

function webStorage(): StateStorage {
  const ls = (() => {
    try {
      const s = globalThis.localStorage;
      const k = '__unsetld_probe__';
      s.setItem(k, '1');
      s.removeItem(k);
      return s;
    } catch {
      return null;
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
      try {
        ls?.setItem(name, value);
      } catch {
        // memory copy is enough
      }
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
