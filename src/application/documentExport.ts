/**
 * 수업 기록을 문서로 내보낸다: 텍스트 · 엑셀(XLSX) · 한글(HWPX) · PDF(브라우저 인쇄).
 * 무압축 ZIP 작성기와 XLSX·HWPX 구조는 엽쌤 RunRun(달리기 뽑기) 앱에서 쓰던 방식을 옮기고, 어떤 표든 받도록 일반화했다.
 * 학생 이름은 다루지 않는다. 표에는 팀·번호만 들어간다.
 */
export interface ExportTable {
 title:string;
 /** 제목 아래 한 줄씩: [항목, 값] */
 meta:[string,string][];
 headers:string[];
 rows:(string|number)[][];
 /** 파일 이름에 쓸 짧은 이름(확장자 제외). */
 fileBase:string;
}

// XML 1.0에서 쓸 수 없는 제어 문자는 지운다.
// eslint-disable-next-line no-control-regex
const xmlEsc=(s:string|number)=>String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
/** 0 → A, 25 → Z, 26 → AA (엑셀 열 이름). */
export function columnName(index:number):string{let n=index+1,out='';while(n>0){const r=(n-1)%26;out=String.fromCharCode(65+r)+out;n=Math.floor((n-1)/26);}return out;}

export function exportText(t:ExportTable):string{
 const lines=[t.title,...t.meta.map(([k,v])=>`${k}: ${v}`),'',t.headers.join('\t'),...t.rows.map(r=>r.join('\t'))];
 return lines.join('\n');
}

/* ── 무압축 ZIP ── */
const CRC_T=(()=>{const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;table[n]=c>>>0;}return table;})();
export const crc32=(b:Uint8Array)=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC_T[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
export function zipBytes(files:{name:string;data:string|Uint8Array}[],now=new Date()):Uint8Array{
 const enc=new TextEncoder(),parts:Uint8Array[]=[],central:Uint8Array[]=[];
 const dTime=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1),dDate=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
 let offset=0;
 for(const f of files){
  const name=enc.encode(f.name),data=typeof f.data==='string'?enc.encode(f.data):f.data,crc=crc32(data);
  const lh=new DataView(new ArrayBuffer(30));
  lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(10,dTime,true);lh.setUint16(12,dDate,true);lh.setUint32(14,crc,true);
  lh.setUint32(18,data.length,true);lh.setUint32(22,data.length,true);lh.setUint16(26,name.length,true);
  const ch=new DataView(new ArrayBuffer(46));
  ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(12,dTime,true);ch.setUint16(14,dDate,true);ch.setUint32(16,crc,true);
  ch.setUint32(20,data.length,true);ch.setUint32(24,data.length,true);ch.setUint16(28,name.length,true);ch.setUint32(42,offset,true);
  parts.push(new Uint8Array(lh.buffer),name,data);central.push(new Uint8Array(ch.buffer),name);
  offset+=30+name.length+data.length;
 }
 const cdSize=central.reduce((s,p)=>s+p.length,0),end=new DataView(new ArrayBuffer(22));
 end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,cdSize,true);end.setUint32(16,offset,true);
 const all=[...parts,...central,new Uint8Array(end.buffer)],out=new Uint8Array(all.reduce((s,p)=>s+p.length,0));
 let at=0;for(const p of all){out.set(p,at);at+=p.length;}
 return out;
}

/* ── 엑셀 ── */
export async function exportXlsx(t:ExportTable):Promise<Uint8Array>{
 const {XLSX_CONTENT_TYPES}=await import('./hwpxTemplate');
 const width=Math.max(2,t.headers.length);
 const cell=(ref:string,v:string|number,s=0)=>typeof v==='number'&&Number.isFinite(v)?`<c r="${ref}" s="${s}"><v>${v}</v></c>`:`<c r="${ref}" t="inlineStr" s="${s}"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
 const rows:string[]=[];const add=(cells:[string|number,number][])=>{const r=rows.length+1;rows.push(`<row r="${r}">${cells.map(([v,s],i)=>cell(columnName(i)+r,v,s)).join('')}</row>`);};
 add([[t.title,1]]);for(const [k,v] of t.meta)add([[k,0],[v,0]]);add([]);
 const headRow=rows.length+1;add(t.headers.map(h=>[h,2]));for(const r of t.rows)add(r.map(v=>[v,0]));
 const last=columnName(width-1),cols=Array.from({length:width},(_,i)=>`<col min="${i+1}" max="${i+1}" width="${i===0?12:14}" customWidth="1"/>`).join('');
 const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${cols}</cols><sheetData>${rows.join('')}</sheetData><autoFilter ref="A${headRow}:${last}${headRow+t.rows.length}"/></worksheet>`;
 const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="16"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE3EEDC"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FFBBBBBB"/></left><right style="thin"><color rgb="FFBBBBBB"/></right><top style="thin"><color rgb="FFBBBBBB"/></top><bottom style="thin"><color rgb="FFBBBBBB"/></bottom></border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf/><xf fontId="1" applyFont="1"/><xf fontId="2" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center"/></xf></cellXfs></styleSheet>`;
 return zipBytes([
  {name:'[Content_Types].xml',data:XLSX_CONTENT_TYPES},
  {name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
  {name:'xl/workbook.xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="기록" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'기록'!$A$${headRow}:$${last}$${headRow+t.rows.length}</definedName></definedNames></workbook>`},
  {name:'xl/_rels/workbook.xml.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'},
  {name:'xl/worksheets/sheet1.xml',data:sheet},
  {name:'xl/styles.xml',data:styles},
 ]);
}

/* ── 한글 ── */
export async function exportHwpx(t:ExportTable,now=new Date()):Promise<Uint8Array>{
 const {HWPX_TEMPLATE:tpl}=await import('./hwpxTemplate');
 let pid=1000;const nid=()=>String(++pid);
 const para=(text:string,cp=0)=>`<hp:p id="${nid()}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="${cp}"><hp:t>${xmlEsc(text)}</hp:t></hp:run></hp:p>`;
 const cols=Math.max(1,t.headers.length),total=42520,widths=Array.from({length:cols},(_,i)=>i<cols-1?Math.floor(total/cols):total-Math.floor(total/cols)*(cols-1));
 const cell=(text:string|number,c:number,r:number,head:boolean)=>`<hp:tc name="" header="0" hasMargin="0" protect="0" editable="0" dirty="1" borderFillIDRef="${head?4:3}"><hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0"><hp:p paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0" id="${nid()}"><hp:run charPrIDRef="${head?8:0}"><hp:t>${xmlEsc(text)}</hp:t></hp:run></hp:p></hp:subList><hp:cellAddr colAddr="${c}" rowAddr="${r}"/><hp:cellSpan colSpan="1" rowSpan="1"/><hp:cellSz width="${widths[c]}" height="282"/><hp:cellMargin left="510" right="510" top="141" bottom="141"/></hp:tc>`;
 const table=[t.headers,...t.rows.map(r=>Array.from({length:cols},(_,i)=>r[i]??''))];
 const trs=table.map((row,ri)=>`<hp:tr>${row.map((v,ci)=>cell(v,ci,ri,ri===0)).join('')}</hp:tr>`).join('');
 const tbl=`<hp:p id="${nid()}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="0"><hp:tbl id="${nid()}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1" rowCnt="${table.length}" colCnt="${cols}" cellSpacing="0" borderFillIDRef="3" noAdjust="0"><hp:sz width="${total}" widthRelTo="ABSOLUTE" height="${282*table.length}" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/><hp:outMargin left="0" right="0" top="0" bottom="0"/><hp:inMargin left="510" right="510" top="141" bottom="141"/>${trs}</hp:tbl></hp:run></hp:p>`;
 const section=tpl.secpre+[para(t.title,7),...t.meta.map(([k,v])=>para(`${k}: ${v}`)),para(''),tbl].join('')+'</hs:sec>';
 return zipBytes([
  {name:'mimetype',data:'application/hwp+zip'},
  {name:'version.xml',data:tpl.version},
  {name:'Contents/header.xml',data:tpl.header},
  {name:'Contents/section0.xml',data:section},
  {name:'Preview/PrvText.txt',data:exportText(t).slice(0,1000)},
  {name:'settings.xml',data:tpl.settings},
  {name:'META-INF/container.rdf',data:tpl.rdf},
  {name:'Contents/content.hpf',data:tpl.hpf.replace(/@@DATE@@/g,now.toISOString())},
  {name:'META-INF/container.xml',data:tpl.container},
  {name:'META-INF/manifest.xml',data:tpl.manifest},
 ],now);
}

/* ── 브라우저 동작 ── */
export function exportFileName(t:ExportTable,ext:string,now=new Date()){
 const p=(n:number)=>String(n).padStart(2,'0');
 const base=t.fileBase.replace(/[\\/:*?"<>|]/g,'_').trim()||'기록';
 return `${base}_${now.getFullYear()}${p(now.getMonth()+1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}.${ext}`;
}
export function downloadBytes(bytes:Uint8Array,name:string,type:string){
 const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),4000);
}
/** PDF는 브라우저 인쇄 창에서 'PDF로 저장'을 고른다. 표만 담은 새 창을 연다. */
export function printTable(t:ExportTable){
 const w=window.open('','_blank','noopener=no,width=820,height=900');if(!w)return false;
 const rows=t.rows.map(r=>`<tr>${r.map(v=>`<td>${xmlEsc(v)}</td>`).join('')}</tr>`).join('');
 w.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${xmlEsc(t.title)}</title><style>body{font-family:system-ui,'Malgun Gothic',sans-serif;margin:32px;color:#222}h1{font-size:22px;margin:0 0 8px}p{margin:2px 0;color:#444}table{border-collapse:collapse;width:100%;margin-top:16px}th,td{border:1px solid #bbb;padding:6px 8px;text-align:center}th{background:#e3eedc}@page{margin:16mm}</style></head><body><h1>${xmlEsc(t.title)}</h1>${t.meta.map(([k,v])=>`<p>${xmlEsc(k)}: ${xmlEsc(v)}</p>`).join('')}<table><thead><tr>${t.headers.map(h=>`<th>${xmlEsc(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>{window.print();}</script></body></html>`);
 w.document.close();return true;
}
