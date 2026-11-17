import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, Text, useWindowDimensions } from 'react-native';
import { Action, Badge, Body, Card, Icon, Label, SectionTitle, palette, styles, type ControlState, type IconName } from './ui';
import type { Payment } from '@/types';
import { localDate } from '@/ledger/model';
import { CollectionFill } from './CollectionFill';

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
      <SectionTitle>{title}</SectionTitle>
      {action}
    </View>
  );
}

export function RecordRow({ title, subtitle, icon, amount, tag, tone, action }: {
  title: string; subtitle?: string; icon?: IconName; amount?: string; tag?: string;
  tone?: 'green' | 'neutral' | 'amber'; action?: ReactNode;
}) {
  const warm = tone === 'amber';
  return (
    <View style={view.record}>
      <View style={view.recordContent}>
        {icon && (
          <View style={[view.recordIcon, warm && {backgroundColor: palette.clayWash}]}>
            <Icon name={icon} size={17} color={warm ? palette.clay : palette.moss} />
          </View>
        )}
        <View style={view.identity}>
          <Text style={view.recordTitle}>{title}</Text>
          {!!subtitle && <Text style={view.recordDetail}>{subtitle}</Text>}
        </View>
        {(!!amount || !!tag) && <View style={view.recordTotal}>
          {!!amount && <Text style={[view.amount, warm && {color: palette.clay}]}>{amount}</Text>}
          {!!tag && <View style={{alignSelf: 'flex-end'}}><Badge tone={tone}>{tag}</Badge></View>}
        </View>}
      </View>
      {action}
    </View>
  );
}

export function Metric({ label, value, icon, detail }: {
  label: string; value: string; icon: IconName; detail?: string;
}) {
  return (
    <Card style={view.metric}>
      <View style={view.metricLabel}>
        <Icon name={icon} size={16} color={palette.moss} />
        <Label>{label}</Label>
      </View>
      <Text style={[view.metricValue, value.length > 9 && {fontSize: 23, lineHeight: 30}]}>
        {value}
      </Text>
      {!!detail && <Body muted>{detail}</Body>}
    </Card>
  );
}

export function MonthPicker({ value, onChange }: { value: Date; onChange: (value: Date) => void }) {
  return (
    <View style={view.monthPicker}>
      <MonthArrow direction={-1} onPress={() => onChange(new Date(value.getFullYear(), value.getMonth() - 1, 15))} />
      <Text style={view.monthLabel}>{periodName(value.getFullYear(), value.getMonth() + 1)}</Text>
      <MonthArrow direction={1} onPress={() => onChange(new Date(value.getFullYear(), value.getMonth() + 1, 15))} />
    </View>
  );
}

function MonthArrow({ direction, onPress }: { direction: number; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={direction < 0 ? 'Previous month' : 'Next month'} accessibilityRole="button"
      onPress={onPress}
      style={({pressed, hovered, focused}: ControlState) => [
        view.monthArrow, (pressed || hovered) && {backgroundColor: palette.sage}, focused && styles.controlFocus,
      ]}>
      <Icon name={direction < 0 ? 'chevron-left' : 'chevron-right'} size={17} />
    </Pressable>
  );
}

export function PaymentRow({ payment, property, tenant }: { payment: Payment; property?: string; tenant?: string }) {
  const outgoing = payment.payment_type === 'advance_refund' || payment.payment_type === 'deposit_refund';
  const kind = payment.settlement_source === 'advance' || payment.status === 'advance_used'
    ? 'From advance'
    : cap(payment.payment_type);
  const state = payment.reversal ? 'Reversed' : payment.status === 'pending' ? 'Pending'
    : payment.payment_date > localDate() ? 'Future dated' : '';
  return (
    <RecordRow
      icon={payment.reversal ? 'rotate-ccw' : outgoing ? 'arrow-up-right' : 'arrow-down-left'}
      title={property || 'Property'}
      subtitle={[tenant, prettyDate(payment.payment_date)].filter(Boolean).join(' · ')}
      amount={(outgoing ? '−' : '') + money(payment.amount)}
      tag={state ? state + ' · ' + kind : kind}
      tone={state || outgoing || payment.payment_type === 'deposit_deduction' ? 'neutral' : 'green'}
    />
  );
}

export function CollectionSummary({ due, collected, outstanding, period }: {
  due: number; collected: number; outstanding: number; period: string;
}) {
  const { width } = useWindowDimensions();
  const pct = due ? Math.round((collected / due) * 100) : 0;
  return (
    <View style={[view.summary, {padding: width < 600 ? 20 : 26}]}>
      <View style={styles.spread}>
        <View style={view.summaryLabel}>
          <Icon name="pie-chart" size={17} color={palette.mint} />
          <Text style={view.summaryLabelText}>Rent collected</Text>
        </View>
        <Text style={view.onForestSubtle}>{period}</Text>
      </View>
      <View style={[view.summaryBody, width >= 980 && view.summaryWide]}>
        <View style={width >= 980 && {flex: 1}}>
          <Text style={[view.summaryValue, {fontSize: width < 600 ? 38 : 48}]}>{money(collected)}</Text>
          <Text style={view.onForestSubtle}>of {money(due)} due for the month</Text>
        </View>
        <View style={[view.progressGroup, width >= 980 && {flex: 1}]}>
          <View
            accessibilityRole="progressbar" accessibilityLabel="Rent collection"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, pct)}
            aria-valuetext={due ? `${pct}% collected, ${money(collected)} of ${money(due)}` : 'No rent billed yet'}
            style={view.progressTrack}>
            <CollectionFill style={view.progressFill} percent={Math.min(100, pct)} />
          </View>
          <View style={styles.spread}>
            <Text style={view.progressText}>{pct}% collected</Text>
            <Text style={view.onForestSubtle}>{money(outstanding)} outstanding</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function BackAction({ label, onPress }: { label: string; onPress: () => void }) {
  return <View style={{alignSelf: 'flex-start'}}><Action label={label} icon="arrow-left" variant="quiet" onPress={onPress} /></View>;
}

const view = StyleSheet.create({
  record: {
    gap: 8, borderTopColor: palette.line, borderTopWidth: 1, paddingTop: 14, paddingBottom: 2,
  },
  recordContent: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10},
  recordIcon: {height: 36, width: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.sage},
  identity: {flexGrow: 1, flexShrink: 1, flexBasis: 116, minWidth: 0, gap: 3},
  recordTitle: {fontSize: 15, lineHeight: 20, color: palette.ink, fontWeight: '600', letterSpacing: -0.15},
  recordDetail: {fontSize: 13, lineHeight: 19, color: palette.muted},
  recordTotal: {alignItems: 'flex-end', gap: 4, maxWidth: '100%'},
  amount: {fontSize: 15, lineHeight: 20, textAlign: 'right', fontVariant: ['tabular-nums'], color: palette.ink, fontWeight: '700'},
  metric: {flexGrow: 1, flexShrink: 1, flexBasis: 140, minWidth: 136, padding: 16, gap: 8},
  metricLabel: {flexDirection: 'row', gap: 8, alignItems: 'center'},
  metricValue: {fontVariant: ['tabular-nums'], fontSize: 29, lineHeight: 35, color: palette.ink, fontWeight: '600', letterSpacing: -1.15},
  monthPicker: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: palette.line, borderRadius: 11, backgroundColor: palette.surface, maxWidth: '100%',
  },
  monthArrow: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 9},
  monthLabel: {flexShrink: 1, minWidth: 116, textAlign: 'center', fontSize: 13, fontWeight: '600', color: palette.ink},
  summary: {backgroundColor: palette.forest, borderRadius: 16, gap: 18, flexGrow: 1, justifyContent: 'space-between'},
  summaryBody: {gap: 20},
  summaryWide: {flexDirection: 'row', alignItems: 'flex-end', gap: 32},
  summaryLabel: {flexDirection: 'row', alignItems: 'center', gap: 8},
  summaryLabelText: {color: '#F2F4E7', fontSize: 14, fontWeight: '600'},
  summaryValue: {fontWeight: '500', fontVariant: ['tabular-nums'], color: '#FFFFFF', letterSpacing: -1.8, marginBottom: 3},
  onForestSubtle: {color: '#D8E4D5', fontSize: 13, lineHeight: 19},
  progressGroup: {gap: 8},
  progressTrack: {height: 6, borderRadius: 12, overflow: 'hidden', backgroundColor: '#3D6152'},
  progressFill: {height: '100%', backgroundColor: palette.mint, borderRadius: 12},
  progressText: {fontSize: 13, lineHeight: 19, color: palette.mint, fontWeight: '600'},
});
