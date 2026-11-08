import {scryptSync,timingSafeEqual,createHmac,randomBytes} from 'node:crypto';
import {cookies} from 'next/headers';
export const COOKIE='tungngay_admin';
export const MAX_AGE=8*60*60;
export function passwordMatches(password:string,hash:string){
 try{const [kind,salt,expected]=hash.split(':');if(kind!=='scrypt'||!salt||!/^[a-f0-9]{128}$/.test(expected))return false;return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(expected,'hex'))}catch{return false}
}
function secret(){const s=process.env.SESSION_SECRET;if(!s||s.length<32)throw Error('Chưa cấu hình SESSION_SECRET an toàn.');return s}
export function signSession(now=Date.now()){
 const body=Buffer.from(JSON.stringify({user:process.env.ADMIN_USERNAME||'ngaph082',exp:Math.floor(now/1000)+MAX_AGE,nonce:randomBytes(16).toString('hex')})).toString('base64url');
 return body+'.'+createHmac('sha256',secret()).update(body).digest('base64url');
}
export function verifySession(token:string,now=Date.now()){
 try{const [body,signature,...extra]=token.split('.');if(extra.length||!body||!signature)return false;const expected=createHmac('sha256',secret()).update(body).digest();const actual=Buffer.from(signature,'base64url');if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return false;const p=JSON.parse(Buffer.from(body,'base64url').toString());return p.user===(process.env.ADMIN_USERNAME||'ngaph082')&&typeof p.exp==='number'&&p.exp>now/1000&&p.exp<=now/1000+MAX_AGE+5}catch{return false}
}
export async function isAdmin(){return verifySession((await cookies()).get(COOKIE)?.value||'')}
export async function requireAdmin(){if(!await isAdmin())throw new HttpError(401,'Vui lòng đăng nhập quản trị.')}
export class HttpError extends Error{constructor(public status:number,message:string){super(message)}}
export function sameOrigin(req:Request){
 const origin=req.headers.get('origin'),url=new URL(req.url);
 // Next may normalize req.url to localhost; Host retains the browser-facing origin.
 const host=req.headers.get('host')||url.host;
 const protocol=(req.headers.get('x-forwarded-proto')||url.protocol.replace(':','')).split(',')[0].trim();
 if(!origin||origin!==`${protocol}://${host}`)throw new HttpError(403,'Yêu cầu không hợp lệ. Hãy tải lại trang.');
}
export function errorResponse(e:unknown){return Response.json({error:e instanceof Error?e.message:'Có lỗi xảy ra.'},{status:e instanceof HttpError?e.status:400,headers:{'Cache-Control':'no-store'}})}
