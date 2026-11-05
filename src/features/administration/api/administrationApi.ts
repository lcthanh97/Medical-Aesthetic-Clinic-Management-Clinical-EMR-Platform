import type { AdministrationSnapshot, CreateAdministrationInput } from '../types/administration.types';
async function parse<T>(r:Response){const b=await r.json();if(!r.ok)throw new Error(b.message||'Yêu cầu thất bại.');return b as T}
export const administrationApi = {
  getSnapshot:()=>fetch('/api/administration').then(r=>parse<{success:true;data:AdministrationSnapshot}>(r)),
  create:(input:CreateAdministrationInput)=>fetch('/api/administration',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)}).then(r=>parse<{success:true;data:{id:string;name:string}}>(r)),
};
