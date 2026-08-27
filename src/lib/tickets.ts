import {prisma} from '@/lib/db';
export async function createTicket(input:{topic:string;orderNo?:string;message:string},meta?:{userId?:string;phone?:string}){const ticket=await prisma.supportTicket.create({data:{id:`SUP-${crypto.randomUUID().slice(0,8).toUpperCase()}`,...input,userId:meta?.userId,phone:meta?.phone,status:'OPEN'}});
await prisma.supportMessage.create({data:{id:crypto.randomUUID(),ticketId:ticket.id,senderRole:'CUSTOMER',senderName:meta?.phone?`Customer ${meta.phone}`:'Customer',message:input.message}});
return ticket}
export async function listTickets(){return prisma.supportTicket.findMany({orderBy:{createdAt:'desc'}})}
