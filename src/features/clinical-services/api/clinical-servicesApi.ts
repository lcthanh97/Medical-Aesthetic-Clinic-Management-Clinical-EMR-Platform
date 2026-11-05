import type { ClsPaymentStatusResponse, ClinicalOrderItem, CreateClinicalOrderDto, SubmitResultsDto } from '../types/clinical-services.types';
async function parse<T>(r:Response):Promise<T>{const b=await r.json();if(!r.ok||b.success===false)throw new Error(b.message||'Yêu cầu cận lâm sàng thất bại.');return (b.data??b) as T}
export const clinicalServicesApi = {
  getCatalog:()=>fetch('/api/cls/catalog').then(r=>parse<Array<{code:string;name:string;type:string;price:number}>>(r)),
  createOrder:(input:CreateClinicalOrderDto)=>fetch('/api/cls/orders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)}).then(r=>parse<ClinicalOrderItem>(r)),
  start:(orderId:string)=>fetch(`/api/cls/orders/${encodeURIComponent(orderId)}/start`,{method:'POST'}).then(r=>parse<ClinicalOrderItem>(r)),
  submitResults:(orderId:string,input:SubmitResultsDto)=>fetch(`/api/cls/orders/${encodeURIComponent(orderId)}/results`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)}).then(r=>parse<ClinicalOrderItem>(r)),
  paymentStatus:(orderId:string)=>fetch(`/api/cls/orders/${encodeURIComponent(orderId)}/payment-status`).then(r=>parse<ClsPaymentStatusResponse>(r)),
};
