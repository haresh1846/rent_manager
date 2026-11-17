import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Icon, type IconName, palette } from './ui';

interface Column<T> {
  label: string;
  share?: number;
  numeric?: boolean;
  render: (record: T) => ReactNode;
}

interface TableProps<T> {
  name: string;
  records: T[];
  rowKey: (record: T) => string;
  columns: Column<T>[];
  actions?: (record: T) => ReactNode;
}

export function LedgerTable<T>({name, records, rowKey, columns, actions}: TableProps<T>) {
  const {width, fontScale} = useWindowDimensions();
  const wide = width >= 1110 && fontScale <= 1.3;
  const webTable = wide && Platform.OS === 'web';
  return (
    <View role={webTable ? 'table' : undefined} aria-label={webTable ? name : undefined}>
      {wide && (
        <View role={webTable ? 'row' : undefined} style={[s.head, s.line]}>
          {columns.map(c => (
            <Text key={c.label} role={webTable ? 'columnheader' : undefined}
              style={[s.label, {flex: c.share ?? 1, textAlign: c.numeric ? 'right' : 'left'}]}>
              {c.label}
            </Text>
          ))}
          {actions && <Text role={webTable ? 'columnheader' : undefined} style={[s.label, s.actionWidth, {textAlign: 'right'}]}>Actions</Text>}
        </View>
      )}
      {records.map(record => (
        <View key={rowKey(record)} role={webTable ? 'row' : undefined} style={wide ? [s.line, s.record] : s.mobileRecord}>
          {columns.map((c, index) => (
            <View key={c.label} role={webTable ? 'cell' : undefined}
              style={wide ? {flex: c.share ?? 1, minWidth: 0, alignItems: c.numeric ? 'flex-end' : 'stretch'}
                : index === 0 ? s.mobileIdentity : s.mobileCell}>
              {!wide && index > 0 && <Text style={s.label}>{c.label}</Text>}
              {c.render(record)}
            </View>
          ))}
          {actions && (
            <View role={webTable ? 'cell' : undefined} style={wide ? [s.actionWidth, s.actions] : s.mobileActions}>
              {actions(record)}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

export function CellTitle({title, detail, icon}: {title: string; detail?: string; icon?: IconName}) {
  return (
    <View style={s.identity}>
      {icon && <View style={s.icon}><Icon name={icon} size={16} color={palette.forest} /></View>}
      <View style={s.identityText}>
        <Text style={s.title}>{title}</Text>
        {!!detail && <Text style={s.detail}>{detail}</Text>}
      </View>
    </View>
  );
}

export function CellText({children, amount, due}: {children: ReactNode; amount?: boolean; due?: boolean}) {
  return <Text style={[s.cellText, amount && s.amount, due && {color: palette.amber}]}>{children}</Text>;
}

export function BalanceLine({label, value, icon}: {label: string; value: string; icon: IconName}) {
  return (
    <View style={s.balance}>
      <View style={s.balanceLabel}>
        <Icon name={icon} size={16} color={palette.moss} />
        <Text style={s.detail}>{label}</Text>
      </View>
      <Text style={s.amount}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  line: {flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 12},
  head: {paddingVertical: 10, backgroundColor: palette.paper, borderRadius: 6},
  label: {fontSize: 11, lineHeight: 15, letterSpacing: 0.65, fontWeight: '700', color: palette.muted, textTransform: 'uppercase'},
  record: {paddingVertical: 12, borderBottomColor: palette.line, borderBottomWidth: StyleSheet.hairlineWidth},
  mobileRecord: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', columnGap: 16, rowGap: 12, paddingVertical: 16, borderTopColor: palette.line, borderTopWidth: StyleSheet.hairlineWidth},
  mobileIdentity: {width: '100%', minWidth: 0},
  mobileCell: {flexGrow: 1, flexBasis: 100, minWidth: 0, gap: 4},
  mobileActions: {width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 4},
  actionWidth: {flex: 1.35, minWidth: 164},
  actions: {alignItems: 'flex-end', gap: 2},
  identity: {flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0},
  identityText: {flex: 1, minWidth: 0, gap: 3},
  title: {color: palette.ink, fontSize: 15, lineHeight: 20, fontWeight: '600'},
  detail: {flexShrink: 1, color: palette.muted, fontSize: 13, lineHeight: 19},
  icon: {width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.paper},
  cellText: {color: palette.ink, fontSize: 14, lineHeight: 20},
  amount: {color: palette.ink, fontSize: 15, lineHeight: 21, fontWeight: '600', fontVariant: ['tabular-nums']},
  balance: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTopColor: palette.line, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10},
  balanceLabel: {flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1},
});
