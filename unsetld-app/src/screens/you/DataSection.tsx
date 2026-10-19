import { View } from 'react-native';
import { DATA } from '../../content/copy/data';
import { Card, LinkRow, SectionLabel } from '../../ui/blocks';
import { GAP } from '../../ui/tokens';

/**
 * You › YOUR DATA, between ACCOUNT and HELP, in every build: one row to Delete data on this phone
 * (screens/you/DeleteDataScreen). Drawn like You's other groups: a kicker, then one card.
 */
export function DataSection({ onOpen }: { onOpen: () => void }) {
  return (
    <View style={{ marginTop: GAP.section - 4 }}>
      <SectionLabel>{DATA.section}</SectionLabel>
      <Card padding={0} style={{ paddingHorizontal: 18, paddingVertical: 4 }}>
        <LinkRow title={DATA.row} detail={DATA.rowDetail} onPress={onOpen} />
      </Card>
    </View>
  );
}
