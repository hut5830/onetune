import type { ReactElement } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { C } from '../theme';

// Line icons drawn on a 24×24 grid (1.8 stroke) so the whole app shares one visual weight.
const P = {
  undo: c => <Path d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11" stroke={c} />,
  redo: c => <Path d="M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 000 11H13" stroke={c} />,
  solo: c => <><Path d="M4 15v-3a8 8 0 0116 0v3" stroke={c} /><Rect x={3} y={14} width={4.5} height={7} rx={1.8} stroke={c} /><Rect x={16.5} y={14} width={4.5} height={7} rx={1.8} stroke={c} /></>,
  settings: c => <><Circle cx={12} cy={12} r={3.2} stroke={c} /><Path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke={c} /></>,
  compare: c => <><Rect x={3} y={5} width={18} height={14} rx={3} stroke={c} /><Path d="M12 5v14" stroke={c} /></>,
  home: c => <Path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-5v-6h-4v6H5a1 1 0 01-1-1z" stroke={c} />,
  bluetoothOff: c => <Path d="M7 7l10 10-5 4V3l5 4-2.5 2M4 4l16 16" stroke={c} />,
  back: c => <Path d="M15 5l-7 7 7 7" stroke={c} />,
  close: c => <Path d="M6 6l12 12M18 6L6 18" stroke={c} />,
  chevron: c => <Path d="M9 5l7 7-7 7" stroke={c} />,
  down: c => <Path d="M5 9l7 7 7-7" stroke={c} />,
  plus: c => <Path d="M12 5v14M5 12h14" stroke={c} />,
  minus: c => <Path d="M5 12h14" stroke={c} />,
  check: c => <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={c} />,
  bluetooth: c => <Path d="M7 7l10 10-5 4V3l5 4L7 17" stroke={c} />,
  radar: c => <><Circle cx={12} cy={12} r={9} stroke={c} /><Circle cx={12} cy={12} r={5} stroke={c} /><Path d="M12 12l6-6" stroke={c} /></>,
  speaker: c => <><Rect x={5} y={2.5} width={14} height={19} rx={3} stroke={c} /><Circle cx={12} cy={7.5} r={1.8} stroke={c} /><Circle cx={12} cy={15} r={3.6} stroke={c} /></>,
  car: c => <><Path d="M4 16v-4l2-5h12l2 5v4M4 16h16M4 16v2.5M20 16v2.5" stroke={c} /><Circle cx={7.5} cy={13} r={1} fill={c} /><Circle cx={16.5} cy={13} r={1} fill={c} /></>,
  eq: c => <Path d="M5 20v-6M5 10V4M12 20v-9M12 7V4M19 20v-4M19 12V4M3 14h4M10 7h4M17 16h4" stroke={c} />,
  wave: c => <Path d="M2 12c2.5 0 2.5-6 5-6s2.5 12 5 12 2.5-12 5-12 2.5 6 5 6" stroke={c} />,
  xover: c => <Path d="M3 7h5c3 0 5 10 8 10h5M3 17h5c3 0 5-10 8-10h5" stroke={c} />,
  timer: c => <><Circle cx={12} cy={13} r={8} stroke={c} /><Path d="M12 9v4l3 2M9 2h6" stroke={c} /></>,
  ruler: c => <Path d="M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2" stroke={c} />,
  layers: c => <Path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5" stroke={c} />,
  save: c => <Path d="M5 3h11l3 3v15H5zM8 3v6h8V3M8 21v-7h8v7" stroke={c} />,
  input: c => <Path d="M3 12h11M10 8l4 4-4 4M14 4h5a2 2 0 012 2v12a2 2 0 01-2 2h-5" stroke={c} />,
  route: c => <><Circle cx={5} cy={6} r={2} stroke={c} /><Circle cx={5} cy={18} r={2} stroke={c} /><Circle cx={19} cy={12} r={2} stroke={c} /><Path d="M7 6c6 0 5 6 10 6M7 18c6 0 5-6 10-6" stroke={c} /></>,
  link: c => <Path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" stroke={c} />,
  unlink: c => <Path d="M15 13l3.7-3.7a4 4 0 00-5.7-5.7L10 6.6M9 11l-3.7 3.7a4 4 0 005.7 5.7l3-3M4 4l16 16" stroke={c} />,
  mute: c => <Path d="M4 9h4l5-4v14l-5-4H4zM16 9l5 6M21 9l-5 6" stroke={c} />,
  volume: c => <Path d="M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" stroke={c} />,
  phase: c => <><Circle cx={12} cy={12} r={9} stroke={c} /><Path d="M5 19L19 5" stroke={c} /></>,
  copy: c => <><Rect x={8} y={8} width={12} height={12} rx={2.5} stroke={c} /><Path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" stroke={c} /></>,
  send: c => <Path d="M4 12l16-8-6 16-2.5-6.5z M11.5 13.5L20 4" stroke={c} />,
  terminal: c => <><Rect x={3} y={4} width={18} height={16} rx={3} stroke={c} /><Path d="M7 9l3 3-3 3M12 15h5" stroke={c} /></>,
  trash: c => <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" stroke={c} />,
  edit: c => <Path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" stroke={c} />,
  bolt: c => <Path d="M13 2L4 14h7l-1 8 9-12h-7z" stroke={c} />,
  shield: c => <Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5" stroke={c} />,
  info: c => <><Circle cx={12} cy={12} r={9} stroke={c} /><Path d="M12 11v6M12 7.5v.5" stroke={c} /></>,
  warn: c => <Path d="M12 3l10 18H2zM12 10v5M12 18v.5" stroke={c} />,
  sliders: c => <Path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4" stroke={c} />,
  refresh: c => <Path d="M20 12a8 8 0 11-2.3-5.7M20 4v5h-5" stroke={c} />,
  share: c => <Path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5" stroke={c} />,
  pause: c => <Path d="M8 5v14M16 5v14" stroke={c} />,
  play: c => <Path d="M7 4l13 8-13 8z" stroke={c} />,
  dots: c => <><Circle cx={5} cy={12} r={1.2} fill={c} /><Circle cx={12} cy={12} r={1.2} fill={c} /><Circle cx={19} cy={12} r={1.2} fill={c} /></>,
  signal: c => <Path d="M4 20v-3M9 20v-7M14 20v-11M19 20V4" stroke={c} />,
  sparkle: c => <Path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" stroke={c} />,
} satisfies Record<string, (c: string) => ReactElement>;

export type IconName = keyof typeof P;

export function Icon({ name, size = 22, color = C.ink, width = 1.8 }: { name: IconName; size?: number; color?: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {P[name](color)}
    </Svg>
  );
}
