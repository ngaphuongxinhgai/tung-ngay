import type {Word} from './types';
export type LearnState={queue:string[];stage:'choice'|'written';completed:string[];correct:number;attempts:number};
export const answerText=(w:Word,reverse:boolean)=>reverse?w.term:w.meaning;
export const normalizeAnswer=(s:string)=>s.normalize('NFC').trim().toLocaleLowerCase('vi').replace(/\s+/g,' ');
export function shuffled<T>(arr:T[]):T[]{const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
export function choicesFor(word:Word,words:Word[],reverse:boolean){const correct=answerText(word,reverse);const alternatives=[...new Set(words.map(w=>answerText(w,reverse)))].filter(s=>normalizeAnswer(s)!==normalizeAnswer(correct));return alternatives.length?shuffled([correct,...shuffled(alternatives).slice(0,3)]):[]}
export function startLearn(words:Word[]):LearnState{return {queue:words.map(w=>w.id),stage:'choice',completed:[],correct:0,attempts:0}}
export function advanceLearn(s:LearnState,ok:boolean,wasWritten:boolean):LearnState{
 const [id,...rest]=s.queue;if(!id)return s;
 const complete=ok&&wasWritten;
 return {queue:ok&&!wasWritten?s.queue:ok?rest:[...rest,id],stage:ok&&!wasWritten?'written':'choice',completed:complete?[...s.completed,id]:s.completed,correct:s.correct+Number(ok),attempts:s.attempts+1};
}
