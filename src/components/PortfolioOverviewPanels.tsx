import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useLocalWorkspace } from '@/providers';
import type { calculateMonth } from '@/ledger';
import {
  Action,
  Body,
  Card,
  Icon,
  Notice,
  palette,
  styles,
  type ControlState,
  type IconName,
} from './ui';
import { money, PanelHead } from './portfolio';
import { CollectionFill } from './CollectionFill';

export function RentBreakdown({
  rows,
  onReport,
  style,
}: {
  rows: ReturnType<typeof calculateMonth>['rows'];
  onReport: () => void;
  style: ViewStyle;
}) {
  const router = useRouter();
  return (
    <Card style={[style, { gap: 12 }]}>
      <PanelHead
        title="Rent by lease"
        action={<Action label="View report" icon="arrow-up-right" variant="quiet" onPress={onReport} />}
      />
      <View style={css.legend}>
        <View style={[css.dot, { backgroundColor: '#53765B' }]} />
        <Text style={css.note}>Settled</Text>
        <View style={[css.dot, { backgroundColor: '#D9DED1', marginLeft: 8 }]} />
        <Text style={css.note}>Unpaid</Text>
      </View>
      {rows.slice(0, 4).map(({ lease, property, tenant, collected, due }) => (
        <Pressable
          key={lease.id}
          accessibilityRole="button"
          accessibilityLabel={
            property.name +
            ', ' +
            tenant.name +
            ', ' +
            money(collected) +
            ' of ' +
            money(due) +
            ' settled. View statement'
          }
          onPress={() => router.push({ pathname: '/tenants/[id]/statement', params: { id: tenant.id } })}
          style={({ pressed, hovered, focused }: ControlState) => [
            css.allocation,
            hovered && css.hover,
            focused && styles.controlFocus,
            pressed && { opacity: 0.74 },
          ]}
        >
          <View style={css.allocationTitle}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={css.rowName}>{property.name}</Text>
              <Text style={css.note}>{tenant.name}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={css.total}>{money(collected)}</Text>
              <Text style={css.note}>of {money(due)}</Text>
            </View>
          </View>
          <View style={css.track}>
            <CollectionFill
              style={css.progress}
              percent={due ? Math.min(100, (100 * collected) / due) : 0}
            />
          </View>
        </Pressable>
      ))}
      {rows.length === 0 && <Body muted>No rent billed for this month.</Body>}
    </Card>
  );
}

const setupSteps = [
  {
    label: 'Add property',
    detail: 'Enter its address and asking rent.',
    icon: 'home',
    path: '/properties/add',
  },
  {
    label: 'Add tenant',
    detail: 'Save the tenant’s name and contact details.',
    icon: 'user-plus',
    path: '/tenants/add',
  },
  {
    label: 'Create lease',
    detail: 'Link a tenant to a property and set the rent.',
    icon: 'file-text',
    path: '/leases/add',
  },
] as const;

export function SetupPanel({ hasProperty, hasTenant, style }: { hasProperty: boolean; hasTenant: boolean; style: ViewStyle }) {
  const router = useRouter();
  const { workspace, selectWorkspace } = useLocalWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function openSample() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await selectWorkspace('demo');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to open the sample workspace.');
    } finally {
      setBusy(false);
    }
  }
  const done = [hasProperty, hasTenant, false];
  return (
    <Card style={style}>
      <PanelHead title="Set up your portfolio" />
      {setupSteps.map((step, i) => {
        const available = i < 2 || (hasProperty && hasTenant);
        return (
          <Pressable
            key={step.path}
            accessibilityRole="button"
            accessibilityLabel={step.label}
            disabled={!available}
            accessibilityState={{ disabled: !available }}
            onPress={() => router.push(step.path)}
            style={({ pressed, hovered, focused }: ControlState) => [
              css.step,
              available && hovered && css.hover,
              focused && styles.controlFocus,
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={[css.stepIcon, done[i] && { backgroundColor: '#DCEBD7' }]}>
              <Icon
                name={done[i] ? 'check' : step.icon}
                size={17}
                color={available ? palette.forest : '#77867B'}
              />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={css.rowName}>{step.label}</Text>
              <Text style={css.note}>{step.detail}</Text>
            </View>
            <Icon name={available ? 'chevron-right' : 'lock'} size={15} color={palette.muted} />
          </Pressable>
        );
      })}
      {workspace === 'personal' && (
        <View style={{ alignSelf: 'flex-start' }}>
          <Action
            label={busy ? 'Opening…' : 'Explore sample workspace'}
            icon="layers"
            variant="quiet"
            disabled={busy}
            onPress={() => void openSample()}
          />
        </View>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </Card>
  );
}

export function Shortcut({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed, hovered, focused }: ControlState) => [
        css.shortcut,
        hovered && css.hover,
        focused && styles.controlFocus,
        pressed && { backgroundColor: '#E9EEE3' },
      ]}
    >
      <Icon name={icon} size={16} />
      <Text style={css.link}>{label}</Text>
      <Icon name="chevron-right" size={13} color={palette.muted} />
    </Pressable>
  );
}
const css = StyleSheet.create({
  hover: { backgroundColor: '#F3F6EE' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  dot: { width: 8, height: 8, borderRadius: 3 },
  note: { color: '#596B5F', fontSize: 12, lineHeight: 18 },
  allocation: { gap: 10, paddingVertical: 5, minHeight: 52 },
  allocationTitle: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowName: { fontSize: 15, lineHeight: 21, fontWeight: '600', color: palette.ink },
  total: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    color: palette.ink,
    fontVariant: ['tabular-nums'],
  },
  track: { height: 7, backgroundColor: '#E2E6DA', borderRadius: 6, overflow: 'hidden' },
  progress: { height: '100%', backgroundColor: '#53765B', borderRadius: 6 },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 54,
    borderTopWidth: 1,
    borderColor: '#E3E6DE',
    paddingTop: 10,
  },
  stepIcon: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F0F2E9',
  },
  shortcut: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderTopWidth: 1,
    borderTopColor: '#E3E7DE',
  },
  link: { flex: 1, color: palette.ink, fontSize: 14, fontWeight: '500' },
});
