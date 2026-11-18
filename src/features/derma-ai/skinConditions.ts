/**
 * Danh mục rút gọn để hiển thị thẻ bệnh minh họa trong trợ lý da liễu.
 * Mã ICD-10 trùng với kho tri thức (dermacare-knowledge-api). Hình minh họa là sơ đồ
 * hình thái thương tổn do hệ thống vẽ (SVG), không phải ảnh bệnh nhân thật.
 */
export type Morphology =
  | 'papule' | 'plaque' | 'eczema' | 'pigment' | 'depigment' | 'ring' | 'vesicle'
  | 'wheal' | 'growth' | 'scar' | 'vascular' | 'hair' | 'nail' | 'normal' | 'mole';

export type SkinCondition = { icd: string; name: string; morphology: Morphology; look: string; urgent?: boolean };

const C = (icd: string, name: string, morphology: Morphology, look: string, urgent = false): SkinCondition => ({ icd, name, morphology, look, urgent });

export const SKIN_CONDITIONS: SkinCondition[] = [
  C('L70.0', 'Mụn trứng cá', 'papule', 'Nhân mụn đầu đen, đầu trắng, sẩn đỏ và mụn mủ ở vùng nhiều dầu như trán, má, cằm.'),
  C('L70.1', 'Mụn trứng cá bọc', 'papule', 'Nốt, nang viêm to, đau, dễ để lại sẹo rỗ hoặc sẹo lồi.'),
  C('L90.5', 'Sẹo rỗ sau mụn', 'scar', 'Các vết lõm đáy nhọn, đáy vuông hoặc dạng lăn trên nền da đã hết mụn.'),
  C('L71.9', 'Trứng cá đỏ (Rosacea)', 'vascular', 'Đỏ da vùng trung tâm mặt, giãn mạch li ti, có thể kèm sẩn mủ, không có nhân mụn.'),
  C('L20.9', 'Viêm da cơ địa (chàm)', 'eczema', 'Mảng đỏ, khô, ngứa nhiều, vết gãi ở nếp khuỷu, khoeo, má (trẻ nhỏ).'),
  C('L21.9', 'Viêm da dầu', 'eczema', 'Dát đỏ phủ vảy mỡ vàng nhạt ở cánh mũi, chân mày, da đầu.'),
  C('L23.9', 'Viêm da tiếp xúc dị ứng', 'eczema', 'Đỏ, mụn nước, ngứa rát đúng vị trí tiếp xúc với chất gây dị ứng.'),
  C('L40.0', 'Vảy nến thể mảng', 'plaque', 'Mảng đỏ ranh giới rõ, phủ vảy trắng dày như nến ở khuỷu, gối, da đầu.'),
  C('L50.0', 'Mày đay cấp', 'wheal', 'Sẩn phù màu hồng, ngứa, thay đổi hình dạng và tự lặn trong 24 giờ.', true),
  C('L50.1', 'Mày đay mạn tính', 'wheal', 'Sẩn phù tái đi tái lại gần như hằng ngày trên 6 tuần.'),
  C('L50.9', 'Mề đay', 'wheal', 'Sẩn phù ngứa, nổi rồi lặn nhanh.'),
  C('L80', 'Bạch biến', 'depigment', 'Dát trắng sữa ranh giới rõ, thường đối xứng ở tay, quanh miệng, quanh mắt.'),
  C('B36.0', 'Lang ben', 'depigment', 'Nhiều dát trắng hoặc nâu nhạt có vảy cám mịn ở lưng, ngực, ngứa khi ra mồ hôi.'),
  C('L81.1', 'Nám má', 'pigment', 'Dát nâu bờ không đều, đối xứng hai gò má, trán, đậm lên khi ra nắng.'),
  C('L81.0', 'Tăng sắc tố sau viêm', 'pigment', 'Vết thâm nâu ở vị trí mụn hoặc tổn thương cũ.'),
  C('L81.2', 'Tàn nhang', 'pigment', 'Nhiều đốm nâu nhỏ 1–3 mm trên sống mũi và gò má.'),
  C('B35.4', 'Nấm thân (hắc lào)', 'ring', 'Mảng hình tròn, bờ đỏ có vảy và mụn nước, giữa lành, lan dần ra ngoài.'),
  C('B35.9', 'Nấm da', 'ring', 'Mảng tròn bờ hoạt động, ngứa, lan rộng dần.'),
  C('B35.1', 'Nấm móng', 'nail', 'Móng dày, đổi màu vàng nâu, mủn và tách khỏi giường móng.'),
  C('B86', 'Ghẻ', 'vesicle', 'Sẩn, mụn nước nhỏ ở kẽ ngón tay, cổ tay, rốn; ngứa dữ dội về đêm.'),
  C('B02.9', 'Zona thần kinh', 'vesicle', 'Chùm mụn nước trên nền đỏ chạy thành dải một bên cơ thể, đau rát.', true),
  C('B00.1', 'Herpes môi', 'vesicle', 'Chùm mụn nước nhỏ ở bờ môi, hay tái phát khi mệt mỏi.'),
  C('L30.1', 'Tổ đỉa', 'vesicle', 'Mụn nước sâu như hạt tấm ở rìa ngón tay, lòng bàn tay, rất ngứa.'),
  C('L01.0', 'Chốc', 'vesicle', 'Trợt nông phủ vảy tiết vàng mật ong quanh mũi, miệng ở trẻ nhỏ.'),
  C('L73.9', 'Viêm nang lông', 'papule', 'Mụn mủ nhỏ ở chân lông vùng lưng, mông, đùi.'),
  C('B07', 'Mụn cóc', 'growth', 'Sẩn sừng hóa sần sùi, có chấm đen nhỏ ở ngón tay hoặc gan bàn chân.'),
  C('B08.1', 'U mềm lây', 'growth', 'Sẩn tròn trắng ngà, bóng, lõm ở giữa, hay gặp ở trẻ em.'),
  C('L82', 'Dày sừng tiết bã', 'growth', 'Mảng nâu đen sần sùi như được "dán" lên da ở người lớn tuổi.'),
  C('L91.0', 'Sẹo lồi', 'growth', 'Khối sẹo chắc, đỏ tím, lan rộng ra ngoài vết thương ban đầu.'),
  C('D22.9', 'Nốt ruồi / dày sừng lành tính', 'mole', 'Nốt sắc tố đều màu, bờ rõ, kích thước ổn định.'),
  C('C43.9', 'Ung thư hắc tố (cần khám ngay)', 'mole', 'Nốt ruồi bất đối xứng, bờ nham nhở, nhiều màu, > 6 mm hoặc thay đổi nhanh.', true),
  C('C44.3', 'Ung thư biểu mô tế bào đáy (cần khám)', 'growth', 'Sẩn bóng như ngọc trai, có mạch máu nhỏ, loét lâu lành ở mặt.', true),
  C('L63.9', 'Rụng tóc từng vùng', 'hair', 'Mảng rụng tóc tròn, da đầu nhẵn, không sẹo.'),
  C('L64.9', 'Rụng tóc androgen', 'hair', 'Tóc thưa dần ở đỉnh đầu và hai bên trán.'),
  C('L43.9', 'Lichen phẳng', 'plaque', 'Sẩn phẳng, đa giác, màu tím, có vân trắng mảnh trên bề mặt.'),
  C('L42', 'Vảy phấn hồng Gibert', 'plaque', 'Một mảng báo hiệu rồi nhiều dát hồng có viền vảy xếp hình cây thông ở lưng.'),
  C('L93.0', 'Lupus ban đỏ dạng đĩa', 'plaque', 'Mảng đỏ hình đĩa, vảy dính, teo da ở giữa, nặng hơn khi ra nắng.'),
  C('L27.0', 'Phát ban do thuốc', 'wheal', 'Ban đỏ dạng sởi lan tỏa sau khi dùng thuốc vài ngày.', true),
  C('D18.0', 'Bớt rượu vang / giãn mạch', 'vascular', 'Mảng đỏ hồng phẳng có từ nhỏ hoặc giãn mao mạch dạng sợi.'),
  C('L85.3', 'Khô da', 'eczema', 'Da khô, bong vảy mịn, nứt như sứ rạn ở cẳng chân người lớn tuổi.'),
  C('Z00.0', 'Da bình thường', 'normal', 'Không thấy tổn thương rõ ràng trên ảnh.'),
];

const byIcd = new Map(SKIN_CONDITIONS.map((c) => [c.icd, c]));

/** Tìm theo mã ICD; nếu không có mã chính xác thì lấy theo nhóm (3 ký tự đầu). */
export function findCondition(icd?: string | null): SkinCondition | null {
  if (!icd) return null;
  const code = icd.trim().toUpperCase();
  return byIcd.get(code) ?? SKIN_CONDITIONS.find((c) => c.icd.startsWith(code.slice(0, 3))) ?? null;
}

export const SKIN_CONDITION_CODES = SKIN_CONDITIONS.map((c) => `${c.icd} – ${c.name}`).join('\n');
