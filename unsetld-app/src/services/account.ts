// Sign in with Apple, only needed to use access. Without the backend (or in
// the browser preview) sign-in is simulated so the flow can be tested.
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { IS_PREVIEW } from '../config/app';

const TOKEN_KEY = 'unsetld.apple.identityToken';

export interface SignedIn {
  userId: string;
  email: string | null;
}

export async function appleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const Apple = await import('expo-apple-authentication');
  return Apple.isAvailableAsync().catch(() => false);
}

/** Returns null if the user cancelled. Throws on other errors. */
export async function signInWithApple(): Promise<SignedIn | null> {
  if (Platform.OS !== 'ios') {
    if (!IS_PREVIEW) return null;
    return { userId: 'preview-user', email: 'k7q2x9mp4w@privaterelay.appleid.com' };
  }
  const Apple = await import('expo-apple-authentication');
  try {
    const cred = await Apple.signInAsync({ requestedScopes: [Apple.AppleAuthenticationScope.EMAIL] });
    if (cred.identityToken) await SecureStore.setItemAsync(TOKEN_KEY, cred.identityToken).catch(() => {});
    return { userId: cred.user, email: cred.email };
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
}

export async function identityToken(): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  return SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
}

export async function signOutApple() {
  if (Platform.OS === 'ios') await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
}
