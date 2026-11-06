import 'server-only';
import { createHmac, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import prisma from '@/infrastructure/database/prisma';
const scrypt=promisify(scryptCallback);export const STAFF_SESSION_COOKIE='clinic_staff_session';
export type StaffPortal='letan'|'admin';type StaffSession={accountId:string;employeeId:string;fullName:string;portal:StaffPortal;exp:number};
function key(){const v=process.env.JWT_ACCESS_SECRET;if(!v||v.length<32)throw new Error('JWT_ACCESS_SECRET chưa được cấu hình an toàn.');return v}function sign(p:string){return createHmac('sha256',key()).update(`staff:${p}`).digest('base64url')}
export function createStaffToken(s:Omit<StaffSession,'exp'>){const p=Buffer.from(JSON.stringify({...s,exp:Date.now()+8*60*60*1000})).toString('base64url');return `${p}.${sign(p)}`}
function decode(t?:string):StaffSession|null{if(!t)return null;const[p,s]=t.split('.');if(!p||!s)return null;const a=Buffer.from(sign(p)),b=Buffer.from(s);if(a.length!==b.length||!timingSafeEqual(a,b))return null;try{const v=JSON.parse(Buffer.from(p,'base64url').toString()) as StaffSession;return v.exp>Date.now()?v:null}catch{return null}}
export async function getStaffSession(portal:StaffPortal){const s=decode((await cookies()).get(STAFF_SESSION_COOKIE)?.value);return s?.portal===portal?s:null}
export async function authenticateStaff(identifier:string,password:string,portal:StaffPortal){const value=identifier.trim().toLowerCase();const a=await prisma.account.findFirst({where:{OR:[{username:value},{email:value}]},include:{employee:true,roles:{include:{role:true}}}});if(!a||a.status!=='ACTIVE'||!a.employee)return null;const names=a.roles.map(x=>x.role.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());const allowed=portal==='letan'?names.some(n=>n.includes('le tan')||n.includes('thu ngan')):names.some(n=>n.includes('quan tri')||n.includes('quan ly'));if(!allowed)return null;const[alg,salt,stored]=a.passwordHash.split(':');if(alg!=='scrypt'||!salt||!stored)return null;const derived=await scrypt(password,salt,64) as Buffer,existing=Buffer.from(stored,'hex');if(existing.length!==derived.length||!timingSafeEqual(existing,derived))return null;return{accountId:a.id,employeeId:a.employee.id,fullName:a.employee.fullName,portal}}
