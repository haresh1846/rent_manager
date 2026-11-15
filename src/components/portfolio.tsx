import type { ReactNode } from 'react';
import { Pressable, View, Text, useWindowDimensions } from 'react-native';
import { Action, Badge, Body, Card, Icon, type IconName, Label, palette, styles } from './ui';
import type { Payment } from '@/types';

export const money = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
export { localDate } from '@/ledger/model';
export const periodName = (year: number, month: number) =>
  new Date(year, month - 1, 15).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
export function prettyDate(value: string) {
  const d = new Date(value.length === 10 ? value + 'T12:00:00' : value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
export const cap = (v: string) => v.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
export function PanelHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.spread}>
      <Text
        accessibilityRole="header"
        style={{ fontSize: 19, fontWeight: '600', letterSpacing: -0.55, color: palette.ink }}
      >
        {title}
      </Text>
      {action}
    </View>
  );
}
export function RecordRow({
  title,
  subtitle,
  icon,
  amount,
  tag,
  tone,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  amount?: string;
  tag?: string;
  tone?: 'green' | 'neutral' | 'amber';
  action?: ReactNode;
}) {
  return (
    <View
      style={{
        gap: 10,
        borderTopColor: palette.line,
        borderTopWidth: 1,
        paddingTop: 14,
        paddingBottom: 3,
      }}
    >
      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        {icon && (
          <View
            style={{
              width: 37,
              height: 37,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#EEF3EA',
              borderRadius: 10,
            }}
          >
            <Icon name={icon} size={16} />
          </View>
        )}
        <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 135, gap: 3 }}>
          <Text style={{ color: palette.ink, fontWeight: '600', fontSize: 15 }}>{title}</Text>
          {!!subtitle && (
            <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 19 }}>{subtitle}</Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 5 }}>
          {!!amount && (
            <Text
              style={{
                color: palette.ink,
                fontWeight: '700',
                fontSize: 16,
                fontVariant: ['tabular-nums'],
              }}
            >
              {amount}
            </Text>
          )}
          {!!tag && <Badge tone={tone}>{tag}</Badge>}
        </View>
      </View>
      {action}
    </View>
  );
}
export function Metric({
  label,
  value,
  icon,
  detail,
}: {
  label: string;
  value: string;
  icon: IconName;
  detail?: string;
}) {
  return (
    <Card style={{ flex: 1, minWidth: 140, padding: 16, gap: 10 }}>
      <View style={styles.spread}>
        <Label>{label}</Label>
        <Icon name={icon} size={16} color={palette.moss} />
      </View>
      <Text style={{ fontSize: 29, fontWeight: '600', color: palette.ink, letterSpacing: -1 }}>
        {value}
      </Text>
      {!!detail && <Body muted>{detail}</Body>}
    </Card>
  );
}
export function MonthPicker({ value, onChange }: { value: Date; onChange: (value: Date) => void }) {
  return (
    <View
      style={[
        styles.wrap,
        {
          gap: 0,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.line,
          borderRadius: 10,
          alignSelf: 'flex-start',
        },
      ]}
    >
      <MonthArrow
        direction={-1}
        onPress={() => onChange(new Date(value.getFullYear(), value.getMonth() - 1, 15))}
      />
      <Text
        style={{
          minWidth: 125,
          textAlign: 'center',
          fontSize: 14,
          fontWeight: '600',
          color: palette.ink,
        }}
      >
        {periodName(value.getFullYear(), value.getMonth() + 1)}
      </Text>
      <MonthArrow
        direction={1}
        onPress={() => onChange(new Date(value.getFullYear(), value.getMonth() + 1, 15))}
      />
    </View>
  );
}
function MonthArrow({ direction, onPress }: { direction: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={direction < 0 ? 'Previous month' : 'Next month'}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Icon name={direction < 0 ? 'chevron-left' : 'chevron-right'} size={16} />
    </Pressable>
  );
}
export function PaymentRow({
  payment,
  property,
  tenant,
}: {
  payment: Payment;
  property?: string;
  tenant?: string;
}) {
  return (
    <RecordRow
      icon="arrow-down-left"
      title={property || 'Property'}
      subtitle={[tenant, prettyDate(payment.payment_date)].filter(Boolean).join(' · ')}
      amount={money(payment.amount)}
      tag={
        payment.settlement_source === 'advance' ||
        (!payment.settlement_source && payment.status === 'advance_used')
          ? 'From advance'
          : cap(payment.payment_type)
      }
      tone="green"
    />
  );
}
export function CollectionSummary({
  due,
  collected,
  outstanding,
  period,
}: {
  due: number;
  collected: number;
  outstanding: number;
  period: string;
}) {
  const { width } = useWindowDimensions();
  const pct = due ? Math.round((collected / due) * 100) : 0;
  return (
    <View
      style={{
        backgroundColor: palette.forest,
        borderRadius: 18,
        padding: width < 600 ? 20 : 28,
        gap: 20,
      }}
    >
      <View style={styles.spread}>
        <Text style={{ color: '#D0E1D4', fontSize: 14, fontWeight: '600' }}>Rent collected</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Icon name="calendar" size={14} color={palette.mint} />
          <Text style={{ color: '#E6F0E7', fontSize: 13 }}>{period}</Text>
        </View>
      </View>
      <View style={{ gap: 4 }}>
        <Text
          style={{
            fontSize: width < 600 ? 43 : 55,
            fontVariant: ['tabular-nums'],
            color: 'white',
            fontWeight: '500',
            letterSpacing: -2.5,
          }}
        >
          {money(collected)}
        </Text>
        <Text style={{ color: '#CEE0D1', fontSize: 14 }}>of {money(due)} due for the month</Text>
      </View>
      <View style={{ gap: 9 }}>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Rent collection"
          accessibilityValue={{ min: 0, max: 100, now: Math.min(100, pct) }}
          style={{ height: 8, borderRadius: 5, overflow: 'hidden', backgroundColor: '#3C5F51' }}
        >
          <View
            style={{
              height: '100%',
              width: `${Math.min(100, pct)}%`,
              backgroundColor: palette.mint,
            }}
          />
        </View>
        <View style={styles.spread}>
          <Text style={{ color: palette.mint, fontSize: 13, fontWeight: '600' }}>
            {pct}% collected
          </Text>
          <Text style={{ color: 'white', fontSize: 13 }}>{money(outstanding)} outstanding</Text>
        </View>
      </View>
    </View>
  );
}
export function BackAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View style={{ alignSelf: 'flex-start' }}>
      <Action label={label} icon="arrow-left" variant="quiet" onPress={onPress} />
    </View>
  );
}
