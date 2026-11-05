import type { AccountViewModel, CreateAccountInput, RoleSummary, UpdateAccountInput } from '../types/auth.types';
async function parse<T>(response: Response): Promise<T> { const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Yêu cầu thất bại.'); return body; }
export const authApi = {
  list: (query='') => fetch(`/api/auth?query=${encodeURIComponent(query)}`).then(r=>parse<{data:AccountViewModel[];roles:RoleSummary[]}>(r)),
  create: (input:CreateAccountInput) => fetch('/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)}).then(r=>parse<{data:AccountViewModel}>(r)),
  update: (id:string,input:UpdateAccountInput) => fetch('/api/auth',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,...input})}).then(r=>parse<{data:AccountViewModel}>(r)),
};
