// Read-only post-test catalogue/Advisor inspection of the same marked native DB.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
const file=process.argv[2],cli=process.argv[3];
if(!file?.endsWith('.local')||!cli)throw Error('Private test config and explicit Supabase CLI path required');
let c,url;
try{c=JSON.parse(fs.readFileSync(file,'utf8'));url=new URL(c.dbUrl);}
catch{throw Error('Invalid private fixture configuration; details withheld');}
if(c.runtime!=='native'||c.environmentMarker!=='physical-hardening-native-20261113'||!['postgres:','postgresql:'].includes(url.protocol)||url.hostname!=='127.0.0.1'||url.port!=='54332')throw Error('Dedicated loopback fixture only');
const db=new pg.Client({connectionString:c.dbUrl,ssl:false});await db.connect();
const out=path.dirname(path.resolve(file));
try{
  const marker=await db.query("SELECT obj_description(oid,'pg_namespace') AS marker FROM pg_namespace WHERE nspname='physical_api_test_environment'");
  if(marker.rows[0]?.marker!==c.environmentMarker)throw Error('Test marker mismatch');
  const tables=await db.query("SELECT c.relname AS table,c.relrowsecurity AS rls,r.role,has_table_privilege(r.role,c.oid,'SELECT') AS select,has_table_privilege(r.role,c.oid,'INSERT') AS insert,has_table_privilege(r.role,c.oid,'UPDATE') AS update,has_table_privilege(r.role,c.oid,'DELETE') AS delete FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN (VALUES('anon'),('authenticated'))r(role) WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname,r.role");
  const columns=await db.query("SELECT a.attname AS column,has_column_privilege('authenticated',a.attrelid,a.attnum,'UPDATE') AS authenticated_update,has_column_privilege('anon',a.attrelid,a.attnum,'SELECT,INSERT,UPDATE,REFERENCES') AS anon_access FROM pg_attribute a WHERE a.attrelid='public.room_groups'::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum");
  const functions=await db.query("SELECT p.oid::regprocedure::text AS signature,p.prosecdef AS security_definer,has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f' ORDER BY p.proname,p.oid");
  const clean=await db.query("SELECT (SELECT count(*) FROM auth.users)::int AS auth_users,(SELECT count(*) FROM public.game_rooms)::int AS rooms,(SELECT count(*) FROM physical_internal.classroom_bootstrap)::int AS bootstrap_rows,(SELECT count(*) FROM fixture_other.keep_row)::int AS unrelated_rows");
  fs.writeFileSync(path.join(out,'permission-matrix.json'),JSON.stringify({tables:tables.rows,groupColumns:columns.rows,publicFunctions:functions.rows,cleanup:clean.rows[0]},null,2)+'\n');
  console.log(JSON.stringify({catalogue:'saved',tables:tables.rowCount,publicFunctions:functions.rowCount,cleanup:clean.rows[0]}));
}finally{await db.end();}
for(const type of ['security','performance']){
  const result=spawnSync(cli,['db','advisors','--db-url',c.dbUrl,'--type',type,'--level','info','--output-format','json'],{encoding:'utf8',timeout:45000,maxBuffer:8*1024*1024});
  if(result.status!==0)throw Error(type+' Advisor failed; raw output is private');
  const data=JSON.parse(result.stdout);
  fs.writeFileSync(path.join(out,'advisor-'+type+'.json'),JSON.stringify(data,null,2)+'\n');
  const findings=[];
  function scan(x){if(Array.isArray(x))return x.forEach(scan);if(x&&typeof x==='object'){if(x.name&&x.level)findings.push({name:x.name,level:x.level,object:x.metadata?.name});else for(const v of Object.values(x))if(v&&typeof v==='object')scan(v);}}
  scan(data);
  console.log(JSON.stringify({advisor:type,findings}));
}
