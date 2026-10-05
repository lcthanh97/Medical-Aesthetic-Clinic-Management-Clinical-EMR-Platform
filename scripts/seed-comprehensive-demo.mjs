import 'dotenv/config';
import pg from 'pg';

const apply = process.argv.includes('--apply');
const N = 24;
const now = new Date('2026-10-05T08:00:00+07:00');
const at = (days = 0, hours = 0) => new Date(now.getTime() + (days * 24 + hours) * 3600_000);
const id = (type, index) => `demo-${type}-${String(index + 1).padStart(3, '0')}`;
const cycle = (items, index) => items[index % items.length];

const data = new Map();
const add = (table, row) => {
  if (!data.has(table)) data.set(table, []);
  data.get(table).push(row);
};

const facilityNames = [
  'Cơ sở Trung tâm', 'Cơ sở Quận 1', 'Cơ sở Quận 3', 'Cơ sở Phú Nhuận',
  'Cơ sở Bình Thạnh', 'Cơ sở Thủ Đức', 'Cơ sở Tân Bình', 'Cơ sở Quận 7',
];
const departmentNames = [
  'Khám Da liễu tổng quát', 'Điều trị mụn', 'Rối loạn sắc tố', 'Vảy nến và bệnh viêm',
  'Da liễu nhi', 'Da liễu thẩm mỹ', 'Laser và ánh sáng', 'Xét nghiệm da liễu',
];
const vietnameseNames = [
  'Nguyễn Văn An', 'Trần Thị Minh Anh', 'Lê Hoàng Bảo', 'Phạm Ngọc Châu', 'Võ Thành Đạt',
  'Đặng Thu Hà', 'Bùi Gia Hân', 'Đỗ Quang Huy', 'Hồ Khánh Linh', 'Ngô Tuấn Minh',
  'Dương Thảo My', 'Lý Quốc Nam', 'Huỳnh Kim Ngân', 'Phan Thiên Phúc', 'Mai Thanh Tâm',
  'Nguyễn Bảo Trân', 'Trần Anh Tú', 'Lê Hải Yến', 'Phạm Đức Anh', 'Võ Ngọc Bích',
  'Đặng Minh Khang', 'Bùi Phương Lan', 'Đỗ Nhật Quang', 'Hồ Thùy Trang',
];
const diagnoses = [
  ['Mụn trứng cá viêm mức độ vừa', 'Theo dõi đáp ứng và nguy cơ sẹo'],
  ['Viêm da cơ địa', 'Tổn thương khô, ngứa, tái phát'],
  ['Viêm da tiếp xúc dị ứng', 'Khai thác dị nguyên và chăm sóc hàng rào da'],
  ['Vảy nến thể mảng', 'Đánh giá BSA và ảnh hưởng chất lượng sống'],
  ['Nám má hỗn hợp', 'Theo dõi sắc tố và chống nắng'],
  ['Tăng sắc tố sau viêm', 'Theo dõi tiến triển bằng ảnh chuẩn hóa'],
  ['Nấm da thân', 'Xác nhận lâm sàng và soi tươi khi cần'],
  ['Lang ben', 'Tổn thương dát đổi màu thân mình'],
  ['Chàm tiết bã', 'Tổn thương vùng da dầu'],
  ['Mày đay mạn tính', 'Đánh giá yếu tố khởi phát'],
  ['Rosacea thể sẩn mủ', 'Theo dõi đỏ da và yếu tố kích hoạt'],
  ['Rụng tóc từng vùng', 'Đánh giá diện tích và tiến triển'],
];
const allergies = [
  ['Penicillin', 'Mày đay', 'HIGH'], ['Cephalosporin', 'Phát ban', 'MODERATE'],
  ['Sulfonamide', 'Phát ban dát sẩn', 'HIGH'], ['Latex', 'Viêm da tiếp xúc', 'MODERATE'],
  ['Nickel', 'Chàm tiếp xúc', 'MODERATE'], ['Hương liệu', 'Kích ứng da', 'LOW'],
  ['Chlorhexidine', 'Ngứa và đỏ da', 'HIGH'], ['Băng dính y tế', 'Đỏ da khu trú', 'LOW'],
];

for (let i = 0; i < N; i++) {
  add('ClinicFacility', { id: id('facility', i), name: `${cycle(facilityNames, i)} ${Math.floor(i / facilityNames.length) + 1}`, createdAt: at(-180 - i), updatedAt: at(-10) });
  add('Department', { id: id('department', i), facilityId: id('facility', i), name: cycle(departmentNames, i) });
  add('Room', { id: id('room', i), departmentId: id('department', i), name: `Phòng khám ${String(i + 1).padStart(2, '0')}` });
}
for (let i = N; i < N * 2; i++) add('Room', { id: id('room', i), departmentId: id('department', i % N), name: `Phòng thủ thuật ${String(i - N + 1).padStart(2, '0')}` });

const roleNames = ['Bác sĩ da liễu', 'Bác sĩ điều trị', 'Điều dưỡng', 'Kỹ thuật viên laser', 'Kỹ thuật viên xét nghiệm', 'Dược sĩ', 'Lễ tân', 'Thu ngân', 'Quản lý cơ sở', 'Quản trị hệ thống', 'Kiểm soát nhiễm khuẩn', 'Quản lý kho', 'Chăm sóc khách hàng', 'Bác sĩ tư vấn', 'Bác sĩ nội trú', 'Điều phối điều trị', 'Kỹ thuật viên hình ảnh', 'Nhân viên hồ sơ', 'Kế toán', 'Kiểm toán nội bộ', 'Quản lý chất lượng', 'Nghiên cứu lâm sàng', 'Trợ lý bác sĩ', 'Giám sát vận hành'];
const permissionCodes = ['DASHBOARD_VIEW', 'PATIENT_READ', 'PATIENT_WRITE', 'VISIT_READ', 'VISIT_WRITE', 'EMR_READ', 'EMR_WRITE', 'PRESCRIPTION_READ', 'PRESCRIPTION_WRITE', 'TREATMENT_READ', 'TREATMENT_WRITE', 'PROTOCOL_READ', 'PROTOCOL_WRITE', 'INVENTORY_READ', 'INVENTORY_WRITE', 'CONSENT_READ', 'CONSENT_WRITE', 'BILLING_READ', 'BILLING_WRITE', 'SCHEDULE_READ', 'SCHEDULE_WRITE', 'LAB_READ', 'LAB_WRITE', 'IMAGE_READ', 'IMAGE_WRITE', 'REPORT_READ', 'REPORT_EXPORT', 'AUDIT_READ', 'ADMIN_USERS', 'ADMIN_ROLES'];
for (let i = 0; i < N; i++) add('Role', { id: id('role', i), name: roleNames[i] });
for (let i = 0; i < permissionCodes.length; i++) add('Permission', { id: id('permission', i), code: permissionCodes[i] });

for (let i = 0; i < 36; i++) {
  add('Account', { id: id('account', i), username: `demo.user${String(i + 1).padStart(2, '0')}`, passwordHash: '$2b$12$DEMOONLY.NOT.A.REAL.PASSWORD.HASH', email: `demo.user${i + 1}@clinic.example`, status: i % 11 === 0 ? 'LOCKED' : 'ACTIVE', createdAt: at(-120 + i), updatedAt: at(-2) });
  add('Employee', { id: id('employee', i), accountId: id('account', i), departmentId: id('department', i % N), employeeCode: `NV-${String(i + 1).padStart(4, '0')}`, fullName: i < vietnameseNames.length ? `BS. ${vietnameseNames[i]}` : `Nhân viên ${String(i + 1).padStart(2, '0')}` });
  add('RefreshToken', { id: id('refresh', i), accountId: id('account', i), tokenHash: `demo-revocable-token-hash-${i + 1}`, expiresAt: at(30, i), revokedAt: i % 9 === 0 ? at(-1) : null, createdAt: at(-3) });
  add('AccountRole', { accountId: id('account', i), roleId: id('role', i % N) });
  add('AccountRole', { accountId: id('account', i), roleId: id('role', (i + 7) % N) });
}
for (let i = 0; i < 72; i++) add('RolePermission', { roleId: id('role', i % N), permissionId: id('permission', i % permissionCodes.length) });
for (let i = 0; i < 72; i++) add('WorkSchedule', { id: id('schedule', i), employeeId: id('employee', i % 36), workDate: at(Math.floor(i / 12)), startTime: at(Math.floor(i / 12), 0), endTime: at(Math.floor(i / 12), 8) });

for (let i = 0; i < 60; i++) {
  add('Patient', { id: id('patient', i), patientCode: `BN-${String(1245 + i).padStart(6, '0')}`, fullName: `${cycle(vietnameseNames, i)}${i >= vietnameseNames.length ? ` ${Math.floor(i / vietnameseNames.length) + 1}` : ''}`, dateOfBirth: new Date(Date.UTC(1965 + (i % 40), i % 12, (i % 27) + 1)), phone: `09${String(10000000 + i * 137).slice(-8)}` });
  const diagnosis = cycle(diagnoses, i);
  add('MedicalHistory', { id: id('history', i), patientId: id('patient', i), type: 'DERMATOLOGY', content: `${diagnosis[0]}. ${diagnosis[1]}.`, diagnosisDate: at(-180 + i) });
}
for (let i = 0; i < 36; i++) {
  const allergy = cycle(allergies, i);
  add('Allergy', { id: id('allergy', i), patientId: id('patient', i), substance: allergy[0], reaction: allergy[1], severity: allergy[2], diagnosisDate: at(-365 + i * 3) });
}
for (let i = 0; i < 80; i++) add('Appointment', { id: id('appointment', i), patientId: id('patient', i % 60), roomId: id('room', i % (N * 2)), employeeId: id('employee', i % 36), scheduledAt: at(Math.floor(i / 12), (i % 12) * 0.75), status: cycle(['CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'], i) });
for (let i = 0; i < 120; i++) add('Visit', { id: id('visit', i), patientId: id('patient', i % 60), employeeId: id('employee', i % 36), roomId: id('room', i % (N * 2)), visitDate: at(-Math.floor(i / 20), (i % 10) * 0.75), status: cycle(['WAITING', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED', 'COMPLETED'], i) });
for (let i = 0; i < 60; i++) {
  const diagnosis = cycle(diagnoses, i);
  add('MedicalRecord', { id: id('record', i), visitId: id('visit', i), preliminaryDiagnosis: diagnosis[0], finalDiagnosis: diagnosis[0], notes: `${diagnosis[1]}. Dữ liệu mô phỏng phục vụ kiểm thử giao diện.` });
}

const services = [
  ['KDL01', 'Khám da liễu tổng quát', 'CONSULTATION', 250000], ['KDL02', 'Khám chuyên sâu mụn', 'CONSULTATION', 350000],
  ['XN01', 'Soi tươi vi nấm', 'LAB', 180000], ['XN02', 'Công thức máu', 'LAB', 150000],
  ['XN03', 'Chức năng gan', 'LAB', 220000], ['XN04', 'Lipid máu', 'LAB', 240000],
  ['HA01', 'Chụp ảnh da chuẩn hóa', 'IMAGING', 200000], ['HA02', 'Soi da kỹ thuật số', 'IMAGING', 300000],
  ['TT01', 'Chiếu ánh sáng NB-UVB', 'PROCEDURE', 450000], ['TT02', 'Laser mạch máu', 'PROCEDURE', 1800000],
  ['TT03', 'Laser sắc tố', 'PROCEDURE', 2200000], ['TT04', 'Thay da hóa học nông', 'PROCEDURE', 900000],
];
for (let i = 0; i < 40; i++) {
  const service = cycle(services, i);
  add('ServiceCatalog', { id: id('service', i), code: `${service[0]}-${String(Math.floor(i / services.length) + 1).padStart(2, '0')}`, name: service[1], category: service[2], basePrice: service[3] + Math.floor(i / services.length) * 50000, active: i % 17 !== 0, createdAt: at(-200 + i), updatedAt: at(-5) });
}
for (let i = 0; i < 80; i++) add('ClinicalOrder', { id: id('order', i), visitId: id('visit', i), serviceId: id('service', i % 40), orderedById: id('employee', i % 36), type: i % 2 ? 'LAB' : 'IMAGING', status: cycle(['ORDERED', 'PAID', 'IN_PROGRESS', 'COMPLETED'], i), orderedAt: at(-Math.floor(i / 20), i % 8) });
const labTests = [['Công thức máu', 'Trong giới hạn tham chiếu', null], ['ALT', '28', 'U/L'], ['AST', '24', 'U/L'], ['Triglyceride', '1.35', 'mmol/L'], ['Cholesterol toàn phần', '4.62', 'mmol/L'], ['KOH vi nấm', 'Không thấy sợi nấm', null]];
for (let i = 0; i < 40; i++) { const test = cycle(labTests, i); add('LabResult', { id: id('lab', i), orderId: id('order', i), testName: test[0], result: test[1], unit: test[2] }); }
const imagingTypes = ['Ảnh da chuẩn hóa', 'Soi da kỹ thuật số', 'Dermatoscopy', 'Wood lamp'];
for (let i = 0; i < 40; i++) add('ImagingResult', { id: id('imaging', i), orderId: id('order', 40 + i), imagingType: cycle(imagingTypes, i), conclusion: `${cycle(diagnoses, i)[0]}; lưu ảnh để so sánh theo thời gian.`, fileUrl: `https://placehold.co/1200x800/e7eef7/284b63?text=Dermatology+Result+${i + 1}` });

const procedures = [
  ['PROC-ACNE-CONSULT', 'Đánh giá mụn chuẩn hóa', 'ACNE', 30, 350000, false],
  ['PROC-COMEDONE', 'Lấy nhân mụn vô khuẩn', 'ACNE', 45, 650000, true],
  ['PROC-CHEMICAL-PEEL', 'Thay da hóa học nông', 'AESTHETIC', 40, 900000, true],
  ['PROC-IPL', 'Ánh sáng xung cường độ cao', 'LIGHT', 45, 1600000, true],
  ['PROC-NBUVB', 'Quang trị liệu NB-UVB', 'PHOTOTHERAPY', 25, 450000, true],
  ['PROC-PIGMENT-LASER', 'Laser điều trị sắc tố', 'LASER', 50, 2200000, true],
  ['PROC-VASCULAR-LASER', 'Laser mạch máu', 'LASER', 50, 2400000, true],
  ['PROC-DERMOSCOPY', 'Soi da tổn thương sắc tố', 'DIAGNOSTIC', 20, 300000, false],
];
for (let i = 0; i < N; i++) { const p = cycle(procedures, i); add('ProcedureCatalog', { id: id('procedure', i), code: `${p[0]}-${Math.floor(i / procedures.length) + 1}`, name: p[1], category: p[2], description: `Quy trình mô phỏng có bước sàng lọc, ghi nhận thông số và theo dõi phản ứng.`, defaultDurationMinutes: p[3], basePrice: p[4], requiresConsent: p[5], isActive: true, createdAt: at(-120 + i), updatedAt: at(-4) }); }

const protocolNames = ['Kiểm soát mụn viêm', 'Phục hồi hàng rào da', 'Theo dõi nám má', 'Điều trị tăng sắc tố sau viêm', 'Quản lý vảy nến thể mảng', 'Quang trị liệu NB-UVB', 'Theo dõi rosacea', 'Chăm sóc sau laser'];
for (let i = 0; i < N; i++) {
  add('TreatmentProtocolTemplate', { id: id('protocol', i), code: `DL-${String(i + 1).padStart(3, '0')}`, name: `${cycle(protocolNames, i)} v${Math.floor(i / protocolNames.length) + 1}`, description: 'Mẫu phác đồ mô phỏng cho kiểm thử quy trình; bác sĩ phải cá thể hóa trước khi áp dụng.', indication: cycle(diagnoses, i)[0], contraindication: 'Đánh giá thai kỳ, dị ứng, bệnh kèm và thuốc đang dùng trước khi thực hiện.', version: 1, status: 'ACTIVE', createdById: id('employee', i % 36), createdAt: at(-100 + i), updatedAt: at(-3) });
  for (let s = 0; s < 3; s++) {
    const stageIndex = i * 3 + s;
    add('ProtocolStageTemplate', { id: id('protocol-stage', stageIndex), protocolId: id('protocol', i), stageType: ['ATTACK', 'RECOVERY', 'MAINTENANCE'][s], name: ['Kiểm soát hoạt động', 'Phục hồi', 'Duy trì'][s], orderNo: s + 1, goal: ['Giảm tổn thương hoạt động', 'Phục hồi dung nạp da', 'Hạn chế tái phát'][s], durationDays: [28, 21, 90][s], notes: 'Điều chỉnh theo đáp ứng lâm sàng.', createdAt: at(-100 + i), updatedAt: at(-3) });
    for (let step = 0; step < 2; step++) {
      const stepIndex = stageIndex * 2 + step;
      add('ProtocolStepTemplate', { id: id('protocol-step', stepIndex), stageTemplateId: id('protocol-stage', stageIndex), procedureId: id('procedure', stepIndex % N), orderNo: step + 1, instruction: step === 0 ? 'Đánh giá lâm sàng và ghi nhận ảnh chuẩn hóa.' : 'Thực hiện can thiệp theo chỉ định đã xác nhận.', repeatCount: s === 2 ? 3 : 1, intervalDays: s === 2 ? 30 : 14, plannedDurationMinutes: 30 + step * 15, defaultParameters: { demo: true, reviewRequired: true }, createdAt: at(-90 + i), updatedAt: at(-3) });
    }
  }
}

const ingredientNames = [
  'Adapalene', 'Tretinoin', 'Tazarotene', 'Trifarotene', 'Benzoyl peroxide', 'Azelaic acid',
  'Clindamycin', 'Erythromycin', 'Doxycycline', 'Minocycline', 'Sarecycline', 'Isotretinoin',
  'Vitamin A', 'Hydrocortisone', 'Betamethasone valerate', 'Mometasone furoate', 'Tacrolimus', 'Pimecrolimus',
  'Calcipotriol', 'Salicylic acid', 'Urea', 'Ketoconazole', 'Miconazole', 'Terbinafine',
  'Fluconazole', 'Itraconazole', 'Permethrin', 'Benzyl benzoate', 'Metronidazole', 'Ivermectin',
  'Spironolactone', 'Methotrexate', 'Folic acid', 'Cyclosporine', 'Acitretin', 'Apremilast',
  'Warfarin', 'Ferrous sulfate', 'Calcium carbonate', 'Magnesium hydroxide', 'Aluminium hydroxide',
  'Amoxicillin', 'Trimethoprim', 'Sulfamethoxazole', 'Phenytoin', 'Carbamazepine', 'Ethinyl estradiol', 'Norethindrone',
];
for (let i = 0; i < ingredientNames.length; i++) add('ActiveIngredient', { id: id('ingredient', i), code: `HC-${String(i + 1).padStart(3, '0')}`, name: ingredientNames[i], description: 'Hoạt chất tham chiếu cho dữ liệu mô phỏng; không thay thế thông tin kê đơn được phê duyệt.', status: 'ACTIVE', createdAt: at(-150 + i), updatedAt: at(-2) });

const medicineForms = ['gel', 'kem', 'dung dịch', 'viên', 'viên nang', 'thuốc mỡ'];
for (let i = 0; i < 48; i++) {
  const ingredient = ingredientNames[i];
  const concentrations = i < 6 ? ['0,1%', '0,025%', '0,05%', '0,005%', '2,5%', '15%'][i] : (i % 3 === 0 ? '1%' : i % 3 === 1 ? '10 mg' : '100 mg');
  add('Medicine', { id: id('medicine', i), name: `${ingredient} ${concentrations} – ${cycle(medicineForms, i)}`, unit: i % 3 === 0 ? 'tuýp' : i % 3 === 1 ? 'viên' : 'hộp', stock: 80 + i * 7, unitCost: 18000 + i * 3500, minStock: 20 + (i % 5) * 5, status: i % 19 === 0 ? 'INACTIVE' : 'ACTIVE', createdAt: at(-120 + i), updatedAt: at(-1) });
  add('MedicineIngredient', { medicineId: id('medicine', i), ingredientId: id('ingredient', i), concentration: i < 6 ? [0.1, 0.025, 0.05, 0.005, 2.5, 15][i] : (i % 3 === 0 ? 1 : i % 3 === 1 ? 10 : 100), concentrationUnit: i < 6 || i % 3 === 0 ? '%' : 'mg' });
}

const interactionPairs = [
  [11, 8, 'CONTRAINDICATED', 'CONTRAINDICATED', 'Phối hợp isotretinoin với tetracycline làm tăng nguy cơ tăng áp lực nội sọ.', 'Tránh phối hợp; bác sĩ lựa chọn phương án khác.'],
  [11, 9, 'CONTRAINDICATED', 'CONTRAINDICATED', 'Phối hợp isotretinoin với tetracycline làm tăng nguy cơ tăng áp lực nội sọ.', 'Tránh phối hợp; bác sĩ lựa chọn phương án khác.'],
  [11, 12, 'ADDITIVE_TOXICITY', 'HIGH', 'Vitamin A có thể làm tăng phản ứng bất lợi liên quan retinoid.', 'Tránh bổ sung vitamin A khi dùng isotretinoin.'],
  [8, 37, 'REDUCED_ABSORPTION', 'MODERATE', 'Sắt đường uống làm giảm hấp thu doxycycline.', 'Tách thời điểm dùng và theo dõi đáp ứng.'],
  [8, 38, 'REDUCED_ABSORPTION', 'MODERATE', 'Calcium làm giảm hấp thu doxycycline.', 'Tách thời điểm dùng.'],
  [8, 39, 'REDUCED_ABSORPTION', 'MODERATE', 'Magnesium làm giảm hấp thu doxycycline.', 'Tách thời điểm dùng.'],
  [8, 40, 'REDUCED_ABSORPTION', 'MODERATE', 'Antacid chứa nhôm làm giảm hấp thu doxycycline.', 'Tách thời điểm dùng.'],
  [8, 36, 'BLEEDING_RISK', 'HIGH', 'Tetracycline có thể làm giảm hoạt tính prothrombin và tăng tác dụng chống đông.', 'Theo dõi đông máu và điều chỉnh bởi bác sĩ.'],
  [8, 41, 'ANTAGONISM', 'MODERATE', 'Kháng sinh kìm khuẩn có thể ảnh hưởng tác dụng diệt khuẩn của penicillin.', 'Tránh phối hợp nếu không có đánh giá chuyên môn.'],
  [9, 11, 'CONTRAINDICATED', 'CONTRAINDICATED', 'Minocycline và isotretinoin có liên quan nguy cơ tăng áp lực nội sọ.', 'Tránh phối hợp.'],
  [8, 44, 'LOWER_EXPOSURE', 'MODERATE', 'Phenytoin có thể làm giảm thời gian bán thải doxycycline.', 'Theo dõi đáp ứng và để bác sĩ điều chỉnh.'],
  [8, 45, 'LOWER_EXPOSURE', 'MODERATE', 'Carbamazepine có thể làm giảm thời gian bán thải doxycycline.', 'Theo dõi đáp ứng và để bác sĩ điều chỉnh.'],
  [8, 46, 'CONTRACEPTIVE_EFFECT', 'MODERATE', 'Nhãn tetracycline cảnh báo khả năng giảm hiệu quả thuốc tránh thai đường uống.', 'Tư vấn biện pháp phù hợp theo đánh giá bác sĩ.'],
  [9, 37, 'REDUCED_ABSORPTION', 'MODERATE', 'Sắt đường uống có thể làm giảm hấp thu minocycline.', 'Tách thời điểm dùng.'],
  [9, 38, 'REDUCED_ABSORPTION', 'MODERATE', 'Calcium có thể làm giảm hấp thu minocycline.', 'Tách thời điểm dùng.'],
  [9, 39, 'REDUCED_ABSORPTION', 'MODERATE', 'Magnesium có thể làm giảm hấp thu minocycline.', 'Tách thời điểm dùng.'],
  [9, 40, 'REDUCED_ABSORPTION', 'MODERATE', 'Antacid chứa nhôm có thể làm giảm hấp thu minocycline.', 'Tách thời điểm dùng.'],
  [9, 36, 'BLEEDING_RISK', 'HIGH', 'Tetracycline có thể làm giảm hoạt tính prothrombin ở người dùng chống đông.', 'Theo dõi INR và điều chỉnh bởi bác sĩ.'],
  [9, 41, 'ANTAGONISM', 'MODERATE', 'Kháng sinh kìm khuẩn có thể ảnh hưởng tác dụng diệt khuẩn của penicillin.', 'Tránh phối hợp nếu chưa có đánh giá chuyên môn.'],
  [9, 44, 'LOWER_EXPOSURE', 'MODERATE', 'Phenytoin có thể làm giảm phơi nhiễm tetracycline.', 'Theo dõi đáp ứng.'],
  [9, 45, 'LOWER_EXPOSURE', 'MODERATE', 'Carbamazepine có thể làm giảm phơi nhiễm tetracycline.', 'Theo dõi đáp ứng.'],
  [10, 37, 'REDUCED_ABSORPTION', 'MODERATE', 'Sắt có thể làm giảm hấp thu kháng sinh nhóm tetracycline.', 'Tách thời điểm dùng theo nhãn thuốc.'],
  [10, 38, 'REDUCED_ABSORPTION', 'MODERATE', 'Calcium có thể làm giảm hấp thu kháng sinh nhóm tetracycline.', 'Tách thời điểm dùng theo nhãn thuốc.'],
  [10, 39, 'REDUCED_ABSORPTION', 'MODERATE', 'Magnesium có thể làm giảm hấp thu kháng sinh nhóm tetracycline.', 'Tách thời điểm dùng theo nhãn thuốc.'],
  [10, 40, 'REDUCED_ABSORPTION', 'MODERATE', 'Antacid chứa nhôm có thể làm giảm hấp thu kháng sinh nhóm tetracycline.', 'Tách thời điểm dùng theo nhãn thuốc.'],
  [34, 12, 'ADDITIVE_RETINOID_TOXICITY', 'HIGH', 'Acitretin và vitamin A có thể gây độc tính retinoid cộng gộp.', 'Tránh bổ sung vitamin A.'],
  [34, 8, 'INTRACRANIAL_HYPERTENSION', 'CONTRAINDICATED', 'Retinoid đường uống và doxycycline có thể làm tăng áp lực nội sọ.', 'Tránh phối hợp.'],
  [34, 9, 'INTRACRANIAL_HYPERTENSION', 'CONTRAINDICATED', 'Retinoid đường uống và minocycline có thể làm tăng áp lực nội sọ.', 'Tránh phối hợp.'],
  [34, 10, 'INTRACRANIAL_HYPERTENSION', 'CONTRAINDICATED', 'Retinoid đường uống và sarecycline thuộc nhóm phối hợp cần tránh.', 'Tránh phối hợp.'],
  [24, 36, 'INCREASED_ANTICOAGULATION', 'HIGH', 'Fluconazole có thể làm tăng tác dụng chống đông của warfarin.', 'Theo dõi INR chặt chẽ.'],
];
for (let i = 0; i < interactionPairs.length; i++) { const x = interactionPairs[i]; add('IngredientInteraction', { id: id('interaction', i), ingredientAId: id('ingredient', x[0]), ingredientBId: id('ingredient', x[1]), interactionType: x[2], severity: x[3], description: x[4], recommendation: x[5], minIntervalHours: ['REDUCED_ABSORPTION'].includes(x[2]) ? 3 : null, status: 'ACTIVE', createdAt: at(-60 + i), updatedAt: at(-1) }); }

const supplies = ['Găng nitrile', 'Gạc vô khuẩn', 'Bông y tế', 'Kim tiêm 30G', 'Ống tiêm 1 ml', 'Khẩu trang y tế', 'Dung dịch NaCl 0,9%', 'Gel siêu âm', 'Kính bảo hộ laser', 'Miếng che mắt laser', 'Băng dính y tế', 'Băng cuộn co giãn', 'Que lấy mẫu', 'Lam kính', 'Ống nghiệm EDTA', 'Ống nghiệm sinh hóa', 'Đầu tip pipette', 'Tấm trải thủ thuật', 'Áo choàng dùng một lần', 'Mũ trùm tóc', 'Túi chất thải y tế', 'Hộp vật sắc nhọn', 'Khăn lau sát khuẩn', 'Dung dịch vệ sinh bề mặt'];
for (let i = 0; i < 48; i++) add('Supply', { id: id('supply', i), name: `${cycle(supplies, i)} ${Math.floor(i / supplies.length) + 1}`, unit: cycle(['cái', 'gói', 'hộp', 'chai'], i), stock: 150 + i * 9, unitCost: 1500 + i * 450, minStock: 30 + i % 10, status: 'ACTIVE', createdAt: at(-110 + i), updatedAt: at(-1) });
for (let i = 0; i < 144; i++) add('ProtocolStepMaterial', { id: id('protocol-material', i), stepTemplateId: id('protocol-step', i), medicineId: i % 2 === 0 ? id('medicine', i % 48) : null, supplyId: i % 2 === 1 ? id('supply', i % 48) : null, plannedQuantity: i % 2 === 0 ? 1 : 2, unit: i % 2 === 0 ? cycle(['tuýp', 'viên', 'hộp'], i) : cycle(['cái', 'gói', 'chai'], i), notes: 'Định mức tham khảo, xác nhận lại trước buổi điều trị.', createdAt: at(-80 + i / 10) });

for (let i = 0; i < 48; i++) {
  add('TreatmentPlan', { id: id('plan', i), patientId: id('patient', i % 60), visitId: id('visit', i), protocolTemplateId: id('protocol', i % N), name: cycle(protocolNames, i), diagnosisSummary: cycle(diagnoses, i)[0], goal: cycle(diagnoses, i)[1], status: cycle(['DRAFT', 'ACTIVE', 'ACTIVE', 'COMPLETED'], i), version: 1, createdById: id('employee', i % 36), startDate: at(-30 + i), expectedEndDate: at(60 + i), completedAt: i % 4 === 3 ? at(-1) : null, notes: 'Phác đồ mô phỏng; bác sĩ cần xác nhận mọi chỉ định.', createdAt: at(-45 + i), updatedAt: at(-1) });
  for (let s = 0; s < 3; s++) {
    const stageIndex = i * 3 + s;
    const planStatus = cycle(['DRAFT', 'ACTIVE', 'ACTIVE', 'COMPLETED'], i);
    const stageStatus = planStatus === 'COMPLETED' ? 'COMPLETED' : planStatus === 'ACTIVE' && s === 0 ? 'IN_PROGRESS' : 'PENDING';
    add('TreatmentStage', { id: id('stage', stageIndex), planId: id('plan', i), stageType: ['ATTACK', 'RECOVERY', 'MAINTENANCE'][s], name: ['Kiểm soát hoạt động', 'Phục hồi', 'Duy trì'][s], orderNo: s + 1, goal: ['Giảm tổn thương', 'Phục hồi da', 'Duy trì kết quả'][s], plannedStartDate: at(-30 + i + s * 28), plannedEndDate: at(-3 + i + s * 28), actualStartDate: s === 0 ? at(-30 + i) : null, actualEndDate: stageStatus === 'COMPLETED' ? at(-3 + i) : null, status: stageStatus, notes: 'Theo dõi đáp ứng và tác dụng không mong muốn.', createdAt: at(-45 + i), updatedAt: at(-1) });
    for (let step = 0; step < 2; step++) {
      const stepIndex = stageIndex * 2 + step;
      add('TreatmentStep', { id: id('step', stepIndex), stageId: id('stage', stageIndex), procedureId: id('procedure', stepIndex % N), orderNo: step + 1, content: step === 0 ? 'Khám, chụp ảnh và lượng giá mức độ.' : 'Thực hiện thủ thuật/điều trị đã được xác nhận.', repeatCount: 1 + s, intervalDays: 14 + s * 7, plannedDurationMinutes: 30 + step * 15, defaultParameters: { demo: true, physicianReview: true }, status: stageStatus === 'COMPLETED' ? 'COMPLETED' : step === 0 && stageStatus === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING', createdAt: at(-44 + i), updatedAt: at(-1) });
    }
  }
}

for (let i = 0; i < 120; i++) add('TreatmentSession', { id: id('session', i), stageId: id('stage', (i % 48) * 3), stepId: id('step', (i % 48) * 6 + (i % 2)), visitId: id('visit', i), sessionNo: Math.floor(i / 48) + 1, scheduledAt: at(Math.floor(i / 24), i % 8), startedAt: i % 4 > 0 ? at(-1, i % 8) : null, completedAt: i % 4 === 2 ? at(-1, i % 8 + 1) : null, performedById: id('employee', i % 36), treatmentArea: cycle(['Mặt', 'Lưng', 'Da đầu', 'Cẳng tay', 'Thân mình'], i), clinicalNotes: 'Ghi nhận mô phỏng: dung nạp thủ thuật, không có bất thường cấp.', patientResponse: cycle(['Dung nạp tốt', 'Đỏ da nhẹ thoáng qua', 'Cải thiện tổn thương viêm'], i), adverseReaction: i % 13 === 0 ? 'Đỏ da nhẹ, tự hết sau theo dõi' : null, status: cycle(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED'], i), createdAt: at(-20 + i / 10), updatedAt: at(-1) });
for (let i = 0; i < 100; i++) add('TreatmentImage', { id: id('treatment-image', i), planId: id('plan', i % 48), sessionId: id('session', i % 120), visitId: id('visit', i), imageUrl: `https://placehold.co/1200x800/e7eef7/284b63?text=Clinical+Demo+${String(i + 1).padStart(3, '0')}`, imageType: 'CLINICAL_STANDARDIZED', phase: cycle(['BEFORE', 'DURING', 'AFTER', 'FOLLOW_UP'], i), bodyArea: cycle(['Mặt chính diện', 'Má trái', 'Má phải', 'Lưng', 'Da đầu'], i), description: 'Ảnh giữ chỗ cho dữ liệu mô phỏng, không phải hình bệnh nhân thật.', capturedAt: at(-20 + i / 8), capturedById: id('employee', i % 36), createdAt: at(-20 + i / 8) });

for (let i = 0; i < 60; i++) {
  add('Prescription', { id: id('prescription', i), visitId: id('visit', i), employeeId: id('employee', i % 36), status: cycle(['DRAFT', 'ISSUED', 'DISPENSED'], i) });
  for (let j = 0; j < 3; j++) add('PrescriptionItem', { id: id('prescription-item', i * 3 + j), prescriptionId: id('prescription', i), medicineId: id('medicine', (i * 3 + j) % 48), quantity: 1 + j, dosage: j === 0 ? 'Dữ liệu demo – bác sĩ xác nhận liều và đường dùng.' : 'Dữ liệu demo – xem hướng dẫn chuyên môn trước khi phát hành.' });
}
for (let i = 0; i < 120; i++) add('TreatmentConsumption', { id: id('consumption', i), sessionId: id('session', i), medicineId: i % 2 === 0 ? id('medicine', i % 48) : null, supplyId: i % 2 === 1 ? id('supply', i % 48) : null, plannedQuantity: 1 + i % 3, actualQuantity: 1 + i % 3, unit: i % 2 === 0 ? 'đơn vị' : 'cái', unitCost: 10000 + i * 50, totalCost: (1 + i % 3) * (10000 + i * 50), recordedById: id('employee', i % 36), createdAt: at(-10 + i / 20) });
for (let i = 0; i < 192; i++) { const medicine = i % 2 === 0; const qty = 5 + i % 10; add('InventoryTransaction', { id: id('inventory-transaction', i), medicineId: medicine ? id('medicine', i % 48) : null, supplyId: medicine ? null : id('supply', i % 48), transactionType: cycle(['IMPORT', 'TREATMENT_USE', 'ADJUSTMENT_IN', 'RETURN'], i), quantity: qty, unit: medicine ? 'đơn vị' : 'cái', referenceType: i % 2 ? 'TREATMENT_SESSION' : 'PURCHASE_RECEIPT', referenceId: i % 2 ? id('session', i % 120) : `PN-${String(i + 1).padStart(5, '0')}`, balanceBefore: 100 + i, balanceAfter: 100 + i + (i % 4 === 1 ? -qty : qty), createdById: id('employee', i % 36), notes: 'Giao dịch kho mô phỏng có thể truy vết.', createdAt: at(-30 + i / 12) }); }

const equipmentNames = ['Laser Nd:YAG Q-switched', 'Laser fractional CO2', 'Laser mạch máu', 'Máy IPL', 'Máy NB-UVB', 'Máy soi da', 'Đèn Wood', 'Máy điện di'];
for (let i = 0; i < N; i++) { add('Equipment', { id: id('equipment', i), name: `${cycle(equipmentNames, i)} ${Math.floor(i / equipmentNames.length) + 1}`, serial: `DL-EQ-${String(i + 1).padStart(5, '0')}`, status: i % 11 === 0 ? 'MAINTENANCE' : 'AVAILABLE' }); add('EquipmentMaintenance', { id: id('maintenance', i), equipmentId: id('equipment', i), performedById: id('employee', i % 36), maintenanceType: cycle(['PREVENTIVE', 'CALIBRATION', 'SAFETY_CHECK'], i), scheduledAt: at(i - 12), completedAt: i < 12 ? at(i - 11) : null, status: i < 12 ? 'COMPLETED' : 'SCHEDULED', notes: 'Kiểm tra an toàn, vệ sinh và hiệu chuẩn theo kế hoạch.', cost: 350000 + i * 25000 }); }
for (let i = 0; i < 60; i++) add('EquipmentUsage', { id: id('equipment-usage', i), equipmentId: id('equipment', i % N), visitId: id('visit', i), treatmentSessionId: id('session', i), operatorId: id('employee', i % 36), startedAt: at(-5 + i / 12), endedAt: at(-5 + i / 12, 0.5), parameters: { demo: true, fluence: 6 + i % 4, spotMm: 4 + i % 3, physicianConfirmed: true }, createdAt: at(-5 + i / 12) });

const consentNames = ['Đồng ý khám và lưu hồ sơ điện tử', 'Đồng ý chụp ảnh lâm sàng', 'Đồng ý điều trị laser', 'Đồng ý thay da hóa học', 'Đồng ý quang trị liệu', 'Đồng ý thủ thuật mụn'];
for (let i = 0; i < N; i++) add('ConsentTemplate', { id: id('consent-template', i), name: `${cycle(consentNames, i)} – phiên bản ${Math.floor(i / consentNames.length) + 1}`, version: Math.floor(i / consentNames.length) + 1, content: 'Nội dung mô phỏng: đã được giải thích mục tiêu, lựa chọn thay thế, nguy cơ thường gặp và quyền rút lại đồng ý.' });
for (let i = 0; i < 40; i++) { add('SignedConsent', { id: id('signed-consent', i), templateId: id('consent-template', i % N), visitId: id('visit', i), treatmentPlanId: id('plan', i % 48), planVersion: 1, signedByPatientId: id('patient', i % 60), signedByEmployeeId: id('employee', i % 36), signerName: cycle(vietnameseNames, i), signatureUrl: `https://placehold.co/480x180/f7fafd/284b63?text=Demo+Signature+${i + 1}`, documentUrl: `https://example.invalid/demo-consent/${i + 1}.pdf`, signedAt: at(-10 + i / 8), createdAt: at(-10 + i / 8) }); add('ConsentAudit', { id: id('consent-audit', i), signedConsentId: id('signed-consent', i), accountId: id('account', i % 36), action: cycle(['VIEWED', 'SIGNED', 'VERIFIED'], i), evidenceUrl: `https://example.invalid/demo-evidence/${i + 1}.json`, ipAddress: `10.20.${Math.floor(i / 254)}.${(i % 254) + 1}`, createdAt: at(-10 + i / 8) }); }

for (let i = 0; i < 60; i++) { const total = 350000 + (i % 8) * 175000; add('Invoice', { id: id('invoice', i), visitId: id('visit', i), total, status: cycle(['DRAFT', 'ISSUED', 'PAID'], i) }); add('Payment', { id: id('payment', i), invoiceId: id('invoice', i), amount: total, method: cycle(['CASH', 'CARD', 'BANK_TRANSFER', 'E_WALLET'], i), paidAt: at(-5 + i / 12) }); for (let j = 0; j < 2; j++) { const itemTotal = total / 2; add('InvoiceItem', { id: id('invoice-item', i * 2 + j), invoiceId: id('invoice', i), serviceId: id('service', (i * 2 + j) % 40), clinicalOrderId: id('order', (i * 2 + j) % 80), itemType: j === 0 ? 'CONSULTATION' : 'CLINICAL_SERVICE', description: j === 0 ? 'Phí khám chuyên khoa' : cycle(services, i)[1], quantity: 1, unitPrice: itemTotal, discount: 0, total: itemTotal }); } add('PaymentAllocation', { id: id('allocation', i), paymentId: id('payment', i), invoiceItemId: id('invoice-item', i * 2), amount: total / 2 }); }

for (let i = 0; i < 80; i++) { add('Notification', { id: id('notification', i), recipient: id('patient', i % 60), type: cycle(['APPOINTMENT_REMINDER', 'LAB_RESULT_READY', 'TREATMENT_SESSION_REMINDER', 'PRESCRIPTION_READY'], i), content: cycle(['Nhắc lịch khám da liễu đã xác nhận.', 'Kết quả cận lâm sàng đã sẵn sàng.', 'Nhắc buổi điều trị sắp tới.', 'Đơn thuốc đã được bác sĩ phát hành.'], i), status: cycle(['SCHEDULED', 'SENT', 'DELIVERED'], i), scheduledAt: at(i / 20) }); add('NotificationDelivery', { id: id('notification-delivery', i), notificationId: id('notification', i), channel: cycle(['SMS', 'EMAIL', 'IN_APP'], i), providerMessageId: `demo-message-${i + 1}`, status: cycle(['QUEUED', 'SENT', 'DELIVERED'], i), attemptedAt: at(i / 20), deliveredAt: i % 3 === 2 ? at(i / 20, 0.05) : null, errorMessage: null }); }
for (let i = 0; i < 30; i++) add('InteractionAlert', { id: id('interaction-alert', i), visitId: id('visit', i), treatmentPlanId: id('plan', i % 48), interactionId: id('interaction', i), severity: interactionPairs[i][3], message: interactionPairs[i][4], status: i % 4 === 0 ? 'RESOLVED' : 'OPEN', createdAt: at(-3 + i / 12), resolvedAt: i % 4 === 0 ? at(-2 + i / 12) : null });
for (let i = 0; i < 100; i++) add('AuditLog', { id: id('audit', i), accountId: id('account', i % 36), action: cycle(['READ', 'CREATE', 'UPDATE', 'EXPORT'], i), entity: cycle(['Patient', 'Visit', 'TreatmentPlan', 'Prescription', 'Invoice'], i), entityId: i % 5 === 0 ? id('patient', i % 60) : id('visit', i % 120), ipAddress: `10.30.${Math.floor(i / 254)}.${(i % 254) + 1}`, createdAt: at(-7 + i / 20) });

const quote = (name) => `"${name.replaceAll('"', '""')}"`;
const insertMany = async (client, table, rows) => {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const params = [];
  const values = rows.map((row, rowIndex) => {
    const placeholders = columns.map((column, columnIndex) => {
      let value = row[column];
      if (value !== null && typeof value === 'object' && !(value instanceof Date)) value = JSON.stringify(value);
      params.push(value);
      return `$${rowIndex * columns.length + columnIndex + 1}`;
    });
    return `(${placeholders.join(', ')})`;
  });
  await client.query(`INSERT INTO ${quote(table)} (${columns.map(quote).join(', ')}) VALUES ${values.join(', ')} ON CONFLICT DO NOTHING`, params);
};

const client = new pg.Client({ connectionString: process.env.DIRECT_URL });
try {
  await client.connect();
  await client.query('BEGIN');
  for (const [table, rows] of data) await insertMany(client, table, rows);

  const tables = [...data.keys()];
  const counts = {};
  for (const table of tables) {
    const result = await client.query(`SELECT count(*)::int AS count FROM ${quote(table)}`);
    counts[table] = result.rows[0].count;
    if (counts[table] < 21) throw new Error(`${table} has only ${counts[table]} rows; expected at least 21.`);
  }

  if (apply) {
    await client.query('COMMIT');
    console.log(JSON.stringify({ mode: 'applied', tableCount: tables.length, counts }, null, 2));
  } else {
    await client.query('ROLLBACK');
    console.log(JSON.stringify({ mode: 'dry-run', tableCount: tables.length, counts }, null, 2));
  }
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  throw error;
} finally {
  await client.end().catch(() => undefined);
}
