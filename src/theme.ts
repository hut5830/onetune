// Design tokens — "neon studio": near-black navy, glass panels, cyan→violet signal accents.
export const C = {
  bg: '#05070D',
  bg1: '#0A0F1C',
  bg2: '#0E1526',
  panel: '#0E1526',
  panel2: '#131C31',
  panel3: '#1A2441',
  line: '#1F2A45',
  line2: '#2B3960',
  ink: '#EEF3FF',
  ink2: '#B5C0DC',
  muted: '#7280A3',
  faint: '#46537A',
  cyan: '#2EE6FF',
  violet: '#8A5CFF',
  pink: '#FF4FB8',
  lime: '#B8FF5A',
  amber: '#FFB23F',
  danger: '#FF4D6D',
  ok: '#34F5A4',
  onAccent: '#030A12',
} as const;

/** Gradient stops for LinearGradient / SVG gradients. */
export const G = {
  primary: ['#2EE6FF', '#8A5CFF'] as const,
  hot: ['#FF4FB8', '#8A5CFF'] as const,
  ok: ['#34F5A4', '#2EE6FF'] as const,
  warn: ['#FFB23F', '#FF4FB8'] as const,
  panel: ['#121B32', '#0B1120'] as const,
  screen: ['#0B1330', '#05070D'] as const,
};

export const F = {
  display: 'ChakraPetch_700Bold',
  head: 'ChakraPetch_600SemiBold',
  num: 'ChakraPetch_600SemiBold',
  numMed: 'ChakraPetch_500Medium',
  body: 'IBMPlexSansThai_400Regular',
  bodyMed: 'IBMPlexSansThai_500Medium',
  bodySemi: 'IBMPlexSansThai_600SemiBold',
} as const;

export const R = { sm: 10, md: 14, lg: 20, xl: 28 } as const;
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Adds alpha to a #RRGGBB colour. */
export const alpha = (hex: string, a: number) => hex + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
