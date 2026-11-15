-- Apply once through Supabase migrations. Existing rental records keep their identifiers.
begin;
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null, type text not null check(type in ('shop','house')), address text not null,
  monthly_rent numeric(12,2) not null check(monthly_rent >= 0),
  status text not null default 'vacant' check(status in ('vacant','occupied','maintenance')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid references public.properties(id), name text not null, phone text, email text,
  id_proof_type text, id_proof_number text, emergency_contact_name text, emergency_contact_phone text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.leases (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id), tenant_id uuid not null references public.tenants(id),
  start_date date not null, end_date date check(end_date >= start_date),
  monthly_rent numeric(12,2) not null check(monthly_rent > 0), advance_paid numeric(12,2) not null default 0,
  advance_balance numeric(12,2) not null default 0 check(advance_balance >= 0),
  status text not null default 'active' check(status in ('active','terminated','expired')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  lease_id uuid not null references public.leases(id), property_id uuid not null references public.properties(id),
  tenant_id uuid not null references public.tenants(id), amount numeric(12,2) not null check(amount > 0),
  payment_type text not null check(payment_type in ('rent','advance','maintenance','security_deposit','other')),
  month integer not null check(month between 1 and 12), year integer not null check(year between 1900 and 9999),
  status text not null check(status in ('paid','partial','pending','advance_used')),
  payment_date date not null, notes text, created_at timestamptz not null default now()
);
create table if not exists public.advance_transactions (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  lease_id uuid not null references public.leases(id), amount numeric(12,2) not null,
  transaction_type text not null check(transaction_type in ('credit','debit')), reason text not null,
  balance_after numeric(12,2) not null check(balance_after >= 0), created_at timestamptz not null default now()
);
-- Earlier clients wrote the cash amount to payments and recorded any advance used
-- to cover the shortfall only in advance_transactions. Represent both legs in the
-- payment journal without changing the historic cash amount or lease balance.
alter table public.payments add column if not exists settlement_source text not null default 'cash' check(settlement_source in ('cash','advance'));
insert into public.payments(id,owner_id,lease_id,property_id,tenant_id,amount,payment_type,month,year,status,payment_date,notes,created_at,settlement_source)
  select a.id,a.owner_id,l.id,l.property_id,l.tenant_id,abs(a.amount),'rent',parts[1]::int,parts[2]::int,'advance_used',
    a.created_at::date,'Advance applied to rent',a.created_at,'advance'
  from public.advance_transactions a join public.leases l on l.id=a.lease_id and l.owner_id=a.owner_id
  cross join lateral regexp_matches(a.reason,'^Rent shortfall - (1[0-2]|[1-9])/([1-9][0-9]{3})$') parts
  where a.transaction_type='debit' and a.amount<0 and parts[2]::int>=1900
  on conflict(id) do nothing;
create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id), title text not null, description text not null default '',
  status text not null default 'open' check(status in ('open','resolved')), created_at timestamptz not null default now()
);
-- A request and all its effects commit together. Replaying an acknowledged or interrupted request is safe.
create table if not exists public.rent_manager_requests (
  owner_id uuid not null references auth.users(id) on delete cascade, id uuid not null,
  command text not null, input_hash bytea not null, primary key(owner_id,id)
);
alter table public.rent_manager_requests enable row level security;
revoke all on public.rent_manager_requests from public, anon, authenticated;

do $setup$
declare t text;
begin
  foreach t in array array['properties','tenants','leases','payments','advance_transactions','maintenance_requests'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('drop policy if exists rent_manager_read on public.%I',t);
    execute format('drop policy if exists rent_manager_owner_scope on public.%I',t);
    execute format('create policy rent_manager_read on public.%I for select to authenticated using (owner_id = (select auth.uid()))',t);
    -- An older permissive policy must never broaden the owner scope.
    execute format('create policy rent_manager_owner_scope on public.%I as restrictive for select to authenticated using (owner_id = (select auth.uid()))',t);
    execute format('create index if not exists %I on public.%I(owner_id)', t||'_ledger_owner',t);
  end loop;
end $setup$;
create index if not exists payments_ledger_period on public.payments(owner_id,lease_id,year,month);
create index if not exists leases_ledger_property on public.leases(owner_id,property_id);
create index if not exists leases_ledger_tenant on public.leases(owner_id,tenant_id);

create or replace function public.rent_manager_snapshot(p_owner uuid) returns jsonb
language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'properties', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id) from public.properties p where p.owner_id=p_owner),'[]'::jsonb),
    'tenants', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc,t.id) from public.tenants t where t.owner_id=p_owner),'[]'::jsonb),
    'leases', coalesce((select jsonb_agg(to_jsonb(l) order by l.created_at desc,l.id) from public.leases l where l.owner_id=p_owner),'[]'::jsonb),
    'payments', coalesce((select jsonb_agg(to_jsonb(p) order by p.payment_date desc,p.created_at desc,p.id) from public.payments p where p.owner_id=p_owner),'[]'::jsonb),
    'maintenance', coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at desc,m.id) from public.maintenance_requests m where m.owner_id=p_owner),'[]'::jsonb)
  ) where p_owner = (select auth.uid());
$$;

create or replace function public.rent_manager_amount(value numeric, minimum numeric) returns numeric
language plpgsql immutable set search_path = ''
as $$
begin
  if value is null or value < minimum or value > 9999999999.99 or value <> round(value,2) then
    raise exception 'Enter a valid amount with at most two decimal places.';
  end if;
  return value;
end;
$$;
create or replace function public.rent_manager_apply(p_owner uuid,p_request uuid,p_command text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  kind text := p_command;
  property public.properties%rowtype;
  lease public.leases%rowtype;
  payment public.payments%rowtype;
  start_day date;
  end_day date;
  period_start date;
  amount numeric;
  previous numeric;
  tenant_id_input uuid;
  balance numeric;
  payload_hash bytea := sha256(convert_to(p_input::text,'UTF8'));
  existing public.rent_manager_requests%rowtype;
begin
  if auth.uid() is null or p_owner is distinct from auth.uid() then raise exception 'Sign in to this workspace.'; end if;
  if p_request is null or jsonb_typeof(p_input) is distinct from 'object' then raise exception 'Invalid request.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text, 0));
  select * into existing from public.rent_manager_requests where owner_id=p_owner and id=p_request;
  if found then
    if existing.command is distinct from kind or existing.input_hash is distinct from payload_hash then raise exception 'Request has already been used.'; end if;
    return public.rent_manager_snapshot(p_owner);
  end if;
  case kind
  when 'property','update_property' then
    if coalesce(length(trim(p_input->>'name')),0) not between 1 and 100 or coalesce(length(trim(p_input->>'address')),0) not between 1 and 500 then
      raise exception 'Enter a property name and address.';
    end if;
    property.type := p_input->>'type';
    if property.type not in ('house','shop') then raise exception 'Invalid property type.'; end if;
    amount := public.rent_manager_amount((p_input->>'monthly_rent')::numeric,0);
    if kind='property' then
      property.status := p_input->>'status';
      if property.status not in ('vacant','maintenance') then raise exception 'Invalid starting status.'; end if;
      insert into public.properties(id,owner_id,name,address,type,status,monthly_rent)
        values(p_request,p_owner,trim(p_input->>'name'),trim(p_input->>'address'),property.type,property.status,amount);
    else
      update public.properties p set name=trim(p_input->>'name'),address=trim(p_input->>'address'),
        type=property.type,monthly_rent=amount,updated_at=greatest(clock_timestamp(),p.updated_at+interval '1 microsecond')
      where p.owner_id=p_owner and p.id=(p_input->>'id')::uuid
        and (not (p_input?'expected_updated_at') or p.updated_at=(p_input->>'expected_updated_at')::timestamptz);
      if not found then raise exception 'Property missing or changed. Refresh the workspace and try again.'; end if;
    end if;
  when 'tenant','update_tenant' then
    if coalesce(length(trim(p_input->>'name')),0) not between 1 and 100 then raise exception 'Enter a tenant name.'; end if;
    if coalesce(p_input->>'email','') <> '' and (p_input->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Invalid email address.'; end if;
    if kind='tenant' then
      insert into public.tenants(id,owner_id,name,phone,email,notes,id_proof_type,id_proof_number,emergency_contact_name,emergency_contact_phone)
        values(p_request,p_owner,trim(p_input->>'name'),nullif(p_input->>'phone',''),nullif(p_input->>'email',''),nullif(p_input->>'notes',''),
          nullif(p_input->>'id_proof_type',''),nullif(p_input->>'id_proof_number',''),nullif(p_input->>'emergency_contact_name',''),nullif(p_input->>'emergency_contact_phone',''));
    else
      update public.tenants t set name=trim(p_input->>'name'), updated_at=greatest(clock_timestamp(),t.updated_at+interval '1 microsecond'),
        phone=case when p_input?'phone' then nullif(p_input->>'phone','') else t.phone end,
        email=case when p_input?'email' then nullif(p_input->>'email','') else t.email end,
        notes=case when p_input?'notes' then nullif(p_input->>'notes','') else t.notes end,
        id_proof_type=case when p_input?'id_proof_type' then nullif(p_input->>'id_proof_type','') else t.id_proof_type end,
        id_proof_number=case when p_input?'id_proof_number' then nullif(p_input->>'id_proof_number','') else t.id_proof_number end,
        emergency_contact_name=case when p_input?'emergency_contact_name' then nullif(p_input->>'emergency_contact_name','') else t.emergency_contact_name end,
        emergency_contact_phone=case when p_input?'emergency_contact_phone' then nullif(p_input->>'emergency_contact_phone','') else t.emergency_contact_phone end
      where t.owner_id=p_owner and t.id=(p_input->>'id')::uuid
        and (not (p_input?'expected_updated_at') or t.updated_at=(p_input->>'expected_updated_at')::timestamptz);
      if not found then raise exception 'Tenant missing or changed. Refresh the workspace and try again.'; end if;
    end if;
  when 'lease' then
    select * into property from public.properties where owner_id=p_owner and id=(p_input->>'property_id')::uuid;
    tenant_id_input := (p_input->>'tenant_id')::uuid;
    if property.id is null or not exists(select 1 from public.tenants where owner_id=p_owner and id=tenant_id_input) then raise exception 'Choose an existing property and tenant.'; end if;
    if property.status='maintenance' then raise exception 'This property is under maintenance.'; end if;
    start_day := (p_input->>'start_date')::date;
    end_day := nullif(p_input->>'end_date','')::date;
    if start_day is null or end_day < start_day then raise exception 'Invalid lease dates.'; end if;
    if exists(select 1 from public.leases l where l.owner_id=p_owner and (l.property_id=property.id or l.tenant_id=tenant_id_input)
        and (l.end_date is not null or l.status <> 'terminated') and
          daterange(l.start_date,l.end_date,case when l.status='terminated' then '[)' else '[]' end) && daterange(start_day,end_day,'[]')) then
      raise exception 'This property or tenant already has a lease during those dates.';
    end if;
    amount := public.rent_manager_amount((p_input->>'advance_paid')::numeric,0);
    insert into public.leases(id,owner_id,property_id,tenant_id,start_date,end_date,monthly_rent,advance_paid,advance_balance,status)
      values(p_request,p_owner,property.id,tenant_id_input,start_day,end_day,public.rent_manager_amount((p_input->>'monthly_rent')::numeric,0.01),amount,amount,'active');
    if amount>0 then
      insert into public.advance_transactions(owner_id,lease_id,amount,transaction_type,reason,balance_after) values(p_owner,p_request,amount,'credit','Initial advance',amount);
    end if;
  when 'end_lease' then
    select * into lease from public.leases where owner_id=p_owner and id=(p_input->>'id')::uuid;
    end_day := (p_input->>'end_date')::date;
    if lease.id is null or lease.status='terminated' or end_day is null or end_day < lease.start_date or end_day > lease.end_date then raise exception 'Invalid move-out date.'; end if;
    -- Accept the caller's local calendar day within the range of global time zones.
    if end_day > (now() at time zone 'Pacific/Kiritimati')::date then raise exception 'Move-out date must be on or before today.'; end if;
    if exists(select 1 from public.payments p where p.owner_id=p_owner and p.lease_id=lease.id and p.payment_type='rent' and make_date(p.year,p.month,1)>end_day) then
      raise exception 'Rent is already recorded after that move-out month.';
    end if;
    update public.leases set end_date=end_day,status='terminated',updated_at=now() where owner_id=p_owner and id=lease.id;
  when 'payment','apply_advance' then
    select * into lease from public.leases where owner_id=p_owner and id=(p_input->>'lease_id')::uuid;
    if lease.id is null then raise exception 'Choose an existing lease.'; end if;
    amount := public.rent_manager_amount((p_input->>'amount')::numeric,0.01);
    payment.payment_type := p_input->>'payment_type';
    payment.month := (p_input->>'month')::int;
    payment.year := (p_input->>'year')::int;
    payment.payment_date := (p_input->>'payment_date')::date;
    if payment.year not between 1900 and 9999 or payment.month not between 1 and 12 or payment.payment_type not in ('rent','advance','security_deposit','maintenance','other') then raise exception 'Invalid payment details.'; end if;
    period_start := make_date(payment.year,payment.month,1);
    balance := lease.advance_balance;
    payment.status := 'paid';
    if kind='apply_advance' and payment.payment_type is distinct from 'rent' then raise exception 'Advances can only be applied to rent.'; end if;
    if payment.payment_type='rent' then
      if period_start < date_trunc('month',lease.start_date)::date or period_start > lease.end_date or (lease.status='terminated' and lease.end_date is null) then raise exception 'Choose a rent month within the lease dates.'; end if;
      select coalesce(sum(p.amount),0) into previous from public.payments p where p.owner_id=p_owner and p.lease_id=lease.id and p.year=payment.year and p.month=payment.month and p.payment_type='rent' and p.status<>'pending';
      if previous+amount>lease.monthly_rent then raise exception 'Amount exceeds the rent outstanding for this month.'; end if;
      if previous+amount<lease.monthly_rent then payment.status:='partial'; end if;
      if kind='apply_advance' then
        if balance<amount then raise exception 'Amount exceeds the available advance.'; end if;
        balance:=balance-amount;
        payment.status:='advance_used';
        insert into public.advance_transactions(owner_id,lease_id,amount,transaction_type,reason,balance_after) values(p_owner,lease.id,-amount,'debit','Applied to rent '||period_start,balance);
      end if;
    elsif payment.payment_type='advance' then
      balance:=public.rent_manager_amount(balance+amount,0);
      insert into public.advance_transactions(owner_id,lease_id,amount,transaction_type,reason,balance_after) values(p_owner,lease.id,amount,'credit','Advance received',balance);
    end if;
    insert into public.payments(id,owner_id,lease_id,property_id,tenant_id,amount,payment_type,year,month,payment_date,status,notes,settlement_source)
      values(p_request,p_owner,lease.id,lease.property_id,lease.tenant_id,amount,payment.payment_type,payment.year,payment.month,payment.payment_date,payment.status,nullif(p_input->>'notes',''),
        case when kind='apply_advance' then 'advance' else 'cash' end);
    update public.leases set advance_balance=balance, updated_at=now() where owner_id=p_owner and id=lease.id;
  when 'maintenance' then
    if not exists(select 1 from public.properties where owner_id=p_owner and id=(p_input->>'property_id')::uuid) then raise exception 'Choose an existing property.'; end if;
    if coalesce(length(trim(p_input->>'title')),0) not between 1 and 160 or length(p_input->>'description')>2000 then raise exception 'Enter a maintenance title and a shorter description.'; end if;
    insert into public.maintenance_requests(id,owner_id,property_id,title,description,status)
      values(p_request,p_owner,(p_input->>'property_id')::uuid,trim(p_input->>'title'),coalesce(trim(p_input->>'description'),''),'open');
  when 'maintenance_status' then
    if (p_input->>'status') not in ('open','resolved') then raise exception 'Invalid maintenance status.'; end if;
    update public.maintenance_requests set status=p_input->>'status' where owner_id=p_owner and id=(p_input->>'id')::uuid;
    if not found then raise exception 'Maintenance request not found.'; end if;
  else raise exception 'Unknown ledger action.';
  end case;
  insert into public.rent_manager_requests(owner_id,id,command,input_hash) values(p_owner,p_request,kind,payload_hash);
  return public.rent_manager_snapshot(p_owner);
end;
$$;

revoke all on function public.rent_manager_snapshot(uuid), public.rent_manager_amount(numeric,numeric), public.rent_manager_apply(uuid,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.rent_manager_snapshot(uuid), public.rent_manager_apply(uuid,uuid,text,jsonb) to authenticated;
commit;
