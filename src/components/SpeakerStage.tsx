import { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { Channel, Kind } from '../model/tuning';
import { C, F } from '../theme';
import { DriverNode } from './DriverNode';

const VW = 380, FLOOR = 244, BOTTOM = FLOOR + 14;
const ORDER: Kind[] = ['tw', 'mr', 'mid', 'lf', 'full', 'ctr', 'rr'];
const RADIUS: Partial<Record<Kind, number>> = { tw: 11, mr: 19, lf: 29, full: 25, mid: 27, ctr: 18, rr: 20 };

interface Cab { x: number; w: number; drivers: Channel[]; side: 0 | 1 | 2 }

/** Front view of the speaker system: main cabinets with their drivers, and sub cabinets on the floor. */
export function SpeakerStage({ channels, selected, onSelect, maxHeight }: { channels: Channel[]; selected: string | null; onSelect: (id: string) => void; maxHeight?: number }) {
  const [w, setW] = useState(0);
  const byOrder = (a: Channel, b: Channel) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind);
  const mains = channels.filter(c => c.kind !== 'sub');
  const subs = channels.filter(c => c.kind === 'sub');
  const left = mains.filter(c => c.side === 0).sort(byOrder), right = mains.filter(c => c.side === 1).sort(byOrder), mid = mains.filter(c => c.side === 2).sort(byOrder);

  const cabs: Cab[] = [];
  if (mid.length) cabs.push({ x: VW / 2, w: 96, drivers: mid, side: 2 });
  if (left.length) cabs.push({ x: subs.length ? 68 : 100, w: 86, drivers: left, side: 0 });
  if (right.length) cabs.push({ x: VW - (subs.length ? 68 : 100), w: 86, drivers: right, side: 1 });

  const cabH = (cab: Cab) => Math.max(120, cab.drivers.reduce((a, d) => a + (RADIUS[d.kind] ?? 20) * 2 + 18, 26));
  // Crop the drawing to the tallest cabinet so short systems don't leave empty space above.
  const top0 = Math.min(FLOOR - 74 - 24, ...cabs.map(c => FLOOR - cabH(c))) - 16;
  const VH = BOTTOM - top0;
  const subW = subs.length > 1 ? 70 : 104;
  const subX = subs.length > 1 ? [VW / 2 - 39, VW / 2 + 39] : [VW / 2];
  const fitW = maxHeight ? Math.min(w, (maxHeight * VW) / VH) : w;
  const height = fitW ? (fitW * VH) / VW : 0;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ width: '100%', height: height || 230, alignItems: 'center' }}>
      {fitW > 0 && (
        <Svg width={fitW} height={height} viewBox={`0 ${top0} ${VW} ${VH}`}>
          <Line x1={10} x2={VW - 10} y1={FLOOR} y2={FLOOR} stroke={C.line2} strokeWidth={1.5} strokeLinecap="round" />
          {cabs.map(cab => {
            const rs = cab.drivers.map(d => RADIUS[d.kind] ?? 20);
            const h = cabH(cab);
            const top = FLOOR - h;
            let y = top + 20;
            const labelAt = cab.side === 0 ? 'left' : 'right';
            return (
              <G key={cab.x}>
                <Rect x={cab.x - cab.w / 2} y={top} width={cab.w} height={h} rx={12} fill={C.panel2} stroke={C.line2} strokeWidth={1.5} />
                {cab.drivers.map((d, i) => {
                  const r = rs[i];
                  const cy = y + r;
                  y += r * 2 + 18;
                  return <DriverNode key={d.id} x={cab.x} y={cy} r={r} color={d.color} selected={d.id === selected} muted={d.mute} label={d.short} labelAt={labelAt} name={d.name} onPress={() => onSelect(d.id)} />;
                })}
              </G>
            );
          })}
          {subs.map((d, i) => {
            const x = subX[i], h = 74, top = FLOOR - h;
            return (
              <G key={d.id}>
                <Rect x={x - subW / 2} y={top} width={subW} height={h} rx={10} fill={C.panel2} stroke={C.line2} strokeWidth={1.5} />
                <SvgText x={x} y={top - 8} fill={d.id === selected ? C.ink : C.ink2} fontSize={11} fontFamily={F.semi} textAnchor="middle">{d.short}</SvgText>
                <DriverNode x={x} y={top + h / 2} r={subs.length > 1 ? 24 : 27} color={d.color} selected={d.id === selected} muted={d.mute} label={d.short} labelAt="none" name={d.name} onPress={() => onSelect(d.id)} />
              </G>
            );
          })}
        </Svg>
      )}
    </View>
  );
}
