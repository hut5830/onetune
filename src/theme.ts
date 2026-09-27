// Design tokens — calm graphite: soft dark greys, one blue accent, no gradients or glows.
export const C = {
  bg: '#131519',
  panel: '#1B1E23',
  panel2: '#22262C',
  panel3: '#2A2F36',
  line: '#2B3037',
  line2: '#383E47',
  ink: '#ECEFF3',
  ink2: '#B8BFC8',
  muted: '#8A929D',
  faint: '#5C646F',
  accent: '#4C9EFF',
  onAccent: '#08121F',
  ok: '#4CC38A',
  warn: '#E8B04B',
  danger: '#E5646E',
  violet: '#9C8CFF',
} as const;

export const F = {
  regular: 'IBMPlexSansThai_400Regular',
  medium: 'IBMPlexSansThai_500Medium',
  semi: 'IBMPlexSansThai_600SemiBold',
  bold: 'IBMPlexSansThai_700Bold',
} as const;

export const R = { sm: 10, md: 14, lg: 18, xl: 24 } as const;
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Widest a single column of content gets on tablets / landscape. */
export const MAX_W = 760;

/** Adds alpha to a #RRGGBB colour. */
export const alpha = (hex: string, a: number) => hex + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
