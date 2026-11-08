import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JWT} from 'google-auth-library';
import {HEADERS} from '../lib/domain';
import {source,checkSource,saveSource,library,writeLibrary} from '../lib/google';
test('Sheets contract: bootstrap, initialize, persist source, stable IDs, atomic writes and stale-edit rejection',async()=>{
 const old=JWT.prototype.request;
 const env={...process.env};process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL='service@example.invalid';process.env.GOOGLE_PRIVATE_KEY='test';process.env.CONFIG_SPREADSHEET_ID='config';
 type Tab={id:number;rows:string[][]};
 const books:Record<string,Record<string,Tab>>={config:{},content:{TuVung:{id:1,rows:[HEADERS,['001','A','你好','nǐ hǎo','Xin chào'],['002','A','谢谢','xièxie','Cảm ơn']]}}};
 let writes=0;
 JWT.prototype.request=(async(options:any)=>{
  const url=new URL(options.url),parts=url.pathname.split('/');const book=books[decodeURIComponent(parts[3]).replace(':batchUpdate','')];if(!book)throw Error('unknown book');
  if(url.pathname.endsWith(':batchUpdate')){
   writes++;
   for(const r of options.data.requests){
    if(r.addSheet){book[r.addSheet.properties.title]={id:Object.keys(book).length+10,rows:[]}}
    if(r.updateCells){const tab=Object.values(book).find(t=>t.id===r.updateCells.range.sheetId)!;tab.rows=r.updateCells.rows.map((r:any)=>r.values.map((c:any)=>c.userEnteredValue.stringValue))}
   }return {data:{}};
  }
  if(parts[4]==='values'){const title=decodeURIComponent(parts[5]).slice(1,-1).replaceAll("''", "'");return {data:{values:book[title]?.rows||[]}}}
  return {data:{sheets:Object.entries(book).map(([title,t])=>({properties:{title,sheetId:t.id,gridProperties:{rowCount:1000}}}))}};
 }) as any;
 try{
  assert.equal(await source(),null);
  const s={spreadsheetId:'content',tab:'TuVung'};
  const check=await checkSource(s);assert.equal(check.needsInitialization,true);assert.equal(check.words.length,2);
  await assert.rejects(()=>saveSource(s,false),/xác nhận/);
  await saveSource(s,true);assert.deepEqual(await source(),s);assert.ok(books.content.BoThe);assert.ok(books.config.CauHinh);
  const first=await library(true);assert.equal(first.words[0].id,'001');const updated=structuredClone(first);updated.decks[0].name='Giao tiếp';updated.words[0].meaning='Chào bạn';
  const next=await writeLibrary(updated);assert.equal(next.words[0].meaning,'Chào bạn');assert.equal(books.content.TuVung.rows[1][1],'Giao tiếp');assert.equal(next.words[0].id,'001');
  await assert.rejects(()=>writeLibrary(first),/đã thay đổi/);
  // External row sorting never targets the old row position: reload, then update by ID.
  books.content.TuVung.rows=[HEADERS,...books.content.TuVung.rows.slice(1).reverse()];
  const sorted=await library(true);sorted.words.find(w=>w.id==='001')!.meaning='Xin chào lại';await writeLibrary(sorted);
  assert.equal(books.content.TuVung.rows.find(r=>r[0]==='001')![4],'Xin chào lại');
  assert.equal(books.content.TuVung.rows.find(r=>r[0]==='002')![4],'Cảm ơn');assert.ok(writes>=4);
 }finally{JWT.prototype.request=old;for(const k of Object.keys(process.env))if(!(k in env))delete process.env[k];Object.assign(process.env,env)}
});
