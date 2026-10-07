import { type ReactNode } from 'react';
import { Platform, Text, View, useWindowDimensions } from 'react-native';

// Browser preview only: on a wide screen, show the app inside a phone-sized
// frame. On a phone (or in the native app) it fills the screen as normal.
export function PhoneFrame({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  if (Platform.OS !== 'web' || width < 560) return <View style={{ flex: 1 }}>{children}</View>;
  const frameH = Math.min(860, height - 48);
  return (
    <View style={{ flex: 1, backgroundColor: '#050505', alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: Math.round(frameH * 0.465),
          height: frameH,
          borderRadius: 44,
          overflow: 'hidden',
          borderWidth: 10,
          borderColor: '#1b1b1b',
          backgroundColor: '#0a0a0a',
        }}>
        {children}
      </View>
      <Text style={{ color: '#555', fontSize: 12, marginTop: 12, fontFamily: 'Inter_400Regular' }}>
        UNSETLD · browser preview · widgets, notifications and purchases are simulated
      </Text>
    </View>
  );
}
