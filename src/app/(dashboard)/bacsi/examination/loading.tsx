export default function DoctorExaminationLoading() {
  return (
    <main className="mx-auto max-w-[1440px] animate-pulse space-y-5 pb-8" aria-busy="true" aria-label="Đang tải lượt khám">
      <div className="space-y-3"><div className="h-6 w-48 rounded bg-slate-200" /><div className="h-9 w-72 rounded bg-slate-200" /><div className="h-4 w-96 max-w-full rounded bg-slate-200" /></div>
      <div className="h-24 rounded-xl border border-slate-200 bg-white" />
      <div className="h-12 border-b border-slate-200" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]"><div className="h-[34rem] rounded-xl border border-slate-200 bg-white" /><div className="h-64 rounded-xl border border-slate-200 bg-white" /></div>
    </main>
  );
}
