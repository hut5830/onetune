import { useId } from 'react';

/** Per-instance prefix for SVG gradient/clip ids, so two drawings on screen never share `url(#…)` targets. */
export const useSvgId = () => 's' + useId().replace(/[^A-Za-z0-9_-]/g, '');
