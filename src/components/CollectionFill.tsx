import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, type ViewStyle } from 'react-native';
import { useReducedMotionPreference } from '@/components/useReducedMotionPreference';

export function CollectionFill({ percent, style }: { percent: number; style: ViewStyle }) {
  const reduceMotion = useReducedMotionPreference();
  const [progress] = useState(() => new Animated.Value(reduceMotion ? percent : 0));
  const width = useMemo(() => progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  }), [progress]);

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(percent);
      return;
    }

    const transition = Animated.timing(progress, {
      toValue: percent,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
      isInteraction: false,
    });
    transition.start();
    return () => transition.stop();
  }, [percent, progress, reduceMotion]);

  return <Animated.View style={[style, { width: reduceMotion ? `${percent}%` : width }]} />;
}
