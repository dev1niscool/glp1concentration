-- Transactional integration checks: temporary users and data are rolled back.
begin;
insert into auth.users(id, email, aud, role) values
 ('00000000-0000-4000-a000-000000000001', 'profile-test-a@example.invalid', 'authenticated', 'authenticated'),
 ('00000000-0000-4000-a000-000000000002', 'profile-test-b@example.invalid', 'authenticated', 'authenticated');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-000000000001', true);
select public.save_injection_profile('[{"id":1,"compound":"tirzepatide","doseMg":2.5,"timeOfDay":"night","dates":["2026-08-11","2026-08-18"]}]',0,'00000000-0000-4000-a000-000000000001');
do $$ begin
  if (select count(*) from public.injection_profiles) <> 1 then raise exception 'own profile not readable'; end if;
  begin
    perform public.save_injection_profile('[]',0,'00000000-0000-4000-a000-000000000001');
    raise exception 'stale revision unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm <> 'profile_conflict' then raise; end if;
  end;
  begin
    perform public.save_injection_profile('[]',1,'00000000-0000-4000-a000-000000000002');
    raise exception 'wrong account unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm <> 'authentication_required' then raise; end if;
  end;
  begin
    perform public.save_injection_profile('[{"compound":"tirzepatide","doseMg":999,"timeOfDay":"night","dates":["2026-08-11"]}]',1,'00000000-0000-4000-a000-000000000001');
    raise exception 'invalid dose unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm <> 'invalid_dose' then raise; end if;
  end;
end $$;
select public.save_injection_profile('[{"id":1,"compound":"tirzepatide","doseMg":5,"timeOfDay":"night","dates":["2026-08-25"]}]',1,'00000000-0000-4000-a000-000000000001');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-000000000002', true);
do $$ begin
  if (select count(*) from public.injection_profiles) <> 0 then raise exception 'another account can read profile'; end if;
end $$;
select public.save_injection_profile('[]',0,'00000000-0000-4000-a000-000000000002');
reset role;
do $$ begin
  if (select revision from public.injection_profiles where user_id='00000000-0000-4000-a000-000000000001') <> 2 then raise exception 'update revision failed'; end if;
  if has_table_privilege('anon','public.injection_profiles','select') then raise exception 'anonymous read allowed'; end if;
  if has_function_privilege('anon','public.save_injection_profile(jsonb,bigint,uuid)','execute') then raise exception 'anonymous write allowed'; end if;
  if has_table_privilege('authenticated','public.injection_profiles','update') then raise exception 'unguarded direct writes allowed'; end if;
end $$;
rollback;
select 'Profile isolation, account binding, revision conflicts, invalid doses, and anonymous access checks passed.' as result;
