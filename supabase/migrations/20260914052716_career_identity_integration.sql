-- Extend existing identity and JSONB career snapshots without rewriting old reports.
alter table public.profiles add column full_name text not null default '상담자';
alter table public.profiles add column speech_mode text not null default 'DIRECT' check(speech_mode in ('DIRECT','POLITE'));
create or replace function public.save_analysis(payload jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare sid uuid; uid uuid := auth.uid(); item text;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 insert into public.profiles(id,full_name,display_name,speech_mode) values(uid,coalesce(payload->'input'->>'fullName','상담자'),coalesce(payload->'input'->>'displayName','상담자'),coalesce(payload->'input'->>'speechMode','DIRECT')) on conflict(id) do update set full_name=excluded.full_name,display_name=excluded.display_name,speech_mode=excluded.speech_mode,updated_at=now();
 insert into public.analysis_sessions(user_id,input) values(uid,payload->'input') returning id into sid;
 insert into public.reports(session_id,user_id,data,rule_version,template_version) values(sid,uid,payload,payload->>'ruleVersion',payload->>'templateVersion');
 insert into public.career_profiles(session_id,user_id,data,rule_version,template_version) values(sid,uid,jsonb_build_object('input',payload->'input','normalized',coalesce(payload->'normalizedCareer','{}'::jsonb)),payload->>'ruleVersion',payload->>'templateVersion');
 insert into public.palm_analyses(session_id,user_id,data,rule_version,template_version) values(sid,uid,payload->'input'->'palm',payload->>'ruleVersion',payload->>'templateVersion');
 insert into public.palm_features(session_id,user_id,data,rule_version,template_version) values(sid,uid,payload->'input'->'palm'->'features',payload->>'ruleVersion',payload->>'templateVersion');
 insert into public.saju_profiles(session_id,user_id,data,rule_version,template_version) values(sid,uid,payload->'saju',payload->>'ruleVersion',payload->>'templateVersion');
 insert into public.saju_features(session_id,user_id,data,rule_version,template_version) values(sid,uid,payload->'saju'->'features',payload->>'ruleVersion',payload->>'templateVersion');
 insert into public.trait_scores(session_id,user_id,data,rule_version,template_version) values(sid,uid,jsonb_build_object('scores',payload->'traits','evidence',payload->'evidence'),payload->>'ruleVersion',payload->>'templateVersion');
 insert into public.career_scenarios(session_id,user_id,data,rule_version,template_version) values(sid,uid,payload->'scenarios',payload->>'ruleVersion',payload->>'templateVersion');
 insert into public.critical_points(session_id,user_id,data,rule_version,template_version) values(sid,uid,payload->'criticalPoints',payload->>'ruleVersion',payload->>'templateVersion');
 insert into public.recommended_actions(session_id,user_id,data,rule_version,template_version) values(sid,uid,payload->'actions',payload->>'ruleVersion',payload->>'templateVersion');
 insert into public.report_sections(session_id,user_id,data,rule_version,template_version) values(sid,uid,payload->'sections',payload->>'ruleVersion',payload->>'templateVersion');
 return sid;
end $$;
revoke all on function public.save_analysis(jsonb) from public,anon;
grant execute on function public.save_analysis(jsonb) to authenticated;
