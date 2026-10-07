import { View } from 'react-native';
import { LEGAL } from '../content';
import type { RootProps } from '../navigation/types';
import { Header, Screen, T } from '../ui/components';
import { space } from '../ui/theme';

export function LegalScreen({ navigation, route }: RootProps<'Legal'>) {
  const doc = LEGAL[route.params.doc];
  return (
    <Screen scroll>
      <Header title={doc.title} onBack={() => navigation.goBack()} />
      <T variant="caption" style={{ marginTop: space.sm }}>{`Updated ${doc.updated}`}</T>
      {doc.sections.map(s => (
        <View key={s.h} style={{ marginTop: space.xl }}>
          <T variant="h2">{s.h}</T>
          <T variant="muted" style={{ marginTop: space.sm }}>
            {s.p}
          </T>
        </View>
      ))}
    </Screen>
  );
}
