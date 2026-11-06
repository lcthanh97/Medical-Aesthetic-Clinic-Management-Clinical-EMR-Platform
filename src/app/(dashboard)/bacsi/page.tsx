import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CalendarClock,
  ClipboardCheck,
  FileText,
  Image as ImageIcon,
  Pill,
  Search,
  Stethoscope,
  UsersRound,
} from 'lucide-react';
import { getDoctorDashboard } from '@/features/appointments/actions';

type DashboardSearchParams = Promise<{
  date?: string;
  status?: string;
  q?: string;
}>;

function formatTime(value: Date | string) {
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('vi-VN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

export default async function BacSiDashboardPage({ searchParams }: { searchParams: DashboardSearchParams }) {
  const params = await searchParams;
  const result = await getDoctorDashboard({ date: params.date });

  if (!result.success) {
    const isUnauthenticated = result.code === 'AUTH_REQUIRED';
    return (
      <section className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-white p-6 shadow-sm sm:p-8" role="alert">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
          <Stethoscope size={22} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tổng quan bác sĩ</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{result.error}</p>
        {isUnauthenticated && (
          <Link href="/auth" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            Đăng nhập <ArrowRight size={16} />
          </Link>
        )}
      </section>
    );
  }

  const { data, employeeName, selectedDate } = result;
  const search = (params.q ?? '').trim().slice(0, 100).toLocaleLowerCase('vi-VN');
  const statusFilter = params.status ?? '';
  const statuses = [...new Set(data.appointments.map((appointment) => appointment.status))].sort((a, b) => a.localeCompare(b, 'vi'));
  const appointments = data.appointments.filter((appointment) => {
    const matchesStatus = !statusFilter || appointment.status === statusFilter;
    const searchable = `${appointment.patient.fullName} ${appointment.patient.patientCode}`.toLocaleLowerCase('vi-VN');
    return matchesStatus && (!search || searchable.includes(search));
  });
  const appointmentStatusCounts = new Map<string, number>();
  for (const appointment of data.appointments) {
    appointmentStatusCounts.set(appointment.status, (appointmentStatusCounts.get(appointment.status) ?? 0) + 1);
  }
  const patientCount = new Set(data.visits.map((visit) => visit.patientId)).size;
  const recordedMedicalRecords = data.visits.filter((visit) => visit.medicalRecord !== null).length;
  const upcoming = data.appointments.find((appointment) => new Date(appointment.scheduledAt).getTime() >= new Date(result.asOf).getTime());

  const metrics = [
    { label: 'Lịch hẹn được phân công', value: data.appointments.length, icon: CalendarDays, tone: 'blue', href: '#appointments' },
    { label: 'Lượt khám trong ngày', value: data.visits.length, icon: UsersRound, tone: 'violet', href: '#visits' },
    { label: 'Bệnh án đã ghi nhận', value: recordedMedicalRecords, icon: ClipboardCheck, tone: 'teal', href: '#visits' },
    { label: 'Buổi điều trị theo lịch', value: data.treatmentSessions.length, icon: Activity, tone: 'amber', href: '/bacsi/treatments' },
  ] as const;

  const metricTone: Record<(typeof metrics)[number]['tone'], string> = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
    teal: 'bg-teal-50 text-teal-700 ring-teal-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-white via-white to-blue-50 p-5 shadow-sm sm:p-7">
        <div className="absolute -right-12 -top-24 h-64 w-64 rounded-full bg-blue-100/50 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
              <Stethoscope size={14} /> Phân hệ bác sĩ điều trị
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Tổng quan bác sĩ</h1>
            <p className="mt-1 text-sm text-slate-600">
              {employeeName ? `Xin chào, ${employeeName}. ` : ''}Lịch và lượt khám được phân công cho bạn — {formatDate(selectedDate)}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/bacsi/queue?date=${encodeURIComponent(selectedDate)}`} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
              <CalendarDays size={16} /> Mở hàng đợi khám
            </Link>
            <Link href="/bacsi/emr" className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">
              <FileText size={16} /> Mở EMR
            </Link>
            <Link href="/bacsi/prescriptions" className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">
              <Pill size={16} /> Kê đơn thuốc
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Thống kê trong ngày">
        {metrics.map(({ label, value, icon: Icon, tone, href }) => (
          <Link key={label} href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
              </div>
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${metricTone[tone]}`}><Icon size={21} /></span>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 opacity-80 group-hover:opacity-100">
              Xem chi tiết <ArrowRight size={13} />
            </span>
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
        <div id="appointments" className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-blue-700"><CalendarClock size={18} /><span className="text-sm font-semibold">Lịch khám</span></div>
                <h2 className="mt-1 text-lg font-bold text-slate-900">Lịch hẹn được phân công</h2>
                <p className="mt-1 text-sm text-slate-500">Danh sách lấy từ lịch hẹn có bác sĩ phụ trách là tài khoản hiện tại.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{appointments.length} / {data.appointments.length}</span>
            </div>
            <form action="/bacsi" method="get" className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(160px,0.8fr)_minmax(180px,1fr)_minmax(150px,0.8fr)_auto]">
              <label className="sr-only" htmlFor="dashboard-date">Ngày</label>
              <input id="dashboard-date" type="date" name="date" defaultValue={selectedDate} className="min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              <label className="relative">
                <span className="sr-only">Tìm bệnh nhân</span>
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="search" name="q" defaultValue={params.q ?? ''} placeholder="Tên hoặc mã bệnh nhân" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label>
                <span className="sr-only">Lọc trạng thái</span>
                <select name="status" defaultValue={statusFilter} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                  <option value="">Tất cả trạng thái</option>
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <div className="flex gap-2">
                <button type="submit" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 sm:flex-none">
                  <Search size={15} /> Lọc
                </button>
                {(params.q || params.status) && <Link href={`/bacsi?date=${encodeURIComponent(selectedDate)}`} className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Xóa lọc</Link>}
              </div>
            </form>
          </div>

          {appointments.length === 0 ? (
            <div className="m-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center sm:m-6">
              <CalendarDays className="mx-auto text-slate-400" size={28} />
              <h3 className="mt-3 font-semibold text-slate-800">Không có lịch hẹn phù hợp</h3>
              <p className="mt-1 text-sm text-slate-500">Thử đổi ngày hoặc bỏ bớt điều kiện lọc.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr><th className="px-5 py-3 sm:px-6">Giờ</th><th className="px-5 py-3">Bệnh nhân</th><th className="px-5 py-3">Phòng</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3 sm:px-6">Thao tác</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.map((appointment) => (
                      <tr key={appointment.id} className="transition hover:bg-blue-50/40">
                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900 sm:px-6">{formatTime(appointment.scheduledAt)}</td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">{appointment.patient.fullName}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{appointment.patient.patientCode}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{appointment.room?.name ?? '—'}</td>
                        <td className="px-5 py-4"><span className="inline-flex max-w-40 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">{appointment.status}</span></td>
                        <td className="px-5 py-4 sm:px-6">
                          <Link href={`/bacsi/queue?date=${encodeURIComponent(selectedDate)}&q=${encodeURIComponent(appointment.patient.patientCode)}`} className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-blue-700 hover:text-blue-900">
                            Tìm Visit <ArrowRight size={14} />
                          </Link>
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-blue-700"><ClipboardCheck size={18} /><span className="text-sm font-semibold">Lịch hẹn</span></div>
                <h2 className="mt-1 text-lg font-bold text-slate-900">Tình hình theo trạng thái</h2>
              </div>
              <Link href={`/bacsi/queue?date=${encodeURIComponent(selectedDate)}`} className="text-xs font-semibold text-blue-700 hover:text-blue-900">Mở hàng đợi</Link>
            </div>
            {appointmentStatusCounts.size === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Chưa có lịch hẹn được phân công trong ngày đã chọn.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {[...appointmentStatusCounts.entries()].map(([status, count]) => (
                  <li key={status} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <Link href={`/bacsi?date=${encodeURIComponent(selectedDate)}&status=${encodeURIComponent(status)}#appointments`} className="truncate text-sm text-slate-700 hover:text-blue-700">{status}</Link>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2 text-blue-700"><CalendarClock size={18} /><h2 className="font-bold">Lịch kế tiếp</h2></div>
            {upcoming ? (
              <div className="mt-5 rounded-xl border border-blue-100 bg-white p-4">
                <p className="text-2xl font-bold text-blue-700">{formatTime(upcoming.scheduledAt)}</p>
                <p className="mt-2 font-semibold text-slate-900">{upcoming.patient.fullName}</p>
                <p className="mt-0.5 text-xs text-slate-500">{upcoming.patient.patientCode}</p>
                <p className="mt-3 text-sm text-slate-600">{upcoming.room?.name ?? 'Chưa có phòng trong dữ liệu lịch hẹn'}</p>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-blue-200 bg-white/70 p-4 text-sm text-slate-600">Không còn lịch hẹn sắp tới trong ngày đã chọn.</p>
            )}
            <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><UsersRound size={14} /> {patientCount} bệnh nhân có Visit được phân công trong ngày</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-violet-700"><CalendarDays size={18} /><span className="text-sm font-semibold">Lịch làm việc</span></div>
                <h2 className="mt-1 text-lg font-bold text-slate-900">Ca được phân công</h2>
              </div>
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800">{data.workSchedules.length}</span>
            </div>
            {data.workSchedules.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Không có ca làm được ghi nhận cho ngày đã chọn.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {data.workSchedules.map((schedule) => (
                  <li key={schedule.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="text-sm font-medium text-slate-700">Ca làm</span>
                    <span className="whitespace-nowrap text-sm font-semibold text-slate-900">{formatTime(schedule.startTime)} – {formatTime(schedule.endTime)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-amber-700"><Activity size={18} /><span className="text-sm font-semibold">Điều trị</span></div>
                <h2 className="mt-1 text-lg font-bold text-slate-900">Buổi trong ngày</h2>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{data.treatmentSessions.length}</span>
            </div>
            {data.treatmentSessions.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Không có buổi điều trị được lên lịch trong ngày đã chọn.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {data.treatmentSessions.slice(0, 5).map((session) => (
                  <li key={session.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="text-sm font-medium text-slate-700">{session.scheduledAt ? formatTime(session.scheduledAt) : 'Chưa có giờ'}</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">{session.status}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/bacsi/treatment-sessions" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900">Mở buổi điều trị <ArrowRight size={14} /></Link>
          </section>

          <section id="visits" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-teal-700"><ClipboardCheck size={18} /><span className="text-sm font-semibold">Theo dõi</span></div>
                <h2 className="mt-1 text-lg font-bold text-slate-900">Lượt khám trong ngày</h2>
              </div>
              <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">{data.visits.length}</span>
            </div>
            {data.visits.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Chưa có Visit được phân công trong ngày này.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {data.visits.slice(0, 6).map((visit) => (
                  <li key={visit.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{visit.patient.fullName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatTime(visit.visitDate)} · {visit.patient.patientCode}</p>
                      <p className="mt-1 text-xs text-slate-500">Trạng thái: {visit.status} · {visit.medicalRecord ? 'Có bệnh án' : 'Chưa có bệnh án'}</p>
                    </div>
                    <Link href={`/bacsi/emr?patientId=${encodeURIComponent(visit.patientId)}`} aria-label={`Mở EMR của ${visit.patient.fullName}`} className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-slate-200 text-blue-700 hover:bg-blue-50">
                      <FileText size={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {data.visits.length > 6 && <p className="mt-3 text-xs text-slate-500">Đang hiển thị 6 trên {data.visits.length} lượt khám.</p>}
          </section>
        </aside>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Đi đến chức năng bác sĩ">
        {[
          { href: '/bacsi/emr', label: 'Bệnh án điện tử', detail: 'Hồ sơ theo Visit được phân công', icon: FileText },
          { href: '/bacsi/prescriptions', label: 'Kê đơn thuốc', detail: 'Đơn thuốc trong Visit được phép', icon: Pill },
          { href: '/bacsi/clinical-services', label: 'Dịch vụ lâm sàng', detail: 'Kết quả hình ảnh cận lâm sàng', icon: ImageIcon },
          { href: '/bacsi/treatments', label: 'Quá trình điều trị', detail: 'Phác đồ và buổi điều trị', icon: Activity },
        ].map(({ href, label, detail, icon: Icon }) => (
          <Link key={href} href={href} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon size={19} /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{label}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{detail}</span></span>
            <ArrowRight size={15} className="flex-none text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
          </Link>
        ))}
      </section>

      <p className="text-xs leading-5 text-slate-500">Thống kê và danh sách chỉ gồm lịch hẹn, Visit, bệnh án và buổi điều trị gắn với nhân viên đang đăng nhập. Trạng thái được hiển thị nguyên giá trị từ database.</p>
    </div>
  );
}
