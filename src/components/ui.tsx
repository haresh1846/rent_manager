import type { ComponentProps, ComponentRef, ReactNode } from 'react';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { MotionPressable, webControlTransition } from './MotionPressable';
import { useReducedMotionPreference } from './useReducedMotionPreference';
import { PageEntrance } from './PageEntrance';

export const palette = {
  ink: '#183C32',
  muted: '#5E7064',
  forest: '#183C32',
  paper: '#F7F7F2',
  surface: '#FFFFFF',
  line: '#DCE2D9',
  mint: '#C6E6A4',
  moss: '#416649',
  sage: '#EAF1E5',
  sageDeep: '#D7E6D0',
  clay: '#89472F',
  clayWash: '#FAEBDF',
  amber: '#89472F',
  danger: '#923C35',
};
export const displayFont = Platform.select({ web: 'Georgia', ios: 'Georgia', default: 'serif' });
export type IconName = ComponentProps<typeof Feather>['name'];
// React Native Web exposes hover and keyboard focus in addition to the native pressed state.
export type ControlState = Readonly<{ pressed: boolean; hovered?: boolean; focused?: boolean }>;

export function Icon({
  name, size = 18, color = palette.forest,
}: { name: IconName; size?: number; color?: string }) {
  return <Feather name={name} size={size} color={color} accessible={false} aria-hidden />;
}

type WithChildren = { children: ReactNode };
export function Page({ children, narrow }: WithChildren & { narrow?: boolean }) {
  const { width } = useWindowDimensions();
  return (
    <ScrollView style={styles.page} keyboardShouldPersistTaps="handled" contentContainerStyle={{flexGrow: 1}}>
      <PageEntrance style={[
        styles.pageContent,
        {
          maxWidth: narrow ? 780 : 1480,
          gap: width < 600 ? 18 : 24,
          paddingHorizontal: width < 600 ? 18 : width < 1200 ? 32 : 40,
          paddingTop: width < 600 ? 22 : 32,
        },
      ]}>
        {children}
      </PageEntrance>
    </ScrollView>
  );
}

export function Card({ children, style }: WithChildren & { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children }: WithChildren) {
  const { width } = useWindowDimensions();
  return (
    <Text accessibilityRole="header" style={[
      styles.title,
      {fontSize: width < 600 ? 35 : 45, lineHeight: width < 600 ? 42 : 53},
    ]}>
      {children}
    </Text>
  );
}
export function SectionTitle({ children }: WithChildren) {
  return <Text accessibilityRole="header" style={styles.sectionTitle}>{children}</Text>;
}
export function Body({ children, muted }: WithChildren & { muted?: boolean }) {
  return <Text style={[styles.body, muted && {color: palette.muted}]}>{children}</Text>;
}
export function Label({ children }: WithChildren) {
  return <Text style={styles.caption}>{children}</Text>;
}

export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  const [focused, setFocused] = useState(false);
  const reduced = useReducedMotionPreference();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor="#657568"
        selectionColor={palette.sageDeep}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        style={[
          styles.input,
          webControlTransition(reduced),
          props.multiline && {minHeight: 90, textAlignVertical: 'top'},
          props.editable === false && {backgroundColor: palette.paper, color: palette.muted},
          focused && styles.inputFocus,
          style,
        ]}
      />
    </View>
  );
}

const actionColors = {
  primary: {text: '#FFFFFF', fill: palette.forest, edge: palette.forest, hover: '#28503E', press: '#103225'},
  secondary: {text: palette.forest, fill: palette.surface, edge: '#C9D3C6', hover: '#F1F5EE', press: palette.sage},
  quiet: {text: palette.moss, fill: 'transparent', edge: 'transparent', hover: '#F0F4ED', press: palette.sage},
};

export function Action({
  label, onPress, variant = 'primary', disabled = false, icon,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet';
  disabled?: boolean;
  icon?: IconName;
}) {
  const colors = actionColors[variant];
  return (
    <MotionPressable
      accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} aria-disabled={disabled}
      disabled={disabled} onPress={onPress}
      style={({ pressed, hovered, focused }: ControlState) => [
        styles.action,
        variant === 'quiet' && styles.quietAction,
        {backgroundColor: pressed ? colors.press : hovered ? colors.hover : colors.fill, borderColor: colors.edge},
        focused && styles.controlFocus,
        disabled && {opacity: 0.48},
      ]}
    >
      {icon && <Icon name={icon} size={16} color={colors.text} />}
      <Text style={[styles.actionLabel, {color: colors.text}]}>{label}</Text>
    </MotionPressable>
  );
}

export function Notice({ children, tone = 'info' }: WithChildren & { tone?: 'error' | 'info' | 'success' }) {
  const error = tone === 'error';
  return (
    <View accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite"
      style={[styles.notice, error && {backgroundColor: '#FFF0EA', borderColor: '#EBC8BD'}]}>
      <Icon name={error ? 'alert-circle' : tone === 'success' ? 'check-circle' : 'info'}
        size={17} color={error ? palette.danger : palette.moss} />
      <Text style={[styles.noticeText, error && {color: palette.danger}]}>{children}</Text>
    </View>
  );
}
export function Header({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <View style={styles.spread}>
      <View style={styles.headerText}>
        <Title>{title}</Title>
        {!!subtitle && <Body muted>{subtitle}</Body>}
      </View>
      {action}
    </View>
  );
}

const badgeColors = {
  neutral: {fill: '#EEF0EA', text: '#536258'},
  green: {fill: '#E7F1DE', text: '#3B643E'},
  amber: {fill: palette.clayWash, text: palette.clay},
};
export function Badge({ children, tone = 'neutral' }: WithChildren & { tone?: 'neutral' | 'green' | 'amber' }) {
  const colors = badgeColors[tone];
  return (
    <View style={[styles.badge, {backgroundColor: colors.fill}]}>
      <Text style={[styles.badgeText, {color: colors.text}]}>{children}</Text>
    </View>
  );
}
export function Empty({
  icon = 'inbox', title, detail, action,
}: { icon?: IconName; title: string; detail: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Icon name={icon} size={19} color={palette.moss} /></View>
      <View style={styles.emptyBody}>
        <Text accessibilityRole="header" style={styles.emptyTitle}>{title}</Text>
        <Body muted>{detail}</Body>
        {action && <View style={styles.emptyAction}>{action}</View>}
      </View>
    </View>
  );
}
export function Waiting({ label = 'Loading your workspace…' }: { label?: string }) {
  return (
    <View style={styles.waiting}>
      <ActivityIndicator color={palette.forest} />
      <Body muted>{label}</Body>
    </View>
  );
}
export function Choices<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | string;
  onChange: (value: T) => void;
}) {
  const buttons = useRef<(ComponentRef<typeof View> | null)[]>([]);
  const selectedIndex = options.findIndex((option) => option.value === value);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.choices}>
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <MotionPressable key={option.value}
              accessibilityRole="radio" accessibilityState={{checked: selected}} aria-checked={selected} accessibilityLabel={option.label}
              ref={(element) => { buttons.current[index] = element; }}
              tabIndex={Platform.OS === 'web' ? (index === Math.max(0, selectedIndex) ? 0 : -1) : undefined}
              onKeyDown={Platform.OS === 'web' ? (event) => {
                const key = event.nativeEvent.key;
                let next = index;
                if (key === 'ArrowRight' || key === 'ArrowDown') next = (index + 1) % options.length;
                else if (key === 'ArrowLeft' || key === 'ArrowUp') next = (index + options.length - 1) % options.length;
                else if (key !== ' ') return;
                event.preventDefault();
                buttons.current[next]?.focus();
                onChange(options[next].value);
              } : undefined}
              onPress={() => onChange(option.value)}
              style={({pressed, hovered, focused}: ControlState) => [
                styles.choice, (hovered || pressed) && {backgroundColor: palette.sage},
                selected && styles.choiceSelected, pressed && {backgroundColor: palette.sageDeep}, focused && styles.controlFocus,
              ]}>
              <View style={!selected && styles.choiceCheckHidden}><Icon name="check" size={14} color={palette.forest} /></View>
              <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{option.label}</Text>
            </MotionPressable>
          );
        })}
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: palette.paper},
  pageContent: {alignSelf: 'center', width: '100%', paddingBottom: 48},
  card: {backgroundColor: palette.surface, borderColor: palette.line, borderWidth: 1, borderRadius: 14, padding: 20, gap: 16},
  title: {color: palette.ink, fontFamily: displayFont, letterSpacing: -1.6, flexShrink: 1},
  sectionTitle: {fontSize: 22, lineHeight: 28, color: palette.ink, fontFamily: displayFont, letterSpacing: -0.55},
  body: {fontSize: 14, lineHeight: 21, color: palette.ink, flexShrink: 1},
  caption: {fontSize: 12, lineHeight: 17, fontWeight: '600', color: palette.muted, flexShrink: 1},
  field: {gap: 8, minWidth: 0},
  label: {fontSize: 13, lineHeight: 18, fontWeight: '600', color: palette.ink},
  input: {
    minHeight: 46, width: '100%', minWidth: 0, backgroundColor: palette.surface, color: palette.ink,
    borderColor: '#BBC7B9', borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 13, fontSize: 16,
  },
  inputFocus: {borderColor: palette.moss, outlineWidth: 2, outlineOffset: 1, outlineStyle: 'solid', outlineColor: '#8BAC84'},
  controlFocus: {outlineColor: '#557750', outlineWidth: 2, outlineOffset: 2, outlineStyle: 'solid'},
  action: {
    minHeight: 44, maxWidth: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
    gap: 8, borderRadius: 9, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1,
  },
  quietAction: {paddingHorizontal: 8},
  actionLabel: {fontSize: 13, lineHeight: 19, fontWeight: '600', flexShrink: 1, textAlign: 'center'},
  notice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: palette.sage,
    borderWidth: 1, borderColor: palette.sageDeep, padding: 14, borderRadius: 10,
  },
  noticeText: {fontSize: 14, lineHeight: 20, flex: 1, color: palette.forest},
  headerText: {flexGrow: 1, flexShrink: 1, minWidth: 0, gap: 4},
  badge: {maxWidth: '100%', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start'},
  badgeText: {fontSize: 11, lineHeight: 16, fontWeight: '600', flexShrink: 1},
  empty: {backgroundColor: '#F5F7F1', borderRadius: 10, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12},
  emptyIcon: {width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E4ECDD', borderRadius: 11},
  emptyBody: {flex: 1, minWidth: 0, gap: 4},
  emptyTitle: {fontSize: 15, lineHeight: 21, fontWeight: '600', color: palette.ink},
  emptyAction: {alignSelf: 'flex-start', marginTop: 6},
  waiting: {padding: 28, flexDirection: 'row', alignItems: 'center', gap: 12},
  choices: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6},
  choice: {borderWidth: 1, borderColor: palette.line, borderRadius: 9, minHeight: 44, maxWidth: '100%', paddingHorizontal: 12, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: palette.surface},
  choiceSelected: {backgroundColor: palette.sage, borderColor: '#81A17B'},
  choiceCheckHidden: {opacity: 0},
  choiceText: {color: palette.muted, fontSize: 13, lineHeight: 19, fontWeight: '600', flexShrink: 1},
  choiceTextSelected: {color: palette.ink},
  wrap: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8},
  spread: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  row: {flexDirection: 'row', alignItems: 'center', gap: 12},
  rule: {height: 1, backgroundColor: palette.line},
});
