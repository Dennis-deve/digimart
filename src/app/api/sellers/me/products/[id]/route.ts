import {NextResponse} from 'next/server';import {z} from 'zod';import {requireRole} from '@/lib/guards';import {prisma} from '@/lib/db';
const editSchema=z.object({name:z.string().min(2).max(160).optional(),price:z.number().positive().optional(),description:z.string().max(3000).nullable().optional(),image:z.string().url().max(600).nullable().optional(),variants:z.array(z.string().min(1).max(40)).max(12).optional(),onPlatform:z.boolean().optional(),inStock:z.boolean().optional()});
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){const guard=await requireRole(request,['CUSTOMER','SELLER']);if(guard.response)return guard.response;const {id}=await params;const seller=await prisma.seller.findUnique({where:{userId:guard.session!.id}});if(!seller)return NextResponse.json({status:'error',message:'Seller profile not found.'},{status:404});const product=await prisma.product.findUnique({where:{id},include:{_count:{select:{OrderItem:true}}}});if(!product||product.sellerId!==seller.id)return NextResponse.json({status:'error',message:'Product not found in your inventory.'},{status:404});const input=editSchema.safeParse(await request.json());if(!input.success)return NextResponse.json({status:'error',message:input.error.issues[0]?.message??'Invalid update.'},{status:400});
const cosmeticOnly=(input.data.inStock!==undefined)&&Object.keys(input.data).length===1;
const data:Record<string,unknown>={updatedAt:new Date()};
if(input.data.name!==undefined)data.name=input.data.name;
if(input.data.price!==undefined)data.basePrice=input.data.price;
if(input.data.description!==undefined)data.description=input.data.description??null;
if(input.data.image!==undefined)data.images=input.data.image?[input.data.image]:[];
if(input.data.variants!==undefined)data.variants=input.data.variants.length?input.data.variants:null;
if(input.data.onPlatform!==undefined)data.onPlatform=input.data.onPlatform;
if(input.data.inStock!==undefined)data.inStock=input.data.inStock;
// Stock toggling keeps approval; ANY content edit sends it back for re-approval (guardrail)
if(!cosmeticOnly)data.approvalStatus='PENDING';
await prisma.product.update({where:{id},data:data as never});
return NextResponse.json({status:'success',data:{id,approvalStatus:cosmeticOnly?product.approvalStatus:'PENDING',message:cosmeticOnly?'Stock updated.':(product._count.OrderItem>0?'Updated — existing orders keep their prices.':'Updated and sent back for admin approval.')}})}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){const guard=await requireRole(request,['CUSTOMER','SELLER']);if(guard.response)return guard.response;const {id}=await params;const seller=await prisma.seller.findUnique({where:{userId:guard.session!.id}});if(!seller)return NextResponse.json({status:'error',message:'Seller profile not found.'},{status:404});const product=await prisma.product.findUnique({where:{id},include:{_count:{select:{OrderItem:true}}}});if(!product||product.sellerId!==seller.id)return NextResponse.json({status:'error',message:'Product not found in your inventory.'},{status:404});if(product._count.OrderItem>0)return NextResponse.json({status:'error',message:`This product has ${product._count.OrderItem} order(s) — hide it instead of deleting.`},{status:409});await prisma.product.delete({where:{id}});return NextResponse.json({status:'success'})}
