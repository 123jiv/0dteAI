import { View } from 'react-native';
import { parseDay } from '../core/time';
import { DOCS, type DocId } from '../content';
import type { RootProps } from '../navigation/types';
import { useAccessEnabled } from '../state/store';
import { NavRow, PageTitle, Screen } from '../ui/kit';
import { T } from '../ui/text';
import { color as C, GAP } from '../ui/tokens';

// Sections that only make sense once access is live: the Rewards and UNSETLD status parts
// of "How missions work", and the Terms of Use pointer to the Access terms.
const ACCESS_ONLY: Partial<Record<DocId, Set<string>>> = {
  record: new Set(['Access', 'Rewards', 'UNSETLD status', 'Keeping it', 'Limits', "It can't be bought", 'Account']),
  terms: new Set(['Access']),
};

function updated(date?: string): string | null {
  if (!date) return null;
  const d = parseDay(date);
  return `UPDATED ${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' }).toUpperCase()} ${d.getFullYear()}`;
}

/** How missions work, Rewards and status terms, Terms of Use, Privacy Policy. */
export function DocScreen({ navigation, route }: RootProps<'Doc' | 'DocSheet'>) {
  const doc = DOCS[route.params.id];
  const accessEnabled = useAccessEnabled();
  const sections = doc.sections.filter(s => accessEnabled || !ACCESS_ONLY[route.params.id]?.has(s.h));
  const sheet = route.name === 'DocSheet';
  return (
    <Screen nav={sheet ? <NavRow onClose={() => navigation.goBack()} /> : <NavRow onBack={() => navigation.goBack()} />}>
      <PageTitle title={doc.title} />
      {updated(doc.updated) ? (
        <T v="mono" style={{ marginTop: 12 }}>
          {updated(doc.updated)!}
        </T>
      ) : null}
      <View style={{ marginTop: 8 }}>
        {sections.map(s => (
          <View key={s.h} style={{ marginTop: GAP.block + 4 }}>
            <T v="kicker" color={C.stone} accessibilityRole="header">
              {s.h}
            </T>
            {s.p ? (
              <T v="body" color={C.muted} style={{ marginTop: 10 }}>
                {s.p}
              </T>
            ) : null}
            {/* A list is spaced, not ruled: a small mark before each item. */}
            {s.list ? (
              <View style={{ marginTop: 12, gap: 10 }}>
                {s.list.map(item => (
                  <View key={item} style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ width: 4, height: 4, marginTop: 9, backgroundColor: C.stone }} />
                    <T v="body" color={C.muted} style={{ flex: 1 }}>
                      {item}
                    </T>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </Screen>
  );
}
