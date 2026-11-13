// Disposable native Supabase ONLY. Never loads .env or linked project settings.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=process.argv[2];
if(!file?.endsWith('.local'))throw Error('Explicit private .local fixture config required');
let c,dbUrl,apiUrl;
try{c=JSON.parse(fs.readFileSync(file,'utf8'));dbUrl=new URL(c.dbUrl);apiUrl=new URL(c.apiUrl);}
catch{throw Error('Invalid private fixture configuration; details withheld');}
if(c.runtime!=='native'||c.environmentMarker!=='physical-hardening-native-20261113'
  ||!['postgres:','postgresql:'].includes(dbUrl.protocol)||dbUrl.hostname!=='127.0.0.1'||dbUrl.port!=='54332'||apiUrl.protocol!=='http:'||apiUrl.hostname!=='127.0.0.1'||apiUrl.port!=='54331')throw Error('Dedicated loopback native environment required');
const db=new pg.Client({connectionString:c.dbUrl,ssl:false});
const verifyOnly=process.argv[3]==='--verify';
if(process.argv[3]&&!verifyOnly)throw Error('Only --verify is supported');
const results=[];let phase='connect',connected=false,failed=false;
const migrations=fs.readdirSync(path.join(root,'supabase/migrations')).filter(n=>/^\d+_.+\.sql$/.test(n)).sort();
const patches=migrations.filter(n=>/^202611130(91515|91733|92338)_/.test(n));
const baseline=migrations.filter(n=>!/^20261113/.test(n));
const followups=migrations.filter(n=>!patches.includes(n)&&!baseline.includes(n));
function flat(relative){
  const absolute=path.resolve(root,relative);
  if(!absolute.startsWith(root+path.sep))throw Error('Repository SQL only');
  return fs.readFileSync(absolute,'utf8').split(/\r?\n/).map(line=>{
    if(line.startsWith('\\ir '))return flat(path.relative(root,path.resolve(path.dirname(absolute),line.slice(4).trim())));
    if(/^\\(set|echo) /.test(line))return '';
    if(line.startsWith('\\'))throw Error('Unsupported psql directive');
    return line;
  }).join('\n');
}
function pass(label){results.push({check:label,status:'PASS'});}
function assert(ok,label){if(!ok)throw Object.assign(Error(label),{testLabel:label});pass(label);}
async function run(sql){return db.query(sql);}
async function apply(name){phase=name;await run(flat('supabase/migrations/'+name));}
async function rollback(){await run('ROLLBACK');}
async function assertSql(expr,label){const r=await run('SELECT ('+expr+') IS TRUE AS ok');assert(r.rows[0].ok,label);}
async function expectBlocked(sql,label,pattern){
  await run('SAVEPOINT negative_case');let blocked=false;
  try{await run(sql);}catch(e){blocked=pattern.test(e.message);}
  await run('ROLLBACK TO SAVEPOINT negative_case;RELEASE SAVEPOINT negative_case');
  assert(blocked,label);
}
try{
  await db.connect();connected=true;
  const marker=await run("SELECT obj_description(oid,'pg_namespace') AS marker FROM pg_namespace WHERE nspname='physical_api_test_environment'");
  assert(marker.rows[0]?.marker===c.environmentMarker,'native test database marker verified before mutation');
  await run("SET physical.test_database='on'");
  if(!verifyOnly){
  await assertSql("to_regclass('public.game_rooms') IS NULL AND (SELECT count(*)=0 FROM auth.users)",'pristine app/Auth fixture required');
  assert(patches.length===3&&baseline.length===30&&followups.length===2,'baseline, three original supplements and two advisor repairs identified');
  const install=fs.readFileSync(path.join(root,'supabase/install_empty.psql'),'utf8');
  const ordered=[...install.matchAll(/^\\ir migrations\/(.+)$/gm)].map(m=>m[1]);
  assert(JSON.stringify(ordered)===JSON.stringify(migrations),'empty installer includes every migration once in ascending order');

  phase='no automatic grants';
  for(const schema of ['', ' IN SCHEMA public'])for(const type of ['TABLES','SEQUENCES','FUNCTIONS'])
    await run(`ALTER DEFAULT PRIVILEGES FOR ROLE postgres${schema} REVOKE ALL ON ${type} FROM PUBLIC,anon,authenticated,service_role`);
  await assertSql("NOT EXISTS(SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace IN (0,'public'::regnamespace) AND d.defaclobjtype IN ('r','S','f') AND a.grantee IN (0,'anon'::regrole::oid,'authenticated'::regrole::oid,'service_role'::regrole::oid))",'global and public schema automatic client grants absent');
  await run("CREATE SCHEMA fixture_other; CREATE TABLE fixture_other.keep_row(id integer PRIMARY KEY,payload text); INSERT INTO fixture_other.keep_row VALUES(1,'synthetic unrelated record'); CREATE PUBLICATION fixture_other_publication FOR TABLE fixture_other.keep_row;");
  // Retain an unrelated registration in the existing Realtime publication.
  await run("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN CREATE PUBLICATION supabase_realtime; END IF; END $$; ALTER PUBLICATION supabase_realtime ADD TABLE fixture_other.keep_row;");

  phase='empty installation guards';
  for(const [label,setup] of [
    ['existing core table','CREATE TABLE public.game_rooms(id uuid)'],
    ['unrelated public table','CREATE TABLE public.unrelated_app(id integer)'],
    ['existing private schema','CREATE SCHEMA physical_internal'],
    ['existing studio schema','CREATE SCHEMA physical_studio_limits'],
    ['existing public function','CREATE FUNCTION public.unrelated_function() RETURNS int LANGUAGE sql AS $$SELECT 1$$'],
    ['existing enum','CREATE TYPE public.unrelated_enum AS ENUM(\'a\')'],
    ['existing migration history',"CREATE SCHEMA IF NOT EXISTS supabase_migrations; CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations(version text PRIMARY KEY); INSERT INTO supabase_migrations.schema_migrations(version) VALUES('synthetic-fixture')"],
  ]){
    await run("BEGIN;SET LOCAL physical.empty_install='transactional';"+setup);
    await expectBlocked(flat('supabase/bootstrap/empty_database.sql'),'installer rejects '+label,/Empty database required|Existing migration history/);
    await rollback();
  }

  phase='latest synthetic upgrade baseline';
  await run("BEGIN;SET LOCAL physical.empty_install='transactional';"+flat('supabase/bootstrap/empty_database.sql'));
  for(const name of baseline)await apply(name);
  await run(flat('supabase/bootstrap/finish_empty_install.sql'));
  await run(flat('supabase/tests/boss_retry_fixture.sql'));
  await run('ALTER FUNCTION physical_internal.secure_apply_classroom_boss_damage(uuid,integer,text) COST 217 PARALLEL RESTRICTED');
  await run("CREATE TABLE public.translation_lesson_cases(id uuid PRIMARY KEY);CREATE TABLE public.translation_case_reports(id uuid PRIMARY KEY,case_id uuid REFERENCES public.translation_lesson_cases(id));ALTER TABLE public.translation_lesson_cases ENABLE ROW LEVEL SECURITY;ALTER TABLE public.translation_case_reports ENABLE ROW LEVEL SECURITY;INSERT INTO public.translation_lesson_cases VALUES('00000000-0000-4000-8000-000000000001');INSERT INTO public.translation_case_reports VALUES('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001');");
  await run(flat('supabase/tests/hardening_snapshot.sql'));
  await run('CREATE TEMP TABLE repair_before AS SELECT pg_temp.hardening_snapshot(true) AS state;');
  // A known regression must fail before the repair; no production boss call occurs.
  await run("SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.boss_student'),'role','authenticated')::text,true);SET LOCAL ROLE authenticated;");
  await expectBlocked("SELECT public.apply_classroom_boss_damage(current_setting('test.boss_room_a')::uuid,3,'synthetic-preserved-damage')",'unfixed latest baseline reproduces boss retry lookup error',/missing FROM-clause entry|does not exist/);
  await run('RESET ROLE');
  for(const name of patches)await apply(name);
  await assertSql('(SELECT state FROM repair_before)=pg_temp.hardening_snapshot(true)','upgrade preserves rows, identities, scores, ownership, secrets, ACLs, triggers, constraints, publications and all other function/policy logic');
  await assertSql("to_regclass('public.translation_case_reports_case_id_idx') IS NOT NULL",'shared feature FK index added only for the matching existing table');
  await run('CREATE TEMP TABLE repair_after AS SELECT pg_temp.hardening_snapshot(false) AS state;');
  const indexBefore=await run("SELECT array_agg(indexrelid ORDER BY indexrelid) AS ids FROM pg_index WHERE indrelid IN (SELECT oid FROM pg_class WHERE relnamespace IN ('public'::regnamespace,'physical_internal'::regnamespace))");
  for(const name of patches)await apply(name);
  await assertSql('(SELECT state FROM repair_after)=pg_temp.hardening_snapshot(false)','all three supplements are idempotent with synthetic data');
  const indexAfter=await run("SELECT array_agg(indexrelid ORDER BY indexrelid) AS ids FROM pg_index WHERE indrelid IN (SELECT oid FROM pg_class WHERE relnamespace IN ('public'::regnamespace,'physical_internal'::regnamespace))");
  assert(JSON.stringify(indexBefore.rows)===JSON.stringify(indexAfter.rows),'second application creates no duplicate indexes');
  await run(flat('supabase/tests/boss_retry_checks.sql'));
  pass('boss damage/reward retry and actor rejection assertions');
  await rollback();
  await assertSql("to_regclass('public.game_rooms') IS NULL AND (SELECT count(*)=0 FROM auth.users)",'entire upgrade fixture rolls back');

  phase='complete empty installation';
  await run(flat('supabase/install_empty.psql'));
  pass('empty DB installation: base + all 35 ordered migrations + finalization');
  } else {
    await assertSql("to_regclass('public.game_rooms') IS NOT NULL AND (SELECT count(*)=0 FROM auth.users) AND (SELECT count(*)=0 FROM public.game_rooms)",'installed empty fixture required for --verify');
  }
  await run('BEGIN');
  await expectBlocked(flat('supabase_schema.sql'),'retired destructive installer always rejects',/Unsafe legacy installer is disabled/);
  await expectBlocked("SET LOCAL physical.empty_install='transactional';"+flat('supabase/bootstrap/empty_database.sql'),'empty installer rejects installed application',/Empty database required|Existing migration history/);
  await rollback();
  await run('BEGIN');
  await run('REVOKE SELECT,INSERT,UPDATE,DELETE ON public.game_rooms,public.mission_templates FROM authenticated;REVOKE SELECT,INSERT,DELETE ON public.room_groups FROM authenticated;');
  await apply(patches.find(n=>n.includes('explicit_core')));
  await assertSql("has_table_privilege('authenticated','public.game_rooms','SELECT') AND NOT has_column_privilege('authenticated','public.room_groups','score','UPDATE')",'explicit grants restore missing privileges while score remains protected');
  await rollback();
  for(const [label,setup,migration,error] of [
    ['boss body drift',"CREATE OR REPLACE FUNCTION physical_internal.secure_apply_classroom_boss_damage(room_uuid uuid,amount integer,action_id text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$BEGIN RETURN 1;END$$",patches[0],/Unexpected boss RPC definition/],
    ['disabled RLS','ALTER TABLE public.game_rooms DISABLE ROW LEVEL SECURITY',patches[1],/Unexpected core RLS/],
    ['extra permissive policy','CREATE POLICY unsafe_fixture ON public.game_rooms TO authenticated USING(true)',patches[1],/Unexpected core policy/],
    ['inherited role','CREATE ROLE physical_hardening_inherited NOLOGIN;GRANT physical_hardening_inherited TO authenticated',patches[1],/Unexpected core RLS/],
    ['policy drift','ALTER POLICY classroom_room_insert ON public.game_rooms WITH CHECK(true)',patches[2],/Policy drift/],
    ['index name collision','DROP INDEX physical_internal.classroom_members_user_id_idx;CREATE INDEX classroom_members_user_id_idx ON physical_internal.classroom_members(room_id)',patches[2],/Index name collision/],
    ['PUBLIC column privilege','GRANT SELECT(id) ON public.game_rooms TO PUBLIC',patches[1],/Unexpected broad client/],
    ['Google helper drift',"CREATE OR REPLACE FUNCTION physical_internal.is_google_teacher(user_uuid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT true$$",patches[1],/Authorization helper drift/],
  ]){
    phase=label;
    await run('BEGIN;'+setup);
    await expectBlocked(flat('supabase/migrations/'+migration),'supplement rejects '+label,error);
    await rollback();
  }

  for(const suite of ['classroom_access.sql','classroom_display.sql','classroom_results.sql']){
    if(suite==='classroom_access.sql')await run('BEGIN');
    phase=suite;await run(flat('supabase/tests/'+suite));pass(suite);
    if(suite==='classroom_results.sql')await rollback();
  }
  for(const suite of ['classroom_student_roster.sql','classroom_data_api_privileges.sql','classroom_boss_retry.psql','classroom_operations.sql','reviewed_access.sql','studio_shared_limits.sql','flagship_expeditions.sql','expedition_workshop.sql','expedition_review_guards.sql']){
    phase=suite;await run(flat('supabase/tests/'+suite));pass(suite);
  }
  await assertSql("(SELECT count(*)=0 FROM auth.users) AND (SELECT count(*)=0 FROM public.game_rooms) AND (SELECT payload='synthetic unrelated record' FROM fixture_other.keep_row WHERE id=1) AND EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='fixture_other' AND tablename='keep_row') AND EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='fixture_other_publication' AND schemaname='fixture_other' AND tablename='keep_row')",'all synthetic SQL fixtures rolled back; unrelated rows/publications preserved');
}catch(e){failed=true;results.push({check:phase,status:'FAIL',code:e.code,reason:e.testLabel??e.message?.replace(/'(?:[^']|'')*'/g,"'[redacted]'").slice(0,220)});}
finally{if(connected){await rollback().catch(()=>{});await db.end();}}
const report={status:failed?'FAIL':'PASS',environment:'isolated native Supabase',productionMutated:false,results};
fs.writeFileSync(path.join(path.dirname(path.resolve(file)),'hardening-sql-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(failed)process.exitCode=1;
