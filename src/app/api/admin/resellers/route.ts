import {NextResponse} from 'next/server';
import {requireRole} from '@/lib/guards';
import {prisma} from '@/lib/db';
export async function GET(request:Request){const guard=await requireRole(request,['ADMIN']);if(guard.response)return guard.response;const resellers=await prisma.reseller.findMany({orderBy:{createdAt:'desc'},include:{User:{select:{phone:true,email:true}}}});return NextResponse.json({status:'success',data:resellers.map(r=>({id:r.id,storeName:r.storeName,storeSlug:r.storeSlug,status:r.status,feePaid:r.feePaid,registrationFee:Number(r.registrationFee),earningsBalance:Number(r.earningsBalance),createdAt:r.createdAt,user:r.User}))});}
