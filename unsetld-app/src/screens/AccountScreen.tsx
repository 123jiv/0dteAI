import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { IS_PREVIEW } from '../config/app';
import { sortedDays } from '../core/record';
import { COPY } from '../content/copy';
import type { RootProps } from '../navigation/types';
import { appleSignInAvailable, signInWithApple, signOutApple } from '../services/account';
import { syncRecord } from '../services/access';
import { useApp } from '../state/store';
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
  const [error, setError] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') appleSignInAvailable().then(setAvailable);
  }, []);

  const signIn = async () => {
    setError(false);
    try {
      const r = await signInWithApple();
      if (!r) return;
      useApp.getState().signIn({ userId: r.userId, email: r.email });
      // First sign-in: hold the user's place with the days already verified on this phone.
      const rec = useApp.getState().record;
      syncRecord(sortedDays(rec).filter(d => rec.days[d].verified), Object.keys(rec.proofs).sort()).catch(() => {});
      navigation.goBack();
    } catch {
      setError(true);
    }
  };

  return (
    <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
      <PageTitle title={A.title} body={A.body} />
      {account.userId ? (
        <View style={{ marginTop: 32, gap: 4 }}>
          <T v="body" color={C.stone}>
            {A.signedIn(account.email ?? 'Apple ID')}
          </T>
          <TextButton
            title={A.signOut}
            align="left"
            onPress={() => {
              signOutApple();
              useApp.getState().signOut();
            }}
          />
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
          {error ? (
            <T v="note" color={C.stone}>
              {A.error}
            </T>
          ) : null}
        </View>
      )}
    </Screen>
  );
}
