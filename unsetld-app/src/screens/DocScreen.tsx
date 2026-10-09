import { View } from 'react-native';
import { parseDay } from '../core/time';
import { DOCS, type DocId } from '../content';
import type { RootProps } from '../navigation/types';
import { useAccessEnabled } from '../state/store';
import { NavRow, PageTitle, Screen } from '../ui/kit';
import { T } from '../ui/text';
import { color as C, hairline } from '../ui/tokens';

// Sections that only make sense once access is live: the rewards and Access parts
// of "How missions work", and the Terms of Use pointer to the Access terms.
const ACCESS_ONLY: Partial<Record<DocId, Set<string>>> = {
  record: new Set(['Access', 'Rewards', 'Keeping it', 'Limits', "It can't be bought", 'Account']),
  terms: new Set(['Access']),
};

function updated(date?: string): string | null {
  if (!date) return null;
  const d = parseDay(date);
  return `UPDATED ${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' }).toUpperCase()} ${d.getFullYear()}`;
}

/** How missions work, Rewards and access terms, Terms of Use, Privacy Policy. */
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
          <View key={s.h} style={{ marginTop: 32 }}>
            <T v="label" accessibilityRole="header">
              {s.h}
            </T>
            {s.p ? (
              <T v="body" style={{ marginTop: 8 }}>
                {s.p}
              </T>
            ) : null}
            {s.list ? (
              <View style={{ marginTop: 8, borderBottomWidth: hairline, borderBottomColor: C.rule }}>
                {s.list.map(item => (
                  <View key={item} style={{ paddingVertical: 12, borderTopWidth: hairline, borderTopColor: C.rule }}>
                    <T v="body">{item}</T>
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
