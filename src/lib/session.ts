import {jwtVerify,SignJWT} from 'jose';
const key=()=>new TextEncoder().encode(process.env.JWT_SECRET??'development-only-change-before-production');
export async function createSession(user:{id:string;phone:string;role:string}){return new SignJWT({phone:user.phone,role:user.role}).setProtectedHeader({alg:'HS256'}).setSubject(user.id).setIssuedAt().setExpirationTime('7d').sign(key());}
export async function readSession(token:string){try{const {payload}=await jwtVerify(token,key());return {id:payload.sub??'',phone:String(payload.phone??''),role:String(payload.role??'CUSTOMER')};}catch{return null;}}
