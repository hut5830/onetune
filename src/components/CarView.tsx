import { View } from 'react-native';
import { useSvgId } from '../lib/svgId';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Channel } from '../model/tuning';
import { C, alpha } from '../theme';
import { DriverNode } from './DriverNode';

/** Speaker positions on the 300×560 top-down car. */
const POS: Record<string, [number, number]> = {
  TW_L: [76, 190], TW_R: [224, 190], MR_L: [114, 124], MR_R: [186, 124], MID_L: [46, 262], MID_R: [254, 262], CTR: [150, 150],
  RR_L: [48, 408], RR_R: [252, 408], SUB: [150, 508], SUB_L: [118, 506], SUB_R: [182, 506],
};
const RAD: Record<string, number> = { tw: 12, mr: 14, mid: 18, ctr: 13, rr: 17, sub: 21 };

/** Top-down right-hand-drive car with tappable speaker hotspots. */
export function CarView({ channels, selected, onSelect, height = 360 }: { channels: Channel[]; selected: string | null; onSelect: (id: string) => void; height?: number }) {
  const width = (height * 300) / 560;
  const u = useSvgId();
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height} viewBox="0 0 300 560">
        <Defs>
          <LinearGradient id={u + 'edge'} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={C.cyan} stopOpacity={0.9} /><Stop offset="1" stopColor={C.violet} stopOpacity={0.6} /></LinearGradient>
          <LinearGradient id={u + 'body'} x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#0C1326" /><Stop offset="0.5" stopColor="#141E3A" /><Stop offset="1" stopColor="#0C1326" /></LinearGradient>
          <LinearGradient id={u + 'glass'} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={C.cyan} stopOpacity={0.25} /><Stop offset="1" stopColor={C.cyan} stopOpacity={0.02} /></LinearGradient>
          <RadialGradient id={u + 'cone'} cx="45%" cy="40%" r="60%"><Stop offset="0" stopColor="#2A3558" /><Stop offset="1" stopColor="#070B16" /></RadialGradient>
          <RadialGradient id={u + 'aura'} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor={C.violet} stopOpacity={0.3} /><Stop offset="1" stopColor={C.violet} stopOpacity={0} /></RadialGradient>
          <RadialGradient id={u + 'lamp'} cx="50%" cy="0%" r="100%"><Stop offset="0" stopColor={C.cyan} stopOpacity={0.5} /><Stop offset="1" stopColor={C.cyan} stopOpacity={0} /></RadialGradient>
        </Defs>
        <Ellipse cx={150} cy={290} rx={150} ry={280} fill={`url(#${u}aura)`} />
        <Path d="M70 12L20 -40H280L230 12Z" fill={`url(#${u}lamp)`} opacity={0.6} />
        {[[40, 118], [260, 118], [40, 450], [260, 450]].map(([x, y], i) => <Rect key={i} x={x - 9} y={y - 34} width={18} height={68} rx={8} fill="#04070F" stroke={C.line2} />)}
        <Path d="M150 20C215 20 246 42 251 92L259 205 261 440C261 506 234 542 150 542 66 542 39 506 39 440L41 205 49 92C54 42 85 20 150 20Z" fill={`url(#${u}body)`} stroke={`url(#${u}edge)`} strokeWidth={2} />
        <Path d="M80 30Q150 18 220 30" stroke={C.cyan} strokeWidth={3} strokeLinecap="round" opacity={0.8} />
        <Path d="M70 140Q150 118 230 140L240 212Q150 198 60 212Z" fill={`url(#${u}glass)`} stroke={C.cyan} strokeOpacity={0.35} />
        <Path d="M64 222Q150 210 236 222L238 386Q150 398 62 386Z" fill="#070B17" opacity={0.7} />
        <Path d="M66 396Q150 408 234 396L226 452Q150 466 74 452Z" fill={`url(#${u}glass)`} stroke={C.cyan} strokeOpacity={0.3} />
        <Rect x={86} y={232} width={52} height={62} rx={14} fill="#111A33" stroke={C.line2} />
        <Rect x={162} y={232} width={52} height={62} rx={14} fill="#111A33" stroke={alpha(C.cyan, 0.55)} />
        <Circle cx={188} cy={222} r={15} fill="none" stroke={C.ink2} strokeWidth={2.5} opacity={0.6} />
        <Rect x={80} y={316} width={140} height={58} rx={16} fill="#111A33" stroke={C.line2} />
        <G>
          <Circle cx={188} cy={262} r={12} fill={C.cyan} opacity={0.15} />
          <Circle cx={188} cy={262} r={5} fill={C.cyan} />
        </G>
        {channels.map(c => {
          const p = POS[c.id];
          if (!p) return null;
          return <DriverNode cone={u + 'cone'} key={c.id} x={p[0]} y={p[1]} r={RAD[c.kind] ?? 12} color={c.color} selected={c.id === selected} muted={c.mute} label={c.short} labelAt="below" fontSize={17} waves="up" name={c.name} onPress={() => onSelect(c.id)} />;
        })}
      </Svg>
    </View>
  );
}

