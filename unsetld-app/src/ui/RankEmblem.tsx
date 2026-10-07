import Svg, { Circle, Path, Polygon } from 'react-native-svg';

interface Props {
  rank: number;
  size?: number;
  color: string;
  dim?: string;
  locked?: boolean;
}

// Five emblems, one per rank, drawn in the brand's minimal line style:
// SETTLED (empty ring) → HUNGRY (1 chevron) → DIALED IN (2) → RELENTLESS (3 + bar) → UNSETLD (crest).
export function RankEmblem({ rank, size = 64, color, dim = '#2a2a2a', locked }: Props) {
  const c = locked ? dim : color;
  const sw = 2.2;
  const chevron = (y: number) => <Path key={y} d={`M18 ${y} 32 ${y - 8} 46 ${y}`} stroke={c} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityElementsHidden importantForAccessibility="no">
      {rank < 4 ? (
        <Circle cx={32} cy={32} r={29} stroke={c} strokeWidth={1.4} fill="none" opacity={rank === 0 ? 0.6 : 1} />
      ) : (
        <Polygon points="32,3 58,15 58,40 32,61 6,40 6,15" stroke={c} strokeWidth={1.6} fill="none" />
      )}
      {rank === 0 && <Circle cx={32} cy={32} r={4} fill={c} opacity={0.6} />}
      {rank === 1 && chevron(36)}
      {rank === 2 && [chevron(30), chevron(40)]}
      {rank === 3 && [chevron(26), chevron(35), chevron(44), <Path key="bar" d="M20 50h24" stroke={c} strokeWidth={sw} strokeLinecap="round" />]}
      {rank >= 4 && [
        chevron(24),
        chevron(33),
        chevron(42),
        <Path key="star" d="M32 47l2 4 4.4.6-3.2 3 .8 4.4-4-2.1-4 2.1.8-4.4-3.2-3 4.4-.6z" fill={c} />,
      ]}
    </Svg>
  );
}
