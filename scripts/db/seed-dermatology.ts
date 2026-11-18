/**
 * Seed dữ liệu chuẩn cho hệ thống phòng khám Da liễu.
 *
 *   npx tsx scripts/db/backup.ts            # luôn sao lưu trước
 *   npx tsx scripts/db/seed-dermatology.ts --confirm-wipe
 *
 * Script XÓA TOÀN BỘ dữ liệu (giữ nguyên cấu trúc bảng / migration) rồi nạp lại:
 * danh mục y khoa thật (ICD-10, thuốc lưu hành tại VN, dịch vụ, phác đồ, thiết bị) và
 * dữ liệu vận hành giả lập nhất quán (bệnh nhân, lượt khám, CLS, đơn thuốc, liệu trình,
 * hóa đơn, kho, lịch hẹn, tái khám, thông báo). Bệnh nhân là người giả lập.
 * Kết quả có tính tất định (seed PRNG cố định) và "hôm nay" = ngày chạy script.
 */
import 'dotenv/config';
import { randomBytes, scryptSync } from 'node:crypto';
import { prisma } from '../../src/infrastructure/database/prisma';
import {
  INGREDIENTS, MEDICINES, INTERACTIONS, SUPPLIES, EQUIPMENT, SERVICES, PROCEDURES, CONSENT_TEMPLATES,
  type IngredientKey, type MedicineKey, type SupplyKey, type EquipmentKey, type ServiceKey, type ProcedureKey, type ConsentKey,
} from './seed-data/catalog';
import { DISEASES, type Disease, type RxLine } from './seed-data/diseases';
import { PROTOCOLS, AFTERCARE_TEMPLATES, type ProtocolDef } from './seed-data/protocols';

const DRY_RUN = process.argv.includes('--dry-run');
if (!DRY_RUN && !process.argv.includes('--confirm-wipe')) {
  console.error('Script này xóa toàn bộ dữ liệu hiện có. Chạy lại với --confirm-wipe sau khi đã backup.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Tiện ích: PRNG tất định, id, ngày giờ theo múi giờ Việt Nam (UTC+7)
// ---------------------------------------------------------------------------
let rngState = 20261118;
function rand() { rngState |= 0; rngState = (rngState + 0x6d2b79f5) | 0; let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const int = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const chance = (p: number) => rand() < p;
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
function weighted<T>(items: readonly T[], w: (t: T) => number): T { const total = items.reduce((s, i) => s + w(i), 0); let r = rand() * total; for (const i of items) { r -= w(i); if (r <= 0) return i; } return items[items.length - 1]; }
let idCounter = 0;
const id = () => `c${(1_790_000_000_000 + idCounter++).toString(36)}${Math.floor(rand() * 36 ** 8).toString(36).padStart(8, '0')}${Math.floor(rand() * 36 ** 6).toString(36).padStart(6, '0')}`;

const VN_OFFSET = 7 * 3600_000;
const DAY = 86_400_000;
/** Tạo Date từ giờ địa phương Việt Nam. */
const vn = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(Date.UTC(y, mo - 1, d, h, mi) - VN_OFFSET);
const nowReal = new Date();
const todayParts = new Date(nowReal.getTime() + VN_OFFSET);
const TODAY = { y: todayParts.getUTCFullYear(), m: todayParts.getUTCMonth() + 1, d: todayParts.getUTCDate() };
const todayAt = (h: number, mi = 0) => vn(TODAY.y, TODAY.m, TODAY.d, h, mi);
const startOfToday = todayAt(0);
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY);
const vnWeekday = (date: Date) => new Date(date.getTime() + VN_OFFSET).getUTCDay(); // 0 = CN
/** Ngày làm việc gần nhất (bỏ Chủ nhật) với giờ khám ngẫu nhiên trong ca. */
function clinicSlot(day: Date): Date {
  let d = day; while (vnWeekday(d) === 0) d = addDays(d, 1);
  const p = new Date(d.getTime() + VN_OFFSET);
  const morning = chance(0.6);
  const h = morning ? int(7, 11) : int(13, 16);
  const mi = pick([0, 10, 15, 20, 30, 40, 45, 50]);
  return vn(p.getUTCFullYear(), p.getUTCMonth() + 1, p.getUTCDate(), h, morning && h === 7 ? Math.max(30, mi) : mi);
}
const WINDOW_START = addDays(startOfToday, -230); // ~ 7,5 tháng lịch sử
const money = (n: number) => Math.round(n / 1000) * 1000;
const hashPassword = (password: string) => { const salt = randomBytes(16).toString('hex'); return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`; };
const placeholder = (text: string, w = 800, h = 600) => `https://placehold.co/${w}x${h}/f1f5f9/334155?text=${encodeURIComponent(text).replace(/%20/g, '+')}`;

// ---------------------------------------------------------------------------
// Tên người Việt (giả lập)
// ---------------------------------------------------------------------------
const SURNAMES = ['Nguyễn', 'Nguyễn', 'Nguyễn', 'Trần', 'Trần', 'Lê', 'Lê', 'Phạm', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Trương', 'Đinh', 'Lâm', 'Mai', 'Tô', 'Hà', 'Châu', 'Quách', 'Lương'];
const MALE_MID = ['Văn', 'Minh', 'Quốc', 'Đức', 'Hoàng', 'Gia', 'Thanh', 'Hữu', 'Công', 'Tuấn', 'Anh', 'Nhật', 'Trọng'];
const FEMALE_MID = ['Thị', 'Ngọc', 'Thu', 'Thanh', 'Minh', 'Phương', 'Bảo', 'Khánh', 'Hồng', 'Mỹ', 'Kim', 'Thùy', 'Diệu'];
const MALE_GIVEN = ['An', 'Bảo', 'Cường', 'Dũng', 'Đạt', 'Hải', 'Hiếu', 'Huy', 'Khang', 'Khoa', 'Long', 'Nam', 'Phong', 'Phúc', 'Quân', 'Sơn', 'Tài', 'Thắng', 'Thịnh', 'Trí', 'Trung', 'Tuấn', 'Vinh', 'Duy', 'Hưng', 'Kiên', 'Lâm', 'Nhân', 'Toàn', 'Khải', 'Lộc', 'Tín'];
const FEMALE_GIVEN = ['Anh', 'Châu', 'Diệp', 'Dung', 'Giang', 'Hà', 'Hạnh', 'Hằng', 'Hiền', 'Hoa', 'Hương', 'Lan', 'Linh', 'Loan', 'Mai', 'My', 'Nga', 'Ngân', 'Nhi', 'Nhung', 'Oanh', 'Phương', 'Quyên', 'Thảo', 'Trang', 'Trâm', 'Uyên', 'Vy', 'Yến', 'Xuân', 'Ngọc', 'Thư', 'Vân', 'Tiên'];
const usedNames = new Set<string>();
function personName(female: boolean) {
  for (;;) {
    const n = `${pick(SURNAMES)} ${pick(female ? FEMALE_MID : MALE_MID)} ${pick(female ? FEMALE_GIVEN : MALE_GIVEN)}`;
    if (!usedNames.has(n)) { usedNames.add(n); return n; }
  }
}
const usedPhones = new Set<string>();
function phoneNumber() {
  for (;;) {
    const p = `${pick(['090', '091', '093', '094', '096', '097', '098', '086', '088', '089', '070', '076', '077', '078', '079', '032', '033', '034', '035', '036', '037', '038', '039', '081', '083', '084', '085'])}${String(int(0, 9_999_999)).padStart(7, '0')}`;
    if (!usedPhones.has(p)) { usedPhones.add(p); return p; }
  }
}

// ---------------------------------------------------------------------------
// Bộ đệm bản ghi để chèn hàng loạt
// ---------------------------------------------------------------------------
type Row = Record<string, unknown>;
const rows: Record<string, Row[]> = {};
const push = (model: string, row: Row) => { (rows[model] ??= []).push(row); return row; };

// ---------------------------------------------------------------------------
// 1. PHÂN QUYỀN
// ---------------------------------------------------------------------------
const PERMISSIONS = ['DASHBOARD_VIEW', 'PATIENT_READ', 'PATIENT_WRITE', 'VISIT_READ', 'VISIT_WRITE', 'EMR_READ', 'EMR_WRITE', 'PRESCRIPTION_READ', 'PRESCRIPTION_WRITE', 'TREATMENT_READ', 'TREATMENT_WRITE', 'PROTOCOL_READ', 'PROTOCOL_WRITE', 'INVENTORY_READ', 'INVENTORY_WRITE', 'CONSENT_READ', 'CONSENT_WRITE', 'BILLING_READ', 'BILLING_WRITE', 'SCHEDULE_READ', 'SCHEDULE_WRITE', 'LAB_READ', 'LAB_WRITE', 'IMAGE_READ', 'IMAGE_WRITE', 'REPORT_READ', 'REPORT_EXPORT', 'AUDIT_READ', 'ADMIN_USERS', 'ADMIN_ROLES'];
const permId = Object.fromEntries(PERMISSIONS.map((code) => [code, push('permission', { id: id(), code }).id as string]));
const ROLE_PERMS: Record<string, string[]> = {
  'Bác sĩ': ['DASHBOARD_VIEW', 'PATIENT_READ', 'PATIENT_WRITE', 'VISIT_READ', 'VISIT_WRITE', 'EMR_READ', 'EMR_WRITE', 'PRESCRIPTION_READ', 'PRESCRIPTION_WRITE', 'TREATMENT_READ', 'TREATMENT_WRITE', 'PROTOCOL_READ', 'PROTOCOL_WRITE', 'CONSENT_READ', 'CONSENT_WRITE', 'SCHEDULE_READ', 'LAB_READ', 'LAB_WRITE', 'IMAGE_READ', 'IMAGE_WRITE', 'REPORT_READ'],
  'Điều dưỡng': ['DASHBOARD_VIEW', 'PATIENT_READ', 'VISIT_READ', 'EMR_READ', 'TREATMENT_READ', 'TREATMENT_WRITE', 'CONSENT_READ', 'CONSENT_WRITE', 'SCHEDULE_READ', 'IMAGE_READ', 'IMAGE_WRITE', 'INVENTORY_READ'],
  'Kỹ thuật viên laser': ['DASHBOARD_VIEW', 'PATIENT_READ', 'TREATMENT_READ', 'TREATMENT_WRITE', 'IMAGE_READ', 'IMAGE_WRITE', 'INVENTORY_READ', 'SCHEDULE_READ'],
  'Kỹ thuật viên xét nghiệm': ['DASHBOARD_VIEW', 'PATIENT_READ', 'VISIT_READ', 'LAB_READ', 'LAB_WRITE', 'IMAGE_READ', 'IMAGE_WRITE'],
  'Dược sĩ': ['DASHBOARD_VIEW', 'PATIENT_READ', 'PRESCRIPTION_READ', 'INVENTORY_READ', 'INVENTORY_WRITE'],
  'Lễ tân': ['DASHBOARD_VIEW', 'PATIENT_READ', 'PATIENT_WRITE', 'VISIT_READ', 'VISIT_WRITE', 'SCHEDULE_READ', 'SCHEDULE_WRITE', 'CONSENT_READ', 'BILLING_READ'],
  'Thu ngân': ['DASHBOARD_VIEW', 'PATIENT_READ', 'VISIT_READ', 'BILLING_READ', 'BILLING_WRITE', 'REPORT_READ'],
  'Quản lý kho': ['DASHBOARD_VIEW', 'INVENTORY_READ', 'INVENTORY_WRITE', 'REPORT_READ', 'REPORT_EXPORT'],
  'Quản lý cơ sở': PERMISSIONS.filter((p) => !p.startsWith('ADMIN_')),
  'Quản trị hệ thống': PERMISSIONS,
};
const roleId: Record<string, string> = {};
for (const [name, perms] of Object.entries(ROLE_PERMS)) {
  roleId[name] = push('role', { id: id(), name }).id as string;
  for (const p of perms) push('rolePermission', { roleId: roleId[name], permissionId: permId[p] });
}

// ---------------------------------------------------------------------------
// 2. CƠ SỞ – KHOA – PHÒNG
// ---------------------------------------------------------------------------
const facilityId = push('clinicFacility', { id: id(), name: 'Phòng khám Chuyên khoa Da liễu An Tâm', createdAt: vn(2024, 3, 1), updatedAt: vn(2026, 1, 5) }).id as string;
const DEPTS = {
  CLINICAL: 'Khoa Da liễu Lâm sàng',
  COSMETIC: 'Khoa Da liễu Thẩm mỹ – Laser',
  LAB: 'Khoa Xét nghiệm – Chẩn đoán hình ảnh',
  NURSING: 'Phòng Điều dưỡng – Kỹ thuật viên',
  PHARMACY: 'Khoa Dược',
  ADMIN: 'Phòng Hành chính – Tiếp đón',
} as const;
const deptId = Object.fromEntries(Object.entries(DEPTS).map(([k, name]) => [k, push('department', { id: id(), facilityId, name }).id as string])) as Record<keyof typeof DEPTS, string>;
const ROOMS = {
  EXAM1: ['CLINICAL', 'P.101 – Phòng khám Da liễu 1'],
  EXAM2: ['CLINICAL', 'P.102 – Phòng khám Da liễu 2'],
  EXAM3: ['CLINICAL', 'P.103 – Phòng khám Da liễu 3'],
  PEDIATRIC: ['CLINICAL', 'P.104 – Phòng khám Da liễu Nhi'],
  ACNE: ['COSMETIC', 'P.105 – Phòng khám Mụn & Sẹo'],
  COSMETIC: ['COSMETIC', 'P.106 – Phòng khám Thẩm mỹ da'],
  LASER1: ['COSMETIC', 'P.201 – Phòng Laser 1'],
  LASER2: ['COSMETIC', 'P.202 – Phòng Laser 2'],
  PROCEDURE: ['COSMETIC', 'P.203 – Phòng Thủ thuật – Tiêm'],
  PHOTOTHERAPY: ['COSMETIC', 'P.204 – Phòng Chiếu đèn NB-UVB/Excimer'],
  LAB: ['LAB', 'P.301 – Phòng Lấy mẫu & Xét nghiệm'],
  IMAGING: ['LAB', 'P.302 – Phòng Soi da – Chụp ảnh'],
  PHARMACY: ['PHARMACY', 'Quầy thuốc'],
  RECEPTION: ['ADMIN', 'Quầy Tiếp đón'],
  CASHIER: ['ADMIN', 'Quầy Thu ngân'],
} as const satisfies Record<string, readonly [keyof typeof DEPTS, string]>;
type RoomKey = keyof typeof ROOMS;
const roomId = Object.fromEntries(Object.entries(ROOMS).map(([k, [d, name]]) => [k, push('room', { id: id(), departmentId: deptId[d], name }).id as string])) as Record<RoomKey, string>;

// ---------------------------------------------------------------------------
// 3. NHÂN SỰ & TÀI KHOẢN (tên nhân viên là giả lập)
// ---------------------------------------------------------------------------
const PASSWORDS = { doctor: 'BacSi@2026', reception: 'LeTan@2026', admin: 'QuanTri@2026', staff: 'NhanVien@2026' };
type Staff = { key: string; code: string; name: string; username: string; email: string; dept: keyof typeof DEPTS; roles: string[]; pwd: keyof typeof PASSWORDS; room?: RoomKey; focus?: Disease['room'][]; status?: string };
const STAFF: Staff[] = [
  { key: 'D1', code: 'BS-001', name: 'ThS.BS. Nguyễn Thị Lan Anh', username: 'bs.lananh', email: 'lananh.nguyen@datlieuantam.vn', dept: 'CLINICAL', roles: ['Bác sĩ'], pwd: 'doctor', room: 'EXAM1', focus: ['GENERAL', 'COSMETIC'] },
  { key: 'D2', code: 'BS-002', name: 'BSCKII. Trần Quốc Bảo', username: 'bs.quocbao', email: 'quocbao.tran@datlieuantam.vn', dept: 'CLINICAL', roles: ['Bác sĩ', 'Quản lý cơ sở'], pwd: 'doctor', room: 'EXAM2', focus: ['GENERAL'] },
  { key: 'D3', code: 'BS-003', name: 'BSCKI. Lê Minh Châu', username: 'bs.minhchau', email: 'minhchau.le@datlieuantam.vn', dept: 'COSMETIC', roles: ['Bác sĩ'], pwd: 'doctor', room: 'ACNE', focus: ['ACNE', 'COSMETIC'] },
  { key: 'D4', code: 'BS-004', name: 'BS. Phạm Hoàng Dũng', username: 'bs.hoangdung', email: 'hoangdung.pham@datlieuantam.vn', dept: 'COSMETIC', roles: ['Bác sĩ'], pwd: 'doctor', room: 'COSMETIC', focus: ['COSMETIC', 'ACNE'] },
  { key: 'D5', code: 'BS-005', name: 'ThS.BS. Võ Thu Hằng', username: 'bs.thuhang', email: 'thuhang.vo@datlieuantam.vn', dept: 'CLINICAL', roles: ['Bác sĩ'], pwd: 'doctor', room: 'PEDIATRIC', focus: ['PEDIATRIC', 'GENERAL'] },
  { key: 'D6', code: 'BS-006', name: 'BSCKI. Đặng Ngọc Khánh', username: 'bs.ngockhanh', email: 'ngockhanh.dang@datlieuantam.vn', dept: 'CLINICAL', roles: ['Bác sĩ'], pwd: 'doctor', room: 'EXAM3', focus: ['GENERAL'] },
  { key: 'D7', code: 'BS-007', name: 'BS. Huỳnh Gia Minh', username: 'bs.giaminh', email: 'giaminh.huynh@datlieuantam.vn', dept: 'CLINICAL', roles: ['Bác sĩ'], pwd: 'doctor', room: 'EXAM2', focus: ['GENERAL', 'ACNE'] },
  { key: 'D8', code: 'BS-008', name: 'BS. Bùi Phương Thảo', username: 'bs.phuongthao', email: 'phuongthao.bui@datlieuantam.vn', dept: 'COSMETIC', roles: ['Bác sĩ'], pwd: 'doctor', room: 'COSMETIC', focus: ['COSMETIC'] },
  { key: 'N1', code: 'DD-001', name: 'ĐD. Phan Thị Hương', username: 'dd.huong', email: 'huong.phan@datlieuantam.vn', dept: 'NURSING', roles: ['Điều dưỡng'], pwd: 'staff' },
  { key: 'N2', code: 'DD-002', name: 'ĐD. Đỗ Văn Lực', username: 'dd.luc', email: 'luc.do@datlieuantam.vn', dept: 'NURSING', roles: ['Điều dưỡng'], pwd: 'staff' },
  { key: 'N3', code: 'DD-003', name: 'ĐD. Nguyễn Kim Oanh', username: 'dd.oanh', email: 'oanh.nguyen@datlieuantam.vn', dept: 'NURSING', roles: ['Điều dưỡng'], pwd: 'staff' },
  { key: 'T1', code: 'KTV-001', name: 'KTV. Hồ Đức Phát', username: 'ktv.phat', email: 'phat.ho@datlieuantam.vn', dept: 'NURSING', roles: ['Kỹ thuật viên laser'], pwd: 'staff' },
  { key: 'T2', code: 'KTV-002', name: 'KTV. Tạ Minh Quân', username: 'ktv.quan', email: 'quan.ta@datlieuantam.vn', dept: 'NURSING', roles: ['Kỹ thuật viên laser'], pwd: 'staff' },
  { key: 'L1', code: 'XN-001', name: 'CN. Lâm Thu Sương', username: 'xn.suong', email: 'suong.lam@datlieuantam.vn', dept: 'LAB', roles: ['Kỹ thuật viên xét nghiệm'], pwd: 'staff' },
  { key: 'P1', code: 'DS-001', name: 'DS. Mai Văn Tài', username: 'ds.tai', email: 'tai.mai@datlieuantam.vn', dept: 'PHARMACY', roles: ['Dược sĩ'], pwd: 'staff' },
  { key: 'R1', code: 'LT-001', name: 'Ngô Thị Mai', username: 'letan.mai', email: 'mai.ngo@datlieuantam.vn', dept: 'ADMIN', roles: ['Lễ tân'], pwd: 'reception' },
  { key: 'R2', code: 'LT-002', name: 'Trương Bích Ngọc', username: 'letan.ngoc', email: 'ngoc.truong@datlieuantam.vn', dept: 'ADMIN', roles: ['Lễ tân', 'Thu ngân'], pwd: 'reception' },
  { key: 'C1', code: 'TN-001', name: 'Lý Thanh Tùng', username: 'thungan.tung', email: 'tung.ly@datlieuantam.vn', dept: 'ADMIN', roles: ['Thu ngân'], pwd: 'reception' },
  { key: 'M1', code: 'QL-001', name: 'Vương Thị Uyên', username: 'quanly.uyen', email: 'uyen.vuong@datlieuantam.vn', dept: 'ADMIN', roles: ['Quản lý cơ sở'], pwd: 'admin' },
  { key: 'A1', code: 'QT-001', name: 'Châu Gia Vĩnh', username: 'admin', email: 'it@datlieuantam.vn', dept: 'ADMIN', roles: ['Quản trị hệ thống'], pwd: 'admin' },
  { key: 'W1', code: 'KHO-001', name: 'Kiều Minh Xuân', username: 'kho.xuan', email: 'xuan.kieu@datlieuantam.vn', dept: 'PHARMACY', roles: ['Quản lý kho'], pwd: 'admin' },
  { key: 'X1', code: 'LT-003', name: 'Đinh Thị Yến', username: 'letan.yen', email: 'yen.dinh@datlieuantam.vn', dept: 'ADMIN', roles: ['Lễ tân'], pwd: 'reception', status: 'LOCKED' },
];
const hashes = Object.fromEntries(Object.entries(PASSWORDS).map(([k, v]) => [k, hashPassword(v)]));
const emp: Record<string, { id: string; accountId: string; name: string; s: Staff }> = {};
for (const s of STAFF) {
  const accountId = push('account', { id: id(), username: s.username, email: s.email, passwordHash: hashes[s.pwd], status: s.status ?? 'ACTIVE', createdAt: vn(2025, int(1, 12), int(1, 28), 9), updatedAt: vn(2026, 10, int(1, 28), 9) }).id as string;
  for (const r of s.roles) push('accountRole', { accountId, roleId: roleId[r] });
  const employeeId = push('employee', { id: id(), accountId, departmentId: deptId[s.dept], employeeCode: s.code, fullName: s.name }).id as string;
  emp[s.key] = { id: employeeId, accountId, name: s.name, s };
}
const DOCTORS = STAFF.filter((s) => s.roles.includes('Bác sĩ')).map((s) => emp[s.key]);
const NURSES = ['N1', 'N2', 'N3'].map((k) => emp[k]);
const TECHS = ['T1', 'T2'].map((k) => emp[k]);

// Lịch làm việc: 4 tuần quanh hôm nay
for (const d of DOCTORS.concat(NURSES, TECHS, [emp.R1, emp.R2, emp.C1, emp.L1, emp.P1])) {
  for (let i = -14; i <= 17; i++) {
    const day = addDays(startOfToday, i);
    const wd = vnWeekday(day);
    if (wd === 0) continue;
    const p = new Date(day.getTime() + VN_OFFSET);
    const [y, mo, dd] = [p.getUTCFullYear(), p.getUTCMonth() + 1, p.getUTCDate()];
    const offDay = (d.s.code.charCodeAt(d.s.code.length - 1) + i) % 6 === 0; // mỗi người nghỉ luân phiên 1 ngày/tuần
    if (offDay) continue;
    if (wd === 6) { push('workSchedule', { id: id(), employeeId: d.id, workDate: vn(y, mo, dd), startTime: vn(y, mo, dd, 7, 30), endTime: vn(y, mo, dd, 12, 0) }); continue; }
    push('workSchedule', { id: id(), employeeId: d.id, workDate: vn(y, mo, dd), startTime: vn(y, mo, dd, 7, 30), endTime: vn(y, mo, dd, 11, 30) });
    push('workSchedule', { id: id(), employeeId: d.id, workDate: vn(y, mo, dd), startTime: vn(y, mo, dd, 13, 30), endTime: vn(y, mo, dd, 17, 0) });
  }
}

// ---------------------------------------------------------------------------
// 4. DƯỢC – HOẠT CHẤT – TƯƠNG TÁC – VẬT TƯ – THIẾT BỊ
// ---------------------------------------------------------------------------
const ingId = {} as Record<IngredientKey, string>;
for (const [k, [name, description]] of Object.entries(INGREDIENTS) as Array<[IngredientKey, readonly [string, string]]>) {
  ingId[k] = push('activeIngredient', { id: id(), code: k, name, description, status: 'ACTIVE', createdAt: vn(2026, 1, 10), updatedAt: vn(2026, 1, 10) }).id as string;
}
const med = {} as Record<MedicineKey, { id: string; cost: number; unit: string; name: string; min: number }>;
for (const [k, d] of Object.entries(MEDICINES) as Array<[MedicineKey, (typeof MEDICINES)[MedicineKey]]>) {
  const medicineId = id();
  med[k] = { id: medicineId, cost: d.cost, unit: d.unit, name: d.name, min: d.min };
  push('medicine', { id: medicineId, name: d.name, unit: d.unit, unitCost: d.cost, minStock: d.min, stock: 0, status: k === 'VITAMIN_A' ? 'INACTIVE' : 'ACTIVE', createdAt: vn(2026, 1, 10), updatedAt: vn(2026, 1, 10) });
  for (const [ik, conc, unit] of d.ing) push('medicineIngredient', { medicineId, ingredientId: ingId[ik], concentration: conc, concentrationUnit: unit });
}
for (const x of INTERACTIONS) push('ingredientInteraction', { id: id(), ingredientAId: ingId[x.a], ingredientBId: ingId[x.b], interactionType: x.type, severity: x.severity, description: x.description, recommendation: x.recommendation, minIntervalHours: x.minIntervalHours ?? null, status: 'ACTIVE', createdAt: vn(2026, 1, 12), updatedAt: vn(2026, 1, 12) });
const interactionId = (a: IngredientKey, b: IngredientKey) => {
  const i = INTERACTIONS.findIndex((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
  return { id: (rows.ingredientInteraction[i] as Row).id as string, def: INTERACTIONS[i] };
};
const sup = {} as Record<SupplyKey, { id: string; cost: number; unit: string; name: string; min: number }>;
for (const [k, [name, unit, cost, min]] of Object.entries(SUPPLIES) as Array<[SupplyKey, readonly [string, string, number, number]]>) {
  sup[k] = { id: id(), cost, unit, name, min };
  push('supply', { id: sup[k].id, name, unit, unitCost: cost, minStock: min, stock: 0, status: 'ACTIVE', createdAt: vn(2026, 1, 10), updatedAt: vn(2026, 1, 10) });
}
const equip = {} as Record<EquipmentKey, string>;
for (const [k, [name, serial]] of Object.entries(EQUIPMENT) as Array<[EquipmentKey, readonly [string, string]]>) {
  equip[k] = push('equipment', { id: id(), name, serial, status: k === 'IPL' ? 'MAINTENANCE' : 'AVAILABLE' }).id as string;
  const lastPm = addDays(startOfToday, -int(20, 120));
  push('equipmentMaintenance', { id: id(), equipmentId: equip[k], performedById: emp.T1.id, maintenanceType: 'PREVENTIVE', scheduledAt: lastPm, completedAt: addDays(lastPm, 0), status: 'COMPLETED', notes: 'Bảo dưỡng định kỳ theo khuyến cáo nhà sản xuất: vệ sinh quang học, kiểm tra hệ thống làm mát, hiệu chuẩn đầu phát.', cost: money(int(1_500_000, 6_000_000)), createdAt: lastPm });
  if (['QSWITCH', 'PICO', 'CO2', 'PDL', 'NBUVB_CABIN', 'EXCIMER'].includes(k)) {
    const cal = addDays(startOfToday, -int(5, 60));
    push('equipmentMaintenance', { id: id(), equipmentId: equip[k], performedById: emp.T2.id, maintenanceType: 'CALIBRATION', scheduledAt: cal, completedAt: cal, status: 'COMPLETED', notes: k === 'NBUVB_CABIN' ? 'Đo bức xạ UV bằng máy đo Waldmann, cập nhật hệ số liều (0.41 mW/cm²).' : 'Đo công suất đầu ra bằng power meter, sai số < 5%.', cost: money(int(800_000, 2_500_000)), createdAt: cal });
    push('equipmentMaintenance', { id: id(), equipmentId: equip[k], performedById: null, maintenanceType: 'SAFETY_CHECK', scheduledAt: addDays(startOfToday, int(7, 40)), completedAt: null, status: 'SCHEDULED', notes: 'Kiểm tra an toàn bức xạ, khóa liên động và kính bảo hộ.', cost: null, createdAt: addDays(startOfToday, -3) });
  }
}
push('equipmentMaintenance', { id: id(), equipmentId: equip.IPL, performedById: emp.T1.id, maintenanceType: 'CORRECTIVE', scheduledAt: addDays(startOfToday, -2), completedAt: null, status: 'IN_PROGRESS', notes: 'Báo lỗi nhiệt độ đầu phát IPL (E-21). Đã liên hệ kỹ sư hãng, chờ thay bộ lọc nước.', cost: null, createdAt: addDays(startOfToday, -2) });

// ---------------------------------------------------------------------------
// 5. DỊCH VỤ – THỦ THUẬT – MẪU ĐỒNG THUẬN – PHÁC ĐỒ
// ---------------------------------------------------------------------------
const svc = {} as Record<ServiceKey, { id: string; code: string; name: string; price: number; category: string }>;
for (const [k, [code, name, category, price]] of Object.entries(SERVICES) as Array<[ServiceKey, readonly [string, string, string, number]]>) {
  svc[k] = { id: id(), code, name, price, category };
  push('serviceCatalog', { id: svc[k].id, code, name, category, basePrice: price, active: true, createdAt: vn(2026, 1, 5), updatedAt: vn(2026, 1, 5) });
}
const proc = {} as Record<ProcedureKey, string>;
for (const [k, p] of Object.entries(PROCEDURES) as Array<[ProcedureKey, (typeof PROCEDURES)[ProcedureKey]]>) {
  proc[k] = push('procedureCatalog', { id: id(), code: p.code, name: p.name, category: p.category, description: p.description, defaultDurationMinutes: p.minutes, basePrice: p.price, requiresConsent: p.consent, isActive: true, createdAt: vn(2026, 1, 8), updatedAt: vn(2026, 1, 8) }).id as string;
}
const consentTpl = {} as Record<ConsentKey, string>;
for (const [k, [name, content]] of Object.entries(CONSENT_TEMPLATES) as Array<[ConsentKey, readonly [string, string]]>) {
  consentTpl[k] = push('consentTemplate', { id: id(), name, version: k === 'LASER' ? 2 : 1, content }).id as string;
}
type ProtoRuntime = { def: ProtocolDef; id: string; stages: Array<{ id: string; def: ProtocolDef['stages'][number]; steps: Array<{ id: string; def: ProtocolDef['stages'][number]['steps'][number] }> }> };
const proto: Record<string, ProtoRuntime> = {};
for (const def of PROTOCOLS) {
  const pid = push('treatmentProtocolTemplate', { id: id(), code: def.code, name: def.name, description: def.description, indication: def.indication, contraindication: def.contraindication, version: 1, status: 'ACTIVE', createdById: emp.D1.id, createdAt: vn(2026, 2, 1), updatedAt: vn(2026, 2, 1) }).id as string;
  proto[def.code] = { def, id: pid, stages: [] };
  def.stages.forEach((st, si) => {
    const sid = push('protocolStageTemplate', { id: id(), protocolId: pid, stageType: st.type, name: st.name, orderNo: si + 1, goal: st.goal, durationDays: st.days, notes: st.notes ?? null, createdAt: vn(2026, 2, 1), updatedAt: vn(2026, 2, 1) }).id as string;
    const stage = { id: sid, def: st, steps: [] as ProtoRuntime['stages'][number]['steps'] };
    proto[def.code].stages.push(stage);
    st.steps.forEach((sp, pi) => {
      const stepId = push('protocolStepTemplate', { id: id(), stageTemplateId: sid, procedureId: sp.proc ? proc[sp.proc] : null, orderNo: pi + 1, instruction: sp.instruction, repeatCount: sp.repeat, intervalDays: sp.interval, plannedDurationMinutes: sp.minutes, defaultParameters: sp.params ?? undefined, createdAt: vn(2026, 2, 1), updatedAt: vn(2026, 2, 1) }).id as string;
      stage.steps.push({ id: stepId, def: sp });
      for (const mat of sp.materials ?? []) push('protocolStepMaterial', { id: id(), stepTemplateId: stepId, medicineId: mat[0] === 'MED' ? med[mat[1] as MedicineKey].id : null, supplyId: mat[0] === 'SUP' ? sup[mat[1] as SupplyKey].id : null, plannedQuantity: mat[2], unit: mat[3], notes: null, createdAt: vn(2026, 2, 1) });
    });
  });
}
const aftercareId: string[] = AFTERCARE_TEMPLATES.map((t) => push('aftercareTemplate', { id: id(), name: t.name, scope: t.scope, appliesTo: t.appliesTo, homeCare: t.homeCare, avoid: t.avoid, warningSigns: t.warningSigns, version: 1, isActive: true, ownerId: t.scope === 'CLINIC' ? null : emp.D1.id, createdAt: vn(2026, 3, 1) }).id as string);

// ---------------------------------------------------------------------------
// 6. BỆNH NHÂN – DỊ ỨNG – TIỀN SỬ
// ---------------------------------------------------------------------------
const ALLERGENS: Array<[string, string, string]> = [
  ['Penicilin / Amoxicilin', 'Mày đay toàn thân, ngứa', 'MODERATE'],
  ['Sulfamid (Cotrimoxazol)', 'Ban đỏ, bọng nước – nghi hồng ban đa dạng', 'HIGH'],
  ['Aspirin / NSAID (Ibuprofen)', 'Phù mạch môi, mi mắt', 'HIGH'],
  ['Hải sản (tôm, cua)', 'Sẩn phù, ngứa sau ăn 1–2 giờ', 'MODERATE'],
  ['Nickel (khóa kim loại, trang sức)', 'Viêm da tiếp xúc tại chỗ', 'LOW'],
  ['Latex (găng tay cao su)', 'Đỏ ngứa tay, nổi sẩn khi tiếp xúc', 'MODERATE'],
  ['p-Phenylenediamine (thuốc nhuộm tóc)', 'Viêm da tiếp xúc nặng vùng mặt, da đầu', 'HIGH'],
  ['Neomycin (thuốc bôi)', 'Viêm da tiếp xúc dị ứng', 'LOW'],
  ['Cephalosporin', 'Ban dát sẩn', 'MODERATE'],
  ['Lidocain', 'Choáng váng, hồi hộp khi gây tê', 'MODERATE'],
  ['Bụi nhà, mạt bụi', 'Hắt hơi, ngứa da', 'LOW'],
  ['Phấn hoa', 'Viêm mũi dị ứng theo mùa', 'LOW'],
];
const HISTORIES: Array<[string, string]> = [
  ['CHRONIC', 'Tăng huyết áp, đang dùng Amlodipin 5mg/ngày'], ['CHRONIC', 'Đái tháo đường type 2, dùng Metformin 850mg x 2 lần/ngày'],
  ['CHRONIC', 'Hen phế quản từ nhỏ, dùng Seretide khi lên cơn'], ['CHRONIC', 'Viêm mũi dị ứng theo mùa'], ['CHRONIC', 'Suy giáp, dùng Levothyroxin 50mcg'],
  ['CHRONIC', 'Rối loạn mỡ máu, dùng Atorvastatin 10mg'], ['CHRONIC', 'Viêm gan B mạn, theo dõi định kỳ, chưa điều trị'], ['CHRONIC', 'Hội chứng buồng trứng đa nang'],
  ['FAMILY', 'Mẹ bị viêm da cơ địa, bố hen phế quản'], ['FAMILY', 'Bố bị vảy nến'], ['FAMILY', 'Chị gái bị bạch biến'], ['FAMILY', 'Mẹ bị nám má'], ['FAMILY', 'Bố hói đầu từ năm 30 tuổi'],
  ['SURGERY', 'Mổ ruột thừa năm 2018'], ['SURGERY', 'Sinh mổ năm 2021'], ['SURGERY', 'Cắt amidan năm 2010'],
  ['PERSONAL', 'Hút thuốc lá 10 điếu/ngày'], ['PERSONAL', 'Làm việc ngoài trời, tiếp xúc nắng nhiều'], ['PERSONAL', 'Thường xuyên thức khuya, căng thẳng công việc'], ['PERSONAL', 'Đang dùng thuốc tránh thai đường uống'], ['PERSONAL', 'Đang cho con bú (con 8 tháng)'],
  ['DERMATOLOGY', 'Từng điều trị mụn bằng isotretinoin năm 2022 (6 tháng)'], ['DERMATOLOGY', 'Từng dùng kem trộn chứa corticoid không rõ nguồn gốc 1 năm'], ['DERMATOLOGY', 'Tiền sử sẹo lồi sau phẫu thuật'], ['DERMATOLOGY', 'Từng bị zona năm 2019'],
];

type PatientRt = { id: string; code: string; name: string; female: boolean; dob: Date; age: number; phone: string; disease: Disease; extraDisease?: Disease; allergies: string[] };
const patients: PatientRt[] = [];
const PATIENT_COUNT = 160;
function diseaseFor(age: number, female: boolean) {
  const fit = DISEASES.filter((d) => age >= d.age[0] && age <= d.age[1]);
  return weighted(fit.length ? fit : DISEASES, (d) => d.weight * ((female ? d.female ?? 0.5 : 1 - (d.female ?? 0.5)) + 0.05));
}
for (let i = 0; i < PATIENT_COUNT; i++) {
  // Phân bố tuổi: nhiều nhất 18–35 (mụn, nám, thẩm mỹ), có trẻ em và người cao tuổi
  const age = weighted([[2, 12, 10], [13, 17, 9], [18, 25, 26], [26, 35, 25], [36, 50, 18], [51, 65, 8], [66, 82, 4]] as const, (b) => b[2]);
  const years = int(age[0], age[1]);
  const female = chance(0.6);
  const disease = diseaseFor(years, female);
  const dob = vn(TODAY.y - years, int(1, 12), int(1, 28));
  const fullName = personName(female);
  const p: PatientRt = { id: id(), code: '', name: fullName, female, dob, age: years, phone: phoneNumber(), disease, allergies: [] };
  if (chance(0.25)) { const extra = diseaseFor(years, female); if (extra.key !== disease.key && !extra.protocol) p.extraDisease = extra; }
  patients.push(p);
}
// Ca đặc biệt cho demo cổng khách hàng: bệnh nhân có liệu trình đầy đủ
patients[0].disease = DISEASES.find((d) => d.key === 'MELASMA')!; patients[0].female = true; patients[0].age = 36; patients[0].dob = vn(TODAY.y - 36, 4, 12);
patients[1].disease = DISEASES.find((d) => d.key === 'ACNE_SEVERE')!; patients[1].age = 21; patients[1].dob = vn(TODAY.y - 21, 9, 3);
patients[2].disease = DISEASES.find((d) => d.key === 'PSORIASIS')!; patients[2].age = 47; patients[2].dob = vn(TODAY.y - 47, 1, 22);

// Ngày khám đầu tiên mỗi bệnh nhân (bệnh nhân liệu trình bắt đầu sớm hơn)
const firstVisitOf = new Map<string, Date>();
patients.forEach((p, i) => {
  const span = (startOfToday.getTime() - WINDOW_START.getTime()) / DAY;
  const earliest = p.disease.protocol ? 0 : 0;
  const latest = p.disease.protocol ? span * 0.7 : span - 1;
  const offset = i < 3 ? int(110, 150) : int(earliest, Math.floor(latest));
  firstVisitOf.set(p.id, clinicSlot(addDays(WINDOW_START, offset)));
});
// Mã bệnh nhân theo tháng đăng ký, số thứ tự toàn cục (khớp quy tắc BN{yyyymm}-{seq} của module tiếp đón)
patients.sort((a, b) => firstVisitOf.get(a.id)!.getTime() - firstVisitOf.get(b.id)!.getTime());
patients.forEach((p, i) => {
  const f = new Date(firstVisitOf.get(p.id)!.getTime() + VN_OFFSET);
  p.code = `BN${f.getUTCFullYear()}${String(f.getUTCMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`;
  push('patient', { id: p.id, patientCode: p.code, fullName: p.name, dateOfBirth: p.dob, phone: p.phone });
  if (chance(0.3)) {
    const n = chance(0.8) ? 1 : 2;
    for (let k = 0; k < n; k++) {
      const [substance, reaction, severity] = pick(ALLERGENS);
      if (p.allergies.includes(substance)) continue;
      p.allergies.push(substance);
      push('allergy', { id: id(), patientId: p.id, substance, reaction, severity, diagnosisDate: vn(int(2015, 2025), int(1, 12), int(1, 28)) });
    }
  }
  const histCount = p.age < 13 ? (chance(0.4) ? 1 : 0) : int(0, 3);
  const usedH = new Set<string>();
  for (let k = 0; k < histCount; k++) {
    let h = pick(HISTORIES);
    if (p.age < 13) h = pick(HISTORIES.filter(([t]) => t === 'FAMILY'));
    if (!p.female && /sinh mổ|tránh thai|cho con bú|buồng trứng/i.test(h[1])) continue;
    if (usedH.has(h[1])) continue; usedH.add(h[1]);
    push('medicalHistory', { id: id(), patientId: p.id, type: h[0], content: h[1], diagnosisDate: vn(int(2010, 2025), int(1, 12), int(1, 28)) });
  }
  push('medicalHistory', { id: id(), patientId: p.id, type: 'DERMATOLOGY', content: `${p.disease.name} (${p.disease.icd}) – chẩn đoán tại phòng khám`, diagnosisDate: firstVisitOf.get(p.id)! });
});
// Ghi nhận dị ứng thuốc ở bệnh nhân phát ban do thuốc
for (const p of patients.filter((x) => x.disease.key === 'DRUG_ERUPTION')) {
  if (!p.allergies.includes('Penicilin / Amoxicilin')) { p.allergies.push('Penicilin / Amoxicilin'); push('allergy', { id: id(), patientId: p.id, substance: 'Penicilin / Amoxicilin', reaction: 'Phát ban dạng sởi toàn thân sau 7 ngày dùng Amoxicilin', severity: 'HIGH', diagnosisDate: firstVisitOf.get(p.id)! }); }
}

// ---------------------------------------------------------------------------
// 7. LƯỢT KHÁM – BỆNH ÁN – CLS – ĐƠN THUỐC – HÓA ĐƠN
// ---------------------------------------------------------------------------
type Movement = { kind: 'MED' | 'SUP'; key: string; qty: number; type: string; refType: string | null; refId: string | null; at: Date; by: string; notes: string };
const movements: Movement[] = [];
const PAY_METHODS = ['CASH', 'CASH', 'CASH', 'CASH', 'BANK_TRANSFER', 'BANK_TRANSFER', 'BANK_TRANSFER', 'CARD', 'CARD', 'VNPAY', 'VNPAY', 'E_WALLET'];
function doctorFor(d: Disease) {
  const fit = DOCTORS.filter((x) => x.s.focus?.includes(d.room));
  return pick(fit.length ? fit : DOCTORS);
}
function examRoomFor(doc: (typeof DOCTORS)[number]) { return roomId[doc.s.room ?? 'EXAM1']; }
const audit = (action: string, entity: string, entityId: string | null, accountId: string | null, at: Date, metadata?: unknown) => push('auditLog', { id: id(), accountId, action, entity, entityId, ipAddress: pick(['10.0.12.21', '10.0.12.22', '10.0.12.35', '10.0.12.41']), createdAt: at, metadata: metadata ?? undefined });

type InvoiceLine = { type: string; description: string; qty: number; unitPrice: number; serviceId?: string | null; orderId?: string | null; planId?: string | null };
function createInvoice(visitId: string, at: Date, lines: InvoiceLine[], opts: { status: 'PAID' | 'UNPAID' | 'PARTIAL'; cashier?: string; kind: 'FINAL' | 'CLS' | 'PROCEDURE'; orderId?: string }) {
  const total = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const invoiceId = push('invoice', { id: id(), visitId, total, status: opts.status }).id as string;
  const items = lines.map((l) => push('invoiceItem', { id: id(), invoiceId, serviceId: l.serviceId ?? null, clinicalOrderId: l.orderId ?? null, treatmentPlanId: l.planId ?? null, itemType: l.type, description: l.description, quantity: l.qty, unitPrice: l.unitPrice, discount: 0, total: l.qty * l.unitPrice }));
  const cashierAcc = opts.cashier ?? pick([emp.C1.accountId, emp.R2.accountId]);
  if (opts.kind === 'FINAL') {
    audit(`FINAL_VISIT_INVOICE_LINK: Invoice ${invoiceId}`, 'Visit', visitId, cashierAcc, at);
    audit(`FINAL_INVOICE_SUMMARY_SNAPSHOT: ${JSON.stringify(lines.map((l, i) => ({ id: items[i].id, category: l.type, name: l.description, quantity: l.qty, unitPrice: l.unitPrice, totalPrice: l.qty * l.unitPrice, isPrepaid: false })))}`, 'Invoice', invoiceId, cashierAcc, at);
  }
  if (opts.kind === 'CLS' && opts.orderId) {
    audit(`CLS_INVOICE_LINK: Invoice ${invoiceId}`, 'ClinicalOrder', opts.orderId, null, at, { invoiceId });
    audit(`CLS_INVOICE_ITEMS_SNAPSHOT: ${JSON.stringify(lines.map((l) => ({ serviceCode: Object.values(svc).find((s) => s.id === l.serviceId)?.code ?? 'CLS', serviceName: l.description, price: l.unitPrice * l.qty })))}`, 'Invoice', invoiceId, cashierAcc, at);
  }
  if (opts.status !== 'UNPAID') {
    const method = pick(PAY_METHODS);
    const paidAt = new Date(at.getTime() + int(5, 40) * 60_000);
    const amount = opts.status === 'PARTIAL' ? money(total * 0.5) : total;
    const paymentId = push('payment', { id: id(), invoiceId, amount, method, paidAt }).id as string;
    let remaining = amount;
    for (const it of items) { const a = Math.min(remaining, Number(it.total)); if (a <= 0) break; push('paymentAllocation', { paymentId, invoiceItemId: it.id, amount: a }); remaining -= a; }
    audit(method === 'CASH' ? `PAYMENT_CASH_CONFIRMED: Thu tiền mặt ${amount} VND. Ghi chú: Thu đủ tại quầy` : method === 'VNPAY' ? `PAYMENT_VNPAY_CONFIRMED: Thanh toán qua VNPay ${amount} VND. TxnRef: ${invoiceId.slice(-10)}_${paidAt.getTime()}` : `PAYMENT_CONFIRMED: ${method} ${amount} VND`, 'Invoice', invoiceId, cashierAcc, paidAt);
  }
  return { invoiceId, total, items };
}

type VisitRt = { id: string; patient: PatientRt; disease: Disease; doctor: (typeof DOCTORS)[number]; at: Date; status: string; isFollowUp: boolean; prescriptionId?: string; rxMeds: MedicineKey[] };
const visits: VisitRt[] = [];
const examFee = (p: PatientRt, doctor: (typeof DOCTORS)[number], followUp: boolean): ServiceKey => followUp ? 'EXAM_RE' : p.age < 13 ? 'EXAM_CHILD' : doctor.s.name.startsWith('BSCKII') || doctor.s.name.startsWith('ThS') ? 'EXAM_EXPERT' : 'EXAM';

function buildVisit(p: PatientRt, disease: Disease, at: Date, opts: { followUp: boolean; index: number; status?: string; doctor?: (typeof DOCTORS)[number]; withRx?: boolean; withLabs?: boolean; paid?: boolean; billing?: 'paid' | 'unpaid' | 'none' }) {
  const doctor = opts.doctor ?? doctorFor(disease);
  const status = opts.status ?? 'COMPLETED';
  const visitId = push('visit', { id: id(), patientId: p.id, employeeId: doctor.id, roomId: examRoomFor(doctor), visitDate: at, status }).id as string;
  const v: VisitRt = { id: visitId, patient: p, disease, doctor, at, status, isFollowUp: opts.followUp, rxMeds: [] };
  visits.push(v);
  const finalDx = disease.final[Math.min(disease.final.length - 1, Math.floor(rand() * disease.final.length))];
  const allergyNote = p.allergies.length ? `Dị ứng: ${p.allergies.join('; ')}.` : 'Không ghi nhận dị ứng thuốc.';
  const examined = status === 'COMPLETED' || status === 'IN_PROGRESS';
  if (examined) {
    const notes = opts.followUp
      ? `TÁI KHÁM lần ${opts.index}.\nDiễn tiến: ${pick(disease.followUpNotes)}\nTuân thủ điều trị: ${pick(['tốt', 'tốt', 'trung bình — quên bôi thuốc vài ngày', 'tốt, không tác dụng phụ đáng kể'])}.\n${allergyNote}\nHướng xử trí: ${disease.advice}`
      : `Lý do khám: ${pick(disease.complaint)}.\nKhám: ${pick(disease.findings)}\nToàn thân: tỉnh, tiếp xúc tốt, sinh hiệu ổn định. ${allergyNote}\nTư vấn: ${disease.advice}`;
    push('medicalRecord', { id: id(), visitId, preliminaryDiagnosis: opts.followUp ? finalDx : disease.preliminary, finalDiagnosis: status === 'COMPLETED' ? finalDx : null, notes });
  } else {
    // Lượt đang chờ: lễ tân ghi lý do khám (JSON theo định dạng module tiếp đón)
    push('medicalRecord', { id: id(), visitId, preliminaryDiagnosis: null, finalDiagnosis: null, notes: JSON.stringify({ reason: opts.followUp ? `Tái khám ${disease.name.toLowerCase()} theo hẹn` : pick(disease.complaint), receptionNote: pick(['', '', 'Bệnh nhân đặt lịch qua tổng đài', 'Khách hàng đặt lịch online', 'Ưu tiên: trẻ em', 'Người nhà đi cùng']), visitType: opts.followUp ? 'FOLLOW_UP' : 'NEW', queueNumber: opts.index }) });
  }
  if (status === 'COMPLETED' || status === 'IN_PROGRESS') audit('VISIT_STARTED', 'Visit', visitId, doctor.accountId, new Date(at.getTime() + 5 * 60_000));

  // Cận lâm sàng (lần khám đầu)
  const lines: InvoiceLine[] = [];
  const fee = svc[examFee(p, doctor, opts.followUp)];
  lines.push({ type: 'CONSULTATION', description: fee.name, qty: 1, unitPrice: fee.price, serviceId: fee.id });
  const doLabs = opts.withLabs ?? (!opts.followUp && status === 'COMPLETED');
  if (doLabs) {
    const labs = (disease.labs ?? []).filter((l) => l.service !== 'BHCG' || p.female);
    const imgs = disease.imaging ?? [];
    for (const lab of labs) {
      const order = push('clinicalOrder', { id: id(), visitId, serviceId: svc[lab.service].id, orderedById: doctor.id, type: 'LAB', status: 'COMPLETED', orderedAt: new Date(at.getTime() + 15 * 60_000) });
      for (const [testName, result, unit] of lab.results) push('labResult', { id: id(), orderId: order.id, testName, result, unit });
      lines.push({ type: 'CLINICAL_SERVICE', description: svc[lab.service].name, qty: 1, unitPrice: svc[lab.service].price, serviceId: svc[lab.service].id, orderId: order.id as string });
    }
    for (const img of imgs) {
      const isLab = svc[img.service].category === 'LAB';
      const order = push('clinicalOrder', { id: id(), visitId, serviceId: svc[img.service].id, orderedById: doctor.id, type: isLab ? 'LAB' : 'IMAGING', status: 'COMPLETED', orderedAt: new Date(at.getTime() + 20 * 60_000) });
      if (isLab) push('labResult', { id: id(), orderId: order.id, testName: img.type, result: img.conclusion, unit: null });
      else push('imagingResult', { id: id(), orderId: order.id, imagingType: img.type, conclusion: img.conclusion, fileUrl: placeholder(`${img.type} – ${p.code}`) });
      lines.push({ type: 'CLINICAL_SERVICE', description: svc[img.service].name, qty: 1, unitPrice: svc[img.service].price, serviceId: svc[img.service].id, orderId: order.id as string });
    }
    if (labs.length || imgs.length) audit('CLINICAL_RESULT_CREATED', 'Visit', visitId, emp.L1.accountId, new Date(at.getTime() + 75 * 60_000));
  }

  // Đơn thuốc
  const withRx = opts.withRx ?? status === 'COMPLETED';
  if (withRx && disease.rx.length) {
    const plan: RxLine[] = pick(disease.rx).filter(([k]) => !(k === 'CEPHALEXIN' && p.allergies.some((a) => a.startsWith('Cephalosporin'))) && !(k === 'AUGMENTIN' && p.allergies.some((a) => a.startsWith('Penicilin'))));
    const rxStatus = status === 'COMPLETED' ? (opts.billing === 'unpaid' ? 'DRAFT' : opts.billing === 'paid' && at >= startOfToday ? 'PAID' : 'DISPENSED') : 'DRAFT';
    const prescriptionId = push('prescription', { id: id(), visitId, employeeId: doctor.id, status: rxStatus }).id as string;
    v.prescriptionId = prescriptionId;
    for (const [k, qty, dosage] of plan) {
      push('prescriptionItem', { id: id(), prescriptionId, medicineId: med[k].id, quantity: qty, dosage });
      v.rxMeds.push(k);
      lines.push({ type: 'MEDICATION', description: `Thuốc: ${med[k].name}`, qty, unitPrice: med[k].cost });
      if (rxStatus === 'DISPENSED') movements.push({ kind: 'MED', key: k, qty: -qty, type: 'PRESCRIPTION_ISSUE', refType: 'PRESCRIPTION', refId: prescriptionId, at: new Date(at.getTime() + 60 * 60_000), by: emp.P1.id, notes: `Cấp phát theo đơn ${p.code}` });
    }
  }

  // Hóa đơn
  const billing = opts.billing ?? (status === 'COMPLETED' ? 'paid' : 'none');
  if (billing !== 'none') createInvoice(visitId, new Date(at.getTime() + 50 * 60_000), lines, { status: billing === 'paid' ? (chance(0.03) ? 'PARTIAL' : 'PAID') : 'UNPAID', kind: 'FINAL' });
  return v;
}

// Lịch sử khám
const historyVisitsByPatient = new Map<string, VisitRt[]>();
for (const p of patients) {
  const list: VisitRt[] = [];
  let at = firstVisitOf.get(p.id)!;
  const doctor = doctorFor(p.disease);
  const maxVisits = p.disease.protocol ? int(2, 4) : int(1, 3);
  for (let k = 0; k < maxVisits && at < startOfToday; k++) {
    list.push(buildVisit(p, p.disease, at, { followUp: k > 0, index: k, doctor: chance(0.85) ? doctor : undefined }));
    at = clinicSlot(addDays(at, (p.disease.followUpDays ?? 21) + int(-3, 7)));
  }
  if (p.extraDisease) {
    const extraAt = clinicSlot(addDays(WINDOW_START, int(10, 220)));
    if (extraAt < startOfToday) list.push(buildVisit(p, p.extraDisease, extraAt, { followUp: false, index: 0 }));
  }
  historyVisitsByPatient.set(p.id, list);
}

// ---------------------------------------------------------------------------
// 8. LIỆU TRÌNH ĐIỀU TRỊ (TreatmentPlan → Stage → Step → Session)
// ---------------------------------------------------------------------------
const PROC_ROOM: Partial<Record<ProcedureKey, RoomKey>> = { NBUVB: 'PHOTOTHERAPY', EXCIMER: 'PHOTOTHERAPY', PDL: 'LASER1', QS_TONING: 'LASER1', PICO: 'LASER2', CO2_FRACTIONAL: 'LASER2', CO2_ABLATION: 'LASER2', CRYO: 'PROCEDURE', ILK: 'PROCEDURE', PRP_HAIR: 'PROCEDURE', SUBCISION: 'PROCEDURE', PEEL_SA: 'PROCEDURE', PEEL_GA: 'PROCEDURE', EXTRACTION: 'PROCEDURE', IPL: 'LASER1', BIOPSY: 'PROCEDURE', DERMOSCOPY: 'IMAGING', RF_MN: 'LASER2' };
const SESSION_RESPONSES = ['Dung nạp tốt, đỏ da nhẹ thoáng qua.', 'Đáp ứng tốt, cải thiện rõ so với buổi trước.', 'Cảm giác châm chích nhẹ, hết sau 30 phút.', 'Đỏ da, phù nhẹ vùng điều trị, chườm mát ổn định.', 'Bệnh nhân hài lòng, thương tổn mờ dần.'];
type SessionRt = { id: string; at: Date; status: string; planId: string; stageId: string; patient: PatientRt; procedure: ProcedureKey | null; visitId: string };
const sessions: SessionRt[] = [];
const plans: Array<{ id: string; patient: PatientRt; visitId: string; doctor: (typeof DOCTORS)[number]; start: Date; status: string; protocol: ProtoRuntime }> = [];

const planCandidates = patients.filter((p) => p.disease.protocol && (historyVisitsByPatient.get(p.id)?.length ?? 0) > 0);
for (const p of planCandidates) {
  if (patients.indexOf(p) > 2 && chance(0.25)) continue; // một số bệnh nhân từ chối liệu trình
  const firstVisit = historyVisitsByPatient.get(p.id)![0];
  const pr = proto[p.disease.protocol!];
  const start = clinicSlot(addDays(firstVisit.at, int(0, 7)));
  const totalDays = pr.def.stages.reduce((s, st) => s + st.days, 0);
  const end = addDays(start, totalDays);
  const status = end < startOfToday ? (chance(0.85) ? 'COMPLETED' : 'CANCELLED') : start > startOfToday ? 'DRAFT' : 'ACTIVE';
  const planId = id();
  plans.push({ id: planId, patient: p, visitId: firstVisit.id, doctor: firstVisit.doctor, start, status, protocol: pr });
  push('treatmentPlan', {
    id: planId, patientId: p.id, visitId: firstVisit.id, protocolTemplateId: pr.id, name: `${pr.def.name} – ${p.name}`,
    diagnosisSummary: p.disease.final[Math.min(1, p.disease.final.length - 1)], goal: pr.def.stages.map((s) => s.goal).join('; '),
    status, version: chance(0.2) ? 2 : 1, createdById: firstVisit.doctor.id, startDate: start, expectedEndDate: end, completedAt: status === 'COMPLETED' ? end : null,
    notes: `Giai đoạn: ${pr.def.stages[0].name}\nĐã tư vấn số buổi, chi phí dự kiến và tác dụng phụ. ${status === 'CANCELLED' ? 'Bệnh nhân dừng liệu trình vì lý do cá nhân (chuyển công tác).' : ''}`.trim(),
    createdAt: firstVisit.at, updatedAt: status === 'ACTIVE' ? addDays(startOfToday, -int(1, 10)) : end,
  });
  // Đồng thuận
  const consentId = push('signedConsent', { id: id(), templateId: consentTpl[pr.def.consent], visitId: firstVisit.id, treatmentPlanId: planId, planVersion: 1, signedByPatientId: p.id, signedByEmployeeId: firstVisit.doctor.id, signerName: p.age < 18 ? `${personName(true)} (mẹ bệnh nhân)` : p.name, signatureUrl: placeholder(`Chữ ký – ${p.name}`, 480, 180), documentUrl: null, signedAt: new Date(start.getTime() - 30 * 60_000), createdAt: new Date(start.getTime() - 30 * 60_000) }).id as string;
  push('consentAudit', { id: id(), signedConsentId: consentId, accountId: emp.N1.accountId, action: 'SIGNED', evidenceUrl: null, ipAddress: '10.0.12.35', createdAt: new Date(start.getTime() - 30 * 60_000) });
  push('consentAudit', { id: id(), signedConsentId: consentId, accountId: firstVisit.doctor.accountId, action: 'VERIFIED', evidenceUrl: null, ipAddress: '10.0.12.21', createdAt: new Date(start.getTime() - 20 * 60_000) });
  if (chance(0.5)) push('signedConsent', { id: id(), templateId: consentTpl.PHOTO, visitId: firstVisit.id, treatmentPlanId: planId, planVersion: 1, signedByPatientId: p.id, signedByEmployeeId: emp.N1.id, signerName: p.name, signatureUrl: placeholder(`Chữ ký – ${p.name}`, 480, 180), documentUrl: null, signedAt: new Date(start.getTime() - 25 * 60_000), createdAt: new Date(start.getTime() - 25 * 60_000) });
  audit('CREATE', 'TreatmentPlan', planId, firstVisit.doctor.accountId, firstVisit.at);
  push('treatmentImage', { id: id(), planId, sessionId: null, visitId: firstVisit.id, imageUrl: placeholder(`${p.disease.name} – Trước điều trị`), imageType: 'CLINICAL_STANDARDIZED', phase: 'BEFORE', bodyArea: pick(['Mặt – chính diện', 'Mặt – nghiêng trái 45°', 'Mặt – nghiêng phải 45°']), description: 'Ảnh mốc trước điều trị, ánh sáng chuẩn, khoảng cách 50 cm.', capturedAt: new Date(start.getTime() - 40 * 60_000), capturedById: emp.N1.id, createdAt: start });

  let cursor = start;
  let sessionNo = 0;
  pr.stages.forEach((stage, si) => {
    const stageStart = cursor;
    const stageEnd = addDays(stageStart, stage.def.days);
    const stageStatus = status === 'CANCELLED' && stageStart > addDays(start, 30) ? 'CANCELLED' : stageEnd < startOfToday ? 'COMPLETED' : stageStart <= startOfToday ? 'IN_PROGRESS' : 'PENDING';
    const stageId = push('treatmentStage', { id: id(), planId, stageType: stage.def.type, name: stage.def.name, orderNo: si + 1, goal: stage.def.goal, plannedStartDate: stageStart, plannedEndDate: stageEnd, actualStartDate: stageStatus === 'PENDING' ? null : stageStart, actualEndDate: stageStatus === 'COMPLETED' ? stageEnd : null, status: stageStatus, notes: null, createdAt: firstVisit.at, updatedAt: firstVisit.at }).id as string;
    stage.steps.forEach((step, pi) => {
      const sd = step.def;
      const stepId = id();
      let stepStatusDone = 0; let stepScheduled = 0;
      const stepSessions: Array<Row> = [];
      for (let r = 0; r < sd.repeat; r++) {
        const plannedAt = clinicSlot(addDays(stageStart, r * (sd.interval ?? 0) + pi * 2));
        if (plannedAt > stageEnd && r > 0) break;
        if (status === 'CANCELLED' && plannedAt > addDays(start, 45)) break;
        sessionNo++;
        const isPast = plannedAt < startOfToday;
        const isToday = !isPast && plannedAt < addDays(startOfToday, 1);
        if (!isPast && !isToday && plannedAt > addDays(startOfToday, 45)) { stepScheduled++; continue; } // xa quá chưa xếp lịch
        const sessionStatus = isPast ? (chance(0.95) ? 'COMPLETED' : 'CANCELLED') : isToday ? (plannedAt.getTime() < nowReal.getTime() ? 'IN_PROGRESS' : 'SCHEDULED') : 'SCHEDULED';
        if (sessionStatus === 'COMPLETED') stepStatusDone++; else if (sessionStatus === 'SCHEDULED') stepScheduled++;
        // Mỗi buổi thực hiện là một lượt đến phòng khám riêng
        let visitId = firstVisit.id;
        const performer = sd.proc && ['NBUVB', 'EXCIMER', 'QS_TONING', 'PICO', 'PDL', 'IPL'].includes(sd.proc) ? pick(TECHS) : firstVisit.doctor;
        if (sessionStatus === 'COMPLETED' || sessionStatus === 'IN_PROGRESS') {
          const room = roomId[(sd.proc && PROC_ROOM[sd.proc]) ?? 'PROCEDURE'];
          visitId = push('visit', { id: id(), patientId: p.id, employeeId: firstVisit.doctor.id, roomId: room, visitDate: plannedAt, status: sessionStatus === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS' }).id as string;
          push('medicalRecord', { id: id(), visitId, preliminaryDiagnosis: p.disease.final[0], finalDiagnosis: sessionStatus === 'COMPLETED' ? p.disease.final[0] : null, notes: `Buổi điều trị số ${sessionNo} – ${pr.def.name}.\n${sd.instruction}${sd.params ? `\nThông số: ${Object.entries(sd.params).map(([k, v]) => `${k}: ${v}`).join('; ')}` : ''}\n${sessionStatus === 'COMPLETED' ? pick(SESSION_RESPONSES) : 'Đang thực hiện.'}` });
          if (sd.proc && sessionStatus === 'COMPLETED') {
            const s = svc[PROCEDURES[sd.proc].service];
            createInvoice(visitId, new Date(plannedAt.getTime() + (sd.minutes ?? 30) * 60_000), [{ type: 'PROCEDURE', description: `${s.name} – buổi ${sessionNo}`, qty: 1, unitPrice: s.price, serviceId: s.id, planId }], { status: 'PAID', kind: 'FINAL' });
          }
        }
        const sessionId = id();
        stepSessions.push({ id: sessionId, stageId, stepId, visitId, sessionNo, scheduledAt: plannedAt, startedAt: sessionStatus === 'COMPLETED' || sessionStatus === 'IN_PROGRESS' ? plannedAt : null, completedAt: sessionStatus === 'COMPLETED' ? new Date(plannedAt.getTime() + (sd.minutes ?? 20) * 60_000) : null, performedById: sessionStatus === 'SCHEDULED' ? null : performer.id, treatmentArea: p.disease.key.startsWith('PSORIASIS') || p.disease.key === 'VITILIGO' ? 'Toàn thân' : p.disease.key === 'ANDROGENETIC_ALOPECIA' ? 'Da đầu vùng đỉnh – trán' : p.disease.key === 'WARTS' ? 'Ngón tay / gan bàn chân' : p.disease.key === 'KELOID' ? 'Sẹo vùng ngực / dái tai' : 'Toàn mặt', clinicalNotes: sessionStatus === 'COMPLETED' ? `${sd.instruction}` : null, patientResponse: sessionStatus === 'COMPLETED' ? pick(SESSION_RESPONSES) : null, adverseReaction: sessionStatus === 'COMPLETED' && chance(0.08) ? pick(['Tăng sắc tố sau viêm nhẹ vùng gò má', 'Phồng rộp nhỏ 2 điểm, đã bôi Fucidin, lành sau 5 ngày', 'Đỏ da kéo dài 48 giờ']) : null, status: sessionStatus, createdAt: firstVisit.at, updatedAt: plannedAt });
        sessions.push({ id: sessionId, at: plannedAt, status: sessionStatus, planId, stageId, patient: p, procedure: sd.proc, visitId });
        if (sessionStatus === 'COMPLETED') {
          // Tiêu hao vật tư & thiết bị
          for (const mat of sd.materials ?? []) {
            const [kind, key, plannedQty, unit] = mat;
            const actual = Math.round(plannedQty * (0.9 + rand() * 0.3) * 100) / 100;
            const unitCost = kind === 'MED' ? med[key as MedicineKey].cost : sup[key as SupplyKey].cost;
            push('treatmentConsumption', { id: id(), sessionId, medicineId: kind === 'MED' ? med[key as MedicineKey].id : null, supplyId: kind === 'SUP' ? sup[key as SupplyKey].id : null, plannedQuantity: plannedQty, actualQuantity: actual, unit, unitCost, totalCost: Math.round(actual * unitCost), recordedById: performer.id, createdAt: new Date(plannedAt.getTime() + 30 * 60_000) });
            movements.push({ kind, key, qty: -actual, type: 'TREATMENT_USE', refType: 'TREATMENT_SESSION', refId: sessionId, at: new Date(plannedAt.getTime() + 30 * 60_000), by: performer.id, notes: `Trừ kho thực tế theo ca điều trị #${sessionId}` });
          }
          const eqKey = sd.proc ? PROCEDURES[sd.proc].equipment : null;
          if (eqKey) push('equipmentUsage', { id: id(), equipmentId: equip[eqKey], visitId, treatmentSessionId: sessionId, operatorId: performer.id, startedAt: plannedAt, endedAt: new Date(plannedAt.getTime() + (sd.minutes ?? 20) * 60_000), parameters: sd.params ?? undefined, createdAt: plannedAt });
          if (chance(0.45)) push('treatmentImage', { id: id(), planId, sessionId, visitId, imageUrl: placeholder(`${p.disease.name} – Sau buổi ${sessionNo}`), imageType: 'CLINICAL_STANDARDIZED', phase: 'AFTER', bodyArea: 'Vùng điều trị', description: pick(['Ảnh sau điều trị, đỏ da nhẹ.', 'Ảnh theo dõi đáp ứng.', 'Ảnh chuẩn hóa so sánh với mốc ban đầu.']), capturedAt: new Date(plannedAt.getTime() + 40 * 60_000), capturedById: emp.N1.id, createdAt: plannedAt });
        }
      }
      const stepStatus = stepStatusDone > 0 && stepScheduled === 0 && stageStatus !== 'IN_PROGRESS' ? 'COMPLETED' : stepStatusDone > 0 ? 'IN_PROGRESS' : stageStatus === 'CANCELLED' ? 'CANCELLED' : 'PENDING';
      push('treatmentStep', { id: stepId, stageId, procedureId: sd.proc ? proc[sd.proc] : null, orderNo: pi + 1, content: sd.instruction, repeatCount: sd.repeat, intervalDays: sd.interval, plannedDurationMinutes: sd.minutes, defaultParameters: sd.params ?? undefined, status: stepStatus, createdAt: firstVisit.at, updatedAt: firstVisit.at });
      for (const s of stepSessions) push('treatmentSession', s);
    });
    cursor = stageEnd;
  });
  if (status === 'COMPLETED') push('treatmentImage', { id: id(), planId, sessionId: null, visitId: firstVisit.id, imageUrl: placeholder(`${p.disease.name} – Kết thúc liệu trình`), imageType: 'CLINICAL_STANDARDIZED', phase: 'FOLLOW_UP', bodyArea: 'Mặt – chính diện', description: 'Ảnh đánh giá kết thúc liệu trình.', capturedAt: end, capturedById: emp.N2.id, createdAt: end });
}

// ---------------------------------------------------------------------------
// 9. HÔM NAY: hàng đợi khám thực tế (để chạy thử các luồng)
// ---------------------------------------------------------------------------
const todaysPatients = patients.filter((p) => !(historyVisitsByPatient.get(p.id) ?? []).some((v) => v.at >= startOfToday)).slice(0, 200);
const usedToday = new Set<string>();
function takeTodayPatient(filter: (p: PatientRt) => boolean = () => true) {
  const p = todaysPatients.find((x) => !usedToday.has(x.id) && filter(x)) ?? todaysPatients.find((x) => !usedToday.has(x.id))!;
  usedToday.add(p.id); return p;
}
const todayPlan: Array<{ doc: string; slots: Array<[number, number, 'COMPLETED_PAID' | 'COMPLETED_UNPAID' | 'IN_PROGRESS' | 'WAITING']> }> = [
  { doc: 'D1', slots: [[8, 0, 'COMPLETED_PAID'], [8, 30, 'COMPLETED_UNPAID'], [9, 0, 'COMPLETED_UNPAID'], [9, 30, 'IN_PROGRESS'], [10, 0, 'WAITING'], [10, 20, 'WAITING'], [10, 40, 'WAITING'], [11, 0, 'WAITING']] },
  { doc: 'D2', slots: [[8, 10, 'COMPLETED_PAID'], [8, 40, 'COMPLETED_UNPAID'], [9, 20, 'IN_PROGRESS'], [10, 10, 'WAITING'], [10, 50, 'WAITING']] },
  { doc: 'D3', slots: [[8, 0, 'COMPLETED_PAID'], [9, 10, 'COMPLETED_UNPAID'], [9, 50, 'WAITING'], [10, 30, 'WAITING']] },
  { doc: 'D5', slots: [[8, 20, 'COMPLETED_PAID'], [9, 40, 'WAITING'], [10, 15, 'WAITING']] },
  { doc: 'D6', slots: [[8, 30, 'COMPLETED_UNPAID'], [9, 45, 'WAITING']] },
  { doc: 'D8', slots: [[13, 30, 'WAITING'], [14, 0, 'WAITING']] },
];
const todayVisits: VisitRt[] = [];
let queueNo = 0;
for (const { doc, slots } of todayPlan) {
  const doctor = emp[doc];
  for (const [h, mi, kind] of slots) {
    const p = takeTodayPatient((x) => doctor.s.focus?.includes(x.disease.room) ?? true);
    const prior = historyVisitsByPatient.get(p.id) ?? [];
    const followUp = prior.length > 0 && prior[prior.length - 1].disease.key === p.disease.key && chance(0.6);
    const status = kind.startsWith('COMPLETED') ? 'COMPLETED' : kind;
    queueNo++;
    const v = buildVisit(p, p.disease, todayAt(h, mi), { followUp, index: followUp && status !== 'WAITING' ? prior.length : queueNo, doctor: doctor as (typeof DOCTORS)[number], status, withRx: status === 'COMPLETED' || (status === 'IN_PROGRESS' && chance(0.5)), withLabs: status === 'COMPLETED' && !followUp, billing: kind === 'COMPLETED_PAID' ? 'paid' : kind === 'COMPLETED_UNPAID' ? 'unpaid' : 'none' });
    todayVisits.push(v);
    audit(`CREATE_WALK_IN_VISIT: Room ${examRoomFor(v.doctor)}, STT #${queueNo}`, 'Visit', v.id, pick([emp.R1.accountId, emp.R2.accountId]), new Date(todayAt(h, mi).getTime() - 10 * 60_000));
  }
}
// Một lượt đang khám có chỉ định CLS chờ thanh toán (luồng CLS – thu ngân)
{
  const v = todayVisits.find((x) => x.status === 'IN_PROGRESS' && x.doctor.id === emp.D1.id) ?? todayVisits.find((x) => x.status === 'IN_PROGRESS')!;
  const s = svc.KOH;
  const order = push('clinicalOrder', { id: id(), visitId: v.id, serviceId: s.id, orderedById: v.doctor.id, type: 'LABORATORY', status: 'AWAITING_PAYMENT', orderedAt: new Date(v.at.getTime() + 12 * 60_000) });
  createInvoice(v.id, new Date(v.at.getTime() + 12 * 60_000), [{ type: 'CLINICAL_SERVICE', description: s.name, qty: 1, unitPrice: s.price, serviceId: s.id, orderId: order.id as string }], { status: 'UNPAID', kind: 'CLS', orderId: order.id as string });
  audit(`CREATE_CLS_ORDER: Order ${order.id} tạo với 1 dịch vụ.`, 'ClinicalOrder', order.id as string, v.doctor.accountId, new Date(v.at.getTime() + 12 * 60_000));
  // Lượt khác: CLS đã thanh toán, sẵn sàng thực hiện
  const v2 = todayVisits.find((x) => x.status === 'IN_PROGRESS' && x.id !== v.id);
  if (v2) {
    const s2 = svc.DERMOSCOPY;
    const order2 = push('clinicalOrder', { id: id(), visitId: v2.id, serviceId: s2.id, orderedById: v2.doctor.id, type: 'IMAGING', status: 'READY', orderedAt: new Date(v2.at.getTime() + 10 * 60_000) });
    createInvoice(v2.id, new Date(v2.at.getTime() + 10 * 60_000), [{ type: 'CLINICAL_SERVICE', description: s2.name, qty: 1, unitPrice: s2.price, serviceId: s2.id, orderId: order2.id as string }], { status: 'PAID', kind: 'CLS', orderId: order2.id as string });
  }
}

// ---------------------------------------------------------------------------
// 10. LỊCH HẸN
// ---------------------------------------------------------------------------
const allHistory = visits.filter((v) => v.at < startOfToday);
for (const v of allHistory) {
  if (!chance(0.55)) continue; // phần còn lại là khách vãng lai
  push('appointment', { id: id(), patientId: v.patient.id, roomId: examRoomFor(v.doctor), employeeId: v.doctor.id, serviceId: svc[examFee(v.patient, v.doctor, v.isFollowUp)].id, treatmentSessionId: null, scheduledAt: new Date(v.at.getTime() - int(0, 20) * 60_000), status: 'COMPLETED' });
}
// Lịch hẹn bị hủy trong quá khứ
for (let i = 0; i < 28; i++) {
  const p = pick(patients); const doctor = doctorFor(p.disease);
  push('appointment', { id: id(), patientId: p.id, roomId: examRoomFor(doctor), employeeId: doctor.id, serviceId: svc.EXAM.id, treatmentSessionId: null, scheduledAt: clinicSlot(addDays(WINDOW_START, int(0, 225))), status: 'CANCELLED' });
}
// Hôm nay: lượt đã đến (CHECKED_IN/COMPLETED) + lượt chưa đến
for (const v of todayVisits) if (chance(0.7)) push('appointment', { id: id(), patientId: v.patient.id, roomId: examRoomFor(v.doctor), employeeId: v.doctor.id, serviceId: svc[examFee(v.patient, v.doctor, v.isFollowUp)].id, treatmentSessionId: null, scheduledAt: new Date(v.at.getTime() - 5 * 60_000), status: v.status === 'COMPLETED' ? 'COMPLETED' : 'CHECKED_IN' });
for (const [h, mi] of [[14, 30], [15, 0], [15, 30], [16, 0], [16, 30]] as const) {
  const p = takeTodayPatient(); const doctor = doctorFor(p.disease);
  push('appointment', { id: id(), patientId: p.id, roomId: examRoomFor(doctor), employeeId: doctor.id, serviceId: svc.EXAM.id, treatmentSessionId: null, scheduledAt: todayAt(h, mi), status: 'CONFIRMED' });
}
// Buổi điều trị sắp tới
for (const s of sessions.filter((x) => x.status === 'SCHEDULED')) {
  const plan = plans.find((x) => x.id === s.planId)!;
  push('appointment', { id: id(), patientId: s.patient.id, roomId: roomId[(s.procedure && PROC_ROOM[s.procedure]) ?? 'PROCEDURE'], employeeId: plan.doctor.id, serviceId: s.procedure ? svc[PROCEDURES[s.procedure].service].id : svc.EXAM_RE.id, treatmentSessionId: s.id, scheduledAt: s.at, status: s.at < addDays(startOfToday, 3) ? 'CONFIRMED' : 'SCHEDULED' });
}
// Đặt lịch mới trong 3 tuần tới (một phần đặt online, chờ xác nhận)
for (let i = 0; i < 40; i++) {
  const p = pick(patients); const doctor = doctorFor(p.disease);
  const at = clinicSlot(addDays(startOfToday, int(1, 21)));
  push('appointment', { id: id(), patientId: p.id, roomId: examRoomFor(doctor), employeeId: doctor.id, serviceId: pick([svc.EXAM.id, svc.EXAM_EXPERT.id, svc.EXAM_RE.id]), treatmentSessionId: null, scheduledAt: at, status: weighted(['SCHEDULED', 'CONFIRMED', 'PENDING'] as const, (s) => (s === 'SCHEDULED' ? 5 : s === 'CONFIRMED' ? 3 : 2)) });
}

// ---------------------------------------------------------------------------
// 11. KẾ HOẠCH TÁI KHÁM + THÔNG BÁO
// ---------------------------------------------------------------------------
const recentCompleted = visits.filter((v) => v.status === 'COMPLETED' && v.at >= addDays(startOfToday, -35) && v.at < addDays(startOfToday, 1));
for (const v of recentCompleted) {
  if (!chance(0.7)) continue;
  const decision = v.disease.followUpDays ? (chance(0.85) ? 'SCHEDULED' : 'ON_SYMPTOMS') : 'NOT_NEEDED';
  const target = decision === 'SCHEDULED' ? clinicSlot(addDays(v.at, v.disease.followUpDays ?? 14)) : null;
  const tpl = v.disease.key.includes('ACNE_SEVERE') ? aftercareId[2] : v.disease.key === 'ATOPIC' ? aftercareId[3] : null;
  const planId = push('followUpPlan', {
    id: id(), visitId: v.id, patientId: v.patient.id, doctorId: v.doctor.id, decision, status: 'CONFIRMED', targetDate: target, windowDays: decision === 'SCHEDULED' ? 3 : null,
    priority: v.disease.key === 'BCC' || v.disease.key === 'DRUG_ERUPTION' ? 'URGENT' : v.disease.protocol ? 'IMPORTANT' : 'NORMAL',
    reason: decision === 'SCHEDULED' ? `Đánh giá đáp ứng điều trị ${v.disease.name.toLowerCase()}` : decision === 'ON_SYMPTOMS' ? 'Tái khám khi có dấu hiệu tái phát' : null,
    preparation: v.disease.labs?.some((l) => l.service === 'LIVER') ? 'Nhịn ăn 8 giờ để xét nghiệm men gan, mỡ máu.' : 'Mang theo thuốc đang dùng và sổ khám.',
    homeCare: v.disease.advice, avoid: v.disease.room === 'COSMETIC' ? 'Tránh nắng trực tiếp, không tự ý dùng mỹ phẩm trị nám/trắng da.' : 'Không tự ý dùng kem có corticoid, không gãi chà xát.',
    warningSigns: 'Thương tổn lan nhanh, sốt, mụn nước – bọng nước, phù môi mắt, khó thở: đến cơ sở y tế ngay.',
    patientMessage: `Bác sĩ ${v.doctor.name} hẹn bạn tái khám để đánh giá kết quả điều trị. Vui lòng dùng thuốc đúng hướng dẫn.`,
    hideDiagnosis: v.disease.key === 'BCC', templateId: tpl, templateVersion: tpl ? 1 : null, version: 1, confirmedAt: new Date(v.at.getTime() + 40 * 60_000), createdAt: new Date(v.at.getTime() + 35 * 60_000), updatedAt: new Date(v.at.getTime() + 40 * 60_000),
  }).id as string;
  audit('FOLLOWUP_PLAN_CONFIRMED', 'FollowUpPlan', planId, v.doctor.accountId, new Date(v.at.getTime() + 40 * 60_000));
  if (target) {
    const booked = chance(0.6);
    if (booked) push('appointment', { id: id(), patientId: v.patient.id, roomId: examRoomFor(v.doctor), employeeId: v.doctor.id, serviceId: svc.EXAM_RE.id, treatmentSessionId: null, scheduledAt: target, status: target < startOfToday ? 'COMPLETED' : 'SCHEDULED', followUpPlanId: planId });
    const remindAt = addDays(target, -1);
    const notificationId = push('notification', { id: id(), recipient: v.patient.code, type: 'APPOINTMENT_REMINDER', content: `Nhắc lịch tái khám Da liễu ngày ${new Date(target.getTime() + VN_OFFSET).toISOString().slice(0, 10).split('-').reverse().join('/')} với ${v.doctor.name}.`, status: remindAt < nowReal ? 'SENT' : 'SCHEDULED', scheduledAt: remindAt, followUpPlanId: planId, dedupeKey: `followup:${planId}:d-1` }).id as string;
    if (remindAt < nowReal) push('notificationDelivery', { id: id(), notificationId, channel: 'SMS', providerMessageId: `SMS${int(100000, 999999)}`, status: 'DELIVERED', attemptedAt: remindAt, deliveredAt: new Date(remindAt.getTime() + 4000), errorMessage: null });
  }
}
// Thông báo khác: kết quả CLS, đơn thuốc, buổi điều trị
for (const v of visits.filter((x) => x.status === 'COMPLETED' && x.at >= addDays(startOfToday, -45)).slice(0, 80)) {
  if (v.prescriptionId && chance(0.5)) {
    const nid = push('notification', { id: id(), recipient: v.patient.code, type: 'PRESCRIPTION_READY', content: `Đơn thuốc của bạn tại lượt khám ngày ${new Date(v.at.getTime() + VN_OFFSET).toISOString().slice(0, 10).split('-').reverse().join('/')} đã sẵn sàng tại Quầy thuốc.`, status: 'DELIVERED', scheduledAt: new Date(v.at.getTime() + 55 * 60_000) }).id as string;
    push('notificationDelivery', { id: id(), notificationId: nid, channel: 'IN_APP', providerMessageId: null, status: 'DELIVERED', attemptedAt: new Date(v.at.getTime() + 55 * 60_000), deliveredAt: new Date(v.at.getTime() + 55 * 60_000), errorMessage: null });
  }
  if (!v.isFollowUp && (v.disease.labs?.length || v.disease.imaging?.length) && chance(0.7)) {
    const nid = push('notification', { id: id(), recipient: v.patient.code, type: 'LAB_RESULT_READY', content: 'Kết quả cận lâm sàng của bạn đã có. Vui lòng xem trong mục Kết quả hoặc trao đổi với bác sĩ.', status: 'DELIVERED', scheduledAt: new Date(v.at.getTime() + 80 * 60_000) }).id as string;
    push('notificationDelivery', { id: id(), notificationId: nid, channel: pick(['SMS', 'EMAIL', 'IN_APP']), providerMessageId: `MSG${int(100000, 999999)}`, status: 'DELIVERED', attemptedAt: new Date(v.at.getTime() + 80 * 60_000), deliveredAt: new Date(v.at.getTime() + 81 * 60_000), errorMessage: null });
  }
}
for (const s of sessions.filter((x) => x.status === 'SCHEDULED' && x.at < addDays(startOfToday, 10))) {
  const at = addDays(s.at, -1);
  const sent = at < nowReal;
  const nid = push('notification', { id: id(), recipient: s.patient.code, type: 'TREATMENT_SESSION_REMINDER', content: `Nhắc lịch buổi điều trị ${s.procedure ? PROCEDURES[s.procedure].name : 'tái khám liệu trình'} lúc ${new Date(s.at.getTime() + VN_OFFSET).toISOString().slice(11, 16)} ngày ${new Date(s.at.getTime() + VN_OFFSET).toISOString().slice(0, 10).split('-').reverse().join('/')}.`, status: sent ? 'SENT' : 'SCHEDULED', scheduledAt: at }).id as string;
  push('notificationDelivery', { id: id(), notificationId: nid, channel: 'SMS', providerMessageId: sent ? `SMS${int(100000, 999999)}` : null, status: sent ? (chance(0.92) ? 'DELIVERED' : 'FAILED') : 'QUEUED', attemptedAt: sent ? at : nowReal, deliveredAt: sent ? new Date(at.getTime() + 3000) : null, errorMessage: null });
}
for (const n of rows.notificationDelivery ?? []) if (n.status === 'FAILED') n.errorMessage = 'Thuê bao tạm thời không liên lạc được (mã 1102).';

// ---------------------------------------------------------------------------
// 12. CẢNH BÁO TƯƠNG TÁC THUỐC
// ---------------------------------------------------------------------------
for (const v of visits.filter((x) => x.rxMeds.some((m) => m === 'ACNOTIN10' || m === 'ACNOTIN20'))) {
  if (!chance(0.5)) continue;
  const { id: interaction, def } = interactionId('ISOTRETINOIN', 'DOXYCYCLINE');
  const plan = plans.find((p) => p.patient.id === v.patient.id);
  push('interactionAlert', { id: id(), visitId: v.id, treatmentPlanId: plan?.id ?? null, interactionId: interaction, severity: def.severity, message: `Bệnh nhân đang dùng Doxycyclin từ đợt điều trị trước. ${def.description} ${def.recommendation}`, status: 'RESOLVED', resolvedAt: new Date(v.at.getTime() + 20 * 60_000), createdAt: new Date(v.at.getTime() + 15 * 60_000) });
}
for (const v of visits.filter((x) => x.rxMeds.includes('MEDROL16')).slice(0, 4)) {
  const { id: interaction, def } = interactionId('ITRACONAZOLE', 'METHYLPREDNISOLONE');
  push('interactionAlert', { id: id(), visitId: v.id, treatmentPlanId: null, interactionId: interaction, severity: def.severity, message: `Kiểm tra: bệnh nhân có đơn Itraconazol trong 30 ngày gần đây. ${def.description}`, status: 'RESOLVED', resolvedAt: new Date(v.at.getTime() + 25 * 60_000), createdAt: new Date(v.at.getTime() + 20 * 60_000) });
}
for (const v of todayVisits.filter((x) => x.status === 'IN_PROGRESS').slice(0, 1)) {
  const { id: interaction, def } = interactionId('BENZOYL_PEROXIDE', 'TRETINOIN');
  push('interactionAlert', { id: id(), visitId: v.id, treatmentPlanId: null, interactionId: interaction, severity: def.severity, message: `${def.description} ${def.recommendation}`, status: 'OPEN', resolvedAt: null, createdAt: new Date(v.at.getTime() + 15 * 60_000) });
}

// ---------------------------------------------------------------------------
// 13. KHO: nhập hàng + xuất (đơn thuốc, liệu trình) → tồn kho thực tế
// ---------------------------------------------------------------------------
const LOW_STOCK: string[] = ['SOOLANTRA', 'EMLA', 'TCA15', 'PRP_KIT', 'DERMATIX']; // cố ý dưới mức tối thiểu để kiểm tra cảnh báo
const usage = new Map<string, number>();
for (const mv of movements) usage.set(`${mv.kind}:${mv.key}`, (usage.get(`${mv.kind}:${mv.key}`) ?? 0) - mv.qty);
const items: Array<{ kind: 'MED' | 'SUP'; key: string; min: number; cost: number; unit: string }> = [
  ...(Object.keys(med) as MedicineKey[]).map((k) => ({ kind: 'MED' as const, key: k, min: med[k].min, cost: med[k].cost, unit: med[k].unit })),
  ...(Object.keys(sup) as SupplyKey[]).map((k) => ({ kind: 'SUP' as const, key: k, min: sup[k].min, cost: sup[k].cost, unit: sup[k].unit })),
];
const SUPPLIERS = ['Công ty CP Dược phẩm Trung ương Codupha', 'Công ty TNHH Zuellig Pharma Việt Nam', 'Công ty CP Dược liệu TW2 (Phytopharma)', 'Công ty TNHH DKSH Việt Nam', 'Công ty TNHH Thiết bị Y tế Phương Đông'];
for (const it of items) {
  const used = usage.get(`${it.kind}:${it.key}`) ?? 0;
  const low = LOW_STOCK.includes(it.key);
  const targetEnd = low ? Math.max(0, Math.floor(it.min * 0.4)) : Math.ceil(it.min * (1.3 + rand() * 1.5));
  const totalImport = Math.ceil(used + targetEnd);
  const first = Math.ceil(totalImport * 0.55);
  const second = Math.max(0, totalImport - first);
  const supplier = it.kind === 'SUP' ? SUPPLIERS[4] : pick(SUPPLIERS.slice(0, 4));
  const receipt = (n: number) => `PN-2026-${String(n).padStart(4, '0')}`;
  movements.push({ kind: it.kind, key: it.key, qty: first, type: 'IMPORT', refType: 'PURCHASE_RECEIPT', refId: receipt(int(1, 300)), at: vn(WINDOW_START.getUTCFullYear(), new Date(WINDOW_START.getTime() + VN_OFFSET).getUTCMonth() + 1, 2, 9), by: emp.W1.id, notes: `Nhập đầu kỳ từ ${supplier}. Lô ${String.fromCharCode(65 + int(0, 25))}${int(10000, 99999)}, HSD ${int(2027, 2029)}` });
  if (second > 0) movements.push({ kind: it.kind, key: it.key, qty: second, type: 'IMPORT', refType: 'PURCHASE_RECEIPT', refId: receipt(int(301, 600)), at: addDays(startOfToday, -int(40, 110)), by: emp.W1.id, notes: `Nhập bổ sung từ ${supplier}. HSD ${int(2027, 2029)}` });
}
movements.sort((a, b) => a.at.getTime() - b.at.getTime());
const balance = new Map<string, number>();
for (const mv of movements) {
  const k = `${mv.kind}:${mv.key}`;
  const before = balance.get(k) ?? 0;
  const after = Math.round((before + mv.qty) * 100) / 100;
  balance.set(k, after);
  push('inventoryTransaction', { id: id(), medicineId: mv.kind === 'MED' ? med[mv.key as MedicineKey].id : null, supplyId: mv.kind === 'SUP' ? sup[mv.key as SupplyKey].id : null, transactionType: mv.type, quantity: Math.abs(mv.qty), unit: mv.kind === 'MED' ? med[mv.key as MedicineKey].unit : sup[mv.key as SupplyKey].unit, referenceType: mv.refType, referenceId: mv.refId, balanceBefore: before, balanceAfter: after, createdById: mv.by, notes: mv.notes, createdAt: mv.at });
}
for (const r of rows.medicine) { const k = Object.keys(med).find((x) => med[x as MedicineKey].id === r.id)!; r.stock = balance.get(`MED:${k}`) ?? 0; }
for (const r of rows.supply) { const k = Object.keys(sup).find((x) => sup[x as SupplyKey].id === r.id)!; r.stock = balance.get(`SUP:${k}`) ?? 0; }

// Nhật ký đăng nhập gần đây
for (let i = 0; i < 60; i++) {
  const s = pick(Object.values(emp)); const at = new Date(addDays(startOfToday, -int(0, 14)).getTime() + int(7, 17) * 3600_000);
  audit(chance(0.94) ? 'LOGIN_SUCCEEDED' : 'LOGIN_FAILED', 'AUTH', s.accountId, s.accountId, at);
}
for (const p of patients) audit('CREATE_PATIENT', 'Patient', p.id, pick([emp.R1.accountId, emp.R2.accountId]), new Date(firstVisitOf.get(p.id)!.getTime() - 15 * 60_000));

// ---------------------------------------------------------------------------
// GHI VÀO DATABASE
// ---------------------------------------------------------------------------
const ORDER = ['permission', 'role', 'rolePermission', 'clinicFacility', 'department', 'room', 'account', 'accountRole', 'employee', 'workSchedule', 'activeIngredient', 'medicine', 'medicineIngredient', 'ingredientInteraction', 'supply', 'equipment', 'equipmentMaintenance', 'serviceCatalog', 'procedureCatalog', 'consentTemplate', 'treatmentProtocolTemplate', 'protocolStageTemplate', 'protocolStepTemplate', 'protocolStepMaterial', 'aftercareTemplate', 'patient', 'allergy', 'medicalHistory', 'visit', 'medicalRecord', 'clinicalOrder', 'labResult', 'imagingResult', 'prescription', 'prescriptionItem', 'treatmentPlan', 'treatmentStage', 'treatmentStep', 'treatmentSession', 'treatmentImage', 'treatmentConsumption', 'equipmentUsage', 'signedConsent', 'consentAudit', 'invoice', 'invoiceItem', 'payment', 'paymentAllocation', 'followUpPlan', 'appointment', 'notification', 'notificationDelivery', 'interactionAlert', 'inventoryTransaction', 'auditLog'];

/**
 * Database thực tế lệch với prisma/schema.prisma ở 2 bảng (không sửa cấu trúc DB):
 *  - EquipmentMaintenance: DB không có cột "createdAt" → Prisma Client không ghi/đọc được bảng này.
 *  - PaymentAllocation: DB có thêm cột "id" NOT NULL (khóa chính) mà schema không khai báo.
 * Hai bảng này được ghi bằng SQL thuần theo đúng cấu trúc đang có trong DB.
 */
const RAW_TABLES: Record<string, { table: string; columns: string[]; withId?: boolean }> = {
  equipmentMaintenance: { table: 'EquipmentMaintenance', columns: ['id', 'equipmentId', 'performedById', 'maintenanceType', 'scheduledAt', 'completedAt', 'status', 'notes', 'cost'] },
  paymentAllocation: { table: 'PaymentAllocation', columns: ['paymentId', 'invoiceItemId', 'amount'], withId: true },
};
async function rawInsert(spec: { table: string; columns: string[]; withId?: boolean }, data: Row[]) {
  const cols = spec.withId ? ['id', ...spec.columns] : spec.columns;
  for (let i = 0; i < data.length; i += 300) {
    const chunk = data.slice(i, i + 300);
    const params: unknown[] = [];
    const values = chunk.map((r) => `(${cols.map((c) => { params.push(c === 'id' && spec.withId ? id() : r[c] ?? null); return `$${params.length}`; }).join(', ')})`);
    await prisma.$executeRawUnsafe(`INSERT INTO "${spec.table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES ${values.join(', ')}`, ...params);
  }
}

async function main() {
  const missing = Object.keys(rows).filter((k) => !ORDER.includes(k));
  if (missing.length) throw new Error(`Thiếu thứ tự chèn cho: ${missing.join(', ')}`);
  if (DRY_RUN) { console.table(Object.fromEntries(ORDER.map((m) => [m, rows[m]?.length ?? 0]))); return; }
  const tables = await prisma.$queryRawUnsafe<{ table_name: string }[]>(`select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' and table_name <> '_prisma_migrations'`);
  console.log(`Xóa dữ liệu ${tables.length} bảng...`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t.table_name}"`).join(', ')} RESTART IDENTITY CASCADE`);
  for (const model of ORDER) {
    const data = rows[model] ?? [];
    if (RAW_TABLES[model]) { await rawInsert(RAW_TABLES[model], data); console.log(`  ${model.padEnd(28)} ${data.length} (SQL)`); continue; }
    for (let i = 0; i < data.length; i += 500) {
      // @ts-expect-error truy cập delegate động
      await prisma[model].createMany({ data: data.slice(i, i + 500) });
    }
    console.log(`  ${model.padEnd(28)} ${data.length}`);
  }
  console.log('\nTài khoản đăng nhập:');
  console.table(STAFF.map((s) => ({ portal: s.roles.includes('Bác sĩ') ? '/bacsi' : s.pwd === 'reception' ? '/letan' : s.pwd === 'admin' ? '/admin' : '(nhân viên)', username: s.username, password: PASSWORDS[s.pwd], name: s.name, status: s.status ?? 'ACTIVE' })));
  console.log('Bệnh nhân demo (cổng khách hàng: mã BN + SĐT):');
  console.table(plans.slice(0, 5).map((p) => ({ code: p.patient.code, phone: p.patient.phone, name: p.patient.name, plan: p.protocol.def.code, status: p.status })));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
