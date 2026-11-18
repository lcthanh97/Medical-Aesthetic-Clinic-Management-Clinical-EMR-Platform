/**
 * Phác đồ điều trị mẫu (TreatmentProtocolTemplate) cho các liệu trình da liễu.
 * Thông số kỹ thuật tham khảo QĐ 3999/QĐ-BYT "Hướng dẫn quy trình kỹ thuật chuyên ngành Da liễu"
 * và khuyến cáo của nhà sản xuất thiết bị. Bác sĩ luôn điều chỉnh theo đáp ứng thực tế.
 */
import type { MedicineKey, ProcedureKey, SupplyKey } from './catalog';

export type Material = ['MED', MedicineKey, number, string] | ['SUP', SupplyKey, number, string];
export type StepDef = { proc: ProcedureKey | null; instruction: string; repeat: number; interval: number | null; minutes: number | null; params?: Record<string, string | number>; materials?: Material[] };
export type StageDef = { type: 'ATTACK' | 'MAINTENANCE' | 'RECOVERY'; name: string; goal: string; days: number; notes?: string; steps: StepDef[] };
export type ProtocolDef = { code: string; name: string; description: string; indication: string; contraindication: string; consent: 'LASER' | 'PEEL' | 'INJECTION' | 'ISOTRETINOIN' | 'PHOTOTHERAPY'; stages: StageDef[] };

export const PROTOCOLS: ProtocolDef[] = [
  {
    code: 'PT-ACNE', name: 'Điều trị mụn trứng cá mức độ trung bình kết hợp thủ thuật', consent: 'PEEL',
    description: 'Retinoid bôi + kháng sinh uống ngắn hạn, kết hợp lấy nhân mụn và peel salicylic 30% mỗi 2–3 tuần.',
    indication: 'Mụn trứng cá thông thường mức độ trung bình (L70.0), nhiều nhân mụn và sẩn viêm.',
    contraindication: 'Đang có nhiễm trùng da cấp, herpes hoạt động, dị ứng salicylat, phụ nữ có thai (với peel).',
    stages: [
      { type: 'ATTACK', name: 'Giai đoạn tấn công', goal: 'Giảm ≥ 50% số thương tổn viêm sau 8 tuần', days: 56, steps: [
        { proc: 'EXTRACTION', instruction: 'Làm sạch, xông hơi, lấy nhân mụn bằng dụng cụ vô khuẩn; đắp mặt nạ làm dịu.', repeat: 3, interval: 14, minutes: 45, materials: [['SUP', 'COMEDONE', 2, 'cái'], ['SUP', 'GAUZE', 2, 'gói'], ['SUP', 'GLOVE', 0.02, 'hộp']] },
        { proc: 'PEEL_SA', instruction: 'Peel Salicylic acid 30%, 2–3 lớp, thời gian lưu 3–5 phút đến khi kết tinh trắng; trung hòa bằng nước.', repeat: 3, interval: 14, minutes: 30, params: { 'Nồng độ': 'SA 30%', 'Số lớp': 2, 'Thời gian lưu': '4 phút' }, materials: [['SUP', 'SALICYLIC30', 0.1, 'chai'], ['SUP', 'GAUZE', 1, 'gói']] },
      ] },
      { type: 'MAINTENANCE', name: 'Giai đoạn duy trì', goal: 'Ngăn tái phát, kiểm soát nhân mụn', days: 90, steps: [
        { proc: 'PEEL_SA', instruction: 'Peel duy trì mỗi 4 tuần, kết hợp retinoid bôi tối.', repeat: 2, interval: 28, minutes: 30, params: { 'Nồng độ': 'SA 30%', 'Số lớp': 2 }, materials: [['SUP', 'SALICYLIC30', 0.1, 'chai']] },
      ] },
    ],
  },
  {
    code: 'PT-ISO', name: 'Isotretinoin đường uống cho mụn trứng cá nặng', consent: 'ISOTRETINOIN',
    description: 'Isotretinoin 0.3–0.5 mg/kg/ngày đến tổng liều tích lũy 120–150 mg/kg; theo dõi xét nghiệm hằng tháng.',
    indication: 'Mụn trứng cá nặng, mụn bọc, mụn kháng trị kháng sinh ≥ 3 tháng, mụn để lại sẹo.',
    contraindication: 'Phụ nữ có thai/cho con bú, suy gan, tăng lipid máu nặng, đang dùng tetracyclin hoặc vitamin A.',
    stages: [
      { type: 'ATTACK', name: 'Khởi trị và tăng liều', goal: 'Dung nạp thuốc, giảm nang viêm', days: 60, steps: [
        { proc: null, instruction: 'Khám, xét nghiệm CBC, AST/ALT, mỡ máu, β-hCG (nữ) hằng tháng; đánh giá tác dụng phụ và tâm trạng.', repeat: 2, interval: 30, minutes: 15 },
        { proc: 'DERMOSCOPY', instruction: 'Chụp ảnh chuẩn hóa theo dõi đáp ứng.', repeat: 1, interval: null, minutes: 15 },
      ] },
      { type: 'MAINTENANCE', name: 'Duy trì đến đủ liều tích lũy', goal: 'Đạt tổng liều 120–150 mg/kg', days: 120, steps: [
        { proc: null, instruction: 'Tái khám mỗi 4–6 tuần, điều chỉnh liều theo cân nặng và đáp ứng.', repeat: 4, interval: 30, minutes: 15 },
      ] },
    ],
  },
  {
    code: 'PT-SCAR', name: 'Laser CO2 Fractional kết hợp Subcision điều trị sẹo rỗ', consent: 'LASER',
    description: '4–5 buổi laser CO2 fractional cách 4–6 tuần; subcision cho sẹo lăn ở buổi đầu.',
    indication: 'Sẹo rỗ sau mụn Goodman–Baron độ 2–4, mụn đã ổn định ≥ 6 tháng.',
    contraindication: 'Đang dùng isotretinoin trong 6 tháng, tiền sử sẹo lồi, nhiễm trùng da vùng điều trị, đang mang thai.',
    stages: [
      { type: 'ATTACK', name: 'Tái tạo bề mặt', goal: 'Cải thiện ≥ 50% độ sâu sẹo', days: 150, steps: [
        { proc: 'SUBCISION', instruction: 'Ủ tê EMLA 45 phút, sát khuẩn, dùng kim 18G cắt dải xơ đáy sẹo lăn.', repeat: 1, interval: null, minutes: 45, materials: [['MED', 'EMLA', 1, 'tuýp'], ['SUP', 'NEEDLE_30G', 2, 'cái'], ['SUP', 'STERILE_GLOVE', 1, 'đôi']] },
        { proc: 'CO2_FRACTIONAL', instruction: 'Ủ tê EMLA 60 phút. Laser CO2 fractional chế độ Static, 2 lượt toàn mặt; tăng năng lượng ở vùng sẹo sâu.', repeat: 4, interval: 35, minutes: 60, params: { 'Bước sóng': '10.600 nm', 'Năng lượng': '80–100 mJ', 'Mật độ': '100 spots/cm²', 'Số lượt': 2 }, materials: [['MED', 'EMLA', 1, 'tuýp'], ['SUP', 'EYE_SHIELD', 2, 'cái'], ['SUP', 'GAUZE', 2, 'gói'], ['MED', 'CICAPLAST', 1, 'tuýp']] },
      ] },
      { type: 'RECOVERY', name: 'Phục hồi và đánh giá', goal: 'Phục hồi hàng rào da, đánh giá kết quả', days: 60, steps: [
        { proc: 'DERMOSCOPY', instruction: 'Chụp ảnh chuẩn hóa, so sánh trước – sau.', repeat: 1, interval: null, minutes: 15 },
      ] },
    ],
  },
  {
    code: 'PT-ROSACEA', name: 'Điều trị Rosacea kết hợp laser mạch máu', consent: 'LASER',
    description: 'Ivermectin bôi + doxycyclin liều kháng viêm; laser Vbeam 595nm cho đỏ da, giãn mạch.',
    indication: 'Rosacea thể sẩn mụn mủ và thể giãn mạch – đỏ da.',
    contraindication: 'Rám nắng gần đây, đang dùng thuốc nhạy cảm ánh sáng, có thai.',
    stages: [
      { type: 'ATTACK', name: 'Kiểm soát viêm', goal: 'Hết sẩn, mụn mủ', days: 56, steps: [
        { proc: null, instruction: 'Tái khám đánh giá sẩn mụn mủ, điều chỉnh thuốc bôi.', repeat: 2, interval: 28, minutes: 15 },
      ] },
      { type: 'MAINTENANCE', name: 'Laser mạch máu', goal: 'Giảm đỏ da nền và giãn mạch', days: 120, steps: [
        { proc: 'PDL', instruction: 'Laser Vbeam 595nm không gây bầm (non-purpuric), toàn mặt 2 lượt chồng 10%.', repeat: 3, interval: 42, minutes: 30, params: { 'Bước sóng': '595 nm', 'Spot': '10 mm', 'Năng lượng': '7.5 J/cm²', 'Độ rộng xung': '10 ms', 'DCD': '30/20' }, materials: [['SUP', 'EYE_SHIELD', 2, 'cái'], ['SUP', 'ULTRASOUND_GEL', 0.1, 'chai']] },
      ] },
    ],
  },
  {
    code: 'PT-PSO', name: 'Quang trị liệu NB-UVB cho vảy nến thể mảng', consent: 'PHOTOTHERAPY',
    description: 'NB-UVB 311nm 3 buổi/tuần; liều khởi đầu theo type da, tăng 10–20% mỗi buổi; duy trì giảm dần.',
    indication: 'Vảy nến thể mảng BSA > 10% hoặc kháng trị thuốc bôi.',
    contraindication: 'Tiền sử ung thư da, lupus ban đỏ, bệnh nhạy cảm ánh sáng, đang dùng thuốc nhạy cảm ánh sáng.',
    stages: [
      { type: 'ATTACK', name: 'Giai đoạn tấn công', goal: 'Đạt PASI 75 sau 24–30 buổi', days: 70, steps: [
        { proc: 'NBUVB', instruction: 'Chiếu toàn thân, che mắt và sinh dục. Ghi liều mỗi buổi, theo dõi đỏ da.', repeat: 24, interval: 2, minutes: 15, params: { 'Bước sóng': '311 nm', 'Liều khởi đầu': '0.3 J/cm²', 'Tăng liều': '15%/buổi', 'Liều tối đa': '1.5 J/cm²' } },
      ] },
      { type: 'MAINTENANCE', name: 'Giai đoạn duy trì', goal: 'Duy trì PASI ≤ 3', days: 60, steps: [
        { proc: 'NBUVB', instruction: 'Chiếu 1–2 buổi/tuần với 75% liều cuối giai đoạn tấn công.', repeat: 8, interval: 7, minutes: 15, params: { 'Liều': '75% liều tối đa đạt được' } },
      ] },
    ],
  },
  {
    code: 'PT-VITILIGO', name: 'NB-UVB kết hợp Tacrolimus điều trị bạch biến', consent: 'PHOTOTHERAPY',
    description: 'NB-UVB 2–3 buổi/tuần kết hợp tacrolimus bôi; Excimer cho vùng khó đáp ứng.',
    indication: 'Bạch biến không phân đoạn diện tích > 5% hoặc đang hoạt động.',
    contraindication: 'Tiền sử ung thư da, bệnh nhạy cảm ánh sáng.',
    stages: [
      { type: 'ATTACK', name: 'Ổn định và tái sắc tố', goal: 'Ngừng lan, tái sắc tố ≥ 50% sau 6 tháng', days: 180, steps: [
        { proc: 'NBUVB', instruction: 'Chiếu toàn thân 2 buổi/tuần, liều khởi đầu 0.2 J/cm², tăng 10–20%/buổi đến khi có hồng ban nhẹ.', repeat: 36, interval: 4, minutes: 15, params: { 'Bước sóng': '311 nm', 'Liều khởi đầu': '0.2 J/cm²' } },
        { proc: 'EXCIMER', instruction: 'Chiếu Excimer vùng mu tay, đầu ngón kém đáp ứng.', repeat: 12, interval: 7, minutes: 20, params: { 'Bước sóng': '308 nm', 'Liều': '200–400 mJ/cm²' } },
      ] },
      { type: 'MAINTENANCE', name: 'Duy trì', goal: 'Duy trì sắc tố, phòng tái phát', days: 120, steps: [
        { proc: null, instruction: 'Bôi tacrolimus 2 lần/tuần vùng đã tái sắc tố; tái khám mỗi 2 tháng.', repeat: 2, interval: 60, minutes: 15 },
      ] },
    ],
  },
  {
    code: 'PT-MELASMA', name: 'Laser toning Nd:YAG kết hợp thuốc điều trị nám', consent: 'LASER',
    description: 'Hydroquinon/Acid azelaic bôi + acid tranexamic uống; laser toning 1064nm mỗi 2 tuần × 8 buổi.',
    indication: 'Nám má thể thượng bì hoặc hỗn hợp.',
    contraindication: 'Rám nắng, đang mang thai, tiền sử huyết khối (với acid tranexamic).',
    stages: [
      { type: 'ATTACK', name: 'Giai đoạn tấn công', goal: 'Giảm mMASI ≥ 50%', days: 112, steps: [
        { proc: 'QS_TONING', instruction: 'Laser toning QS Nd:YAG 1064nm năng lượng thấp, 3–5 lượt toàn mặt đến khi hơi hồng nhẹ, không gây đỏ rõ.', repeat: 8, interval: 14, minutes: 30, params: { 'Bước sóng': '1064 nm', 'Spot': '7 mm', 'Năng lượng': '1.6–2.0 J/cm²', 'Tần số': '10 Hz', 'Số lượt': 4 }, materials: [['SUP', 'EYE_SHIELD', 2, 'cái'], ['MED', 'CICAPLAST', 0.1, 'tuýp']] },
        { proc: 'PEEL_GA', instruction: 'Peel Glycolic 35% xen kẽ, thời gian lưu 3 phút.', repeat: 2, interval: 28, minutes: 30, params: { 'Nồng độ': 'GA 35%', 'Thời gian lưu': '3 phút' }, materials: [['SUP', 'GLYCOLIC35', 0.1, 'chai']] },
      ] },
      { type: 'MAINTENANCE', name: 'Giai đoạn duy trì', goal: 'Hạn chế tái phát', days: 120, steps: [
        { proc: 'QS_TONING', instruction: 'Laser toning duy trì mỗi 4–6 tuần.', repeat: 3, interval: 35, minutes: 30, params: { 'Bước sóng': '1064 nm', 'Năng lượng': '1.6 J/cm²' }, materials: [['SUP', 'EYE_SHIELD', 2, 'cái']] },
      ] },
    ],
  },
  {
    code: 'PT-PICO', name: 'Laser Picosecond điều trị tàn nhang – đồi mồi', consent: 'LASER',
    description: '2–3 buổi laser picosecond 532nm cách 4 tuần.',
    indication: 'Tàn nhang, đồi mồi (lentigo), dát cà phê sữa.',
    contraindication: 'Rám nắng, đang mang thai, tiền sử sẹo lồi.',
    stages: [
      { type: 'ATTACK', name: 'Điều trị', goal: 'Làm mờ ≥ 70% thương tổn', days: 90, steps: [
        { proc: 'PICO', instruction: 'Bắn điểm từng thương tổn đến khi trắng xám nhẹ (end-point).', repeat: 3, interval: 30, minutes: 30, params: { 'Bước sóng': '532 nm', 'Spot': '3 mm', 'Năng lượng': '0.7–1.0 J/cm²' }, materials: [['SUP', 'EYE_SHIELD', 2, 'cái'], ['MED', 'CICAPLAST', 0.2, 'tuýp']] },
      ] },
    ],
  },
  {
    code: 'PT-WART', name: 'Áp nitơ lỏng điều trị mụn cóc', consent: 'LASER',
    description: 'Áp nitơ lỏng 2 chu kỳ đông – tan, nhắc lại mỗi 2–3 tuần; đốt laser CO2 nếu kháng trị.',
    indication: 'Mụn cóc thông thường, mụn cóc gan bàn chân.',
    contraindication: 'Rối loạn tuần hoàn ngoại vi, bệnh Raynaud, cryoglobulin máu.',
    stages: [
      { type: 'ATTACK', name: 'Điều trị', goal: 'Sạch thương tổn', days: 63, steps: [
        { proc: 'CRYO', instruction: 'Gọt sừng, áp nitơ lỏng mỗi thương tổn 2 chu kỳ x 10–15 giây, viền đông 1–2 mm.', repeat: 4, interval: 21, minutes: 15, params: { 'Kỹ thuật': 'Xịt mở', 'Chu kỳ': 2, 'Thời gian đông': '10–15 giây' }, materials: [['SUP', 'LIQUID_N2', 0.3, 'lít'], ['SUP', 'BLADE15', 1, 'cái']] },
      ] },
    ],
  },
  {
    code: 'PT-HAIR', name: 'Tiêm PRP kết hợp Minoxidil điều trị rụng tóc androgen', consent: 'INJECTION',
    description: 'PRP tự thân 4 buổi cách 4 tuần + minoxidil 5% hằng ngày.',
    indication: 'Rụng tóc androgen Norwood II–IV, Ludwig I–II.',
    contraindication: 'Giảm tiểu cầu, rối loạn đông máu, nhiễm trùng da đầu, đang dùng thuốc chống đông.',
    stages: [
      { type: 'ATTACK', name: 'Liệu trình PRP', goal: 'Giảm rụng, tăng mật độ tóc', days: 120, steps: [
        { proc: 'PRP_HAIR', instruction: 'Lấy 20ml máu, ly tâm 2 lần thu 4ml PRP; tiêm trong da vùng thưa tóc, mỗi điểm 0.05–0.1ml cách 1 cm.', repeat: 4, interval: 28, minutes: 60, params: { 'Thể tích PRP': '4 ml', 'Ly tâm': '1500 vòng × 10 phút + 3000 vòng × 10 phút' }, materials: [['SUP', 'PRP_KIT', 1, 'bộ'], ['SUP', 'NEEDLE_30G', 6, 'cái'], ['SUP', 'SYRINGE_1ML', 4, 'cái'], ['MED', 'EMLA', 1, 'tuýp']] },
      ] },
      { type: 'MAINTENANCE', name: 'Duy trì', goal: 'Duy trì mật độ tóc', days: 180, steps: [
        { proc: 'PRP_HAIR', instruction: 'PRP nhắc lại mỗi 3–6 tháng.', repeat: 1, interval: 120, minutes: 60, materials: [['SUP', 'PRP_KIT', 1, 'bộ']] },
      ] },
    ],
  },
  {
    code: 'PT-KELOID', name: 'Tiêm Triamcinolon trong thương tổn điều trị sẹo lồi', consent: 'INJECTION',
    description: 'Triamcinolon 20–40 mg/ml tiêm trong sẹo mỗi 4 tuần + silicone gel.',
    indication: 'Sẹo lồi, sẹo phì đại.',
    contraindication: 'Nhiễm trùng tại chỗ, dị ứng triamcinolon.',
    stages: [
      { type: 'ATTACK', name: 'Làm xẹp sẹo', goal: 'Giảm thể tích sẹo ≥ 50%', days: 120, steps: [
        { proc: 'ILK', instruction: 'Tiêm Triamcinolon 40mg/ml (pha 1:1 với lidocain) vào trong sẹo đến khi bạc màu, tối đa 1ml/buổi.', repeat: 4, interval: 28, minutes: 20, params: { 'Nồng độ': '20–40 mg/ml', 'Thể tích tối đa': '1 ml' }, materials: [['MED', 'KENACORT', 1, 'lọ'], ['SUP', 'SYRINGE_1ML', 1, 'cái'], ['SUP', 'NEEDLE_30G', 1, 'cái']] },
      ] },
    ],
  },
  {
    code: 'PT-VASCULAR', name: 'Laser Pulsed Dye điều trị bớt rượu vang – giãn mạch', consent: 'LASER',
    description: 'Laser Vbeam 595nm 5–8 buổi cách 6–8 tuần.',
    indication: 'Bớt rượu vang, u máu phẳng, giãn mao mạch.',
    contraindication: 'Rám nắng, đang dùng isotretinoin, có thai.',
    stages: [
      { type: 'ATTACK', name: 'Điều trị', goal: 'Làm nhạt màu ≥ 50%', days: 240, steps: [
        { proc: 'PDL', instruction: 'Laser 595nm gây bầm nhẹ (purpuric), chồng xung 10%.', repeat: 5, interval: 49, minutes: 30, params: { 'Bước sóng': '595 nm', 'Spot': '7 mm', 'Năng lượng': '9–11 J/cm²', 'Độ rộng xung': '1.5 ms' }, materials: [['SUP', 'EYE_SHIELD', 2, 'cái'], ['MED', 'CICAPLAST', 0.2, 'tuýp']] },
      ] },
    ],
  },
];

export const AFTERCARE_TEMPLATES = [
  { name: 'Chăm sóc sau laser / IPL', scope: 'CLINIC', appliesTo: 'Laser CO2, Picosecond, Q-switched, PDL, IPL', homeCare: 'Chườm mát 10–15 phút nếu nóng rát. Rửa mặt nhẹ bằng nước muối sinh lý 24 giờ đầu. Thoa kem phục hồi (Cicaplast B5) 3 lần/ngày. Chống nắng SPF ≥ 50 sau 48 giờ.', avoid: 'Không cạy mài, không xông hơi, bơi lội, tập gym ra mồ hôi nhiều trong 5 ngày. Ngừng retinoid, AHA/BHA 7 ngày.', warningSigns: 'Phồng rộp, chảy dịch vàng, đau tăng, sốt — liên hệ phòng khám ngay.' },
  { name: 'Chăm sóc sau peel hóa học', scope: 'CLINIC', appliesTo: 'Peel Salicylic, Glycolic, TCA', homeCare: 'Dưỡng ẩm nhiều lần trong ngày, để da tự bong.', avoid: 'Không cạy vảy, không tẩy tế bào chết, không trang điểm 48 giờ.', warningSigns: 'Mụn nước, trợt da, sẫm màu bất thường.' },
  { name: 'Theo dõi khi dùng Isotretinoin', scope: 'CLINIC', appliesTo: 'Mụn trứng cá nặng điều trị isotretinoin', homeCare: 'Dưỡng ẩm môi, nhỏ nước mắt nhân tạo. Uống thuốc sau bữa ăn có chất béo.', avoid: 'Không mang thai, không hiến máu, không uống rượu, không dùng vitamin A, tetracyclin. Không wax lông, laser trong thời gian điều trị.', warningSigns: 'Đau đầu dữ dội, nhìn mờ, đau bụng, vàng da, trầm cảm, có ý nghĩ tự hại — ngừng thuốc và báo ngay.' },
  { name: 'Chăm sóc viêm da cơ địa tại nhà', scope: 'DEPARTMENT', appliesTo: 'Viêm da cơ địa trẻ em và người lớn', homeCare: 'Tắm nước ấm < 10 phút, thoa dưỡng ẩm trong 3 phút sau tắm. Mặc đồ cotton.', avoid: 'Len, lông thú, xà phòng diệt khuẩn, nước quá nóng.', warningSigns: 'Chảy dịch vàng, mụn nước lan nhanh, sốt — có thể bội nhiễm.' },
];
