import {randomUUID} from 'node:crypto';
import {requireAdmin,sameOrigin,errorResponse,HttpError} from '@/lib/auth';
import {library,source,parseSource,checkSource,saveSource,writeLibrary,configured} from '@/lib/google';
import {withWriteLock} from '@/lib/redis';
import {inspectWorkbook,previewRows,suggestedMapping,type Mapping} from '@/lib/import';
import {normalize} from '@/lib/domain';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
type Context={params:Promise<{path:string[]}>};
function json(data:unknown){return Response.json(data,{headers:{'Cache-Control':'no-store'}})}
function str(v:unknown,max=500){if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('Nội dung nhập không hợp lệ.');return v.trim()}
export async function GET(req:Request,ctx:Context){try{await requireAdmin();const path=(await ctx.params).path.join('/');
 if(path==='session')return json({ok:true});
 if(path==='settings')return json({source:configured()?await source():null,serviceEmail:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL||'',configured:configured()});
 if(path==='library')return json(await library(true));
 throw new HttpError(404,'Không tìm thấy chức năng.');
}catch(e){return errorResponse(e)}}
export async function POST(req:Request,ctx:Context){try{await requireAdmin();sameOrigin(req);const path=(await ctx.params).path.join('/');
 if(Number(req.headers.get('content-length')||0)>4*1024*1024)throw Error('Yêu cầu vượt quá dung lượng cho phép.');
 if(path==='import/inspect'||path==='import/preview'||path==='import/commit'){
  const form=await req.formData(),file=form.get('file');if(!(file instanceof File)||!file.name.toLowerCase().endsWith('.xlsx'))throw Error('Chọn file .xlsx hợp lệ.');
  const sheets=await inspectWorkbook(Buffer.from(await file.arrayBuffer()));
  if(path==='import/inspect')return json({sheets:sheets.map(s=>({name:s.name,headers:s.rows[0]||[],mapping:suggestedMapping(s.rows[0]||[])}))});
  const sheet=sheets.find(s=>s.name===form.get('sheet'));if(!sheet)throw Error('Không tìm thấy sheet.');
  const mapping=JSON.parse(String(form.get('mapping'))) as Mapping;
  for(const k of ['id','deck','term','pinyin','meaning'] as const)if(!Number.isInteger(mapping[k])||mapping[k]<-1||mapping[k]>29)throw Error('Ánh xạ cột không hợp lệ.');
  const selected=String(form.get('deckId')||'');
  if(path==='import/preview'){const current=await library(true);return json({rows:previewRows(sheet.rows,mapping,current,selected),revision:current.revision})}
  return json(await withWriteLock(async()=>{
   const current=await library(true);if(current.revision!==form.get('revision'))throw new HttpError(409,'Dữ liệu đã thay đổi. Xem trước lại trước khi nhập.');
   const rows=previewRows(sheet.rows,mapping,current,selected), policy=form.get('policy');if(policy!=='skip'&&policy!=='update')throw Error('Chọn cách xử lý ID đã tồn tại.');
   const accept=form.get('skipInvalid')==='true';if(rows.some(r=>r.errors.length)&&!accept)throw Error('File có dòng lỗi. Hãy sửa hoặc xác nhận bỏ qua các dòng lỗi.');
   let added=0,updated=0,skipped=0;
   for(const r of rows){if(r.errors.length){skipped++;continue}const old=r.id?current.words.find(w=>w.id===r.id):undefined;if(old&&policy==='skip'){skipped++;continue}
    let d=current.decks.find(d=>normalize(d.name)===normalize(r.deck));if(!d){d={id:randomUUID(),name:r.deck};current.decks.push(d)}
    const w={id:old?.id||r.id||randomUUID(),deckId:d.id,term:r.term,pinyin:r.pinyin,meaning:r.meaning};if(old){Object.assign(old,w);updated++}else{current.words.push(w);added++}
   }
   if(!added&&!updated)throw Error('Không có dòng mới hoặc cập nhật để nhập.');
   return {library:await writeLibrary(current),added,updated,skipped};
  }));
 }
 const body=await req.json();
 if(path==='settings/check')return json(await checkSource(parseSource(str(body.url,1000),str(body.tab,100))));
 if(path==='settings/save')return json(await withWriteLock(async()=>{const s=parseSource(str(body.url,1000),str(body.tab,100));await saveSource(s,body.initialize===true);return {ok:true}}));
 return json(await withWriteLock(async()=>{
  const data=await library(true);if(body.revision!==data.revision)throw new HttpError(409,'Dữ liệu đã thay đổi. Hãy tải lại trước khi lưu.');
  if(path==='decks/create')data.decks.push({id:randomUUID(),name:str(body.name,100)});
  else if(path==='decks/rename'){const d=data.decks.find(d=>d.id===body.id);if(!d)throw Error('Bộ thẻ không còn tồn tại.');d.name=str(body.name,100)}
  else if(path==='decks/delete'){if(!data.decks.some(d=>d.id===body.id))throw Error('Bộ thẻ không còn tồn tại.');data.words=data.words.filter(w=>w.deckId!==body.id);data.decks=data.decks.filter(d=>d.id!==body.id)}
  else if(path==='words/save'){
   const existing=body.id?data.words.find(w=>w.id===body.id):undefined;if(body.id&&!existing)throw Error('Từ không còn tồn tại.');
   const w={id:existing?.id||randomUUID(),deckId:str(body.deckId,100),term:str(body.term),pinyin:typeof body.pinyin==='string'?body.pinyin.trim().slice(0,500):'',meaning:str(body.meaning)};
   if(existing)Object.assign(existing,w);else data.words.push(w);
  }else if(path==='words/delete')data.words=data.words.filter(w=>w.id!==body.id);
  else throw new HttpError(404,'Không tìm thấy chức năng.');
  return await writeLibrary(data);
 }));
}catch(e){return errorResponse(e)}}
