import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { IS_PREVIEW } from '../config/app';
import { provenCounts } from '../core/points';
import { sortedDays } from '../core/record';
import { POINTS } from '../content';
import { COPY } from '../content/copy';
import type { RootProps } from '../navigation/types';
import { appleSignInAvailable, signInWithApple, signOutApple } from '../services/account';
import { deleteAccount, syncRecord } from '../services/access';
import { useApp } from '../state/store';
import { showDialog } from '../ui/actions';
import { NavRow, PageTitle, Screen, TextButton } from '../ui/kit';
import { T } from '../ui/text';
import { color as C } from '../ui/tokens';

const A = COPY.account;

/** Stand-in for Apple's button in the browser preview, drawn to Apple's white style. */
function PreviewAppleButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={A.previewButton}
      onPress={onPress}
      style={({ pressed }) => ({ height: 54, borderRadius: 2, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, opacity: pressed ? 0.85 : 1 })}>
      <Svg width={16} height={19} viewBox="0 0 814 1000">
        <Path
          fill="#000"
          d="M788 341c-6 4-108 62-108 190 0 148 130 200 134 201-1 3-21 72-69 142-43 62-88 124-156 124s-86-40-165-40c-77 0-104 41-167 41s-106-57-156-128C43 790 0 671 0 557 0 375 118 279 235 279c62 0 114 41 153 41 37 0 95-43 166-43 27 0 124 2 188 64zM554 171c29-35 50-83 50-131 0-7-1-14-2-19-48 2-104 32-138 71-27 30-52 79-52 127 0 8 1 15 2 18 3 1 9 1 14 1 43 0 97-29 126-67z"
        />
      </Svg>
      <Text style={{ fontSize: 19, fontWeight: '500', color: '#000', fontFamily: "-apple-system, 'SF Pro Text', 'Helvetica Neue', Inter_500Medium, sans-serif" }}>
        {A.previewButton}
      </Text>
    </Pressable>
  );
}

/** Account: Sign in with Apple, only to use access. */
export function AccountScreen({ navigation }: RootProps<'Account'>) {
  const account = useApp(s => s.account);
  const [available, setAvailable] = useState(Platform.OS !== 'ios');
  // 'delete-sign-in': a delete found the session gone, so the phone signed out with the account maybe still there.
  const [error, setError] = useState<'sign-in' | 'delete' | 'delete-sign-in' | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') appleSignInAvailable().then(setAvailable);
  }, []);

  const signIn = async () => {
    if (busy) return;
    const deleting = error === 'delete-sign-in'; // signing in to finish a delete: stay here
    setError(null);
    setBusy(true);
    const r = await signInWithApple().catch(() => undefined); // null: cancelled; undefined: failed
    // The server trades Apple's sign-in for its session and holds the user's place
    // with the days already verified on this phone. Only then is the phone signed in.
    const rec = useApp.getState().record;
    const synced = r ? await syncRecord(r.apple, sortedDays(rec).filter(d => rec.days[d].verified), provenCounts(rec, POINTS)) : false;
    setBusy(false);
    if (r === null) return setError(deleting ? 'delete-sign-in' : null);
    if (!r || !synced) return setError('sign-in');
    useApp.getState().signIn({ userId: r.userId, email: r.email });
    if (!deleting) navigation.goBack();
  };

  const removeAccount = async () => {
    setError(null);
    setBusy(true);
    const r = await deleteAccount();
    setBusy(false);
    if (r !== 'deleted') setError(r === 'needs-account' ? 'delete-sign-in' : 'delete');
  };

  const confirmDelete = () => {
    if (busy) return;
    showDialog(A.deleteTitle, A.deleteBody, [
      { label: A.deleteNo, cancel: true },
      { label: A.deleteYes, destructive: true, onPress: removeAccount },
    ]);
  };

  return (
    <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
      <PageTitle title={A.title} body={A.body} />
      {account.userId ? (
        <View style={{ marginTop: 32, gap: 4 }}>
          <T v="body" color={C.stone}>
            {account.email ? A.signedIn(account.email) : A.signedInApple}
          </T>
          <TextButton
            title={A.signOut}
            align="left"
            onPress={() => {
              signOutApple();
              useApp.getState().signOut();
            }}
          />
          <TextButton title={A.deleteAccount} align="left" onPress={confirmDelete} style={{ marginTop: 24 }} />
          {error === 'delete' ? (
            <T v="note" color={C.stone}>
              {A.deleteError}
            </T>
          ) : null}
        </View>
      ) : (
        <View style={{ marginTop: 32, gap: 12 }}>
          <T v="note" color={C.stone}>
            {A.legal}
          </T>
          {Platform.OS === 'ios' && available ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={2}
              style={{ height: 54 }}
              onPress={signIn}
            />
          ) : IS_PREVIEW ? (
            <>
              <PreviewAppleButton onPress={signIn} />
              <T v="mono.s" align="center">
                {A.previewNote}
              </T>
            </>
          ) : null}
          {error === 'sign-in' || error === 'delete-sign-in' ? (
            <T v="note" color={C.stone}>
              {error === 'sign-in' ? A.error : A.deleteSignIn}
            </T>
          ) : null}
        </View>
      )}
    </Screen>
  );
}
