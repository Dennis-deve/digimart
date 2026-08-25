import {prisma} from '@/lib/db';
export async function createTicket(input:{topic:string;orderNo?:string;message:string}){return prisma.supportTicket.create({data:{id:`SUP-${crypto.randomUUID().slice(0,8).toUpperCase()}`,...input,status:'OPEN'}})}
export async function listTickets(){return prisma.supportTicket.findMany({orderBy:{createdAt:'desc'}})}
