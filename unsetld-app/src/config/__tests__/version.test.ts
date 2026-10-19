// One version number: app.json's expo.version is what the App Store build carries (the widget
// extension takes it too), and package.json and AppConfig.version (the You footer) say the same.
// The build number is left to EAS (remote, auto-increment), so app.json sets none.
import { describe, expect, it, vi } from 'vitest';
import appJson from '../../../app.json';
import lockJson from '../../../package-lock.json';
import pkg from '../../../package.json';
import { AppConfig } from '../app';

vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
});
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

describe('app version', () => {
  it('is the same in app.json, package.json, the lockfile and AppConfig', () => {
    const version = appJson.expo.version;
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.version).toBe(version);
    expect(lockJson.version).toBe(version);
    expect(lockJson.packages[''].version).toBe(version);
    expect(AppConfig.version).toBe(version);
  });

  it('leaves the build number to EAS', () => {
    const ios = appJson.expo.ios as { buildNumber?: string };
    expect(ios.buildNumber).toBeUndefined();
  });
});

describe('expo-secure-store plugin', () => {
  it('adds no Face ID usage string (the app never asks for Face ID)', () => {
    const entry = appJson.expo.plugins.find(p => (Array.isArray(p) ? p[0] : p) === 'expo-secure-store');
    expect(Array.isArray(entry)).toBe(true);
    expect((entry as [string, { faceIDPermission?: unknown }])[1].faceIDPermission).toBe(false);
  });
});
