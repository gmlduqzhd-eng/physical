import {studioInputSchema} from './domain';
export const LOGIN_CONDITIONS_KEY='physical_studio_login_conditions';
export function parseLoginConditions(raw:string|null,now=Date.now()){
 try{const value=JSON.parse(raw??'null');if(!value||!Number.isFinite(value.expires)||value.expires<=now||value.expires>now+600000||!Number.isInteger(value.step)||value.step<0||value.step>2||typeof value.chosen!=='boolean')return null;const form=studioInputSchema.safeParse(value.form);if(!form.success)return null;return {form:form.data,step:value.step,chosen:value.chosen};}catch{return null;}
}
