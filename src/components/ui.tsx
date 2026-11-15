import type { ComponentProps, ReactNode } from 'react';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

export const palette = {
  ink: '#192D28',
  muted: '#546760',
  forest: '#173C34',
  paper: '#F4F6F3',
  surface: '#FFFFFF',
  line: '#D9E1DA',
  mint: '#C6E6A4',
  moss: '#386249',
  amber: '#865C24',
  danger: '#983B35',
};
const serif = Platform.select({ web: 'Georgia', ios: 'Georgia', default: 'serif' });
export type IconName = ComponentProps<typeof Feather>['name'];
export function Icon({
  name,
  size = 18,
  color = palette.forest,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Feather name={name} size={size} color={color} accessible={false} />;
}
type WithChildren = { children: ReactNode };
export function Page({ children, narrow }: WithChildren & { narrow?: boolean }) {
  const { width } = useWindowDimensions();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.paper }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <View
        style={{
          alignSelf: 'center',
          width: '100%',
          maxWidth: narrow ? 660 : 1320,
          gap: 22,
          paddingHorizontal: width < 600 ? 18 : width < 1150 ? 32 : 48,
          paddingTop: width < 700 ? 22 : 38,
          paddingBottom: 50,
        }}
      >
        {children}
      </View>
    </ScrollView>
  );
}
export function Card({ children, style }: WithChildren & { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function Title({ children }: WithChildren) {
  const { width } = useWindowDimensions();
  return (
    <Text
      accessibilityRole="header"
      style={{
        fontSize: width < 640 ? 34 : 43,
        lineHeight: width < 640 ? 42 : 52,
        fontFamily: serif,
        color: palette.ink,
        letterSpacing: -1.35,
      }}
    >
      {children}
    </Text>
  );
}
export function SectionTitle({ children }: WithChildren) {
  return (
    <Text
      accessibilityRole="header"
      style={{ fontSize: 20, fontWeight: '600', letterSpacing: -0.5, color: palette.ink }}
    >
      {children}
    </Text>
  );
}
export function Body({ children, muted }: WithChildren & { muted?: boolean }) {
  return (
    <Text style={{ fontSize: 15, lineHeight: 22, color: muted ? palette.muted : palette.ink }}>
      {children}
    </Text>
  );
}
export function Label({ children }: WithChildren) {
  return (
    <Text style={{ color: palette.muted, fontSize: 12, fontWeight: '600', letterSpacing: 0.45 }}>
      {children}
    </Text>
  );
}
export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor="#76867E"
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          styles.input,
          props.multiline && { minHeight: 84, textAlignVertical: 'top' },
          focused && { borderColor: palette.forest, borderWidth: 2, paddingHorizontal: 11 },
          style,
        ]}
      />
    </View>
  );
}
export function Action({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet';
  disabled?: boolean;
  icon?: IconName;
}) {
  const color = variant === 'primary' ? '#FFF' : palette.forest;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor:
            variant === 'primary'
              ? palette.forest
              : variant === 'secondary'
                ? palette.surface
                : 'transparent',
          borderColor: variant === 'secondary' ? '#C8D4CB' : 'transparent',
          opacity: disabled ? 0.5 : pressed ? 0.76 : 1,
        },
      ]}
    >
      {icon && <Icon name={icon} size={16} color={color} />}
      <Text style={{ color, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}
export function Notice({
  children,
  tone = 'info',
}: WithChildren & { tone?: 'error' | 'info' | 'success' }) {
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: tone === 'error' ? '#FBECE8' : '#E8EFE5',
        padding: 14,
        borderRadius: 10,
      }}
    >
      <Text
        style={{
          color: tone === 'error' ? palette.danger : palette.forest,
          fontSize: 14,
          lineHeight: 20,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
export function Header({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.spread}>
      <View style={{ gap: 4, flexGrow: 1, flexShrink: 1 }}>
        <Title>{title}</Title>
        {!!subtitle && <Body muted>{subtitle}</Body>}
      </View>
      {action}
    </View>
  );
}
export function Badge({
  children,
  tone = 'neutral',
}: WithChildren & { tone?: 'neutral' | 'green' | 'amber' }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: 20,
        backgroundColor: tone === 'green' ? '#E4F0DE' : tone === 'amber' ? '#FCEDD4' : '#EDF1ED',
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: tone === 'amber' ? palette.amber : tone === 'green' ? '#35643D' : palette.muted,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
export function Empty({
  icon = 'inbox',
  title,
  detail,
  action,
}: {
  icon?: IconName;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <View style={{ alignItems: 'flex-start', gap: 8, paddingVertical: 8 }}>
      <Icon name={icon} size={25} />
      <SectionTitle>{title}</SectionTitle>
      <Body muted>{detail}</Body>
      {action}
    </View>
  );
}
export function Waiting({ label = 'Loading your workspace…' }: { label?: string }) {
  return (
    <View style={{ padding: 28, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <ActivityIndicator color={palette.forest} />
      <Body muted>{label}</Body>
    </View>
  );
}
export function Choices<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | string;
  onChange: (value: T) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.wrap}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={o.label}
              onPress={() => onChange(o.value)}
              style={({ pressed }) => ({
                paddingHorizontal: 13,
                paddingVertical: 11,
                minHeight: 44,
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: selected ? palette.forest : palette.line,
                borderRadius: 9,
                backgroundColor: selected ? '#E5F1E0' : pressed ? palette.paper : palette.surface,
              })}
            >
              <Text
                style={{
                  color: selected ? palette.forest : palette.muted,
                  fontWeight: selected ? '700' : '500',
                }}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
export const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  label: { fontSize: 14, fontWeight: '600', color: palette.ink },
  input: {
    minHeight: 46,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#BBC9C0',
    backgroundColor: palette.surface,
    color: palette.ink,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  action: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderRadius: 9,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 9 },
  spread: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rule: { height: 1, backgroundColor: palette.line },
});
