import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Channel } from '../model/tuning';
import { C } from '../theme';
import { DriverNode } from './DriverNode';

/** Speaker positions on the 300×560 top-down car. */
const POS: Record<string, [number, number]> = {
  TW_L: [76, 190], TW_R: [224, 190], MR_L: [114, 124], MR_R: [186, 124], MID_L: [46, 262], MID_R: [254, 262], CTR: [150, 150],
  RR_L: [48, 408], RR_R: [252, 408], SUB: [150, 508], SUB_L: [118, 506], SUB_R: [182, 506],
};
const RAD: Record<string, number> = { tw: 12, mr: 14, mid: 18, ctr: 13, rr: 17, sub: 21 };

/** Top-down right-hand-drive car with tappable speaker hotspots. */
export function CarView({ channels, selected, onSelect, height = 380 }: { channels: Channel[]; selected: string | null; onSelect: (id: string) => void; height?: number }) {
  const width = (height * 300) / 560;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height} viewBox="0 0 300 560">
        {[[40, 118], [260, 118], [40, 450], [260, 450]].map(([x, y], i) => <Rect key={i} x={x - 9} y={y - 34} width={18} height={68} rx={8} fill={C.panel3} />)}
        <Path d="M150 20C215 20 246 42 251 92L259 205 261 440C261 506 234 542 150 542 66 542 39 506 39 440L41 205 49 92C54 42 85 20 150 20Z" fill={C.panel2} stroke={C.line2} strokeWidth={2} />
        <Path d="M70 140Q150 118 230 140L240 212Q150 198 60 212Z" fill={C.panel3} />
        <Path d="M66 396Q150 408 234 396L226 452Q150 466 74 452Z" fill={C.panel3} />
        <Rect x={86} y={232} width={52} height={62} rx={14} fill={C.panel} stroke={C.line2} />
        <Rect x={162} y={232} width={52} height={62} rx={14} fill={C.panel} stroke={C.line2} />
        <Circle cx={188} cy={222} r={15} fill="none" stroke={C.muted} strokeWidth={2.5} />
        <Rect x={80} y={316} width={140} height={58} rx={16} fill={C.panel} stroke={C.line2} />
        <Circle cx={188} cy={262} r={6} fill={C.accent} />
        {channels.map(c => {
          const p = POS[c.id];
          if (!p) return null;
          return <DriverNode key={c.id} x={p[0]} y={p[1]} r={RAD[c.kind] ?? 12} color={c.color} selected={c.id === selected} muted={c.mute} label={c.short} labelAt="below" fontSize={17} name={c.name} onPress={() => onSelect(c.id)} />;
        })}
      </Svg>
    </View>
  );
}
