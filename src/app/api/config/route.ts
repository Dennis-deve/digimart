import {NextResponse} from 'next/server';
import {paymentFeePct} from '@/lib/fees';
// Public, non-sensitive checkout config for the frontend.
export async function GET(){return NextResponse.json({status:'success',data:{paymentFeePct:paymentFeePct(),googleAuthEnabled:Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET)}});}
