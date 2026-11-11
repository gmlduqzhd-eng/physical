DO $$ BEGIN IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='physical_internal.expedition_action(uuid,text,text,uuid,jsonb)'::regprocedure) <> '3f0ad46e587d71eb92eccffefb6e4c09' THEN RAISE EXCEPTION 'Expedition function changed; review migration before applying';END IF;END $$;
-- Shared checkpoint handoff; retain owner/member/expiry/run checks and legacy rhythm compatibility.
-- Preserve original classroom ownership, membership, expiry and bound-run checks.
CREATE OR REPLACE FUNCTION physical_internal.expedition_action(p_room uuid,p_game text,p_action text DEFAULT 'view',p_group uuid DEFAULT NULL,p_data jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e physical_internal.expeditions%ROWTYPE; r public.game_rooms%ROWTYPE; owner boolean;
 actor text:=auth.uid()::text; g jsonb; groups jsonb; output jsonb:='[]'; item record; idx integer:=0;
 codes jsonb; n integer; slot integer; old_cp integer; handoff jsonb; ready_users jsonb; dt double precision;
 x double precision; y double precision; vx double precision; vy double precision; nx double precision; ny double precision;
 ax double precision; ay double precision; cp integer; bumps integer; targetx integer; targety integer;
 clockms double precision:=extract(epoch FROM clock_timestamp())*1000;
 station text; expected text; chosen text; sequence text[]; visited jsonb; axes jsonb; quality integer;
 seen jsonb; request_id text; pattern jsonb; taps jsonb; tap jsonb; beat integer; hits integer; misses integer; used integer[]; t double precision;
 child text; children jsonb; childrun text; busy boolean; parent_config jsonb;
 settings jsonb; workshop jsonb; target text; op_seen jsonb; route text[]; prior text; w jsonb; projected jsonb;
 level text; radius double precision; drag double precision; gain double precision; speed double precision; tolerance integer; minimum_quality integer;
 swaps integer; active_groups jsonb; tag jsonb; report_kind text; report_state text; role_time double precision;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Classroom authentication required' USING ERRCODE='42501'; END IF;
 IF p_game NOT IN ('expedition-map','expedition-ship','expedition-loop','expedition-rescue','expedition-shadow','expedition-boss') OR p_game IS NULL OR p_action IS NULL OR p_data IS NULL OR jsonb_typeof(p_data)<>'object' OR octet_length(p_data::text)>2048 THEN RAISE EXCEPTION 'Invalid expedition input' USING ERRCODE='22023'; END IF;
 SELECT * INTO r FROM public.game_rooms WHERE id=p_room;
 owner:=physical_internal.owns_classroom(p_room);
 IF r.id IS NULL OR NOT (owner OR physical_internal.reads_classroom(p_room) OR physical_internal.views_classroom(p_room)) THEN RAISE EXCEPTION 'Classroom access required' USING ERRCODE='42501'; END IF;
 IF p_group IS NOT NULL AND NOT (EXISTS(SELECT 1 FROM public.room_groups WHERE id=p_group AND room_id=p_room) AND (owner OR physical_internal.member_classroom(p_room,p_group))) THEN RAISE EXCEPTION 'Own group required' USING ERRCODE='42501'; END IF;
 IF p_action NOT IN ('view','observe') AND r.status='finished' THEN RAISE EXCEPTION 'Lesson finished' USING ERRCODE='42501'; END IF;
 IF p_action='start' THEN
  IF NOT owner THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
  settings:=physical_internal.expedition_settings(p_data->'settings');
  SELECT coalesce(jsonb_object_agg(id::text,jsonb_build_object('name',left(group_name,80),'visited','[]'::jsonb,'vote',NULL,'done',false,'ship',jsonb_build_object('x',50,'y',80,'vx',0,'vy',0,'checkpoint',0,'bumps',0),'axes',jsonb_build_array(jsonb_build_object('value',0,'at',0,'user',NULL),jsonb_build_object('value',0,'at',0,'user',NULL)),'loop','[]'::jsonb,'quality',0,'mode','none','seen','[]'::jsonb,'tick',clockms)),'{}'::jsonb) INTO groups FROM public.room_groups WHERE room_id=p_room;
  SELECT jsonb_object_agg(key,value||jsonb_build_object('workshop',jsonb_build_object('level',settings->>'level','members',settings->'members','roleRound',0,'roleSwaps',0,'roleAt',clockms,'devices','[]'::jsonb))) INTO groups FROM jsonb_each(groups);
  SELECT count(*) INTO n FROM jsonb_each(groups);
  IF n=0 OR n>20 THEN RAISE EXCEPTION 'Use 1 to 20 groups' USING ERRCODE='22023'; END IF;
  codes:=jsonb_build_object('forest',encode(extensions.gen_random_bytes(12),'hex'),'river',encode(extensions.gen_random_bytes(12),'hex'),'tower',encode(extensions.gen_random_bytes(12),'hex'));
  INSERT INTO physical_internal.expeditions(room_id,game,seed,config,groups,started_at) VALUES(p_room,p_game,(extract(epoch FROM clock_timestamp())::bigint%1000)::integer,jsonb_build_object('codes',codes,'event','calm','eventCount',0,'settings',settings,'workshopVersion',CASE WHEN jsonb_typeof(p_data->'settings')='object' THEN 1 ELSE 0 END,'lessonStep',0,'lessonAt',clockms,'observations','{}'::jsonb),groups,clock_timestamp()+interval '5 seconds')
  ON CONFLICT(room_id,game) DO UPDATE SET run_id=gen_random_uuid(),seed=EXCLUDED.seed,phase=0,revision=physical_internal.expeditions.revision+1,config=EXCLUDED.config,groups=EXCLUDED.groups,actors='{}',started_at=EXCLUDED.started_at;
  UPDATE physical_internal.expeditions SET seed=CASE settings->>'stationOrder' WHEN 'river-tower-forest' THEN 0 WHEN 'tower-forest-river' THEN 1 ELSE seed END WHERE room_id=p_room AND game=p_game;
  IF p_game='expedition-boss' THEN
   children:='{}';
   FOREACH child IN ARRAY physical_internal.expedition_route((SELECT config FROM physical_internal.expeditions WHERE room_id=p_room AND game=p_game)) LOOP
    PERFORM physical_internal.expedition_action(p_room,child,'start',NULL,CASE WHEN jsonb_typeof(p_data->'settings')='object' THEN jsonb_build_object('settings',settings) ELSE '{}'::jsonb END);
    SELECT run_id::text INTO childrun FROM physical_internal.expeditions WHERE room_id=p_room AND game=child;
    children:=children||jsonb_build_object(child,childrun);
   END LOOP;
   UPDATE physical_internal.expeditions SET config=config||jsonb_build_object('children',children) WHERE room_id=p_room AND game=p_game;
  END IF;
 END IF;
 SELECT * INTO e FROM physical_internal.expeditions WHERE room_id=p_room AND game=p_game FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('missing',true,'owner',owner,'status',r.status); END IF;
 settings:=physical_internal.expedition_settings(e.config->'settings');
 -- Metadata never stores device IDs or raw signals. It is a last report, not proof.
 IF p_action IN ('rotate','readiness','difficulty','members','observe','lesson-step') THEN
  IF p_data->>'runId' IS DISTINCT FROM e.run_id::text THEN RAISE EXCEPTION 'Expedition changed; reload' USING ERRCODE='22023'; END IF;
  request_id:=p_data->>'requestId';
  IF request_id IS NULL OR request_id!~'^[a-f0-9-]{36}$' THEN RAISE EXCEPTION 'Request id required' USING ERRCODE='22023'; END IF;
  IF clockms-coalesce((e.actors->>(actor||':meta'))::double precision,0)<180 THEN RAISE EXCEPTION 'Slow down' USING ERRCODE='P0001'; END IF;
  target:=coalesce(p_data->>'target',p_group::text);
  IF p_action IN ('difficulty','members','observe','lesson-step') AND NOT owner THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
  IF p_action IN ('rotate','readiness') AND NOT (owner OR (p_group IS NOT NULL AND target=p_group::text AND coalesce(physical_internal.member_classroom(p_room,p_group),false))) THEN RAISE EXCEPTION 'Own group required' USING ERRCODE='42501'; END IF;
  op_seen:=coalesce(e.config->'opSeen','[]');
  IF op_seen ? request_id THEN RETURN physical_internal.expedition_action(p_room,p_game,'view',p_group); END IF;
  IF p_action='rotate' AND p_game='expedition-boss' THEN
   route:=physical_internal.expedition_route(e.config);
   FOREACH child IN ARRAY route LOOP
    SELECT run_id::text INTO childrun FROM physical_internal.expeditions c WHERE c.room_id=p_room AND c.game=child AND c.run_id::text=e.config->'children'->>child AND EXISTS(SELECT 1 FROM jsonb_each(c.groups) z WHERE z.value->>'done' IS DISTINCT FROM 'true');
    IF childrun IS NOT NULL THEN
     PERFORM physical_internal.expedition_action(p_room,child,'rotate',p_group,p_data||jsonb_build_object('runId',childrun,'target',target));
     RETURN physical_internal.expedition_action(p_room,p_game,'view',p_group);
    END IF;
   END LOOP;
   RAISE EXCEPTION 'Boss already completed' USING ERRCODE='22023';
  END IF;
  IF p_action='lesson-step' THEN
   IF r.status<>'playing' OR settings->'packageMinutes'='null'::jsonb OR jsonb_typeof(p_data->'step') IS DISTINCT FROM 'number' OR (p_data->>'step')::integer<>coalesce((e.config->>'lessonStep')::integer,0)+1 OR (p_data->>'step')::integer>3 THEN RAISE EXCEPTION 'Invalid lesson stage' USING ERRCODE='22023'; END IF;
   e.config:=e.config||jsonb_build_object('lessonStep',(p_data->>'step')::integer,'lessonAt',clockms);
  ELSE
   IF target IS NULL OR e.groups->target IS NULL THEN RAISE EXCEPTION 'Current room group required' USING ERRCODE='42501'; END IF;
   g:=e.groups->target;
   w:=coalesce(g->'workshop',jsonb_build_object('level',settings->>'level','members',settings->'members','roleRound',0,'roleSwaps',0,'roleAt',clockms,'devices','[]'::jsonb));
   IF p_action='rotate' THEN
    IF r.status<>'playing' THEN RAISE EXCEPTION 'Rotate only while playing' USING ERRCODE='42501'; END IF;
    w:=w||jsonb_build_object('roleRound',coalesce((w->>'roleRound')::integer,0)+1,'roleSwaps',coalesce((w->>'roleSwaps')::integer,0)+1,'roleAt',clockms);
    IF p_game='expedition-ship' THEN g:=g||jsonb_build_object('axes',jsonb_build_array(jsonb_build_object('value',0,'at',0,'user',NULL),jsonb_build_object('value',0,'at',0,'user',NULL))); END IF;
   ELSIF p_action='readiness' THEN
    IF r.status NOT IN ('waiting','playing','paused') THEN RAISE EXCEPTION 'Lesson closed' USING ERRCODE='42501'; END IF;
    report_kind:=p_data->>'kind';report_state:=p_data->>'state';
    IF coalesce(report_kind,'') NOT IN ('camera','tilt','touch') OR coalesce(report_state,'') NOT IN ('ready','lost','manual','off','error') THEN RAISE EXCEPTION 'Invalid coarse status' USING ERRCODE='22023'; END IF;
    SELECT coalesce(jsonb_agg(v),'[]') INTO projected FROM jsonb_array_elements(coalesce(w->'devices','[]')) v WHERE v->>'kind'<>report_kind;
    w:=w||jsonb_build_object('devices',projected||jsonb_build_array(jsonb_build_object('kind',report_kind,'state',report_state,'at',clockms)));
   ELSIF p_action='members' THEN
    IF r.status NOT IN ('waiting','paused') OR jsonb_typeof(p_data->'members') IS DISTINCT FROM 'number' OR coalesce(p_data->>'members','')!~'^[2-6]$' THEN RAISE EXCEPTION 'Pause to choose two to six seats' USING ERRCODE='22023'; END IF;
    w:=w||jsonb_build_object('members',(p_data->>'members')::integer,'roleRound',0,'roleAt',clockms);
    g:=g||jsonb_build_object('axes',jsonb_build_array(jsonb_build_object('value',0,'at',0,'user',NULL),jsonb_build_object('value',0,'at',0,'user',NULL)));
    IF p_game='expedition-boss' THEN
     FOREACH child IN ARRAY physical_internal.expedition_route(e.config) LOOP
      UPDATE physical_internal.expeditions c SET groups=jsonb_set(c.groups,ARRAY[target],(c.groups->target)||jsonb_build_object('workshop',coalesce(c.groups->target->'workshop',w)||jsonb_build_object('members',(p_data->>'members')::integer,'roleRound',0,'roleAt',clockms),'axes',g->'axes')),revision=c.revision+1 WHERE c.room_id=p_room AND c.game=child AND c.run_id::text=e.config->'children'->>child;
     END LOOP;
    END IF;
   ELSIF p_action='difficulty' THEN
    IF r.status NOT IN ('waiting','paused') OR coalesce(p_data->>'level','') NOT IN ('easy','normal','challenge') OR (p_game IN ('expedition-map','expedition-boss') AND (e.phase>0 OR EXISTS(SELECT 1 FROM physical_internal.expeditions c WHERE c.room_id=p_room AND c.game='expedition-map' AND c.run_id::text=e.config->'children'->>'expedition-map' AND c.phase>0))) THEN RAISE EXCEPTION 'Pause before adjusting; restart map/boss after an opened gate' USING ERRCODE='22023'; END IF;
    w:=w||jsonb_build_object('level',p_data->>'level');
    g:=(g-'handoff')||jsonb_build_object('visited','[]'::jsonb,'vote',NULL,'done',false,'loop','[]'::jsonb,'quality',0,'ship',jsonb_build_object('x',50,'y',80,'vx',0,'vy',0,'checkpoint',0,'bumps',0),'axes',jsonb_build_array(jsonb_build_object('value',0,'at',0,'user',NULL),jsonb_build_object('value',0,'at',0,'user',NULL)),'tick',clockms);
    IF p_game='expedition-boss' THEN
     FOREACH child IN ARRAY physical_internal.expedition_route(e.config) LOOP
      UPDATE physical_internal.expeditions c SET groups=jsonb_set(c.groups,ARRAY[target],g||jsonb_build_object('workshop',w)),revision=c.revision+1 WHERE c.room_id=p_room AND c.game=child AND c.run_id::text=e.config->'children'->>child;
     END LOOP;
    END IF;
   ELSIF p_action='observe' THEN
    IF jsonb_typeof(p_data->'tags') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Observation tags required' USING ERRCODE='22023'; END IF;
    IF jsonb_array_length(p_data->'tags')>5 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(p_data->'tags') v WHERE v NOT IN ('고른 역할 참여','역할 재안내 필요','신호 전달 원활','추가 연습 필요','작은 동작 대안 사용')) THEN RAISE EXCEPTION 'Only public observation enums' USING ERRCODE='22023'; END IF;
    e.config:=jsonb_set(e.config||jsonb_build_object('observations',coalesce(e.config->'observations','{}')),ARRAY['observations',target],p_data->'tags',true);
   END IF;
   g:=g||jsonb_build_object('workshop',w);
   e.groups:=jsonb_set(e.groups,ARRAY[target],g);
  END IF;
  SELECT coalesce(jsonb_agg(v),'[]') INTO op_seen FROM (SELECT value v FROM jsonb_array_elements(op_seen||to_jsonb(request_id)) WITH ORDINALITY q(value,ord) ORDER BY ord DESC LIMIT 32) z;
  e.config:=e.config||jsonb_build_object('opSeen',op_seen);
  e.actors:=jsonb_set(e.actors,ARRAY[actor||':meta'],to_jsonb(clockms));
  UPDATE physical_internal.expeditions SET groups=e.groups,config=e.config,actors=e.actors,revision=revision+1 WHERE room_id=p_room AND game=p_game;
  RETURN physical_internal.expedition_action(p_room,p_game,'view',p_group);
 END IF;
 IF p_action NOT IN ('view','start') THEN
  IF r.status<>'playing' THEN RAISE EXCEPTION 'Lesson must be playing' USING ERRCODE='42501'; END IF;
  IF clockms-coalesce((e.actors->>actor)::double precision,0)<180 THEN RAISE EXCEPTION 'Slow down' USING ERRCODE='P0001'; END IF;
  IF p_action='event' THEN
   IF NOT owner OR p_game<>'expedition-boss' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
   chosen:=p_data->>'event';
   IF chosen NOT IN ('calm','crosswind','slow') OR chosen IS NULL OR (e.config->>'eventCount')::integer>=3 THEN RAISE EXCEPTION 'Event limit' USING ERRCODE='22023'; END IF;
   e.config:=e.config||jsonb_build_object('event',chosen,'eventCount',(e.config->>'eventCount')::integer+1);
   UPDATE physical_internal.expeditions SET config=config||jsonb_build_object('event',chosen) WHERE room_id=p_room AND game='expedition-ship' AND run_id::text=e.config->'children'->>'expedition-ship';
  ELSE
   IF p_group IS NULL OR NOT physical_internal.member_classroom(p_room,p_group) THEN RAISE EXCEPTION 'Student group membership required' USING ERRCODE='42501'; END IF;
   -- Bound boss children cannot bypass earlier stages, even through a deep link.
   SELECT config INTO parent_config FROM physical_internal.expeditions WHERE room_id=p_room AND game='expedition-boss' AND config->'children'->>p_game=e.run_id::text;
   IF parent_config IS NOT NULL THEN
    FOREACH child IN ARRAY physical_internal.expedition_route(parent_config) LOOP
     EXIT WHEN child=p_game;
     IF NOT EXISTS(SELECT 1 FROM physical_internal.expeditions c WHERE c.room_id=p_room AND c.game=child AND c.run_id::text=parent_config->'children'->>child AND NOT EXISTS(SELECT 1 FROM jsonb_each(c.groups) z WHERE z.value->>'done' IS DISTINCT FROM 'true')) THEN
      RAISE EXCEPTION 'Complete the previous boss stage together first' USING ERRCODE='42501';
     END IF;
    END LOOP;
   END IF;
   g:=e.groups->p_group::text;
   IF g IS NULL THEN RAISE EXCEPTION 'Group changed; teacher must restart' USING ERRCODE='22023'; END IF;
   IF p_data->>'runId' IS DISTINCT FROM e.run_id::text THEN RAISE EXCEPTION 'Expedition changed; reload' USING ERRCODE='22023'; END IF;
   request_id:=p_data->>'requestId';
   IF request_id IS NULL OR request_id!~'^[a-f0-9-]{36}$' THEN RAISE EXCEPTION 'Request id required' USING ERRCODE='22023'; END IF;
   level:=coalesce(g->'workshop'->>'level',settings->>'level');
   radius:=CASE level WHEN 'easy' THEN 13 WHEN 'challenge' THEN 6 ELSE 9 END;
   drag:=CASE level WHEN 'easy' THEN .22 WHEN 'challenge' THEN .5 ELSE .35 END;
   gain:=CASE level WHEN 'easy' THEN 26 WHEN 'challenge' THEN 36 ELSE 32 END;
   speed:=CASE level WHEN 'easy' THEN 18 WHEN 'challenge' THEN 10 ELSE 14 END;
   tolerance:=CASE level WHEN 'easy' THEN 240 WHEN 'challenge' THEN 120 ELSE 180 END;
   minimum_quality:=CASE level WHEN 'easy' THEN 40 WHEN 'challenge' THEN 70 ELSE 50 END;
   seen:=coalesce(g->'seen','[]');
   IF seen ? request_id THEN RETURN physical_internal.expedition_action(p_room,p_game,'view',p_group); END IF;
   IF p_action='visit' AND p_game='expedition-map' THEN
    IF p_data->'movementConfirmed' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Partner movement confirmation required' USING ERRCODE='22023'; END IF;
    SELECT key INTO station FROM jsonb_each_text(e.config->'codes') WHERE value=p_data->>'token';
    IF station IS NULL THEN RAISE EXCEPTION 'Station code does not belong to this lesson' USING ERRCODE='22023'; END IF;
    visited:=coalesce(g->'visited','[]');IF NOT visited ? station THEN g:=jsonb_set(g,'{visited}',visited||to_jsonb(station));END IF;
   ELSIF p_action='vote' AND p_game='expedition-map' THEN
    chosen:=p_data->>'station';sequence:=CASE WHEN e.seed%2=0 THEN ARRAY['river','tower','forest'] ELSE ARRAY['tower','forest','river'] END;
    IF e.phase>=3 OR chosen IS NULL OR NOT (g->'visited') ? chosen THEN RAISE EXCEPTION 'Visit the chosen station first' USING ERRCODE='22023'; END IF;
    expected:=sequence[e.phase+1];
    g:=g||jsonb_build_object('vote',chosen,'done',false);
    e.groups:=jsonb_set(e.groups,ARRAY[p_group::text],g);
    IF NOT EXISTS(SELECT 1 FROM jsonb_each(e.groups) z WHERE z.value->>'vote' IS DISTINCT FROM expected) THEN
     e.phase:=e.phase+1;
     SELECT jsonb_object_agg(key,value||jsonb_build_object('vote',NULL,'visited','[]'::jsonb,'done',e.phase=3)) INTO e.groups FROM jsonb_each(e.groups);
     g:=e.groups->p_group::text;
    END IF;
   ELSIF p_action='ship-handoff' AND p_game='expedition-ship' THEN
    handoff:=g->'handoff';axes:=g->'axes';
    IF handoff->>'pending' IS DISTINCT FROM 'true' OR p_data->>'checkpoint' IS DISTINCT FROM handoff->>'checkpoint' THEN RAISE EXCEPTION 'Checkpoint handoff changed; reload' USING ERRCODE='22023';END IF;
    IF axes->0->>'user' IS DISTINCT FROM actor AND axes->1->>'user' IS DISTINCT FROM actor THEN RAISE EXCEPTION 'Claim a controller first' USING ERRCODE='42501';END IF;
    IF axes->0->>'user' IS NULL OR axes->1->>'user' IS NULL OR axes->0->>'user'=axes->1->>'user' OR axes->0->>'user' IS NOT DISTINCT FROM handoff->'from'->>0 OR axes->1->>'user' IS NOT DISTINCT FROM handoff->'from'->>1 THEN RAISE EXCEPTION 'Both devices must exchange axes' USING ERRCODE='22023';END IF;
    ready_users:=coalesce(handoff->'ready','[]');IF NOT ready_users ? actor THEN ready_users:=ready_users||to_jsonb(actor);END IF;
    handoff:=handoff||jsonb_build_object('ready',ready_users,'pending',NOT (ready_users ? (axes->0->>'user') AND ready_users ? (axes->1->>'user')));
    g:=g||jsonb_build_object('handoff',handoff);
   ELSIF p_action IN ('claim','release','steer') AND p_game='expedition-ship' THEN
    IF jsonb_typeof(p_data->'slot') IS DISTINCT FROM 'number' OR (p_data->>'slot')::integer NOT BETWEEN 0 AND 1 THEN RAISE EXCEPTION 'Invalid controller' USING ERRCODE='22023'; END IF;
    slot:=(p_data->>'slot')::integer;axes:=g->'axes';
    IF p_action='claim' THEN
     IF (axes->(1-slot)->>'user')=actor THEN RAISE EXCEPTION 'Use a different device for the other axis' USING ERRCODE='22023'; END IF;
     IF axes->slot->>'user' IS NOT NULL AND axes->slot->>'user'<>actor AND clockms-(axes->slot->>'at')::double precision<10000 THEN RAISE EXCEPTION 'Controller occupied' USING ERRCODE='22023'; END IF;
     axes:=jsonb_set(axes,ARRAY[slot::text],jsonb_build_object('user',actor,'value',0,'at',clockms,'protocol',CASE WHEN p_data->>'controlVersion'='2' THEN 2 ELSE 0 END));
    ELSE
     IF axes->slot->>'user' IS DISTINCT FROM actor THEN RAISE EXCEPTION 'Claim this controller first' USING ERRCODE='42501'; END IF;
     IF p_action='release' THEN axes:=jsonb_set(axes,ARRAY[slot::text],jsonb_build_object('user',NULL,'value',0,'at',0));
     ELSE
      IF jsonb_typeof(p_data->'value') IS DISTINCT FROM 'number' OR abs((p_data->>'value')::double precision)>1 THEN RAISE EXCEPTION 'Invalid steering' USING ERRCODE='22023'; END IF;
      axes:=jsonb_set(axes,ARRAY[slot::text],jsonb_build_object('user',actor,'value',(p_data->>'value')::double precision,'at',clockms,'protocol',CASE WHEN p_data->>'controlVersion'='2' THEN 2 ELSE 0 END));
     END IF;
    END IF;
    IF g->'handoff'->>'pending'='true' AND p_action IN ('claim','release') THEN g:=jsonb_set(g,'{handoff,ready}','[]'::jsonb);END IF;
    dt:=least(.5,greatest(0,(clockms-(g->>'tick')::double precision)/1000));
    ax:=CASE WHEN clockms-(axes->0->>'at')::double precision<1500 THEN (axes->0->>'value')::double precision ELSE 0 END;
    ay:=CASE WHEN clockms-(axes->1->>'at')::double precision<1500 THEN (axes->1->>'value')::double precision ELSE 0 END;
    IF e.config->>'event'='crosswind' THEN ax:=least(1,greatest(-1,ax+.2)); ELSIF e.config->>'event'='slow' THEN ax:=ax*.6;ay:=ay*.6; END IF;
    x:=(g->'ship'->>'x')::double precision;y:=(g->'ship'->>'y')::double precision;cp:=(g->'ship'->>'checkpoint')::integer;bumps:=(g->'ship'->>'bumps')::integer;old_cp:=cp;
    vx:=((g->'ship'->>'vx')::double precision+ax*gain*dt)*power(drag,dt);vy:=((g->'ship'->>'vy')::double precision+ay*gain*dt)*power(drag,dt);nx:=x+vx*dt;ny:=y+vy*dt;
    IF nx<5 OR nx>95 OR ny<5 OR ny>95 THEN vx:=-vx*.3;vy:=-vy*.3;bumps:=bumps+1;END IF;
    x:=least(95,greatest(5,nx));y:=least(95,greatest(5,ny));targetx:=(CASE WHEN settings->>'shipCourse'='zigzag' THEN ARRAY[25,75,30] ELSE ARRAY[25,75,50] END)[cp+1];targety:=(CASE WHEN settings->>'shipCourse'='zigzag' THEN ARRAY[65,45,25] ELSE ARRAY[25,65,30] END)[cp+1];
    IF g->'handoff'->>'pending'='true' THEN x:=(g->'ship'->>'x')::double precision;y:=(g->'ship'->>'y')::double precision;vx:=0;vy:=0;END IF;
    IF g->'handoff'->>'pending' IS DISTINCT FROM 'true' AND cp<3 AND sqrt(power(x-targetx,2)+power(y-targety,2))<radius AND sqrt(vx*vx+vy*vy)<speed THEN cp:=cp+1;END IF;
    g:=g||jsonb_build_object('axes',axes,'ship',jsonb_build_object('x',x,'y',y,'vx',vx,'vy',vy,'checkpoint',cp,'bumps',bumps),'tick',clockms,'done',cp>=3,'mode',CASE WHEN p_data->>'mode'='sensor' THEN 'sensor' ELSE 'assisted' END);
    IF cp>old_cp AND cp<3 AND axes->0->>'protocol'='2' AND axes->1->>'protocol'='2' THEN g:=g||jsonb_build_object('handoff',jsonb_build_object('checkpoint',cp,'pending',true,'ready','[]'::jsonb,'from',jsonb_build_array(axes->0->'user',axes->1->'user')));g:=jsonb_set(jsonb_set(g,'{ship,vx}','0'),'{ship,vy}','0');END IF;
   ELSIF p_action='loop' AND p_game='expedition-loop' THEN
    IF p_data ? 'rhythmVersion' AND (p_data->>'rhythmVersion'<>'2' OR jsonb_typeof(p_data->'elapsedMs') IS DISTINCT FROM 'number' OR (p_data->>'elapsedMs')::double precision NOT BETWEEN 4800 AND 12000) THEN RAISE EXCEPTION 'Complete the rhythm recording first' USING ERRCODE='22023';END IF;
    taps:=p_data->'taps';
    IF jsonb_typeof(taps) IS DISTINCT FROM 'array' OR jsonb_array_length(taps)>24 OR jsonb_typeof(p_data->'loop') IS DISTINCT FROM 'array' OR jsonb_array_length(p_data->'loop')<>8 THEN RAISE EXCEPTION 'Invalid rhythm' USING ERRCODE='22023'; END IF;
    idx:=0;FOR item IN SELECT key FROM jsonb_each(e.groups) ORDER BY key LOOP EXIT WHEN item.key=p_group::text;idx:=idx+1;END LOOP;
    IF coalesce((e.config->>'workshopVersion')::integer,CASE WHEN e.config ? 'settings' THEN 1 ELSE 0 END)=0 THEN
     pattern:=(jsonb_build_array('[1,0,1,0,1,0,1,0]'::jsonb,'[0,1,0,1,0,1,0,1]'::jsonb,'[1,0,0,1,0,0,1,0]'::jsonb,'[1,1,0,0,1,1,0,0]'::jsonb))->(idx%4);
    ELSE
     SELECT jsonb_agg((settings->'rhythm')->((i+idx)%8) ORDER BY i) INTO pattern FROM generate_series(0,7) i;
    END IF;
    used:='{}';hits:=0;misses:=0;
    FOR tap IN SELECT value FROM jsonb_array_elements(taps) LOOP
     IF jsonb_typeof(tap) IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Invalid beat time' USING ERRCODE='22023'; END IF;
     t:=tap::double precision;IF t<0 OR t>=4800 THEN RAISE EXCEPTION 'Invalid beat range' USING ERRCODE='22023'; END IF;
     beat:=round(t/600)::integer;
     IF beat<8 AND pattern->>beat='1' AND NOT beat=ANY(used) AND abs(t-beat*600)<=tolerance THEN hits:=hits+1;used:=array_append(used,beat);ELSE misses:=misses+1;END IF;
    END LOOP;
    SELECT count(*) INTO n FROM jsonb_array_elements(pattern) v WHERE v='1'::jsonb;
    quality:=greatest(0,round((hits-misses*.25)/n*100)::integer);
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_data->'loop') v WHERE v NOT IN ('0'::jsonb,'1'::jsonb)) THEN RAISE EXCEPTION 'Invalid loop steps' USING ERRCODE='22023'; END IF;
    IF p_data->'movementConfirmed' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Partner confirmation required' USING ERRCODE='22023'; END IF;
    g:=g||jsonb_build_object('loop',p_data->'loop','quality',quality,'done',quality>=minimum_quality,'mode','partner-confirmed');
   ELSIF p_action='complete' AND p_game IN ('expedition-rescue','expedition-shadow') THEN
    IF coalesce(p_data->>'mode','') NOT IN ('camera','assisted') OR p_data->'movementConfirmed' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Mode and partner confirmation required' USING ERRCODE='22023'; END IF;
    g:=g||jsonb_build_object('done',true,'mode',p_data->>'mode');
   ELSE RAISE EXCEPTION 'Invalid expedition action' USING ERRCODE='22023';
   END IF;
   SELECT coalesce(jsonb_agg(v),'[]') INTO seen FROM (SELECT value v FROM jsonb_array_elements(seen||to_jsonb(request_id)) WITH ORDINALITY q(value,ord) ORDER BY ord DESC LIMIT 32) z;
   g:=jsonb_set(g,'{seen}',seen);e.groups:=jsonb_set(e.groups,ARRAY[p_group::text],g);
  END IF;
  e.actors:=jsonb_set(e.actors,ARRAY[actor],to_jsonb(clockms));e.revision:=e.revision+1;
  UPDATE physical_internal.expeditions SET phase=e.phase,groups=e.groups,actors=e.actors,config=e.config,revision=e.revision WHERE room_id=p_room AND game=p_game;
 END IF;
 IF p_game='expedition-boss' THEN
  e.phase:=0;
  FOREACH child IN ARRAY physical_internal.expedition_route((SELECT config FROM physical_internal.expeditions WHERE room_id=p_room AND game=p_game)) LOOP
   SELECT EXISTS(SELECT 1 FROM physical_internal.expeditions c WHERE c.room_id=p_room AND c.game=child AND c.run_id::text=e.config->'children'->>child AND NOT EXISTS(SELECT 1 FROM jsonb_each(c.groups) z WHERE z.value->>'done' IS DISTINCT FROM 'true')) INTO busy;
   EXIT WHEN NOT busy;e.phase:=e.phase+1;
  END LOOP;
 END IF;
 idx:=0;
 FOR item IN SELECT key,value FROM jsonb_each(e.groups) ORDER BY key LOOP
  g:=item.value;
  IF p_game='expedition-boss' THEN
   route:=physical_internal.expedition_route(e.config);
   SELECT c.groups INTO active_groups FROM physical_internal.expeditions c WHERE c.room_id=p_room AND c.game=route[least(3,e.phase+1)] AND c.run_id::text=e.config->'children'->>route[least(3,e.phase+1)];
   IF active_groups->item.key IS NOT NULL THEN
    g:=g||(active_groups->item.key);
    SELECT coalesce(sum((c.groups->item.key->'workshop'->>'roleSwaps')::integer),0) INTO swaps FROM physical_internal.expeditions c WHERE c.room_id=p_room AND c.game=ANY(route) AND c.run_id::text=e.config->'children'->>c.game;
    g:=jsonb_set(g,'{workshop,roleSwaps}',to_jsonb(swaps),true);
    SELECT jsonb_agg(jsonb_build_object('game',c.game,'done',c.groups->item.key->'done','checkpoint',c.groups->item.key->'ship'->'checkpoint','quality',c.groups->item.key->'quality','swaps',coalesce(c.groups->item.key->'workshop'->'roleSwaps','0'::jsonb)) ORDER BY array_position(route,c.game)) INTO projected FROM physical_internal.expeditions c WHERE c.room_id=p_room AND c.game=ANY(route) AND c.run_id::text=e.config->'children'->>c.game;
    g:=jsonb_set(g,'{workshop,contributions}',coalesce(projected,'[]'),true);
   END IF;
   g:=g||jsonb_build_object('done',e.phase=3);
  END IF;
  IF g->'workshop' IS NULL THEN g:=g||jsonb_build_object('workshop',jsonb_build_object('level',settings->>'level','members',settings->'members','roleRound',0,'roleSwaps',0,'roleAt',clockms,'devices','[]'::jsonb)); END IF;
  axes:=g->'axes';
  output:=output||jsonb_build_array((g-'seen'-'tick'-'axes'-'handoff')||jsonb_build_object('id',item.key,'exchange',CASE WHEN g->'handoff' IS NOT NULL THEN jsonb_build_object('checkpoint',g->'handoff'->'checkpoint','pending',g->'handoff'->'pending','mine',coalesce(g->'handoff'->'ready','[]'::jsonb) ? actor,'readyCount',jsonb_array_length(coalesce(g->'handoff'->'ready','[]'::jsonb)),'swapped',axes->0->>'user' IS NOT NULL AND axes->1->>'user' IS NOT NULL AND axes->0->>'user' IS DISTINCT FROM g->'handoff'->'from'->>0 AND axes->1->>'user' IS DISTINCT FROM g->'handoff'->'from'->>1) ELSE NULL END,'axes',jsonb_build_array(jsonb_build_object('value',axes->0->'value','at',axes->0->'at','claimed',axes->0->>'user' IS NOT NULL,'mine',axes->0->>'user'=actor),jsonb_build_object('value',axes->1->'value','at',axes->1->'at','claimed',axes->1->>'user' IS NOT NULL,'mine',axes->1->>'user'=actor))));
  IF item.key=p_group::text THEN
   sequence:=CASE WHEN e.seed%2=0 THEN ARRAY['river','tower','forest'] ELSE ARRAY['tower','forest','river'] END;
   chosen:=CASE idx%3 WHEN 0 THEN '첫 길: '||sequence[1] WHEN 1 THEN '마지막 길: '||sequence[3] ELSE '세 지점은 한 번씩만 지나가요. 앞뒤 단서로 가운데 길을 찾아요.' END;
   IF g->'workshop'->>'level'='easy' OR (SELECT count(*) FROM jsonb_each(e.groups))<(CASE WHEN g->'workshop'->>'level'='challenge' THEN 2 ELSE 3 END) THEN chosen:='길 순서: '||array_to_string(sequence,' → ');END IF;
  END IF;
  idx:=idx+1;
 END LOOP;
 RETURN jsonb_build_object('runId',e.run_id,'game',p_game,'seed',CASE WHEN p_game='expedition-map' AND NOT owner THEN 0 ELSE e.seed END,'phase',e.phase,'revision',e.revision,'startedAt',extract(epoch FROM e.started_at)*1000,'serverTime',clockms,'status',r.status,'groups',output,'clue',CASE WHEN p_group IS NOT NULL AND p_game='expedition-map' THEN chosen ELSE NULL END,'owner',owner,'groupId',p_group,'codes',CASE WHEN owner THEN e.config->'codes' ELSE NULL END,'event',e.config->>'event','workshop',jsonb_build_object('version',coalesce((e.config->>'workshopVersion')::integer,CASE WHEN e.config ? 'settings' THEN 1 ELSE 0 END),'settings',settings,'lessonStep',coalesce((e.config->>'lessonStep')::integer,0),'lessonAt',coalesce((e.config->>'lessonAt')::double precision,clockms),'observations',CASE WHEN owner THEN coalesce(e.config->'observations','{}') ELSE '{}'::jsonb END));
END; $$;

NOTIFY pgrst,'reload schema';
