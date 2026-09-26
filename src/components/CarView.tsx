import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Channel } from '../model/tuning';
import { clamp } from '../lib/format';
import { C } from '../theme';

/** Top-down right-hand-drive car with tappable speaker hotspots. */
export function CarView({ channels, selected, onSelect, height = 380 }: { channels: Channel[]; selected: string | null; onSelect: (id: string) => void; height?: number }) {
  const width = (height * 300) / 560;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height} viewBox="0 0 300 560">
        <Defs>
          <LinearGradient id="body" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={C.panel2} /><Stop offset="0.5" stopColor={C.panel} /><Stop offset="1" stopColor={C.panel2} />
          </LinearGradient>
          <LinearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.glass} /><Stop offset="1" stopColor={C.bg} />
          </LinearGradient>
        </Defs>
        <Ellipse cx={150} cy={300} rx={138} ry={270} fill={C.bg2} opacity={0.55} />
        <Path d="M150 20C215 20 246 42 251 92L259 205 261 440C261 506 234 542 150 542 66 542 39 506 39 440L41 205 49 92C54 42 85 20 150 20Z" fill="url(#body)" stroke={C.line} strokeWidth={2} />
        <Path d="M70 140Q150 118 230 140L240 212Q150 198 60 212Z" fill="url(#glass)" stroke={C.line} />
        <Path d="M64 222Q150 210 236 222L238 386Q150 398 62 386Z" fill={C.bg} opacity={0.55} />
        <Path d="M66 396Q150 408 234 396L226 452Q150 466 74 452Z" fill="url(#glass)" stroke={C.line} />
        <Rect x={86} y={232} width={52} height={62} rx={12} fill={C.panel2} stroke={C.line} />
        <Rect x={162} y={232} width={52} height={62} rx={12} fill={C.panel2} stroke={C.line} />
        <Circle cx={188} cy={222} r={16} fill="none" stroke={C.muted} strokeWidth={3} />
        <Rect x={80} y={316} width={140} height={58} rx={14} fill={C.panel2} stroke={C.line} />
        <Circle cx={188} cy={262} r={5} fill={C.amber} />
        {channels.map(c => {
          const on = c.id === selected;
          const color = c.mute ? C.muted : c.color;
          return (
            <G key={c.id} onPress={() => onSelect(c.id)} accessibilityLabel={c.name}>
              <Circle cx={c.x} cy={c.y} r={24} fill="transparent" />
              <Circle cx={c.x} cy={c.y} r={clamp(16 + c.gain * 0.8, 10, 22)} fill="none" stroke={on ? C.amber : color} strokeWidth={on ? 3 : 2} strokeDasharray={c.mute ? '3 3' : undefined} />
              <Circle cx={c.x} cy={c.y} r={8} fill={color} stroke={C.bg} strokeWidth={2} />
              <SvgText x={c.x} y={c.y + 32} fill={C.bg} fontSize={12} fontWeight="600" textAnchor="middle" stroke={C.bg} strokeWidth={3}>{c.short}</SvgText>
              <SvgText x={c.x} y={c.y + 32} fill={C.ink} fontSize={12} fontWeight="600" textAnchor="middle">{c.short}</SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
