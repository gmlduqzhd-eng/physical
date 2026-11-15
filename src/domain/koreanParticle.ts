/** 한국어 조사 고르기. 마지막 글자의 받침을 보고 은/는, 이/가, 을/를, 으로/로를 붙인다. 한글이 아니면 괄호 표기로 둔다. */
const lastSyllable=(word:string)=>{const ch=word.trim().replace(/[)\]」』"'”’.!?]+$/,'').slice(-1);const code=ch.charCodeAt(0)-0xac00;return code>=0&&code<11172?code:null;};
const coda=(word:string)=>{const c=lastSyllable(word);return c===null?null:c%28;};
export function withParticle(word:string,kind:'은는'|'이가'|'을를'|'으로'):string{
 const final=coda(word);
 if(final===null)return word+({은는:'은(는)',이가:'이(가)',을를:'을(를)',으로:'(으)로'} as const)[kind];
 if(kind==='으로')return word+(final===0||final===8?'로':'으로');
 const [withCoda,without]=kind==='은는'?['은','는']:kind==='이가'?['이','가']:['을','를'];
 return word+(final?withCoda:without);
}
