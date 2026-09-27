import { G, Circle, Text as SvgText } from 'react-native-svg';
import { C, F } from '../theme';

/** One tappable speaker driver drawn inside an <Svg>: surround, cone and dust cap; selected gets a ring. */
export function DriverNode({ x, y, r, color, selected, muted, label, labelAt = 'below', onPress, name, fontSize = 11 }: {
  x: number; y: number; r: number; color: string; selected: boolean; muted: boolean; label: string;
  labelAt?: 'below' | 'left' | 'right' | 'none'; onPress: () => void; name: string; fontSize?: number;
}) {
  const col = muted ? C.faint : color;
  const lx = labelAt === 'left' ? x - r - 9 : labelAt === 'right' ? x + r + 9 : x;
  const ly = labelAt === 'below' ? y + r + fontSize + 5 : y + fontSize * 0.36;
  const anchor = labelAt === 'left' ? 'end' : labelAt === 'right' ? 'start' : 'middle';
  return (
    <G onPress={onPress} accessibilityLabel={name}>
      <Circle cx={x} cy={y} r={r + 14} fill="#000" opacity={0.001} />
      {selected && <Circle cx={x} cy={y} r={r + 6} fill="none" stroke={C.ink} strokeWidth={2} />}
      <Circle cx={x} cy={y} r={r} fill={C.bg} stroke={col} strokeWidth={2.2} strokeDasharray={muted ? '3 3' : undefined} />
      <Circle cx={x} cy={y} r={r * 0.72} fill={C.panel3} />
      <Circle cx={x} cy={y} r={Math.max(3, r * 0.28)} fill={col} />
      {labelAt !== 'none' && (
        <SvgText x={lx} y={ly} fill={selected ? C.ink : C.ink2} fontSize={fontSize} fontFamily={F.semi} textAnchor={anchor}>{label}</SvgText>
      )}
    </G>
  );
}
