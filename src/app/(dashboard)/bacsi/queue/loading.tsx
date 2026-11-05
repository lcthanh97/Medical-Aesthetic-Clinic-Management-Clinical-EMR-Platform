export default function DoctorQueueLoading() {
  return (
    <div className="mx-auto max-w-[1440px] animate-pulse space-y-5" aria-label="Đang tải hàng đợi khám">
      <div className="h-16 rounded-xl bg-white" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 rounded-xl bg-white" />)}
      </div>
      <div className="h-12 border-b border-slate-200" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.85fr)_minmax(290px,1fr)]">
        <div className="h-[34rem] rounded-xl bg-white" />
        <div className="h-96 rounded-xl bg-blue-50" />
      </div>
    </div>
  );
}
