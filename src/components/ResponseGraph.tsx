import { memo, useMemo, useRef, useState } from 'react';
import { useSvgId } from '../lib/svgId';
import { LayoutChangeEvent, PanResponder, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Channel } from '../model/tuning';
import { responseDb } from '../lib/dsp';
import { clamp, fmtF } from '../lib/format';
import { haptic } from '../lib/haptics';
import { C, F, alpha } from '../theme';

const N = 120;
const FREQS = Array.from({ length: N }, (_, i) => 20 * Math.pow(1000, i / (N - 1)));
const GRID_F = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

export interface EditHandle { index: number; f: number; g: number; onDrag: (f: number, g: number) => void }

interface Props { channels: Channel[]; selected: string | null; height?: number; top?: number; bot?: number; edit?: EditHandle; bandMarks?: boolean }

function ResponseGraphImpl({ channels, selected, height = 190, top = 12, bot = -24, edit, bandMarks }: Props) {
  const [w, setW] = useState(0);
  const u = useSvgId();
  const pad = { l: 30, r: 10, t: 10, b: 20 };
  const fx = (f: number) => pad.l + (Math.log10(f / 20) / 3) * (w - pad.l - pad.r);
  const fy = (d: number) => pad.t + ((top - clamp(d, bot - 6, top + 6)) / (top - bot)) * (height - pad.t - pad.b);
  const xf = (x: number) => clamp(20 * Math.pow(1000, (x - pad.l) / Math.max(1, w - pad.l - pad.r)), 20, 20000);
  const yd = (y: number) => top - ((y - pad.t) / (height - pad.t - pad.b)) * (top - bot);
  const gridDb = useMemo(() => { const out: number[] = []; for (let d = Math.ceil(top / 6) * 6; d >= bot; d -= 6) out.push(d); return out; }, [top, bot]);

  const paths = useMemo(() => {
    if (!w) return [];
    return channels.filter(c => !c.mute || c.id === selected).map(c => {
      const pts = FREQS.map(f => `${fx(f).toFixed(1)},${fy(responseDb(c, f)).toFixed(1)}`);
      return { id: c.id, color: c.color, d: 'M' + pts.join('L'), fill: `M${fx(20)},${height - pad.b}L${pts.join('L')}L${fx(20000)},${height - pad.b}Z` };
    });
  }, [channels, selected, w, height, top, bot]);

  const sel = channels.find(c => c.id === selected);
  const editRef = useRef(edit); editRef.current = edit;
  const geo = useRef({ fx, fy, xf, yd }); geo.current = { fx, fy, xf, yd };
  const start = useRef({ x: 0, y: 0 });
  const pr = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !!editRef.current,
    onMoveShouldSetPanResponder: () => !!editRef.current,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      const e = editRef.current; if (!e) return;
      start.current = { x: geo.current.fx(e.f), y: geo.current.fy(e.g) };
      haptic.tap();
    },
    onPanResponderMove: (_, g) => {
      const e = editRef.current; if (!e) return;
      e.onDrag(geo.current.xf(start.current.x + g.dx), Math.round(geo.current.yd(start.current.y + g.dy) * 2) / 2);
    },
    onPanResponderRelease: () => haptic.tick(),
  })).current;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ height }} accessible accessibilityLabel="กราฟตอบสนองความถี่" {...(edit ? pr.panHandlers : {})}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <Defs>
            <ClipPath id={u + 'plot'}><Rect x={pad.l} y={pad.t} width={w - pad.l - pad.r} height={height - pad.t - pad.b} /></ClipPath>
            {sel && <LinearGradient id={u + 'selFill'} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={sel.color} stopOpacity={0.38} /><Stop offset="1" stopColor={sel.color} stopOpacity={0} /></LinearGradient>}
          </Defs>
          {GRID_F.map(f => (
            <G key={f}>
              <Line x1={fx(f)} x2={fx(f)} y1={pad.t} y2={height - pad.b} stroke={C.line} strokeWidth={1} opacity={0.7} />
              <SvgText x={fx(f)} y={height - 6} fill={C.muted} fontSize={9} fontFamily={F.head} textAnchor="middle">{fmtF(f)}</SvgText>
            </G>
          ))}
          {gridDb.map(d => (
            <G key={d}>
              <Line x1={pad.l} x2={w - pad.r} y1={fy(d)} y2={fy(d)} stroke={d === 0 ? C.line2 : C.line} strokeWidth={1} opacity={d === 0 ? 1 : 0.6} strokeDasharray={d === 0 ? undefined : '2 4'} />
              <SvgText x={pad.l - 6} y={fy(d) + 3} fill={C.muted} fontSize={9} fontFamily={F.head} textAnchor="end">{d > 0 ? `+${d}` : d}</SvgText>
            </G>
          ))}
          <G clipPath={`url(#${u}plot)`}>
            {sel && sel.hpf.on && <Line x1={fx(sel.hpf.freq)} x2={fx(sel.hpf.freq)} y1={pad.t} y2={height - pad.b} stroke={sel.color} strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />}
            {sel && sel.lpf.on && <Line x1={fx(sel.lpf.freq)} x2={fx(sel.lpf.freq)} y1={pad.t} y2={height - pad.b} stroke={sel.color} strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />}
            {paths.filter(p => p.id !== selected).map(p => (
              <G key={p.id}>
                {!selected && <Path d={p.d} stroke={p.color} strokeWidth={5} fill="none" opacity={0.12} />}
                <Path d={p.d} stroke={p.color} strokeWidth={selected ? 1.2 : 1.8} fill="none" opacity={selected ? 0.3 : 0.9} />
              </G>
            ))}
            {paths.filter(p => p.id === selected).map(p => (
              <G key={p.id}>
                <Path d={p.fill} fill={`url(#${u}selFill)`} />
                <Path d={p.d} stroke={p.color} strokeWidth={7} fill="none" opacity={0.18} />
                <Path d={p.d} stroke={p.color} strokeWidth={2.4} fill="none" />
              </G>
            ))}
            {bandMarks && sel && sel.eq.map((b, i) => (b.g !== 0 && i !== edit?.index ? <Circle key={i} cx={fx(b.f)} cy={fy(b.g)} r={3.5} fill={C.bg} stroke={sel.color} strokeWidth={1.5} /> : null))}
            {edit && sel && (
              <G>
                <Line x1={fx(edit.f)} x2={fx(edit.f)} y1={pad.t} y2={height - pad.b} stroke={C.ink} strokeOpacity={0.25} strokeWidth={1} />
                <Circle cx={fx(edit.f)} cy={fy(edit.g)} r={16} fill={alpha(sel.color, 0.18)} />
                <Circle cx={fx(edit.f)} cy={fy(edit.g)} r={8} fill={C.bg} stroke={sel.color} strokeWidth={2.5} />
                <SvgText x={fx(edit.f)} y={pad.t + 10} fill={C.ink} fontSize={10} fontFamily={F.head} textAnchor={fx(edit.f) > w - 60 ? 'end' : fx(edit.f) < 60 ? 'start' : 'middle'}>{edit.index + 1} · {fmtF(edit.f)} Hz</SvgText>
              </G>
            )}
          </G>
        </Svg>
      )}
    </View>
  );
}
export const ResponseGraph = memo(ResponseGraphImpl);
