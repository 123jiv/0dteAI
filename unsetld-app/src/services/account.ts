// Sign in with Apple, only needed to use access. Apple's identity token and
// one-time authorization code go up once, with the sign-in sync; the server
// trades them for its own session token, which is kept in the Keychain and
// sent on every later request (docs/ACCESS.md). On iOS that needs the backend:
// without it sign-in fails. The browser preview simulates sign-in so the flow
// can be tested.
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { IS_PREVIEW } from '../config/app';

const SESSION_KEY = 'unsetld.session';
/** Older builds kept Apple's identity token here and reused it after it expired. Only ever deleted now. */
const OLD_TOKEN_KEY = 'unsetld.apple.identityToken';

export interface SignedIn {
  userId: string;
  email: string | null;
  /** Apple's proof of this sign-in, sent once with the sign-in sync. Null in the preview. */
  apple: { identityToken: string; authorizationCode: string | null } | null;
}

export async function appleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const Apple = await import('expo-apple-authentication');
  return Apple.isAvailableAsync().catch(() => false);
}

/** The email claim in Apple's identity token. Apple puts it in every token but returns `email` only on the first authorization. */
function emailFromToken(token: string): string | null {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '='))) as { email?: unknown };
    return typeof claims.email === 'string' ? claims.email : null;
  } catch {
    return null;
  }
}

/** Returns null if the user cancelled. Throws on other errors. */
export async function signInWithApple(): Promise<SignedIn | null> {
  if (Platform.OS !== 'ios') {
    if (!IS_PREVIEW) return null;
    return { userId: 'preview-user', email: 'k7q2x9mp4w@privaterelay.appleid.com', apple: null };
  }
  const Apple = await import('expo-apple-authentication');
  try {
    const cred = await Apple.signInAsync({ requestedScopes: [Apple.AppleAuthenticationScope.EMAIL] });
    const token = cred.identityToken;
    return {
      userId: cred.user,
      email: cred.email ?? (token ? emailFromToken(token) : null),
      apple: token ? { identityToken: token, authorizationCode: cred.authorizationCode } : null,
    };
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
}

/** The server's session token, or null if there is none. Throws if the Keychain can't be read (e.g. before first unlock). */
export async function sessionToken(): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  return SecureStore.getItemAsync(SESSION_KEY);
}

/** Keeps the session token the server returned at sign-in. False if the Keychain write failed. */
export async function saveSession(token: string): Promise<boolean> {
  if (Platform.OS !== 'ios') return true;
  return SecureStore.setItemAsync(SESSION_KEY, token).then(
    () => true,
    () => false,
  );
}

export async function signOutApple() {
  if (Platform.OS !== 'ios') return;
  await Promise.all([SESSION_KEY, OLD_TOKEN_KEY].map(k => SecureStore.deleteItemAsync(k).catch(() => {})));
}
