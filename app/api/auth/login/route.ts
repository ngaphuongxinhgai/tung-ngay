import {cookies} from 'next/headers';
import {allowLogin} from '@/lib/redis';
import {sameOrigin,errorResponse,HttpError,passwordMatches,signSession,COOKIE,MAX_AGE} from '@/lib/auth';
export const runtime='nodejs';
export async function POST(req:Request){try{
 sameOrigin(req);if(!await allowLogin())throw new HttpError(429,'Đã có quá nhiều lần đăng nhập. Vui lòng thử lại sau 10 phút.');
 if(!process.env.ADMIN_PASSWORD_HASH||!process.env.SESSION_SECRET)throw new HttpError(503,'Quản trị chưa được cấu hình trên máy chủ.');
 const {username,password}=await req.json();
 const valid=typeof password==='string'&&password.length<=256&&passwordMatches(password,process.env.ADMIN_PASSWORD_HASH);
 if(!valid||username!==(process.env.ADMIN_USERNAME||'ngaph082'))throw new HttpError(401,'Tài khoản hoặc mật khẩu không đúng.');
 (await cookies()).set(COOKIE,signSession(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',maxAge:MAX_AGE,path:'/'});
 return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
}catch(e){return errorResponse(e)}}
