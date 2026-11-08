import {cookies} from 'next/headers';
import {sameOrigin,errorResponse,COOKIE} from '@/lib/auth';
export async function POST(req:Request){try{sameOrigin(req);(await cookies()).delete(COOKIE);return Response.json({ok:true})}catch(e){return errorResponse(e)}}
