import {library,configured} from '@/lib/google';
import {demo} from '@/lib/demo';
export const dynamic='force-dynamic';
export async function GET(){try{const data=!configured()&&process.env.DEMO_MODE==='true'?demo:await library();return Response.json(data,{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Chưa tải được bộ từ vựng. Quản trị viên cần kiểm tra kết nối Google Sheets.'},{status:503,headers:{'Cache-Control':'no-store'}})}}
