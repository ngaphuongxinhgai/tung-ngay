import {Redis} from '@upstash/redis';
import {randomUUID} from 'node:crypto';
export function redis(){return process.env.UPSTASH_REDIS_REST_URL&&process.env.UPSTASH_REDIS_REST_TOKEN?new Redis({url:process.env.UPSTASH_REDIS_REST_URL,token:process.env.UPSTASH_REDIS_REST_TOKEN}):null}
const attempts=new Map<string,{n:number;until:number}>();
export async function allowLogin(){
 const r=redis();const key='tungngay:login:'+Math.floor(Date.now()/600000);
 if(r){const n=await r.incr(key);if(n===1)await r.expire(key,660);return n<=15}
 if(process.env.NODE_ENV==='production')throw Error('Cần cấu hình Redis để bảo vệ đăng nhập.');
 const v=attempts.get(key)||{n:0,until:Date.now()+660000};v.n++;attempts.set(key,v);for(const [k,a]of attempts)if(a.until<Date.now())attempts.delete(k);return v.n<=15;
}
let localLock=false;
export async function withWriteLock<T>(fn:()=>Promise<T>):Promise<T>{
 const r=redis(),token=randomUUID(),key='tungngay:write:'+process.env.CONFIG_SPREADSHEET_ID;
 if(!r){if(process.env.NODE_ENV==='production')throw Error('Cần cấu hình Redis trước khi cập nhật.');if(localLock)throw Error('Đang có thao tác khác. Hãy thử lại.');localLock=true;try{return await fn()}finally{localLock=false}}
 if(!await r.set(key,token,{nx:true,ex:90}))throw Error('Đang có thao tác cập nhật khác. Hãy thử lại.');
 try{return await fn()}finally{await r.eval("if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",[key],[token])}
}
