import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotionPreference } from './useReducedMotionPreference';

export function PageEntrance({ children, style }: { children: ReactNode; style: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotionPreference();
  const [progress] = useState(() => new Animated.Value(reduced ? 1 : 0));
  const settled = useRef(reduced);
  const entrance = useMemo(() => ({
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }),
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
  }), [progress]);

  useLayoutEffect(() => {
    if (reduced || settled.current) {
      settled.current = true;
      progress.setValue(1);
      return;
    }

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
      isInteraction: false,
    });
    animation.start(({ finished }) => { if (finished) settled.current = true; });
    return () => animation.stop();
  }, [progress, reduced]);

  return (
    <Animated.View style={[style, !reduced && entrance]}>
      {children}
    </Animated.View>
  );
}
