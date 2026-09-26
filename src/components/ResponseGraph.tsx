import { memo, useMemo, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Line, Path, Text as SvgText, ClipPath, Defs, Rect, G } from 'react-native-svg';
import { Channel } from '../model/tuning';
import { responseDb } from '../lib/dsp';
import { clamp, fmtF } from '../lib/format';
import { C } from '../theme';

const N = 120;
const FREQS = Array.from({ length: N }, (_, i) => 20 * Math.pow(1000, i / (N - 1)));
const GRID_F = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
const GRID_DB = [12, 6, 0, -6, -12, -18, -24];

function ResponseGraphImpl({ channels, selected, height = 170, top = 12 }: { channels: Channel[]; selected: string | null; height?: number; top?: number }) {
  const [w, setW] = useState(0);
  const bot = -24, pad = { l: 30, r: 8, t: 8, b: 18 };
  const fx = (f: number) => pad.l + (Math.log10(f / 20) / 3) * (w - pad.l - pad.r);
  const fy = (d: number) => pad.t + ((top - clamp(d, bot - 6, top + 6)) / (top - bot)) * (height - pad.t - pad.b);

  const paths = useMemo(() => {
    if (!w) return [];
    return channels.filter(c => !c.mute || c.id === selected).map(c => {
      const pts = FREQS.map(f => `${fx(f).toFixed(1)},${fy(responseDb(c, f)).toFixed(1)}`);
      return { id: c.id, color: c.color, d: 'M' + pts.join('L'), fill: `M${fx(20)},${height - pad.b}L${pts.join('L')}L${fx(20000)},${height - pad.b}Z` };
    });
  }, [channels, selected, w, height]);

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ height, backgroundColor: C.bg, borderRadius: 14, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}
      accessible accessibilityLabel="กราฟตอบสนองความถี่">
      {w > 0 && (
        <Svg width={w} height={height}>
          <Defs><ClipPath id="plot"><Rect x={pad.l} y={pad.t} width={w - pad.l - pad.r} height={height - pad.t - pad.b} /></ClipPath></Defs>
          {GRID_F.map(f => (
            <G key={f}>
              <Line x1={fx(f)} x2={fx(f)} y1={pad.t} y2={height - pad.b} stroke={C.line} strokeWidth={1} />
              <SvgText x={fx(f)} y={height - 5} fill={C.muted} fontSize={9} textAnchor="middle">{fmtF(f)}</SvgText>
            </G>
          ))}
          {GRID_DB.map(d => (
            <G key={d}>
              <Line x1={pad.l} x2={w - pad.r} y1={fy(d)} y2={fy(d)} stroke={C.line} strokeWidth={1} opacity={d === 0 ? 1 : 0.6} />
              <SvgText x={pad.l - 5} y={fy(d) + 3} fill={C.muted} fontSize={9} textAnchor="end">{d}</SvgText>
            </G>
          ))}
          <G clipPath="url(#plot)">
            {paths.filter(p => p.id !== selected).map(p => <Path key={p.id} d={p.d} stroke={p.color} strokeWidth={1.2} fill="none" opacity={0.35} />)}
            {paths.filter(p => p.id === selected).map(p => (
              <G key={p.id}>
                <Path d={p.fill} fill={p.color} opacity={0.14} />
                <Path d={p.d} stroke={p.color} strokeWidth={2.2} fill="none" />
              </G>
            ))}
          </G>
        </Svg>
      )}
    </View>
  );
}
export const ResponseGraph = memo(ResponseGraphImpl);
