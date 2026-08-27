import {createNotification} from '@/lib/notify-user';
import {NextResponse} from 'next/server';
import {prisma} from '@/lib/db';
import {getMuviinAirtimeStatus,getMuviinCheckerStatus} from '@/lib/providers';
import {recomputeAndSettle} from '@/lib/settle';
import {sendSms} from '@/lib/notify';

/** Polls Muviin for pending airtime AND result-checker items, delivers checker vouchers,
 *  recomputes order status and triggers settlement exactly once per order. */
export async function POST(request:Request){const token=request.headers.get('authorization')?.replace(/^Bearer\s+/,'');if(!process.env.JOBS_TOKEN||token!==process.env.JOBS_TOKEN)return NextResponse.json({status:'error',message:'Unauthorized job request.'},{status:401});const items=await prisma.orderItem.findMany({where:{source:'MUVIIN',fulfillment:'PENDING',externalRef:{not:null}},take:100,include:{Product:{select:{name:true,category:true}},Order:{select:{customerPhone:true,customerId:true}}}});let fulfilled=0,failed=0,pending=0;const touchedOrders=new Set<string>();
for(const item of items){const isChecker=/result checker/i.test(item.Product.category);try{
const result=isChecker?await getMuviinCheckerStatus(item.externalRef!):await getMuviinAirtimeStatus(item.externalRef!);
const status=String(result.status??'').toLowerCase();
if(status==='success'){const metadata=isChecker?{...(item.metadata as object|null??{}),checkerResult:result as object}:item.metadata as object|null;
await prisma.orderItem.update({where:{id:item.id},data:{fulfillment:'FULFILLED',metadata:metadata as never}});fulfilled++;touchedOrders.add(item.orderId);
if(isChecker){const detail=JSON.stringify(result);if(item.Order?.customerId)await createNotification({userId:item.Order.customerId,title:'Result checker ready',message:`Your ${item.Product.name} voucher is ready — open the order to view your codes.`,type:'ORDER'});await sendSms(item.Order?.customerPhone??'',`DigiMart: your ${item.Product.name} is ready. Check your DigiMart order for the voucher details.`);void detail;}}
else if(status==='failed'){await prisma.orderItem.update({where:{id:item.id},data:{fulfillment:'FAILED'}});failed++;touchedOrders.add(item.orderId)}
else pending++}catch{pending++}}
const settled:string[]=[];for(const orderId of touchedOrders){const result=await recomputeAndSettle(orderId);if(result?.settled)settled.push(orderId)}
return NextResponse.json({status:'success',data:{checked:items.length,fulfilled,failed,pending,ordersSettled:settled}})}
