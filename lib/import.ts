import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import type {ImportRow,Library} from './types';
import {HEADERS} from './domain';
export type Mapping=Record<'id'|'deck'|'term'|'pinyin'|'meaning',number>;
function cellText(v:ExcelJS.CellValue):string{
 if(v==null)return '';
 if(typeof v==='object'){
  if('formula'in v||'sharedFormula'in v)throw Error('File chứa công thức. Hãy chuyển thành giá trị văn bản trước khi import.');
  if('richText'in v)return v.richText.map(x=>x.text).join('').trim();
  if('text'in v)return String(v.text).trim();
  throw Error('File chứa kiểu ô không được hỗ trợ.');
 }return String(v).trim();
}
export async function inspectWorkbook(bytes:Buffer){
 if(bytes.length>3*1024*1024)throw Error('File tối đa 3 MB.');
 // Bound ZIP expansion before parsing workbook XML (compressed XLSX can be tiny).
 let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(bytes.readUInt32LE(i)===0x06054b50){end=i;break}
 if(end<0)throw Error('Không đọc được file .xlsx. File có thể bị hỏng hoặc sai định dạng.');
 const count=bytes.readUInt16LE(end+10);let cursor=bytes.readUInt32LE(end+16),expanded=0;
 if(count>500)throw Error('File Excel có quá nhiều thành phần.');
 for(let i=0;i<count;i++){
  if(cursor+46>bytes.length||bytes.readUInt32LE(cursor)!==0x02014b50)throw Error('Cấu trúc file Excel không hợp lệ.');
  const size=bytes.readUInt32LE(cursor+24);expanded+=size;
  if(size>10*1024*1024||expanded>25*1024*1024)throw Error('File Excel sau giải nén quá lớn.');
  cursor+=46+bytes.readUInt16LE(cursor+28)+bytes.readUInt16LE(cursor+30)+bytes.readUInt16LE(cursor+32);
 }
 const book=new ExcelJS.Workbook();try{
  const zip=await JSZip.loadAsync(bytes);
  // ExcelJS expects the main spreadsheet namespace as the default namespace.
  for(const name of Object.keys(zip.files).filter(n=>n.startsWith('xl/')&&n.endsWith('.xml'))){
   const xml=await zip.file(name)!.async('string');
   const match=xml.match(/xmlns:([A-Za-z_][\w.-]*)="http:\/\/schemas.openxmlformats.org\/spreadsheetml\/2006\/main"/);
   if(match){const prefix=match[1];zip.file(name,xml.replace(new RegExp(`(<\\/?)${prefix}:`,'g'),'$1').replaceAll(match[0],'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'))}
  }
  await book.xlsx.load(await zip.generateAsync({type:'nodebuffer'}) as any);
 }catch{throw Error('Không đọc được file .xlsx. File có thể bị hỏng hoặc sai định dạng.')}
 if(book.worksheets.length>20)throw Error('Tối đa 20 sheet mỗi file.');
 return book.worksheets.map(sheet=>{
 if(sheet.rowCount>2001||sheet.columnCount>30)throw Error('Mỗi sheet tối đa 2.000 dòng dữ liệu và 30 cột.');
 const rows:string[][]=[];sheet.eachRow({includeEmpty:true},row=>{const a:string[]=[];for(let c=1;c<=sheet.columnCount;c++)a.push(cellText(row.getCell(c).value));rows.push(a)});
 return {name:sheet.name,rows};
 });
}
export function suggestedMapping(headers:string[]):Mapping{return Object.fromEntries(['id','deck','term','pinyin','meaning'].map((k,i)=>[k,headers.indexOf(HEADERS[i])])) as Mapping}
export function previewRows(rows:string[][],map:Mapping,current:Library,selectedDeck:string):ImportRow[]{
 const get=(r:string[],k:keyof Mapping)=>r[map[k]]?.trim()||'';
 const seen=new Set<string>();
 if(map.term<0||map.meaning<0)throw Error('Hãy chọn cột Từ vựng và Nghĩa.');
 return rows.slice(1).map((r,i)=>{
 const id=get(r,'id'),deck=get(r,'deck')||current.decks.find(d=>d.id===selectedDeck)?.name||'';
 const term=get(r,'term'),pinyin=get(r,'pinyin'),meaning=get(r,'meaning');const errors:string[]=[];
 if(!term)errors.push('Thiếu từ');if(!meaning)errors.push('Thiếu nghĩa');if(!deck)errors.push('Thiếu bộ thẻ');
 if(id&&seen.has(id))errors.push('ID trùng trong file');if(id)seen.add(id);
 return {row:i+2,id,deck,term,pinyin,meaning,errors,duplicate:!!id&&current.words.some(w=>w.id===id),blank:!r.some(Boolean)};
 }).filter(r=>!r.blank);
}
