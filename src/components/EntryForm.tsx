import { useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLedger } from '@/ledger';
import { Action, Body, Card, Choices, Field, Header, Notice, Page, styles } from './ui';
import { BackAction, cap, localDate, money } from './portfolio';
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
export default function EntryForm({
  section,
  editing = false,
}: {
  section: Section;
  editing?: boolean;
}) {
  const router = useRouter();
  const params = useLocalSearchParams<{ lease?: string; id?: string }>();
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
  const [name, setName] = useState(existingProperty?.name ?? existingTenant?.name ?? ''),
    [address, setAddress] = useState(existingProperty?.address ?? ''),
    [rent, setRent] = useState(existingProperty ? String(existingProperty.monthly_rent) : ''),
    [propertyType, setPropertyType] = useState<PropertyType>(existingProperty?.type ?? 'house');
  const [email, setEmail] = useState(existingTenant?.email ?? ''),
    [phone, setPhone] = useState(existingTenant?.phone ?? ''),
    [notes, setNotes] = useState(existingTenant?.notes ?? '');
  const [propertyId, setProperty] = useState(''),
    [tenantId, setTenant] = useState('');
  const [leaseId, setLease] = useState(params.lease || ''),
    [advance, setAdvance] = useState('0'),
    [date, setDate] = useState(today),
    [end, setEnd] = useState('');
  const [month, setMonth] = useState(today.slice(0, 7)),
    [paymentType, setType] = useState<PaymentType | 'apply_advance'>('rent'),
    [amount, setAmount] = useState('');
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const target = ('/' + section) as
    | '/properties'
    | '/tenants'
    | '/leases'
    | '/payments'
    | '/maintenance';
  const goBack = () => router.replace(target);
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
  function selectProperty(id: string) {
    setProperty(id);
    if (section === 'leases')
      setRent(String(data.properties.find((p) => p.id === id)?.monthly_rent ?? ''));
  }
  let fallback: ReactNode;
  if (editing && !existingProperty && !existingTenant) {
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
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
          throw new Error('Enter the billing month as YYYY-MM.');
        const [year, billingMonth] = month.split('-').map(Number);
        const value = amountValue(amount, 'amount');
        if (paymentType === 'apply_advance')
          await ledger.applyAdvance(leaseId, year, billingMonth, value);
        else
          await ledger.addPayment({
            lease_id: leaseId,
            amount: value,
            month: billingMonth,
            year,
            payment_type: paymentType,
            payment_date: isoDay(date, 'the payment date'),
            notes: notes.trim() || undefined,
          });
      }
      if (section === 'maintenance')
        await ledger.addMaintenance({
          property_id: required(propertyId, 'Property'),
          title: required(name, 'Request title'),
          description: notes.trim() || undefined,
        });
      goBack();
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
      <BackAction label={'Back to ' + section} onPress={goBack} />
      <Header title={editing ? 'Edit ' + spec[section].name : spec[section].title} />
      <Card style={{ gap: 17 }}>
        {fallback || (
          <>
            {section === 'properties' && (
              <>
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
                {dateField('Start date', date, setDate)}
                {dateField('End date (optional)', end, setEnd)}
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
                <Body muted>Rent is billed in full for each calendar month the lease covers.</Body>
              </>
            )}
            {section === 'payments' && (
              <>
                <Choices label="Lease" value={leaseId} onChange={setLease} options={leases} />
                <Choices
                  label="Payment type"
                  value={paymentType}
                  onChange={setType}
                  options={[
                    ...paymentTypes.map((value) => ({ label: cap(value), value })),
                    { label: 'Apply advance to rent', value: 'apply_advance' },
                  ]}
                />
                {selectedLease && (
                  <Body muted>
                    Monthly rent {money(selectedLease.monthly_rent)} · Available advance{' '}
                    {money(selectedLease.advance_balance)}
                  </Body>
                )}
                <Field
                  label="Amount (₹)"
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                />
                <Field
                  label="Billing month"
                  placeholder="YYYY-MM"
                  value={month}
                  onChangeText={setMonth}
                  maxLength={7}
                />
                {paymentType !== 'apply_advance' && (
                  <>
                    {dateField('Payment date', date, setDate)}
                    <Field label="Payment note (optional)" value={notes} onChangeText={setNotes} />
                  </>
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
            <View style={styles.wrap}>
              <Action
                label={busy ? 'Saving…' : spec[section].verb}
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
