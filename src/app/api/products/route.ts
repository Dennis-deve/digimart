import {NextResponse} from 'next/server';import {prisma} from '@/lib/db';
export async function GET(request:Request){const url=new URL(request.url);const q=url.searchParams.get('q')?.trim()??'';const category=url.searchParams.get('category')?.trim()??'';
const where:Record<string,unknown>={inStock:true,isExcluded:false};
if(q){const words=q.split(/\s+/).filter(Boolean);where.AND=words.map(w=>({OR:[{name:{contains:w,mode:'insensitive'}},{category:{contains:w,mode:'insensitive'}},{network:{contains:w,mode:'insensitive'}},{description:{contains:w,mode:'insensitive'}}]}));}
if(category)where.category=category;
const products=await prisma.product.findMany({where,orderBy:{createdAt:'desc'},take:60});
return NextResponse.json({status:'success',data:products.map(p=>({id:p.id,name:p.name,network:p.network,category:p.category,basePrice:Number(p.basePrice),variablePrice:p.variablePrice,minAmount:p.minAmount?Number(p.minAmount):null,maxAmount:p.maxAmount?Number(p.maxAmount):null,images:p.images,description:p.description,inStock:p.inStock,provider:p.source}))});}
