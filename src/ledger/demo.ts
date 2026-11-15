import { applyCommand, emptyLedger, localDate, type Ledger } from './model.ts';

export function createDemoLedger(now = new Date()): Ledger {
  let data = emptyLedger();
  const owner = 'local-demo';
  const id = (n: number) => 'd0000000-0000-4000-8000-' + String(n).padStart(12, '0');
  const names = ['Gulmohar House', 'Market Road Studio', 'Lakeview Shop'];
  const addresses = ['12 Garden Road', '8 Market Road', '24 Lake Lane'];
  const rents = [18000, 24000, 16000];
  names.forEach((name, i) => {
    data = applyCommand(
      data,
      {
        kind: 'property',
        input: {
          name,
          type: i === 2 ? 'shop' : 'house',
          address: addresses[i],
          monthly_rent: rents[i],
          status: 'vacant',
        },
      },
      owner,
      id(i + 1),
      now
    );
  });
  ['Mira Shah', 'Arun Rao'].forEach((name, i) => {
    data = applyCommand(data, { kind: 'tenant', input: { name } }, owner, id(4 + i), now);
    const lease = id(6 + i);
    const date = localDate(now);
    data = applyCommand(
      data,
      {
        kind: 'lease',
        input: {
          property_id: id(1 + i),
          tenant_id: id(4 + i),
          start_date: date.slice(0, 7) + '-01',
          monthly_rent: rents[i],
          advance_paid: rents[i],
        },
      },
      owner,
      lease,
      now
    );
    data = applyCommand(
      data,
      {
        kind: 'payment',
        input: {
          lease_id: lease,
          amount: i === 0 ? rents[i] : 12000,
          payment_type: 'rent',
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          payment_date: date,
        },
      },
      owner,
      id(8 + i),
      now
    );
  });
  return data;
}
