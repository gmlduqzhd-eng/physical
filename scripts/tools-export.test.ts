import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {crc32,exportHwpx,exportText,exportXlsx,zipBytes,type ExportTable} from '../src/application/documentExport';

/** 무압축 ZIP 읽기(테스트용): 이름 → 내용 */
function unzip(bytes:Uint8Array){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),dec=new TextDecoder(),out=new Map<string,string>();let at=0;
 while(view.getUint32(at,true)===0x04034b50){
  const crc=view.getUint32(at+14,true),size=view.getUint32(at+18,true),nameLen=view.getUint16(at+26,true);
  const name=dec.decode(bytes.subarray(at+30,at+30+nameLen)),data=bytes.subarray(at+30+nameLen,at+30+nameLen+size);
  assert.equal(crc32(data),crc,name);out.set(name,dec.decode(data));at+=30+nameLen+size;
 }
 return out;
}
const table:ExportTable={title:'리그 순위표',fileBase:'league',meta:[['팀 수','4팀']],headers:['순위','팀','승점'],rows:[[1,'1팀',6],[2,'2팀 <A&B>',3]]};
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('the zip writer stores files with correct checksums and a central directory',()=>{
 const z=zipBytes([{name:'a.txt',data:'가나다'},{name:'b/c.xml',data:'<x/>'}]);
 const files=unzip(z);assert.equal(files.get('a.txt'),'가나다');assert.equal(files.get('b/c.xml'),'<x/>');
 const view=new DataView(z.buffer);assert.equal(view.getUint32(z.length-22,true),0x06054b50);assert.equal(view.getUint16(z.length-22+10,true),2);
});

test('Excel export holds every header and row, escaped',async()=>{
 const files=unzip(await exportXlsx(table));
 for(const name of ['[Content_Types].xml','xl/workbook.xml','xl/worksheets/sheet1.xml','xl/styles.xml'])assert(files.has(name),name);
 const sheet=files.get('xl/worksheets/sheet1.xml')!;
 for(const h of table.headers)assert(sheet.includes(`>${h}<`),h);
 assert(sheet.includes('2팀 &lt;A&amp;B&gt;'));assert(sheet.includes('<v>6</v>'));
});

test('한글 export starts with the mimetype and contains a table with every row',async()=>{
 const bytes=await exportHwpx(table),files=unzip(bytes);
 assert.equal([...files.keys()][0],'mimetype');assert.equal(files.get('mimetype'),'application/hwp+zip');
 const section=files.get('Contents/section0.xml')!;
 assert(section.includes('rowCnt="3"')&&section.includes('colCnt="3"'));assert(section.includes('리그 순위표'));assert(section.includes('2팀 &lt;A&amp;B&gt;'));
 assert(section.trim().endsWith('</hs:sec>'));
});

test('text export lists the title, meta and rows',()=>{
 assert.equal(exportText(table).split('\n')[0],'리그 순위표');assert.match(exportText(table),/1\t1팀\t6/);
});

test('league and sports scores can be undone, and tools offer export and the RunRun link',()=>{
 const tools=read('src/presentation/ClassTools.tsx'),sports=read('src/presentation/SportsClassroom.tsx');
 assert.match(tools,/↶ 되돌리기/);assert.match(tools,/gmlduqzhd123-lab\.github\.io\/RunRun/);assert((tools.match(/<ExportMenu /g)??[]).length>=4);
 assert.match(sports,/undoScores/);assert((sports.match(/<ExportMenu /g)??[]).length>=2);
});

test('export handles wide tables, odd values and unsafe file names',async()=>{
 const {columnName,exportFileName}=await import('../src/application/documentExport');
 assert.deepEqual([0,25,26,27,51,52,701,702].map(columnName),['A','Z','AA','AB','AZ','BA','ZZ','AAA']);
 const wide:ExportTable={title:'넓은 표',fileBase:'축구/풋살:결과',meta:[],headers:Array.from({length:30},(_,i)=>`열${i+1}`),rows:[[...Array.from({length:29},(_,i)=>i),Number.NaN]]};
 const sheet=unzip(await exportXlsx(wide)).get('xl/worksheets/sheet1.xml')!;
 assert(sheet.includes('r="AD')&&!sheet.includes('undefined'));assert(!sheet.includes('<v>NaN</v>'));
 const weird:ExportTable={...table,rows:[[1,'1팀\u0001\u0007',3]]};
 assert(!unzip(await exportHwpx(weird)).get('Contents/section0.xml')!.includes('\u0001'));
 assert.match(exportFileName(wide,'xlsx'),/^축구_풋살_결과_\d{8}_\d{4}\.xlsx$/);
});
