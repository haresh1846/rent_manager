-- Run on a migrated disposable database containing Supabase's authenticated and anon roles.
begin;
insert into auth.users(id) values
 ('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002');
set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
do $test$
declare
  owner uuid := auth.uid();
  property_id uuid := gen_random_uuid();
  tenant_id uuid := gen_random_uuid();
  lease_id uuid := gen_random_uuid();
  ticket_id uuid := gen_random_uuid();
  request_id uuid := gen_random_uuid();
  rent jsonb;
  snapshot jsonb;
  blocked boolean;
begin
  perform public.rent_manager_apply(owner,property_id,'property','{"name":"Test house","type":"house","address":"Test address","monthly_rent":100,"status":"vacant"}');
  perform public.rent_manager_apply(owner,tenant_id,'tenant','{"name":"Test tenant","email":"a@example.com","emergency_contact_name":"Backup"}');
  perform public.rent_manager_apply(owner,lease_id,'lease',jsonb_build_object('property_id',property_id,'tenant_id',tenant_id,
    'start_date','2025-01-01','monthly_rent',100,'advance_paid',40));
  rent:=jsonb_build_object('lease_id',lease_id,'payment_type','rent','amount',60,'year',2025,'month',1,'payment_date','2025-01-02');
  perform public.rent_manager_apply(owner,request_id,'payment',rent);
  perform public.rent_manager_apply(owner,request_id,'payment',rent);
  snapshot:=public.rent_manager_apply(owner,gen_random_uuid(),'apply_advance',rent||'{"amount":40}');
  if jsonb_array_length(snapshot->'payments')<>2 or (snapshot#>>'{leases,0,advance_balance}')::numeric<>0 then
    raise exception 'Duplicate or missing payment, incorrect advance balance.';
  end if;
  snapshot:=public.rent_manager_apply(owner,gen_random_uuid(),'update_property',jsonb_build_object(
    'id',property_id,'expected_updated_at',snapshot#>>'{properties,0,updated_at}','name','Revised','address','New address','monthly_rent',125,'type','house','status','maintenance'));
  if snapshot#>>'{properties,0,name}'<>'Revised' or snapshot#>>'{properties,0,status}'<>'vacant'
     or (snapshot#>>'{properties,0,monthly_rent}')::numeric<>125 or (snapshot#>>'{leases,0,monthly_rent}')::numeric<>100 then raise exception 'Property edit damaged the existing lease or occupancy.'; end if;
  snapshot:=public.rent_manager_apply(owner,gen_random_uuid(),'update_tenant',jsonb_build_object(
    'id',tenant_id,'expected_updated_at',snapshot#>>'{tenants,0,updated_at}','name','Renamed','email',''));
  if snapshot#>>'{tenants,0,emergency_contact_name}'<>'Backup' or snapshot#>>'{tenants,0,email}' is not null or snapshot#>>'{tenants,0,name}'<>'Renamed' then raise exception 'Tenant edit overwrote retained data.'; end if;
  begin
    blocked:=false;
    perform public.rent_manager_apply(owner,gen_random_uuid(),'update_tenant',jsonb_build_object(
      'id',tenant_id,'expected_updated_at','2020-01-01','name','Stale'));
  exception when raise_exception then blocked:=sqlerrm like '%Refresh%'; end;
  if not blocked then raise exception 'Accepted a stale edit.'; end if;
  begin
    blocked:=false;
    perform public.rent_manager_apply(owner,gen_random_uuid(),'payment',rent||'{"amount":1}');
  exception when raise_exception then blocked:=sqlerrm like '%outstanding%'; end;
  if not blocked then raise exception 'Accepted an overpayment.'; end if;

  perform public.rent_manager_apply(owner,gen_random_uuid(),'payment',rent||'{"amount":10,"payment_type":"advance"}');
  perform public.rent_manager_apply(owner,ticket_id,'maintenance',jsonb_build_object('title','Repair door','property_id',property_id));
  perform public.rent_manager_apply(owner,gen_random_uuid(),'maintenance_status',jsonb_build_object('id',ticket_id,'status','resolved'));
  snapshot:=public.rent_manager_apply(owner,gen_random_uuid(),'end_lease',jsonb_build_object('id',lease_id,'end_date','2025-01-14'));
  if snapshot#>>'{leases,0,status}'<>'terminated' or snapshot#>>'{maintenance,0,status}'<>'resolved' then raise exception 'Move-out or maintenance update failed.'; end if;
  begin
    blocked:=false;
    insert into public.payments default values;
  exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Direct financial writes must be denied.'; end if;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  if public.rent_manager_snapshot(owner) is not null or exists(select 1 from public.properties) then raise exception 'Another account can read records.'; end if;
  begin
    blocked:=false;
    perform public.rent_manager_apply(owner,gen_random_uuid(),'tenant','{"name":"Wrong owner"}');
  exception when raise_exception then blocked:=sqlerrm like '%Sign in%'; end;
  if not blocked then raise exception 'Another account can change records.'; end if;
  begin
    blocked:=false;
    perform public.rent_manager_apply(auth.uid(),gen_random_uuid(),'payment',rent);
  exception when raise_exception then blocked:=sqlerrm like '%existing lease%'; end;
  if not blocked then raise exception 'A payment can reference another owner.'; end if;
end $test$;
reset role;
set local role anon;
do $test$ begin
  if has_function_privilege(current_user,'public.rent_manager_apply(uuid,uuid,text,jsonb)','execute')
     or has_function_privilege(current_user,'public.rent_manager_snapshot(uuid)','execute') then raise exception 'Anonymous access to ledger RPCs.'; end if;
end $test$;
rollback;
