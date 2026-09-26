import { Text, View } from 'react-native';
import { useSvgId } from '../lib/svgId';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { C, F } from '../theme';

/** OneTune mark: a response curve inside a rounded chip. */
export function Logo({ size = 40 }: { size?: number }) {
  const u = useSvgId();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Defs>
          <LinearGradient id={u + 'lg'} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={C.cyan} /><Stop offset="1" stopColor={C.violet} /></LinearGradient>
        </Defs>
        <Rect x={1} y={1} width={38} height={38} rx={12} fill="#0B1226" stroke={`url(#${u}lg)`} strokeWidth={1.6} />
        <Path d="M7 24c3 0 4-9 7-9s3 13 6 13 3-17 6-17 3 9 7 9" stroke={`url(#${u}lg)`} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <View>
        <Text style={{ fontFamily: F.display, fontSize: size * 0.5, color: C.ink, letterSpacing: 2.5, lineHeight: size * 0.6 }}>ONETUNE</Text>
        <Text style={{ fontFamily: F.head, fontSize: size * 0.24, color: C.cyan, letterSpacing: 4, lineHeight: size * 0.32 }}>DSP STUDIO</Text>
      </View>
    </View>
  );
}
