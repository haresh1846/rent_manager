import { Children, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { calculateMonth, fundBalances, useLedger, usesAdvance } from '@/ledger';
import { billingMonthParam } from '@/ledger/model';
import { Action, Body, Card, Choices, Field, Header, Icon, Notice, Page, palette, styles } from './ui';
import { BackAction, cap, localDate, money, periodName, prettyDate } from './portfolio';
import type { PaymentType, PropertyType } from '@/types';

type Section = 'properties' | 'tenants' | 'leases' | 'payments' | 'maintenance';
const spec = {
  properties: { name: 'property', title: 'Add property', verb: 'Save property' },
  tenants: { name: 'tenant', title: 'Add tenant', verb: 'Save tenant' },
  leases: { name: 'lease', title: 'Create lease', verb: 'Create lease' },
  payments: { name: 'payment', title: 'Record payment', verb: 'Save payment' },
  maintenance: { name: 'request', title: 'New maintenance request', verb: 'Save request' },
} as const;
function amountValue(input: string, name: string, allowZero = false) {
  const raw = input.trim();
  if (
    !/^\d+(\.\d{1,2})?$/.test(raw) ||
    !Number.isSafeInteger(Math.round(Number(raw) * 100)) ||
    (!allowZero && Number(raw) === 0)
  )
    throw new Error('Enter a valid ' + name + ' in rupees with up to two decimal places.');
  return Number(raw);
}
function required(value: string, label: string) {
  if (!value.trim()) throw new Error(label + ' is required.');
  return value.trim();
}
function isoDay(value: string, label: string) {
  const date = new Date(value + 'T12:00:00Z');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    throw new Error('Enter ' + label + ' as YYYY-MM-DD.');
  return value;
}
const paymentTypes = ['rent', 'advance', 'security_deposit', 'maintenance', 'other'] as const;
const settlementTypes = ['advance_refund', 'deposit_refund', 'deposit_deduction'] as const;
type EntryType = PaymentType | 'apply_advance';
function isSettlementType(value: string | undefined): value is (typeof settlementTypes)[number] {
  return settlementTypes.some(type => type === value);
}

function FormPair({ children }: { children: ReactNode }) {
  return (
    <View style={form.pair}>
      {Children.map(children, (child) => child && <View style={form.pairedField}>{child}</View>)}
    </View>
  );
}

function HeldFund({ label, value }: { label: string; value: number }) {
  return (
    <View style={form.fund}>
      <Text style={form.caption}>{label}</Text>
      <Text style={form.fundAmount}>{money(value)}</Text>
    </View>
  );
}
export default function EntryForm({
  section,
  editing = false,
}: {
  section: Section;
  editing?: boolean;
}) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    lease?: string; id?: string; month?: string; amount?: string; type?: string; replaces?: string; from?: string; tenant?: string;
  }>();
  const ledger = useLedger();
  const { data } = ledger;
  const existingProperty =
    editing && section === 'properties'
      ? data.properties.find((p) => p.id === params.id)
      : undefined;
  const existingTenant =
    editing && section === 'tenants' ? data.tenants.find((t) => t.id === params.id) : undefined;
  const [openedRevision] = useState(existingProperty?.updated_at ?? existingTenant?.updated_at);
  const today = localDate();
  const original = section === 'payments' && params.replaces
    ? data.payments.find(p => p.id === params.replaces) : undefined;
  const initialMonth = original ? original.year + '-' + String(original.month).padStart(2, '0')
    : billingMonthParam(params.month) ?? today.slice(0, 7);
  const initialType: EntryType = original ? usesAdvance(original) ? 'apply_advance' : original.payment_type
    : isSettlementType(params.type) ? params.type : 'rent';
  const [name, setName] = useState(existingProperty?.name ?? existingTenant?.name ?? ''),
    [address, setAddress] = useState(existingProperty?.address ?? ''),
    [rent, setRent] = useState(existingProperty ? String(existingProperty.monthly_rent) : ''),
    [propertyType, setPropertyType] = useState<PropertyType>(existingProperty?.type ?? 'house');
  const [email, setEmail] = useState(existingTenant?.email ?? ''),
    [phone, setPhone] = useState(existingTenant?.phone ?? ''),
    [notes, setNotes] = useState(original?.notes ?? existingTenant?.notes ?? '');
  const [propertyId, setProperty] = useState(''),
    [tenantId, setTenant] = useState('');
  const [leaseId, setLease] = useState(original?.lease_id ?? params.lease ?? ''),
    [advance, setAdvance] = useState('0'),
    [date, setDate] = useState(original && original.payment_date <= today ? original.payment_date : today),
    [end, setEnd] = useState('');
  const [month, setMonth] = useState(initialMonth),
    [paymentType, setType] = useState<EntryType>(initialType),
    [amount, setAmount] = useState(original ? String(original.amount) : params.amount ?? '');
  const isSettlement = isSettlementType(paymentType);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const target = ('/' + section) as
    | '/properties'
    | '/tenants'
    | '/leases'
    | '/payments'
    | '/maintenance';
  const returnScreen = section === 'payments' && ['leases', 'arrears', 'statement', 'reports', 'overview'].includes(params.from ?? '')
    ? params.from : section;
  function goToList(billingMonth: string) {
    if (returnScreen === 'statement' && params.tenant) router.replace({ pathname: '/tenants/[id]/statement', params: { id: params.tenant } });
    else if (returnScreen === 'overview') router.replace('/');
    else if (returnScreen === 'reports') router.replace({ pathname: '/reports', params: { month: billingMonth } });
    else if (returnScreen === 'leases' || returnScreen === 'arrears') router.replace('/' + returnScreen as '/leases' | '/arrears');
    else if (section === 'payments') router.replace({ pathname: '/payments', params: { month: billingMonth } });
    else router.replace(target);
  }
  const goBack = () => goToList(initialMonth);
  const props = data.properties.map((p) => ({ value: p.id, label: p.name }));
  const tenants = data.tenants.map((t) => ({ value: t.id, label: t.name }));
  const leases = data.leases.map((l) => ({
    value: l.id,
    label: [
      data.properties.find((p) => p.id === l.property_id)?.name,
      data.tenants.find((t) => t.id === l.tenant_id)?.name,
      l.start_date,
    ]
      .filter(Boolean)
      .join(' · '),
  }));
  const selectedLease = data.leases.find((l) => l.id === leaseId);
  const funds = selectedLease ? fundBalances(data, selectedLease) : undefined;
  const [billingYear, billingNumber] = month.split('-').map(Number);
  const rentRow = section === 'payments' && billingMonthParam(month) && selectedLease &&
    (paymentType === 'rent' || paymentType === 'apply_advance')
    ? calculateMonth(data, billingYear, billingNumber).rows.find(row => row.lease.id === selectedLease.id)
    : undefined;
  function selectProperty(id: string) {
    setProperty(id);
    if (section === 'leases')
      setRent(String(data.properties.find((p) => p.id === id)?.monthly_rent ?? ''));
  }
  let fallback: ReactNode;
  if (section === 'payments' && params.replaces &&
    (!original?.reversal || data.payments.some(p => p.replaces_payment_id === original.id))) {
    fallback = <Notice tone="error">This payment is unavailable for replacement. Check its history in Payments.</Notice>;
  } else if (editing && !existingProperty && !existingTenant) {
    fallback = <Notice tone="error">This record is unavailable in your workspace.</Notice>;
  } else if (section === 'leases' && (!props.length || !tenants.length)) {
    fallback = (
      <>
        <Body>Add a property and a tenant before creating a lease.</Body>
        <View style={styles.wrap}>
          {!props.length && (
            <Action label="Add property" onPress={() => router.push('/properties/add')} />
          )}
          {!tenants.length && (
            <Action label="Add tenant" onPress={() => router.push('/tenants/add')} />
          )}
        </View>
      </>
    );
  } else if (section === 'payments' && !leases.length) {
    fallback = (
      <>
        <Body>Create a lease so the payment can be linked to a tenant and property.</Body>
        <Action label="Create lease" onPress={() => router.push('/leases/add')} />
      </>
    );
  } else if (section === 'maintenance' && !props.length) {
    fallback = (
      <>
        <Body>Add the property that needs maintenance first.</Body>
        <Action label="Add property" onPress={() => router.push('/properties/add')} />
      </>
    );
  }
  async function save() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      if (section === 'properties') {
        const input = {
          name: required(name, 'Property name'),
          address: required(address, 'Address'),
          type: propertyType,
          status: existingProperty?.status ?? 'vacant',
          monthly_rent: amountValue(rent, 'asking rent', true),
        } as const;
        if (existingProperty) await ledger.updateProperty(existingProperty.id, input, openedRevision);
        else await ledger.addProperty(input);
      }
      if (section === 'tenants') {
        const input = {
          name: required(name, 'Tenant name'),
          email: email.trim(),
          phone: phone.trim(),
          notes: notes.trim(),
        };
        if (existingTenant) await ledger.updateTenant(existingTenant.id, input, openedRevision);
        else await ledger.addTenant({ ...input, email: input.email || undefined });
      }
      if (section === 'leases')
        await ledger.addLease({
          property_id: required(propertyId, 'Property'),
          tenant_id: required(tenantId, 'Tenant'),
          monthly_rent: amountValue(rent, 'monthly rent'),
          advance_paid: amountValue(advance, 'opening advance', true),
          start_date: isoDay(date, 'the start date'),
          end_date: end.trim() ? isoDay(end.trim(), 'the end date') : undefined,
        });
      if (section === 'payments') {
        required(leaseId, 'Lease');
        if (!billingMonthParam(month))
          throw new Error('Enter the billing month as YYYY-MM.');
        const [year, billingMonth] = month.split('-').map(Number);
        const value = amountValue(amount, 'amount');
        if (paymentType === 'apply_advance')
          await ledger.applyAdvance(leaseId, year, billingMonth, value, original?.id);
        else
          await ledger.addPayment({
            lease_id: leaseId,
            amount: value,
            month: billingMonth,
            year,
            payment_type: paymentType,
            payment_date: isoDay(date, 'the payment date'),
            notes: notes.trim() || undefined,
          }, original?.id);
      }
      if (section === 'maintenance')
        await ledger.addMaintenance({
          property_id: required(propertyId, 'Property'),
          title: required(name, 'Request title'),
          description: notes.trim() || undefined,
        });
      goToList(month);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not save the ' + spec[section].name + '. Please retry.'
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const dateField = (label: string, value: string, onChangeText: (v: string) => void) => (
    <Field
      label={label}
      placeholder="YYYY-MM-DD"
      value={value}
      onChangeText={onChangeText}
      autoCapitalize="none"
      maxLength={10}
    />
  );
  return (
    <Page narrow>
      <BackAction label={'Back to ' + returnScreen} onPress={goBack} />
      <Header title={original ? 'Replace payment' : editing ? 'Edit ' + spec[section].name : spec[section].title} />
      <Card style={form.card}>
        {fallback || (
          <>
            {section === 'properties' && (
              <>
                <FormPair>
                  <Field
                    label="Property name"
                    placeholder="e.g. River Road House"
                    value={name}
                    onChangeText={setName}
                    maxLength={100}
                  />
                  <Choices
                    label="Property type"
                    value={propertyType}
                    onChange={setPropertyType}
                    options={[
                      { label: 'House', value: 'house' },
                      { label: 'Shop', value: 'shop' },
                    ]}
                  />
                </FormPair>
                <Field label="Address" value={address} onChangeText={setAddress} maxLength={500} />
                <Field
                  label="Asking rent per month (₹)"
                  keyboardType="decimal-pad"
                  value={rent}
                  onChangeText={setRent}
                />
                {editing && <Body muted>Existing leases keep their agreed monthly rent.</Body>}
              </>
            )}
            {section === 'tenants' && (
              <>
                <Field label="Tenant name" value={name} onChangeText={setName} maxLength={100} />
                <FormPair>
                  <Field
                    label="Phone (optional)"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    maxLength={32}
                  />
                  <Field
                    label="Email (optional)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </FormPair>
                <Field label="Notes (optional)" multiline value={notes} onChangeText={setNotes} />
              </>
            )}
            {(section === 'leases' || section === 'maintenance') && (
              <Choices
                label="Property"
                value={propertyId}
                onChange={selectProperty}
                options={props}
              />
            )}
            {section === 'leases' && (
              <>
                <Choices label="Tenant" value={tenantId} onChange={setTenant} options={tenants} />
                <FormPair>
                  {dateField('Start date', date, setDate)}
                  {dateField('End date (optional)', end, setEnd)}
                </FormPair>
                <FormPair>
                  <Field
                    label="Monthly rent (₹)"
                    keyboardType="decimal-pad"
                    value={rent}
                    onChangeText={setRent}
                  />
                  <Field
                    label="Opening advance (₹)"
                    keyboardType="decimal-pad"
                    value={advance}
                    onChangeText={setAdvance}
                  />
                </FormPair>
                <Body muted>Rent is billed in full for each calendar month the lease covers.</Body>
              </>
            )}
            {section === 'payments' && (
              <>
                {original && <Notice>Replacing the reversed {money(original.amount)} entry dated {prettyDate(original.payment_date)}. Both entries will remain in the history.</Notice>}
                <Choices label="Lease" value={leaseId} onChange={setLease} options={leases} />
                {selectedLease && funds && (
                  <View style={form.balance}>
                    <View style={form.balanceTop}>
                      <View style={form.balanceLabel}>
                        <Icon name="file-text" size={16} color={palette.moss} />
                        <View style={form.balancePeriod}>
                          <Text style={form.balanceTitle}>{rentRow ? 'Rent outstanding' : 'Monthly rent'}</Text>
                          <Text style={form.caption}>
                            {rentRow ? periodName(billingYear, billingNumber) : 'Lease from ' + prettyDate(selectedLease.start_date)}
                          </Text>
                        </View>
                      </View>
                      <Text style={form.rentAmount}>{money(rentRow ? rentRow.outstanding : selectedLease.monthly_rent)}</Text>
                    </View>
                    <View style={form.funds}>
                      <HeldFund label="Available advance" value={funds.advance} />
                      <HeldFund label="Deposit held" value={funds.deposit} />
                    </View>
                  </View>
                )}
                <Choices label="Transaction" value={isSettlement ? 'settlement' : 'receipt'}
                  options={[{ label: 'Receive or apply funds', value: 'receipt' }, { label: 'Refund or deduct', value: 'settlement' }]}
                  onChange={mode => setType(mode === 'settlement' ? 'advance_refund' : 'rent')} />
                <Choices
                  label="Payment type"
                  value={paymentType}
                  onChange={setType}
                  options={isSettlement ? settlementTypes.map(value => ({ label: cap(value), value })) : [
                    ...paymentTypes.map((value) => ({ label: cap(value), value })),
                    { label: 'Apply advance to rent', value: 'apply_advance' },
                  ]}
                />
                <Field
                  label="Amount (₹)"
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                />
                <FormPair>
                  <Field
                    label="Billing month"
                    placeholder="YYYY-MM"
                    value={month}
                    onChangeText={setMonth}
                    maxLength={7}
                  />
                  {paymentType !== 'apply_advance' && dateField('Payment date', date, setDate)}
                </FormPair>
                {paymentType !== 'apply_advance' && (
                  <Field label={paymentType === 'deposit_deduction' ? 'Reason for deduction' : 'Payment note (optional)'}
                    value={notes} onChangeText={setNotes} />
                )}
              </>
            )}
            {section === 'maintenance' && (
              <>
                <Field
                  label="Request title"
                  placeholder="e.g. Repair kitchen tap"
                  value={name}
                  onChangeText={setName}
                  maxLength={150}
                />
                <Field
                  label="Description (optional)"
                  multiline
                  value={notes}
                  onChangeText={setNotes}
                />
              </>
            )}
            {!!error && <Notice tone="error">{error}</Notice>}
            <View style={[styles.wrap, form.footer]}>
              <Action
                label={busy ? 'Saving…' : original ? 'Save replacement' : spec[section].verb}
                icon="check"
                disabled={busy}
                onPress={() => void save()}
              />
              <Action label="Cancel" disabled={busy} variant="quiet" onPress={goBack} />
            </View>
          </>
        )}
      </Card>
    </Page>
  );
}

const form = StyleSheet.create({
  card: { gap: 20 },
  pair: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 16 },
  pairedField: { flexBasis: 220, flexGrow: 1, flexShrink: 1, minWidth: 0 },
  balance: { padding: 16, gap: 12, borderWidth: 1, borderColor: palette.sageDeep, borderRadius: 12, backgroundColor: palette.sage },
  balanceTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  balanceLabel: { flexDirection: 'row', alignItems: 'center', gap: 9, minWidth: 0, flexShrink: 1 },
  balancePeriod: { gap: 2, flexShrink: 1 },
  balanceTitle: { color: palette.forest, fontWeight: '600', fontSize: 14, lineHeight: 19 },
  caption: { color: palette.muted, fontSize: 12, lineHeight: 17 },
  rentAmount: { color: palette.forest, fontSize: 24, lineHeight: 29, fontWeight: '600', fontVariant: ['tabular-nums'], letterSpacing: -0.7 },
  funds: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, borderTopWidth: 1, borderTopColor: palette.sageDeep, paddingTop: 10 },
  fund: { flexGrow: 1, flexBasis: 105, minWidth: 0, gap: 2 },
  fundAmount: { fontSize: 15, lineHeight: 21, fontWeight: '600', color: palette.ink, fontVariant: ['tabular-nums'] },
  footer: { borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 16, gap: 12 },
});
