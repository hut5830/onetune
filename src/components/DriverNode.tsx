import { G, Circle, Path, Text as SvgText } from 'react-native-svg';
import { C, F } from '../theme';

/**
 * One tappable speaker driver drawn inside an <Svg>. `cone` is the id of a radial gradient
 * the parent defines for the cone. Selected drivers get a halo and sound-wave arcs.
 */
export function DriverNode({ x, y, r, color, selected, muted, label, labelAt = 'below', waves = 'up', onPress, name, cone, fontSize = 11 }: {
  x: number; y: number; r: number; color: string; selected: boolean; muted: boolean; label: string;
  labelAt?: 'below' | 'left' | 'right' | 'none'; waves?: 'up' | 'left' | 'right'; onPress: () => void; name: string; cone: string; fontSize?: number;
}) {
  const col = muted ? C.faint : color;
  const lx = labelAt === 'left' ? x - r - 8 : labelAt === 'right' ? x + r + 8 : x;
  const ly = labelAt === 'below' ? y + r + fontSize + 4 : y + fontSize * 0.36;
  const anchor = labelAt === 'left' ? 'end' : labelAt === 'right' ? 'start' : 'middle';
  const dir = waves === 'left' ? 180 : waves === 'right' ? 0 : -90;
  const wave = (k: number) => {
    const rr = r + 8 + k * 9, a0 = ((dir - 32) * Math.PI) / 180, a1 = ((dir + 32) * Math.PI) / 180;
    return `M${x + rr * Math.cos(a0)} ${y + rr * Math.sin(a0)}A${rr} ${rr} 0 0 1 ${x + rr * Math.cos(a1)} ${y + rr * Math.sin(a1)}`;
  };
  return (
    <G onPress={onPress} accessibilityLabel={name}>
      <Circle cx={x} cy={y} r={r + 14} fill="#000" opacity={0.001} />
      {selected && <Circle cx={x} cy={y} r={r + 9} fill={col} opacity={0.16} />}
      {selected && [0, 1, 2].map(k => <Path key={k} d={wave(k)} stroke={col} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.75 - k * 0.22} />)}
      <Circle cx={x} cy={y} r={r} fill="#060A14" stroke={col} strokeWidth={selected ? 2.6 : 1.8} strokeDasharray={muted ? '3 3' : undefined} />
      <Circle cx={x} cy={y} r={r * 0.78} fill={`url(#${cone})`} stroke={col} strokeOpacity={0.35} strokeWidth={1} />
      <Circle cx={x} cy={y} r={Math.max(3, r * 0.3)} fill={col} opacity={muted ? 0.4 : 0.95} />
      <Circle cx={x - r * 0.1} cy={y - r * 0.1} r={Math.max(1.2, r * 0.1)} fill="#fff" opacity={0.5} />
      {labelAt !== 'none' && (
        <SvgText x={lx} y={ly} fill={selected ? col : C.ink2} fontSize={fontSize} fontFamily={F.head} textAnchor={anchor} letterSpacing={0.6}>{label}</SvgText>
      )}
    </G>
  );
}
