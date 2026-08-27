import {NextResponse} from 'next/server';
import {prisma} from '@/lib/db';
// Public: ONLY admin-approved resellers appear anywhere on the marketplace.
export async function GET(){const resellers=await prisma.reseller.findMany({where:{status:'APPROVED'},select:{storeName:true,storeSlug:true,storeTagline:true,storeColor:true,approvedAt:true},orderBy:{approvedAt:'desc'},take:12});
return NextResponse.json({status:'success',data:resellers.map(r=>({name:r.storeName,slug:r.storeSlug,tagline:r.storeTagline,color:r.storeColor??'#071c42',since:r.approvedAt}))});}
