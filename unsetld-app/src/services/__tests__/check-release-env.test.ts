// The EAS build guard (scripts/check-release-env.mjs, the eas-build-pre-install hook): a production
// iPhone build without an App Store RevenueCat key stops before it can reach the App Store.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error: a plain node script, no types.
import { checkReleaseEnv } from '../../../scripts/check-release-env.mjs';

const ROOT = join(__dirname, '..', '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'check-release-env.mjs');

type Env = Record<string, string | undefined>;
const check = (env: Env) => (checkReleaseEnv as (env: Env) => { ok: boolean; message: string })(env);

describe('check-release-env', () => {
  it.each([
    [{}, true],
    [{ EAS_BUILD_PROFILE: 'development' }, true],
    [{ EAS_BUILD_PROFILE: 'preview' }, true],
    [{ EAS_BUILD_PROFILE: 'preview', EXPO_PUBLIC_REVENUECAT_IOS_KEY: 'test_x' }, true],
    [{ EAS_BUILD_PROFILE: 'production' }, false],
    [{ EAS_BUILD_PROFILE: 'production', EXPO_PUBLIC_REVENUECAT_IOS_KEY: '' }, false],
    [{ EAS_BUILD_PROFILE: 'production', EXPO_PUBLIC_REVENUECAT_IOS_KEY: '   ' }, false],
    [{ EAS_BUILD_PROFILE: 'production', EXPO_PUBLIC_REVENUECAT_IOS_KEY: 'test_abc' }, false],
    [{ EAS_BUILD_PROFILE: 'production', EAS_BUILD_PLATFORM: 'ios', EXPO_PUBLIC_REVENUECAT_IOS_KEY: 'goog_abc' }, false],
    [{ EAS_BUILD_PROFILE: 'production', EAS_BUILD_PLATFORM: 'ios', EXPO_PUBLIC_REVENUECAT_IOS_KEY: 'appl_abc' }, true],
    [{ EAS_BUILD_PROFILE: 'production', EAS_BUILD_PLATFORM: 'android' }, true],
  ] as [Env, boolean][])('%o → ok %s', (env, ok) => {
    expect(check(env).ok).toBe(ok);
  });

  it('the failing message names the variable and where to set it', () => {
    const { message } = check({ EAS_BUILD_PROFILE: 'production' });
    expect(message).toContain('EXPO_PUBLIC_REVENUECAT_IOS_KEY');
    expect(message).toContain('EAS environment variable');
    expect(message).not.toMatch(/!/);
  });

  it('exits non-zero for a keyless production build and zero otherwise', () => {
    const run = (env: Env) => spawnSync(process.execPath, [SCRIPT], { env: { PATH: process.env.PATH, ...env }, encoding: 'utf8' });
    expect(run({ EAS_BUILD_PROFILE: 'production' }).status).toBe(1);
    expect(run({ EAS_BUILD_PROFILE: 'production', EXPO_PUBLIC_REVENUECAT_IOS_KEY: 'appl_abc' }).status).toBe(0);
    expect(run({}).status).toBe(0);
  });

  it('runs as the eas-build-pre-install hook', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts['eas-build-pre-install']).toBe('node scripts/check-release-env.mjs');
  });

  it('each eas.json build profile loads its own EAS environment, so a production build sees the production key', () => {
    const eas = JSON.parse(readFileSync(join(ROOT, 'eas.json'), 'utf8')) as { build: Record<string, { environment?: string }> };
    expect(eas.build.production.environment).toBe('production');
    expect(eas.build.preview.environment).toBe('preview');
    expect(eas.build.development.environment).toBe('development');
  });
});
