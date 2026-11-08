import { createHash } from 'node:crypto';
import type { Deck, Library, Word } from './types';
export const HEADERS=['ID','Bộ thẻ','Từ vựng','Phiên âm','Nghĩa'];
export const normalize=(s:string)=>s.normalize('NFC').trim().toLocaleLowerCase('vi').replace(/\s+/g,' ');
export const revision=(data:unknown)=>createHash('sha256').update(JSON.stringify(data)).digest('hex');
export const deckId=(name:string)=>'deck_'+revision(name).slice(0,20);
export function parseWords(rows:string[][],decks?:Deck[]):{decks:Deck[];words:Word[]}{
  if(!rows.length||HEADERS.some((h,i)=>rows[0][i]!==h))throw Error('Tab từ vựng phải có các cột: '+HEADERS.join(' · '));
  const result=decks?[...decks]:[], words:Word[]=[],ids=new Set<string>();
  const names=new Set<string>(), deckIds=new Set<string>();
  for(const d of result){if(!d.id||!d.name||names.has(d.name)||deckIds.has(d.id))throw Error('Tab BoThe có ID hoặc tên bộ thẻ không hợp lệ/trùng nhau.');names.add(d.name);deckIds.add(d.id)}
  rows.slice(1).forEach((r,i)=>{if(!r.some(x=>x.trim()))return;const [id,name,term,pinyin='',meaning]=r.map(x=>x.trim());
    if(!id||!name||!term||!meaning)throw Error(`Dòng ${i+2}: thiếu ID, bộ thẻ, từ vựng hoặc nghĩa.`);
    if(ids.has(id))throw Error(`Dòng ${i+2}: ID ${id} bị trùng.`);ids.add(id);
    let d=result.find(d=>d.name===name);if(!d){if(decks)throw Error(`Dòng ${i+2}: bộ thẻ “${name}” chưa có trong BoThe.`);d={id:deckId(name),name};result.push(d)}
    words.push({id,deckId:d.id,term,pinyin,meaning});
  });return {decks:result,words};
}
export function validateLibrary(data:Pick<Library,'decks'|'words'>){
 const ds=new Set<string>(),ns=new Set<string>(),ws=new Set<string>();
 for(const d of data.decks){if(!d.id||!d.name.trim()||ds.has(d.id)||ns.has(normalize(d.name)))throw Error('ID và tên bộ thẻ phải duy nhất.');ds.add(d.id);ns.add(normalize(d.name))}
 for(const w of data.words){if(!w.id||!w.term.trim()||!w.meaning.trim()||!ds.has(w.deckId)||ws.has(w.id))throw Error('Từ vựng không hợp lệ hoặc ID bị trùng.');ws.add(w.id)}
}
