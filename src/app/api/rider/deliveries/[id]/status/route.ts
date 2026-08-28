import {createNotification} from '@/lib/notify-user';
import {NextResponse} from 'next/server';import {z} from 'zod';import {requireRole} from '@/lib/guards';import {prisma} from '@/lib/db';
import {recomputeAndSettle} from '@/lib/settle';
import {riderFeePct} from '@/lib/fees';
import {sendSms} from '@/lib/notify';
const schema=z.object({status:z.enum(['GOING_TO_PICKUP','PICKED_UP','OUT_FOR_DELIVERY','DELIVERED','FAILED'])});
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){const guard=await requireRole(request,['RIDER']);if(guard.response)return guard.response;const {id}=await params;const input=schema.safeParse(await request.json());if(!input.success)return NextResponse.json({status:'error',message:'Invalid delivery status.'},{status:400});const rider=await prisma.rider.findUnique({where:{userId:guard.session!.id}});const delivery=await prisma.delivery.findUnique({where:{id}});if(!rider||!delivery||delivery.riderId!==rider.id)return NextResponse.json({status:'error',message:'Assigned delivery not found.'},{status:404});const updated=await prisma.delivery.update({where:{id},data:{status:input.data.status,updatedAt:new Date()}});const order=await prisma.order.findUnique({where:{id:updated.orderId}});
if(order?.customerId)await createNotification({userId:order.customerId,title:'Delivery update',message:`Your delivery is now ${updated.status.replaceAll('_',' ').toLowerCase()}.`,type:'DELIVERY'});
let orderStatus=null;
if(input.data.status==='DELIVERED'){
const fee=Number(updated.deliveryFee)*riderFeePct()/100;
if(fee>0){await prisma.rider.update({where:{id:rider.id},data:{earningsBalance:{increment:fee}}});await createNotification({userId:rider.userId,title:'Delivery earnings credited',message:`GH₵${fee.toFixed(2)} added to your rider earnings.`,type:'DELIVERY'});}
const items=await prisma.orderItem.findMany({where:{orderId:updated.orderId,source:'ADMIN',fulfillment:'PENDING'}});
for(const item of items)await prisma.orderItem.update({where:{id:item.id},data:{fulfillment:'FULFILLED',metadata:{...(item.metadata as object|null??{}),completedBy:'RIDER_DELIVERED'} as never}});
const result=await recomputeAndSettle(updated.orderId);orderStatus=result?.status??null;
if(order?.customerPhone)await sendSms(order.customerPhone,`DigiMart: your order ${order.id} has been delivered. Thank you for shopping with us!`);
}
return NextResponse.json({status:'success',data:{id:updated.id,status:updated.status,orderStatus}})}
