'use client';
import { useSearchParams } from 'next/navigation';
import { patientAuthLink, patientReturnPath } from '@/features/client-portal/patientReturnPath';
import { Suspense, useState } from 'react';import Link from 'next/link';
function PatientRegisterPage(){const destination=patientReturnPath(useSearchParams().get('next'));const[error,setError]=useState(''),[code,setCode]=useState(''),[loading,setLoading]=useState(false);async function submit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault()
  if (loading) return
  setLoading(true)
  setError('')
  const fields = new FormData(event.currentTarget)
  try {
    const response = await fetch('/api/patient-auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: fields.get('fullName'), phone: fields.get('phone'), dateOfBirth: fields.get('dateOfBirth') }),
    })
    const data = await response.json()
    if (!response.ok) { setError(data.error || 'Không thể xử lý yêu cầu.'); return }
    setCode(data.patientCode)
  } catch {
    setError('Kết nối gián đoạn. Vui lòng thử lại.')
  } finally {
    setLoading(false)
  }
}
return <main className="grid min-h-screen place-items-center bg-[#eef7ff] p-4"><section className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-xl"><h1 className="font-serif text-3xl font-black text-[#0c3865]">Đăng ký Khách hàng</h1><p className="mt-2 text-sm text-[#718196]">Tạo hồ sơ thật trong hệ thống phòng khám.</p>{code?<div className="mt-7 rounded-2xl bg-emerald-50 p-5 text-center"><p className="text-sm text-emerald-700">Đăng ký thành công. Mã bệnh nhân của bạn:</p><strong className="mt-2 block text-2xl text-emerald-800">{code}</strong><Link href={patientAuthLink('dang-nhap',destination)} className="mt-5 inline-block rounded-xl bg-[#176cce] px-5 py-3 font-bold text-white">Đăng nhập ngay</Link></div>:<form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-semibold">Họ và tên<input required name="fullName" className="mt-1 w-full rounded-xl border px-4 py-3"/></label><label className="block text-sm font-semibold">Số điện thoại<input required name="phone" type="tel" className="mt-1 w-full rounded-xl border px-4 py-3"/></label><label className="block text-sm font-semibold">Ngày sinh<input name="dateOfBirth" type="date" className="mt-1 w-full rounded-xl border px-4 py-3"/></label>{error&&<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={loading} className="w-full rounded-xl bg-[#176cce] py-3.5 font-bold text-white">{loading?'Đang tạo hồ sơ...':'Đăng ký hồ sơ'}</button></form>}<Link href={patientAuthLink('dang-nhap',destination)} className="mt-5 block text-center text-sm text-[#176cce]">Đã có hồ sơ? Đăng nhập</Link></section></main>}

export default function Page() { return <Suspense><PatientRegisterPage /></Suspense> }
