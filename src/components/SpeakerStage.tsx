import { useState } from 'react';
import { useSvgId } from '../lib/svgId';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Defs, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Channel, Kind } from '../model/tuning';
import { C, F } from '../theme';
import { DriverNode } from './DriverNode';

const VW = 380, VH = 270, FLOOR = 238;
const ORDER: Kind[] = ['tw', 'mr', 'mid', 'lf', 'full', 'ctr', 'rr'];
const RADIUS: Partial<Record<Kind, number>> = { tw: 11, mr: 19, lf: 29, full: 25, mid: 27, ctr: 18, rr: 20 };

interface Cab { x: number; w: number; drivers: Channel[]; side: 0 | 1 | 2 }

/** Front view of the speaker system: main cabinets with their drivers, and sub cabinets on the floor. */
export function SpeakerStage({ channels, selected, onSelect }: { channels: Channel[]; selected: string | null; onSelect: (id: string) => void }) {
  const [w, setW] = useState(0);
  const u = useSvgId();
  const byOrder = (a: Channel, b: Channel) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind);
  const mains = channels.filter(c => c.kind !== 'sub');
  const subs = channels.filter(c => c.kind === 'sub');
  const left = mains.filter(c => c.side === 0).sort(byOrder), right = mains.filter(c => c.side === 1).sort(byOrder), mid = mains.filter(c => c.side === 2).sort(byOrder);

  const cabs: Cab[] = [];
  if (mid.length) cabs.push({ x: VW / 2, w: 96, drivers: mid, side: 2 });
  if (left.length) cabs.push({ x: subs.length ? 68 : 100, w: 86, drivers: left, side: 0 });
  if (right.length) cabs.push({ x: VW - (subs.length ? 68 : 100), w: 86, drivers: right, side: 1 });

  const subW = subs.length > 1 ? 70 : 104;
  const subX = subs.length > 1 ? [VW / 2 - 39, VW / 2 + 39] : [VW / 2];
  const height = w ? (w * VH) / VW : 0;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ width: '100%', height: height || 240 }}>
      {w > 0 && (
        <Svg width={w} height={height} viewBox={`0 0 ${VW} ${VH}`}>
          <Defs>
            <LinearGradient id={u + 'cab'} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#1A2442" /><Stop offset="1" stopColor="#0A0F1E" /></LinearGradient>
            <LinearGradient id={u + 'edge'} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={C.cyan} stopOpacity={0.55} /><Stop offset="1" stopColor={C.violet} stopOpacity={0.15} /></LinearGradient>
            <RadialGradient id={u + 'cone'} cx="45%" cy="40%" r="60%"><Stop offset="0" stopColor="#2A3558" /><Stop offset="1" stopColor="#070B16" /></RadialGradient>
            <RadialGradient id={u + 'spot'} cx="50%" cy="100%" r="60%"><Stop offset="0" stopColor={C.violet} stopOpacity={0.35} /><Stop offset="1" stopColor={C.violet} stopOpacity={0} /></RadialGradient>
            <LinearGradient id={u + 'floorFade'} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={C.cyan} stopOpacity={0.35} /><Stop offset="1" stopColor={C.cyan} stopOpacity={0} /></LinearGradient>
          </Defs>

          <Rect x={0} y={FLOOR - 120} width={VW} height={150} fill={`url(#${u}spot)`} />
          {/* perspective floor grid */}
          <G opacity={0.5}>
            {Array.from({ length: 13 }, (_, i) => {
              const t = i / 12, xb = -80 + t * (VW + 160), xt = VW / 2 + (xb - VW / 2) * 0.35;
              return <Line key={`v${i}`} x1={xt} y1={FLOOR} x2={xb} y2={VH} stroke={`url(#${u}floorFade)`} strokeWidth={1} />;
            })}
            {[0, 0.22, 0.5, 0.85].map((k, i) => <Line key={`h${i}`} x1={0} x2={VW} y1={FLOOR + k * (VH - FLOOR)} y2={FLOOR + k * (VH - FLOOR)} stroke={C.cyan} strokeOpacity={0.28 - i * 0.05} strokeWidth={1} />)}
          </G>

          {cabs.map(cab => {
            const rs = cab.drivers.map(d => RADIUS[d.kind] ?? 20);
            const h = Math.max(120, rs.reduce((a, r) => a + r * 2 + 18, 26));
            const top = FLOOR - h;
            let y = top + 20;
            const labelAt = cab.side === 0 ? 'left' : cab.side === 1 ? 'right' : 'none';
            return (
              <G key={cab.x}>
                <Rect x={cab.x - cab.w / 2 + 4} y={FLOOR - 3} width={cab.w - 8} height={6} rx={3} fill="#000" opacity={0.5} />
                <Rect x={cab.x - cab.w / 2} y={top} width={cab.w} height={h} rx={14} fill={`url(#${u}cab)`} stroke={`url(#${u}edge)`} strokeWidth={1.4} />
                <Path d={`M${cab.x - cab.w / 2 + 10} ${top + 1.5}H${cab.x + cab.w / 2 - 10}`} stroke="#fff" strokeOpacity={0.12} strokeWidth={1} />
                {cab.drivers.map((d, i) => {
                  const r = rs[i];
                  const cy = y + r;
                  y += r * 2 + 18;
                  return (
                    <DriverNode cone={u + 'cone'} key={d.id} x={cab.x} y={cy} r={r} color={d.color} selected={d.id === selected} muted={d.mute} label={d.short}
                      labelAt={labelAt === 'none' ? 'right' : labelAt} waves={cab.side === 0 ? 'left' : cab.side === 1 ? 'right' : 'up'} name={d.name} onPress={() => onSelect(d.id)} />
                  );
                })}
              </G>
            );
          })}

          {subs.map((d, i) => {
            const x = subX[i], h = 74, top = FLOOR - h;
            return (
              <G key={d.id}>
                <Rect x={x - subW / 2} y={top} width={subW} height={h} rx={12} fill={`url(#${u}cab)`} stroke={`url(#${u}edge)`} strokeWidth={1.4} />
                <SvgText x={x} y={top - 7} fill={d.id === selected ? d.color : C.ink2} fontSize={11} fontFamily={F.head} textAnchor="middle" letterSpacing={0.6}>{d.short}</SvgText>
                <DriverNode cone={u + 'cone'} x={x} y={top + h / 2} r={subs.length > 1 ? 24 : 27} color={d.color} selected={d.id === selected} muted={d.mute} label={d.short} labelAt="none" waves="up" name={d.name} onPress={() => onSelect(d.id)} />
              </G>
            );
          })}
        </Svg>
      )}
    </View>
  );
}
