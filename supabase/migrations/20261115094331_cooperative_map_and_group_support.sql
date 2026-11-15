-- New rules are opt-in on NEW runs only. No data, ACL, RLS, grant, table or publication changes.
-- Existing private RPC keeps every owner/member/TV/expiry/status/run/idempotency guard.
DO $migration$
DECLARE fn oid:=to_regprocedure('physical_internal.expedition_action(uuid,text,text,uuid,jsonb)'); current_body text; new_body text; definition text;
BEGIN
 IF fn IS NULL OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=fn AND prosecdef AND NOT proisstrict AND NOT proleakproof AND NOT proretset AND provolatile='v' AND proparallel='u' AND pronargdefaults=3 AND proargnames=ARRAY['p_room','p_game','p_action','p_group','p_data'] AND pg_get_userbyid(proowner)='postgres' AND proconfig=ARRAY['search_path=""']) THEN RAISE EXCEPTION 'Reviewed private expedition RPC required'; END IF;
 SELECT prosrc INTO current_body FROM pg_proc WHERE oid=fn;
 IF md5(replace(current_body,E'\r\n',E'\n'))='8dc92ac12c3a3228a5a55ab57980da8d' THEN RETURN; END IF;
 IF md5(replace(current_body,E'\r\n',E'\n'))<>'d536e99447203aae0aab101df8596790' THEN RAISE EXCEPTION 'Expedition definition changed; review before applying'; END IF;
 new_body:=replace(current_body,E'\r\n',E'\n');
 new_body:=replace(new_body,$before$role_time double precision;$before$,$after$role_time double precision; map_brief jsonb; map_signals text[]; map_role integer; map_signal_text text;$after$);
 new_body:=replace(new_body,$before$'settings',settings,'workshopVersion'$before$,$after$'settings',settings,'mapVersion',CASE WHEN p_data->>'mapVersion'='2' THEN 2 ELSE 1 END,'workshopVersion'$after$);
 new_body:=replace(new_body,$before$CASE WHEN jsonb_typeof(p_data->'settings')='object' THEN jsonb_build_object('settings',settings) ELSE '{}'::jsonb END);$before$,$after$(CASE WHEN jsonb_typeof(p_data->'settings')='object' THEN jsonb_build_object('settings',settings) ELSE '{}'::jsonb END)||jsonb_build_object('mapVersion',coalesce(p_data->'mapVersion','1'::jsonb)));$after$);
 new_body:=replace(new_body,$before$sequence:=CASE WHEN e.seed%2=0 THEN ARRAY['river','tower','forest'] ELSE ARRAY['tower','forest','river'] END;$before$,$after$sequence:=CASE WHEN e.config->>'mapVersion'='2' AND settings->>'stationOrder'='auto' THEN CASE e.seed%6 WHEN 0 THEN ARRAY['river','tower','forest'] WHEN 1 THEN ARRAY['tower','forest','river'] WHEN 2 THEN ARRAY['forest','river','tower'] WHEN 3 THEN ARRAY['river','forest','tower'] WHEN 4 THEN ARRAY['forest','tower','river'] ELSE ARRAY['tower','river','forest'] END ELSE CASE WHEN e.seed%2=0 THEN ARRAY['river','tower','forest'] ELSE ARRAY['tower','forest','river'] END END;$after$);
 new_body:=replace(new_body,$before$   IF p_action='visit' AND p_game='expedition-map' THEN$before$,$after$   IF p_action='support' THEN
    IF p_data->>'kind' IS NULL OR p_data->>'kind' NOT IN ('need-clue','need-partner','need-rhythm','offering','none') THEN RAISE EXCEPTION 'Invalid support signal' USING ERRCODE='22023'; END IF;
    g:=g||jsonb_build_object('support',p_data->>'kind');
   ELSIF p_action='visit' AND p_game='expedition-map' THEN$after$);
 new_body:=replace(new_body,$before$IF e.phase>=3 OR chosen IS NULL OR NOT (g->'visited') ? chosen THEN RAISE EXCEPTION 'Visit the chosen station first' USING ERRCODE='22023'; END IF;$before$,$after$IF e.phase>=3 OR chosen IS NULL OR NOT (g->'visited') ? chosen THEN RAISE EXCEPTION 'Visit the chosen station first' USING ERRCODE='22023'; END IF;
    IF e.config->>'mapVersion'='2' AND (p_data->>'gesture' IS NULL OR p_data->>'gesture' NOT IN ('open','wings','knees')) THEN RAISE EXCEPTION 'Choose the shared carrying signal' USING ERRCODE='22023'; END IF;$after$);
 new_body:=replace(new_body,$before$g:=g||jsonb_build_object('vote',chosen,'done',false);$before$,$after$g:=g||jsonb_build_object('vote',chosen,'done',false);
    IF e.config->>'mapVersion'='2' THEN g:=g||jsonb_build_object('voteGesture',p_data->>'gesture'); END IF;$after$);
 new_body:=replace(new_body,$before$IF NOT EXISTS(SELECT 1 FROM jsonb_each(e.groups) z WHERE z.value->>'vote' IS DISTINCT FROM expected) THEN$before$,$after$IF NOT EXISTS(SELECT 1 FROM jsonb_each(e.groups) z WHERE z.value->>'vote' IS DISTINCT FROM expected OR (e.config->>'mapVersion'='2' AND z.value->>'voteGesture' IS DISTINCT FROM (ARRAY['open','wings','knees'])[1+((e.seed/6+e.phase)%3)])) THEN$after$);
 new_body:=replace(new_body,$before$SELECT jsonb_object_agg(key,value||jsonb_build_object('vote',NULL,'visited','[]'::jsonb,'done',e.phase=3)) INTO e.groups FROM jsonb_each(e.groups);$before$,$after$SELECT jsonb_object_agg(key,(CASE WHEN e.config->>'mapVersion'='2' THEN value||jsonb_build_object('mapHistory',coalesce(value->'mapHistory','[]'::jsonb)||jsonb_build_array(jsonb_build_object('station',expected,'gesture',value->>'voteGesture')),'voteGesture',NULL,'support','none') ELSE value END)||jsonb_build_object('vote',NULL,'visited','[]'::jsonb,'done',e.phase=3)) INTO e.groups FROM jsonb_each(e.groups);$after$);
 new_body:=replace(new_body,$before$IF g->'workshop'->>'level'='easy' OR (SELECT count(*) FROM jsonb_each(e.groups))<(CASE WHEN g->'workshop'->>'level'='challenge' THEN 2 ELSE 3 END) THEN chosen:='길 순서: '||array_to_string(sequence,' → ');END IF;$before$,$after$IF g->'workshop'->>'level'='easy' OR (SELECT count(*) FROM jsonb_each(e.groups))<(CASE WHEN g->'workshop'->>'level'='challenge' THEN 2 ELSE 3 END) THEN chosen:='길 순서: '||array_to_string(sequence,' → ');END IF;
   IF p_game='expedition-map' AND e.config->>'mapVersion'='2' THEN
    SELECT count(*) INTO n FROM jsonb_each(e.groups);map_role:=idx%least(n,3);
    map_signals:=ARRAY[(ARRAY['open','wings','knees'])[1+(e.seed/6)%3],(ARRAY['open','wings','knees'])[1+(e.seed/6+1)%3],(ARRAY['open','wings','knees'])[1+(e.seed/6+2)%3]];
    SELECT string_agg(pos::text||'관문 '||CASE signal WHEN 'open' THEN '손바닥 펴기' WHEN 'wings' THEN '팔 작게 펼치기' ELSE '양손 무릎 가볍게 짚기' END,' → ' ORDER BY pos) INTO map_signal_text FROM unnest(map_signals) WITH ORDINALITY AS signals(signal,pos);
    map_brief:=CASE WHEN n=1 THEN jsonb_build_object('role','combined','title','혼자 연결하는 연습 단서','text','첫 길은 '||sequence[1]||', 마지막은 '||sequence[3]||'이에요. '||map_signal_text,'signals',to_jsonb(map_signals))
     WHEN map_role=0 THEN jsonb_build_object('role','first','title','첫 길 탐사단','text','첫 길은 '||sequence[1]||'이에요. 다른 모둠에게 몸짓으로 알려 줘요.'||CASE WHEN n=2 THEN ' 운반 약속: '||map_signal_text ELSE '' END)||CASE WHEN n=2 THEN jsonb_build_object('signals',to_jsonb(map_signals)) ELSE '{}'::jsonb END
     WHEN map_role=1 THEN jsonb_build_object('role','last','title','도착지 연결단','text','마지막 길은 '||sequence[3]||'이에요. 첫 길을 물어보고 가운데 길을 함께 찾아요.')
     ELSE jsonb_build_object('role','signal','title','운반 약속 설계단','text','길 단서는 다른 모둠에게 물어봐요. 운반 약속: '||map_signal_text||'. 관문마다 몸짓으로 전해요.','signals',to_jsonb(map_signals)) END;
    chosen:=map_brief->>'text';
   END IF;$after$);
 new_body:=replace(new_body,$before$RETURN jsonb_build_object('runId',e.run_id,'game',p_game,$before$,$after$RETURN jsonb_build_object('playVersion',1,'mapRules',CASE WHEN p_game='expedition-map' AND e.config->>'mapVersion'='2' THEN jsonb_build_object('version',2,'brief',map_brief,'history',coalesce(e.groups->p_group::text->'mapHistory','[]'::jsonb)) ELSE NULL END,'runId',e.run_id,'game',p_game,$after$);
 -- SQL dollar-quoted replacements may come from a CRLF checkout too.
 new_body:=replace(new_body,E'\r\n',E'\n');
 IF md5(new_body)<>'8dc92ac12c3a3228a5a55ab57980da8d' THEN RAISE EXCEPTION 'Incomplete expedition patch'; END IF;
 definition:=pg_get_functiondef(fn);EXECUTE replace(definition,current_body,new_body);
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid=fn)<>'8dc92ac12c3a3228a5a55ab57980da8d' THEN RAISE EXCEPTION 'Expedition patch verification failed'; END IF;
END $migration$;
NOTIFY pgrst,'reload schema';
