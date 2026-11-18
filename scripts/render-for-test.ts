// Test helper: renders React screens to HTML in Node so tests can check what a teacher or student would see
// instead of matching component source text. Stylesheet and asset imports are stubbed (Node cannot load .css).
import {register} from 'node:module';
import React,{type ReactElement} from 'react';

const stub=`export async function load(url,context,next){
 if(/\\.(css|png|jpe?g|svg|webp|mp3|wav)(\\?.*)?$/.test(url))return {format:'module',source:'export default ""',shortCircuit:true};
 const result=await next(url,context);
 // Vite fills import.meta.env at build time; here it is empty, so the app falls back to its placeholder backend
 // (no request is made while rendering a first screen).
 if(/\\/src\\/.*\\.tsx?$/.test(url)&&result.source&&String(result.source).includes('import.meta.env'))
  return {...result,source:String(result.source).replaceAll('import.meta.env','({DEV:false,PROD:true,MODE:"test"})')};
 return result;
}`;
register('data:text/javascript,'+encodeURIComponent(stub));
// tsx compiles JSX with the classic React.createElement runtime (the app's tsconfig.app.json is not the root config).
(globalThis as {React?:unknown}).React=React;
// Some screens read feature flags such as `'speechSynthesis' in window` while rendering; a bare window answers "not supported".
(globalThis as {window?:unknown}).window??=globalThis;

/** Static HTML of an element on first render (effects do not run), inside a router like the app. */
export async function renderHtml(element:ReactElement,path='/'):Promise<string>{
 const {renderToStaticMarkup}=await import('react-dom/server');
 const {MemoryRouter}=await import('react-router-dom');
 return renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:[path]},element));
}
/** Text a reader would get: tags removed, entities decoded, whitespace collapsed. */
export const textOf=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
