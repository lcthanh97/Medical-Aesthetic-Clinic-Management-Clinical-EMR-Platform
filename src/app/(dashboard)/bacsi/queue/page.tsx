import Link from 'next/link';
import {
  ArrowDownUp,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  ListOrdered,
  RefreshCw,
  Search,
  Stethoscope,
  UsersRound,
} from 'lucide-react';
import { getDoctorDashboard } from '@/features/appointments/actions';

type QueueSearchParams = Promise<{
  date?: string;
  q?: string;
  room?: string;
  status?: string;
  sort?: string;
  page?: string;
}>;

const PAGE_SIZE = 6;

function timeLabel(value: Date | string) {
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function routeHref(
  values: { date: string; q: string; room: string; sort: string; status: string; page: number },
) {
  const params = new URLSearchParams();
  params.set('date', values.date);
  if (values.q) params.set('q', values.q);
  if (values.room) params.set('room', values.room);
  if (values.sort !== 'earliest') params.set('sort', values.sort);
  if (values.status) params.set('status', values.status);
  if (values.page > 1) params.set('page', String(values.page));
  return `/bacsi/queue?${params.toString()}`;
}

export default async function DoctorQueuePage({ searchParams }: { searchParams: QueueSearchParams }) {
  const params = await searchParams;
  const result = await getDoctorDashboard({ date: params.date });

  if (!result.success) {
    const needsLogin = result.code === 'AUTH_REQUIRED';
    return (
      <main className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-white p-6 shadow-sm sm:p-8" role="alert">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
          <Stethoscope size={22} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hàng đợi khám</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{result.error}</p>
        {needsLogin && (
          <Link href="/auth" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            Đăng nhập <ArrowRight size={16} />
          </Link>
        )}
      </main>
    );
  }

  const { data, selectedDate } = result;
  const q = (params.q ?? '').trim().slice(0, 100);
  const search = q.toLocaleLowerCase('vi-VN');
  const selectedStatus = params.status ?? '';
  const selectedRoom = params.room ?? '';
  const sort = params.sort === 'latest' ? 'latest' : 'earliest';
  const requestedPage = Number(params.page ?? '1');
  const roomMap = new Map<string, NonNullable<(typeof data.visits)[number]['room']>>();
  for (const visit of data.visits) {
    if (visit.room) roomMap.set(visit.room.id, visit.room);
  }
  const rooms = [...roomMap.values()]
    .sort((a, b) => `${a.name} ${a.departmentName}`.localeCompare(`${b.name} ${b.departmentName}`, 'vi'));
  const statusCounts = new Map<string, number>();
  for (const visit of data.visits) statusCounts.set(visit.status, (statusCounts.get(visit.status) ?? 0) + 1);
  const statuses = [...statusCounts.keys()].sort((a, b) => a.localeCompare(b, 'vi'));

  const filteredVisits = data.visits
    .filter((visit) => !selectedStatus || visit.status === selectedStatus)
    .filter((visit) => !selectedRoom || visit.room?.id === selectedRoom)
    .filter((visit) => {
      if (!search) return true;
      return `${visit.patient.fullName} ${visit.patient.patientCode}`.toLocaleLowerCase('vi-VN').includes(search);
    })
    .sort((a, b) => sort === 'latest'
      ? new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
      : new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime());

  const pageCount = Math.max(1, Math.ceil(filteredVisits.length / PAGE_SIZE));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, pageCount) : 1;
  const pageVisits = filteredVisits.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const nextVisit = pageVisits[0] ?? null;
  const visitsWithRecord = data.visits.filter((visit) => visit.medicalRecord !== null).length;
  const roomsInUse = new Set(data.visits.flatMap((visit) => visit.room?.id ?? [])).size;
  const baseHref = { date: selectedDate, q, room: selectedRoom, sort, status: selectedStatus };
  const metrics = [
    { label: 'Lượt khám được phân công', value: data.visits.length, icon: UsersRound, tone: 'blue' },
    { label: 'Có bệnh án', value: visitsWithRecord, icon: CheckCircle2, tone: 'teal' },
    { label: 'Chưa có bệnh án', value: data.visits.length - visitsWithRecord, icon: ClipboardList, tone: 'amber' },
    { label: 'Phòng có lượt khám', value: roomsInUse, icon: CalendarDays, tone: 'violet' },
  ] as const;
  const metricTone: Record<(typeof metrics)[number]['tone'], string> = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    teal: 'bg-teal-50 text-teal-700 ring-teal-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  };

  return (
    <main className="mx-auto max-w-[1440px] space-y-5 pb-8 text-slate-800">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
            <ListOrdered size={14} /> Khu vực bác sĩ
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-[27px]">Hàng đợi khám</h1>
          <p className="mt-1 text-sm text-slate-500">Các lượt khám được phân công trong ngày {selectedDate}.</p>
        </div>
        <form action="/bacsi/queue" method="get">
          <input type="hidden" name="date" value={selectedDate} />
          {q && <input type="hidden" name="q" value={q} />}
          {selectedStatus && <input type="hidden" name="status" value={selectedStatus} />}
          {selectedRoom && <input type="hidden" name="room" value={selectedRoom} />}
          {sort !== 'earliest' && <input type="hidden" name="sort" value={sort} />}
          <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50">
            <RefreshCw size={16} /> Làm mới danh sách
          </button>
        </form>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Thống kê lượt khám được phân công">
        {metrics.map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className="rounded-xl border border-[#e1e9f2] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${metricTone[tone]}`}><Icon size={18} /></span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          </article>
        ))}
      </section>

      <nav aria-label="Lọc theo trạng thái lượt khám" className="flex gap-6 overflow-x-auto border-b border-[#e1e9f2]">
        <Link href={routeHref({ ...baseHref, status: '', page: 1 })} aria-current={!selectedStatus ? 'page' : undefined}
          className={`shrink-0 border-b-2 px-1 py-3 text-sm ${!selectedStatus ? 'border-blue-600 font-semibold text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          Tất cả · {data.visits.length}
        </Link>
        {statuses.map((status) => (
          <Link key={status} href={routeHref({ ...baseHref, status, page: 1 })} aria-current={selectedStatus === status ? 'page' : undefined}
            className={`shrink-0 border-b-2 px-1 py-3 text-sm ${selectedStatus === status ? 'border-blue-600 font-semibold text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {status} · {statusCounts.get(status)}
          </Link>
        ))}
      </nav>

      <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.85fr)_minmax(290px,1fr)]">
        <div className="min-w-0 overflow-hidden rounded-xl border border-[#e1e9f2] bg-white shadow-sm">
          <div className="space-y-4 border-b border-slate-100 p-4 sm:p-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Danh sách lượt khám</h2>
              <p className="mt-1 text-xs text-slate-500">Danh sách chỉ gồm Visit được phân công cho tài khoản hiện tại.</p>
            </div>
            <form action="/bacsi/queue" method="get" className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_minmax(140px,0.8fr)_auto]">
              <label className="relative">
                <span className="sr-only">Tìm bệnh nhân theo tên hoặc mã bệnh nhân</span>
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="search" name="q" defaultValue={q} maxLength={100} placeholder="Tên hoặc mã bệnh nhân"
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label>
                <span className="sr-only">Ngày lượt khám</span>
                <input type="date" name="date" defaultValue={selectedDate}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label>
                <span className="sr-only">Lọc theo phòng</span>
                <select name="room" defaultValue={selectedRoom} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                  <option value="">Tất cả phòng</option>
                  {rooms.map((room) => <option key={room.id} value={room.id}>{room.name} · {room.departmentName}</option>)}
                </select>
              </label>
              <label>
                <span className="sr-only">Sắp xếp theo thời điểm lượt khám</span>
                <select name="sort" defaultValue={sort} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                  <option value="earliest">Thời điểm sớm nhất</option>
                  <option value="latest">Thời điểm muộn nhất</option>
                </select>
              </label>
              {selectedStatus && <input type="hidden" name="status" value={selectedStatus} />}
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#246dce] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                <Search size={15} /> Lọc
              </button>
              {(q || selectedRoom || sort !== 'earliest') && (
                <Link href={routeHref({ ...baseHref, q: '', room: '', sort: 'earliest', page: 1 })}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Xóa bộ lọc
                </Link>
              )}
            </form>
          </div>

          {pageVisits.length === 0 ? (
            <div className="m-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center sm:m-5">
              <CalendarDays className="mx-auto text-slate-400" size={28} />
              <h3 className="mt-3 font-semibold text-slate-800">Không có lượt khám phù hợp</h3>
              <p className="mt-1 text-sm text-slate-500">Thử chọn ngày khác hoặc xóa bớt điều kiện lọc.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-[#f5f8fc] text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">STT</th>
                    <th scope="col" className="px-4 py-3">Bệnh nhân / Mã BN</th>
                    <th scope="col" className="px-4 py-3">Thời điểm lượt khám</th>
                    <th scope="col" className="px-4 py-3">Phòng / Khoa</th>
                    <th scope="col" className="px-4 py-3">Trạng thái</th>
                    <th scope="col" className="px-4 py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageVisits.map((visit, index) => (
                    <tr key={visit.id} className={`transition hover:bg-blue-50/50 ${visit.id === nextVisit?.id ? 'bg-blue-50/70' : 'bg-white'}`}>
                      <td className="px-4 py-4 text-slate-500">{(page - 1) * PAGE_SIZE + index + 1}</td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">{visit.patient.fullName}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{visit.patient.patientCode}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">{timeLabel(visit.visitDate)}</td>
                      <td className="px-4 py-4 text-slate-700">
                        {visit.room ? <><p>{visit.room.name}</p><p className="mt-0.5 text-xs text-slate-500">{visit.room.departmentName}</p></> : <span className="text-slate-400">Chưa có phòng</span>}
                      </td>
                      <td className="px-4 py-4"><span className="inline-flex max-w-48 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">{visit.status}</span></td>
                      <td className="px-4 py-4">
                        <Link href={`/bacsi/examination?visitId=${encodeURIComponent(visit.id)}`} className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-blue-700 hover:text-blue-900">
                          Khám bệnh <ArrowRight size={14} />
                        </Link>
                        <Link href={`/bacsi/emr?patientId=${encodeURIComponent(visit.patientId)}`} className="mt-1 inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-slate-600 hover:text-blue-800">
                          Mở EMR <FileText size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-5">
            <span>Hiển thị {filteredVisits.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredVisits.length)} trong {filteredVisits.length} lượt khám</span>
            <div className="flex items-center gap-2">
              <Link aria-label="Trang trước" aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined}
                href={routeHref({ ...baseHref, page: Math.max(1, page - 1) })}
                className={`rounded-md border px-3 py-2 ${page <= 1 ? 'pointer-events-none border-slate-100 text-slate-300' : 'border-slate-200 text-blue-700 hover:bg-blue-50'}`}>‹</Link>
              <span className="font-semibold text-slate-700">{page} / {pageCount}</span>
              <Link aria-label="Trang sau" aria-disabled={page >= pageCount} tabIndex={page >= pageCount ? -1 : undefined}
                href={routeHref({ ...baseHref, page: Math.min(pageCount, page + 1) })}
                className={`rounded-md border px-3 py-2 ${page >= pageCount ? 'pointer-events-none border-slate-100 text-slate-300' : 'border-slate-200 text-blue-700 hover:bg-blue-50'}`}>›</Link>
            </div>
          </footer>
        </div>

        <aside className="rounded-xl border border-[#e1e9f2] bg-[#edf5ff] p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Lượt khám đầu danh sách</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">{nextVisit ? nextVisit.patient.fullName : 'Chưa có lượt khám'}</h2>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-blue-700"><UsersRound size={19} /></span>
          </div>
          {nextVisit ? (
            <>
              <p className="mt-1 text-sm text-slate-500">{nextVisit.patient.patientCode}</p>
              <div className="my-4 h-px bg-[#dbe6f1]" />
              <dl className="space-y-3 text-sm">
                <div><dt className="text-xs text-slate-500">Thời điểm lượt khám</dt><dd className="mt-1 font-semibold text-slate-800">{timeLabel(nextVisit.visitDate)} · {selectedDate}</dd></div>
                <div><dt className="text-xs text-slate-500">Phòng / Khoa</dt><dd className="mt-1 font-semibold text-slate-800">{nextVisit.room ? `${nextVisit.room.name} · ${nextVisit.room.departmentName}` : 'Chưa có phòng trong dữ liệu'}</dd></div>
                <div><dt className="text-xs text-slate-500">Trạng thái trong hồ sơ</dt><dd className="mt-1 font-semibold text-slate-800">{nextVisit.status}</dd></div>
                <div><dt className="text-xs text-slate-500">Bệnh án</dt><dd className="mt-1 font-semibold text-slate-800">{nextVisit.medicalRecord ? 'Đã có bệnh án' : 'Chưa có bệnh án'}</dd></div>
              </dl>
              <div className="mt-5 rounded-lg border border-blue-100 bg-white/80 p-3 text-xs leading-5 text-slate-600">
                Thao tác dưới đây chỉ mở EMR của lượt khám đã được phân công; không tự đổi trạng thái lượt khám.
              </div>
              <div className="mt-4 grid gap-2">
                <Link href={`/bacsi/examination?visitId=${encodeURIComponent(nextVisit.id)}`} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#246dce] px-4 text-sm font-semibold text-white hover:bg-blue-700">
                  <Stethoscope size={16} /> Mở lượt khám <ArrowRight size={15} />
                </Link>
                <Link href={`/bacsi/emr?patientId=${encodeURIComponent(nextVisit.patientId)}`} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                  <FileText size={16} /> Mở EMR được phân công
                </Link>
              </div>
            </>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-blue-200 bg-white/70 p-4 text-sm text-slate-600">Chọn ngày khác hoặc xóa bộ lọc để xem các lượt khám được phân công.</p>
          )}
        </aside>
      </section>

      <p className="flex items-center gap-2 text-xs text-slate-500"><ArrowDownUp size={14} /> Trạng thái lấy nguyên văn từ Visit; danh sách và liên kết hồ sơ được giới hạn theo nhân viên đăng nhập.</p>
    </main>
  );
}
