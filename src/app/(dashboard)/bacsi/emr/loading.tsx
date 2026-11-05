export default function PatientRecordsLoading() {
  return (
    <main className="mx-auto w-full max-w-[1600px] animate-pulse space-y-5 p-2 sm:p-4" aria-busy="true" aria-label="Đang tải hồ sơ bệnh nhân">
      <div className="space-y-2">
        <div className="h-3 w-32 rounded bg-slate-200" />
        <div className="h-8 w-72 max-w-full rounded bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-200" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[365px_minmax(0,1fr)]">
        <div className="h-[28rem] rounded-xl border border-[#e1e9f2] bg-white p-4">
          <div className="mb-4 h-6 w-44 rounded bg-slate-200" />
          <div className="mb-3 h-10 rounded bg-slate-100" />
          {[1, 2, 3, 4].map((item) => <div key={item} className="mb-2 h-14 rounded-lg bg-slate-100" />)}
        </div>
        <div className="space-y-5">
          <div className="h-32 rounded-xl border border-[#e1e9f2] bg-white" />
          <div className="h-12 rounded-lg bg-slate-100" />
          <div className="h-80 rounded-xl border border-[#e1e9f2] bg-white" />
        </div>
      </div>
    </main>
  );
}
