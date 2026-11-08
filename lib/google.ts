import {JWT} from 'google-auth-library';
import {HEADERS,parseWords,revision,validateLibrary} from './domain';
import type {Library,Source,Deck} from './types';
import {HttpError} from './auth';
const q=(s:string)=>"'"+s.replace(/'/g,"''")+"'";
let jwt:JWT;
export function configured(){return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL&&process.env.GOOGLE_PRIVATE_KEY&&process.env.CONFIG_SPREADSHEET_ID)}
async function google(id:string,path='',method='GET',body?:unknown):Promise<any>{
 if(!configured())throw new HttpError(503,'Chưa cấu hình tài khoản dịch vụ Google và file cấu hình.');
 jwt??=new JWT({email:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key:process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g,'\n'),scopes:['https://www.googleapis.com/auth/spreadsheets']});
 try{const result=await jwt.request({url:`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}${path}`,method:method as 'GET'|'POST'|'PUT',data:body,timeout:20000});return result.data}catch(e:any){const status=e?.response?.status;if(status===403)throw Error('Không có quyền truy cập Google Sheets. Chia sẻ quyền Chỉnh sửa cho email dịch vụ và bật Sheets API.');if(status===404)throw Error('Không tìm thấy file hoặc tab Google Sheets.');throw Error('Google Sheets chưa phản hồi hợp lệ. Kiểm tra cấu hình và thử lại.');}
}
export async function values(id:string,tab:string){const r=await google(id,'/values/'+encodeURIComponent(q(tab))+'?valueRenderOption=FORMATTED_VALUE');return (r.values||[]).map((r:any[])=>r.map(x=>String(x??''))) as string[][]}
export async function metadata(id:string){return google(id,'?fields=sheets(properties(sheetId,title,gridProperties))')}
const CONFIG_TAB='CauHinh';
export async function source():Promise<Source|null>{
 const id=process.env.CONFIG_SPREADSHEET_ID;if(!id||!configured())throw new HttpError(503,'Chưa cấu hình Google Sheets trên Vercel.');
 const meta=await metadata(id);if(!meta.sheets?.some((s:any)=>s.properties.title===CONFIG_TAB))return null;
 const rows=await values(id,CONFIG_TAB);const data=Object.fromEntries(rows.slice(1).map(r=>[r[0],r[1]]));return data.spreadsheetId?{spreadsheetId:data.spreadsheetId,tab:data.tab||'TuVung'}:null;
}
export function parseSource(url:string,tab:string):Source{
 let u:URL;try{u=new URL(url)}catch{throw Error('Liên kết Google Sheets không hợp lệ.')}
 const match=u.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
 if(u.protocol!=='https:'||u.hostname!=='docs.google.com'||!match||!tab.trim()||tab.length>100)throw Error('Nhập liên kết https://docs.google.com/spreadsheets/d/… và tên tab hợp lệ.');
 if(['BoThe',CONFIG_TAB].includes(tab.trim()))throw Error('Tên tab từ vựng không được là BoThe hoặc CauHinh.');return {spreadsheetId:match[1],tab:tab.trim()};
}
function sheetId(meta:any,title:string){const p=meta.sheets?.find((s:any)=>s.properties.title===title)?.properties;if(!p)throw Error('Không tìm thấy tab '+title);return p.sheetId as number}
function cells(rows:string[][]){return rows.map(r=>({values:r.map(v=>({userEnteredValue:{stringValue:v}}))}))}
export async function checkSource(s:Source){
 const meta=await metadata(s.spreadsheetId);
 sheetId(meta,s.tab);const rows=await values(s.spreadsheetId,s.tab);const hasDecks=meta.sheets.some((x:any)=>x.properties.title==='BoThe');
 let decks:Deck[]|undefined;
 if(hasDecks){const dr=await values(s.spreadsheetId,'BoThe');if(dr[0]?.[0]!=='ID'||dr[0]?.[1]!=='Tên bộ thẻ')throw Error('Tab BoThe cần cột ID và Tên bộ thẻ.');decks=dr.slice(1).filter(r=>r.some(Boolean)).map(r=>({id:r[0],name:r[1]}))}
 const data=parseWords(rows,decks);validateLibrary(data);
 // A no-op write of a title verifies editor permission, not just read access.
 await google(s.spreadsheetId,':batchUpdate','POST',{requests:[{updateSheetProperties:{properties:{sheetId:sheetId(meta,s.tab),title:s.tab},fields:'title'}}]});
 return {...data,needsInitialization:!hasDecks};
}
export async function saveSource(s:Source,initialize:boolean){
 const checked=await checkSource(s);
 if(checked.needsInitialization&&!initialize)throw Error('Cần xác nhận tạo tab BoThe.');
 if(checked.needsInitialization)await google(s.spreadsheetId,':batchUpdate','POST',{requests:[{addSheet:{properties:{title:'BoThe'}}}]});
 if(checked.needsInitialization){const meta=await metadata(s.spreadsheetId);await google(s.spreadsheetId,':batchUpdate','POST',{requests:[{updateCells:{range:{sheetId:sheetId(meta,'BoThe')},rows:cells([['ID','Tên bộ thẻ'],...checked.decks.map(d=>[d.id,d.name])]),fields:'userEnteredValue'}}]})}
 const configId=process.env.CONFIG_SPREADSHEET_ID!;let meta=await metadata(configId);
 if(!meta.sheets.some((x:any)=>x.properties.title===CONFIG_TAB)){await google(configId,':batchUpdate','POST',{requests:[{addSheet:{properties:{title:CONFIG_TAB}}}]});meta=await metadata(configId)}
 await google(configId,':batchUpdate','POST',{requests:[{updateCells:{range:{sheetId:sheetId(meta,CONFIG_TAB)},rows:cells([['Khóa','Giá trị'],['spreadsheetId',s.spreadsheetId],['tab',s.tab]]),fields:'userEnteredValue'}}]});cache=null;
}
let cache:{until:number;data:Library}|null=null;
export async function library(fresh=false):Promise<Library>{
 if(!fresh&&cache&&cache.until>Date.now())return cache.data;
 const s=await source();if(!s)throw new HttpError(503,'Quản trị viên chưa chọn nguồn Google Sheets.');
 const rows=await values(s.spreadsheetId,s.tab),dr=await values(s.spreadsheetId,'BoThe');
 if(dr[0]?.[0]!=='ID'||dr[0]?.[1]!=='Tên bộ thẻ')throw Error('Tab BoThe không đúng mẫu.');
 const data=parseWords(rows,dr.slice(1).filter(r=>r.some(Boolean)).map(r=>({id:r[0],name:r[1]})));validateLibrary(data);
 const result={...data,revision:revision({s,...data}),sourceKey:revision(s).slice(0,24)};
 cache={until:Date.now()+30000,data:result};return result;
}
export async function writeLibrary(data:Library){
 validateLibrary(data);const current=await library(true);
 if(current.revision!==data.revision)throw new HttpError(409,'Dữ liệu đã thay đổi. Hãy tải lại trước khi lưu.');
 const s=(await source())!,meta=await metadata(s.spreadsheetId);
 const words=[HEADERS,...data.words.map(w=>[w.id,data.decks.find(d=>d.id===w.deckId)!.name,w.term,w.pinyin,w.meaning])];
 const decks=[['ID','Tên bộ thẻ'],...data.decks.map(d=>[d.id,d.name])];
 const requests=[{name:s.tab,rows:words},{name:'BoThe',rows:decks}].flatMap(({name,rows})=>{
 const props=meta.sheets.find((x:any)=>x.properties.title===name).properties;
 return [...(props.gridProperties.rowCount<rows.length?[{appendDimension:{sheetId:props.sheetId,dimension:'ROWS',length:rows.length-props.gridProperties.rowCount}}]:[]),{updateCells:{range:{sheetId:props.sheetId,startColumnIndex:0,endColumnIndex:name==='BoThe'?2:5},rows:cells(rows),fields:'userEnteredValue'}}];});
 await google(s.spreadsheetId,':batchUpdate','POST',{requests});cache=null;return library(true);
}
