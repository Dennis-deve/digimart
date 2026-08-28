import {NextResponse} from 'next/server';
import {readSession} from '@/lib/session';
import {prisma} from '@/lib/db';
/** Authorizes by the user's CURRENT database role (not the JWT copy), so role changes
 *  (e.g. admin approving a seller/reseller) take effect immediately without re-login. */
export async function requireRole(request:Request,roles:string[]){
const token=request.headers.get('cookie')?.match(/digimart_session=([^;]+)/)?.[1];
if(!token)return {session:null,response:NextResponse.json({status:'error',message:'Authentication required.'},{status:401})};
const session=await readSession(decodeURIComponent(token));
if(!session)return {session:null,response:NextResponse.json({status:'error',message:'Session is invalid or expired.'},{status:401})};
const user=await prisma.user.findUnique({where:{id:session.id},select:{role:true}});
const role=user?.role??session.role;
if(!roles.includes(role))return {session:{...session,role},response:NextResponse.json({status:'error',message:'You do not have permission to perform this action.'},{status:403})};
return {session:{...session,role},response:null};}
