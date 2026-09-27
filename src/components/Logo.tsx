import { Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { C, F } from '../theme';

/** OneTune mark: a response curve inside a rounded square. */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Rect x={0} y={0} width={40} height={40} rx={12} fill={C.accent} />
        <Path d="M7 24c3 0 4-9 7-9s3 13 6 13 3-17 6-17 3 9 7 9" stroke={C.onAccent} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text style={{ fontFamily: F.bold, fontSize: size * 0.56, color: C.ink, lineHeight: size * 0.8 }}>OneTune</Text>
    </View>
  );
}
