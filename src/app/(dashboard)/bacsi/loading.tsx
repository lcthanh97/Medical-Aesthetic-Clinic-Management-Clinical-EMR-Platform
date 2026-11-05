export default function DoctorDashboardLoading() {
  return (
    <div className="mx-auto max-w-[1440px] animate-pulse space-y-6" aria-label="Đang tải dashboard bác sĩ">
      <div className="h-40 rounded-3xl border border-slate-200 bg-white" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-32 rounded-2xl border border-slate-200 bg-white" />)}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
        <div className="h-[420px] rounded-2xl border border-slate-200 bg-white" />
        <div className="space-y-6"><div className="h-52 rounded-2xl border border-slate-200 bg-white" /><div className="h-60 rounded-2xl border border-slate-200 bg-white" /></div>
      </div>
    </div>
  );
}
