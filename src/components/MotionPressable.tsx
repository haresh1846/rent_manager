import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useReducedMotionPreference } from './useReducedMotionPreference';

type Props = ComponentProps<typeof Pressable>;
const activeScale = 0.985;
const releaseDuration = 140;
const pressDuration = 85;
const webTransition: ViewStyle & { transitionProperty: string; transitionDuration: string; transitionTimingFunction: string } = {
  transitionProperty: 'transform, background-color, border-color, opacity',
  transitionDuration: `${releaseDuration}ms`,
  transitionTimingFunction: 'ease-out',
};
export function webControlTransition(reduced: boolean) {
  return Platform.OS === 'web' && !reduced ? webTransition : undefined;
}

function WebMotionPressable({ style, ...props }: Props) {
  const reduced = useReducedMotionPreference();
  return <Pressable {...props} style={state => [
    typeof style === 'function' ? style(state) : style,
    webControlTransition(reduced),
    !reduced && !props.disabled && state.pressed && pressedWebStyle,
  ]} />;
}
const pressedWebStyle = {transform: [{scale: activeScale}], transitionDuration: `${pressDuration}ms`};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
function NativeMotionPressable({ style, onPressIn, onPressOut, onHoverIn, onHoverOut, onFocus, onBlur, ...props }: Props) {
  const reduced = useReducedMotionPreference();
  const [scale] = useState(() => new Animated.Value(1));
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const active = pressed && !props.disabled;
  const state = {pressed: active, hovered, focused};

  useEffect(() => {
    if (reduced || props.disabled) scale.setValue(1);
    return () => scale.stopAnimation();
  }, [props.disabled, reduced, scale]);

  function feedback(down: boolean) {
    setPressed(down);
    if (reduced || props.disabled) return;
    Animated.timing(scale, {
      toValue: down ? activeScale : 1,
      duration: down ? pressDuration : releaseDuration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }

  return <AnimatedPressable {...props}
    onPressIn={event => { feedback(true); onPressIn?.(event); }}
    onPressOut={event => { feedback(false); onPressOut?.(event); }}
    onHoverIn={event => { setHovered(true); onHoverIn?.(event); }}
    onHoverOut={event => { setHovered(false); onHoverOut?.(event); }}
    onFocus={event => { setFocused(true); onFocus?.(event); }}
    onBlur={event => { setFocused(false); onBlur?.(event); }}
    style={[
      typeof style === 'function' ? style(state) : style,
      !reduced && !props.disabled && {transform: [{scale}]},
    ]}
  />;
}

export const MotionPressable = Platform.OS === 'web' ? WebMotionPressable : NativeMotionPressable;
