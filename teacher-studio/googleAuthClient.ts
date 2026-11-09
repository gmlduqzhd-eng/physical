import type {SupabaseClient} from '@supabase/supabase-js';
import {setStudioTeacherGoogleClient} from '../src/application/teacherGoogle';
let client:Promise<SupabaseClient>|undefined;
setStudioTeacherGoogleClient(()=>{
 if(!client)client=(async()=>{
  const r=await fetch('/api/studio?action=oauth-config',{cache:'no-store'});const config=await r.json();if(!r.ok||!config.url||!config.publishableKey)throw Error('Google 로그인 연결을 확인하지 못했습니다.');
  const {createClient}=await import('@supabase/supabase-js');
  return createClient(config.url,config.publishableKey,{auth:{storageKey:'physical_studio_oauth',flowType:'pkce',detectSessionInUrl:false,autoRefreshToken:false,persistSession:true,storage:{
   getItem:key=>{if(!key.endsWith('-code-verifier'))return null;try{const value=JSON.parse(sessionStorage.getItem(key)??'null');if(value&&typeof value.value==='string'&&value.expiresAt>Date.now()&&value.expiresAt<=Date.now()+600000)return value.value;sessionStorage.removeItem(key);return null;}catch{return null;}},
   setItem:(key,value)=>{if(key.endsWith('-code-verifier'))sessionStorage.setItem(key,JSON.stringify({value,expiresAt:Date.now()+600000}));},removeItem:key=>sessionStorage.removeItem(key),
  }}});
 })().catch(e=>{client=undefined;throw e;});return client;
});
