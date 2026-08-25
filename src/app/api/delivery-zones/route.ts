import {NextResponse} from 'next/server';import {prisma} from '@/lib/db';
export async function GET(){const zones=await prisma.deliveryZone.findMany({where:{active:true},orderBy:{name:'asc'}});return NextResponse.json({status:'success',data:zones.map(z=>({...z,baseFee:Number(z.baseFee),minimumOrder:z.minimumOrder?Number(z.minimumOrder):null}))})}
