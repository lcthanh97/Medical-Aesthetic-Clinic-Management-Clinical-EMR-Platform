/**
 * Danh mục chuẩn cho phòng khám chuyên khoa Da liễu.
 *
 * Nguồn tham khảo khi biên soạn:
 *  - Bảng phân loại bệnh tật quốc tế ICD-10 (WHO), chương XII "Bệnh da và mô dưới da" (L00–L99)
 *    và các mã nhiễm trùng da liên quan (A/B), u da (C/D).
 *  - Bộ Y tế, "Hướng dẫn chẩn đoán và điều trị các bệnh Da liễu" (QĐ 75/QĐ-BYT, 13/01/2015)
 *    và "Hướng dẫn quy trình kỹ thuật chuyên ngành Da liễu" (QĐ 3999/QĐ-BYT, 2015).
 *  - Dược thư Quốc gia Việt Nam (2018) cho liều dùng, chống chỉ định, tương tác thuốc.
 *  - Tên biệt dược là các sản phẩm đang lưu hành tại Việt Nam; giá là mức tham khảo
 *    tại nhà thuốc/phòng khám tư nhân năm 2026 (VND), không phải giá niêm yết chính thức.
 *
 * Toàn bộ thông tin bệnh nhân trong seed là giả lập; danh mục y khoa là dữ liệu thật.
 */

// ---------------------------------------------------------------------------
// HOẠT CHẤT
// ---------------------------------------------------------------------------
export const INGREDIENTS = {
  ISOTRETINOIN: ['Isotretinoin', 'Retinoid đường uống, ức chế tuyến bã; gây quái thai — bắt buộc tránh thai.'],
  TRETINOIN: ['Tretinoin', 'Retinoid bôi tại chỗ, tiêu nhân mụn, chống lão hóa.'],
  ADAPALENE: ['Adapalene', 'Retinoid thế hệ 3 bôi tại chỗ, điều trị mụn trứng cá.'],
  ACITRETIN: ['Acitretin', 'Retinoid đường uống điều trị vảy nến, rối loạn sừng hóa.'],
  BENZOYL_PEROXIDE: ['Benzoyl peroxide', 'Kháng khuẩn C. acnes, tiêu nhân mụn nhẹ.'],
  CLINDAMYCIN: ['Clindamycin', 'Kháng sinh nhóm lincosamid.'],
  DOXYCYCLINE: ['Doxycyclin', 'Kháng sinh nhóm tetracyclin, kháng viêm trong mụn và rosacea.'],
  MINOCYCLINE: ['Minocyclin', 'Kháng sinh nhóm tetracyclin.'],
  AZELAIC_ACID: ['Acid azelaic', 'Kháng khuẩn, giảm tăng sắc tố, điều trị mụn và rosacea.'],
  METRONIDAZOLE: ['Metronidazol', 'Kháng khuẩn/kháng ký sinh trùng; dạng gel điều trị rosacea.'],
  IVERMECTIN: ['Ivermectin', 'Diệt Demodex (bôi) và ký sinh trùng (uống).'],
  HYDROCORTISONE: ['Hydrocortison', 'Corticoid bôi nhóm VII (rất nhẹ).'],
  DESONIDE: ['Desonid', 'Corticoid bôi nhóm VI (nhẹ).'],
  MOMETASONE: ['Mometason furoat', 'Corticoid bôi nhóm IV (trung bình).'],
  BETAMETHASONE: ['Betamethason dipropionat', 'Corticoid bôi nhóm II–III (mạnh).'],
  CLOBETASOL: ['Clobetasol propionat', 'Corticoid bôi nhóm I (rất mạnh).'],
  TACROLIMUS: ['Tacrolimus', 'Ức chế calcineurin bôi tại chỗ.'],
  CALCIPOTRIOL: ['Calcipotriol', 'Dẫn chất vitamin D3 điều trị vảy nến.'],
  SALICYLIC_ACID: ['Acid salicylic', 'Tiêu sừng, BHA.'],
  METHOTREXATE: ['Methotrexat', 'Ức chế miễn dịch, kháng chuyển hóa folat.'],
  CETIRIZINE: ['Cetirizin', 'Kháng histamin H1 thế hệ 2.'],
  LEVOCETIRIZINE: ['Levocetirizin', 'Kháng histamin H1 thế hệ 2.'],
  FEXOFENADINE: ['Fexofenadin', 'Kháng histamin H1 thế hệ 2, không an thần.'],
  DESLORATADINE: ['Desloratadin', 'Kháng histamin H1 thế hệ 2.'],
  BILASTINE: ['Bilastin', 'Kháng histamin H1 thế hệ 2.'],
  CHLORPHENIRAMINE: ['Clorpheniramin', 'Kháng histamin H1 thế hệ 1, gây buồn ngủ.'],
  PREDNISOLONE: ['Prednisolon', 'Corticoid toàn thân.'],
  METHYLPREDNISOLONE: ['Methylprednisolon', 'Corticoid toàn thân.'],
  TERBINAFINE: ['Terbinafin', 'Kháng nấm nhóm allylamin.'],
  ITRACONAZOLE: ['Itraconazol', 'Kháng nấm nhóm triazol, ức chế mạnh CYP3A4.'],
  FLUCONAZOLE: ['Fluconazol', 'Kháng nấm nhóm triazol.'],
  KETOCONAZOLE: ['Ketoconazol', 'Kháng nấm nhóm imidazol (dùng tại chỗ).'],
  CLOTRIMAZOLE: ['Clotrimazol', 'Kháng nấm nhóm imidazol (dùng tại chỗ).'],
  PERMETHRIN: ['Permethrin', 'Diệt ký sinh trùng ghẻ, chấy.'],
  ACYCLOVIR: ['Aciclovir', 'Kháng virus Herpes.'],
  VALACYCLOVIR: ['Valaciclovir', 'Tiền chất aciclovir, sinh khả dụng cao.'],
  FUSIDIC_ACID: ['Acid fusidic', 'Kháng sinh bôi điều trị nhiễm tụ cầu.'],
  MUPIROCIN: ['Mupirocin', 'Kháng sinh bôi điều trị chốc, nhiễm khuẩn da nông.'],
  CEPHALEXIN: ['Cefalexin', 'Kháng sinh cephalosporin thế hệ 1.'],
  AMOX_CLAV: ['Amoxicilin + Acid clavulanic', 'Kháng sinh nhóm penicilin phối hợp.'],
  TRANEXAMIC_ACID: ['Acid tranexamic', 'Chống tiêu fibrin; giảm tăng sắc tố trong nám.'],
  HYDROQUINONE: ['Hydroquinon', 'Ức chế tyrosinase, làm giảm sắc tố.'],
  MINOXIDIL: ['Minoxidil', 'Kích thích mọc tóc.'],
  UREA: ['Urea', 'Dưỡng ẩm, tiêu sừng.'],
  HYDROXYCHLOROQUINE: ['Hydroxycloroquin', 'Kháng sốt rét, điều hòa miễn dịch trong lupus.'],
  SPIRONOLACTONE: ['Spironolacton', 'Kháng androgen, lợi tiểu giữ kali.'],
  ZINC: ['Kẽm gluconat', 'Bổ sung kẽm; hỗ trợ điều trị mụn.'],
  TRIAMCINOLONE: ['Triamcinolon acetonid', 'Corticoid tiêm trong thương tổn.'],
  SILICONE: ['Silicone gel', 'Phòng và điều trị sẹo phì đại, sẹo lồi.'],
  LIDOCAINE_PRILOCAINE: ['Lidocain + Prilocain', 'Gây tê bề mặt trước thủ thuật.'],
  PANTHENOL: ['Dexpanthenol', 'Phục hồi hàng rào bảo vệ da.'],
  SUNSCREEN: ['Bộ lọc chống nắng phổ rộng', 'Màng lọc UVA/UVB.'],
  IMIQUIMOD: ['Imiquimod', 'Điều hòa miễn dịch tại chỗ.'],
  VITAMIN_A: ['Vitamin A (Retinol)', 'Vitamin tan trong dầu.'],
} as const satisfies Record<string, readonly [string, string]>;
export type IngredientKey = keyof typeof INGREDIENTS;

// ---------------------------------------------------------------------------
// THUỐC & SẢN PHẨM (biệt dược lưu hành tại VN)
// [tên hiển thị, đơn vị, giá vốn/đơn vị (VND), tồn tối thiểu, hoạt chất[[key, nồng độ, đơn vị]]]
// ---------------------------------------------------------------------------
type MedDef = { name: string; unit: string; cost: number; min: number; ing: Array<[IngredientKey, number | null, string | null]> };
const m = (name: string, unit: string, cost: number, min: number, ...ing: Array<[IngredientKey, number | null, string | null]>): MedDef => ({ name, unit, cost, min, ing });

export const MEDICINES = {
  ACNOTIN10: m('Acnotin 10 (Isotretinoin 10mg)', 'viên', 9500, 200, ['ISOTRETINOIN', 10, 'mg']),
  ACNOTIN20: m('Acnotin 20 (Isotretinoin 20mg)', 'viên', 14000, 150, ['ISOTRETINOIN', 20, 'mg']),
  DOXY100: m('Doxycyclin 100mg (Doxycyclin Stada)', 'viên', 1200, 300, ['DOXYCYCLINE', 100, 'mg']),
  MINO100: m('Minocyclin 100mg (Minocin)', 'viên', 6500, 100, ['MINOCYCLINE', 100, 'mg']),
  DIFFERIN: m('Differin Gel 0.1% 30g (Adapalene)', 'tuýp', 245000, 15, ['ADAPALENE', 0.1, '%']),
  EPIDUO: m('Epiduo Gel 15g (Adapalene 0.1% + Benzoyl peroxide 2.5%)', 'tuýp', 320000, 10, ['ADAPALENE', 0.1, '%'], ['BENZOYL_PEROXIDE', 2.5, '%']),
  BENZAC: m('Benzac AC 5% 60g (Benzoyl peroxide)', 'tuýp', 185000, 10, ['BENZOYL_PEROXIDE', 5, '%']),
  KLENZIT_C: m('Klenzit-C 15g (Adapalene 0.1% + Clindamycin 1%)', 'tuýp', 115000, 20, ['ADAPALENE', 0.1, '%'], ['CLINDAMYCIN', 1, '%']),
  DALACIN_T: m('Dalacin T 1% 30ml (Clindamycin)', 'chai', 145000, 10, ['CLINDAMYCIN', 1, '%']),
  SKINOREN: m('Skinoren Cream 20% 30g (Acid azelaic)', 'tuýp', 275000, 10, ['AZELAIC_ACID', 20, '%']),
  RETIN_A: m('Retin-A 0.025% 20g (Tretinoin)', 'tuýp', 230000, 8, ['TRETINOIN', 0.025, '%']),
  ROZEX: m('Rozex Gel 0.75% 30g (Metronidazol)', 'tuýp', 220000, 8, ['METRONIDAZOLE', 0.75, '%']),
  SOOLANTRA: m('Soolantra 1% 30g (Ivermectin)', 'tuýp', 650000, 5, ['IVERMECTIN', 1, '%']),
  HYDROCORTISONE: m('Hydrocortison 1% 15g', 'tuýp', 35000, 20, ['HYDROCORTISONE', 1, '%']),
  DESONIDE: m('Desonide 0.05% 15g (Desowen)', 'tuýp', 85000, 15, ['DESONIDE', 0.05, '%']),
  ELOMET: m('Elomet Cream 0.1% 15g (Mometason furoat)', 'tuýp', 75000, 20, ['MOMETASONE', 0.1, '%']),
  DIPROSONE: m('Diprosone Cream 0.05% 15g (Betamethason)', 'tuýp', 55000, 15, ['BETAMETHASONE', 0.05, '%']),
  DIPROSALIC: m('Diprosalic Ointment 15g (Betamethason + Acid salicylic 3%)', 'tuýp', 78000, 10, ['BETAMETHASONE', 0.05, '%'], ['SALICYLIC_ACID', 3, '%']),
  DERMOVATE: m('Dermovate Cream 0.05% 15g (Clobetasol)', 'tuýp', 62000, 10, ['CLOBETASOL', 0.05, '%']),
  PROTOPIC01: m('Protopic 0.1% 10g (Tacrolimus)', 'tuýp', 380000, 8, ['TACROLIMUS', 0.1, '%']),
  PROTOPIC003: m('Protopic 0.03% 10g (Tacrolimus)', 'tuýp', 330000, 8, ['TACROLIMUS', 0.03, '%']),
  DAIVOBET: m('Daivobet Ointment 15g (Calcipotriol + Betamethason)', 'tuýp', 420000, 6, ['CALCIPOTRIOL', 50, 'mcg/g'], ['BETAMETHASONE', 0.5, 'mg/g']),
  MTX: m('Methotrexat 2.5mg (Methotrexate Belmed)', 'viên', 2800, 100, ['METHOTREXATE', 2.5, 'mg']),
  NEOTIGASON: m('Neotigason 25mg (Acitretin)', 'viên', 35000, 50, ['ACITRETIN', 25, 'mg']),
  CETIRIZINE: m('Cetirizin 10mg', 'viên', 900, 500, ['CETIRIZINE', 10, 'mg']),
  XYZAL: m('Xyzal 5mg (Levocetirizin)', 'viên', 6500, 200, ['LEVOCETIRIZINE', 5, 'mg']),
  TELFAST180: m('Telfast HD 180mg (Fexofenadin)', 'viên', 8500, 200, ['FEXOFENADINE', 180, 'mg']),
  AERIUS: m('Aerius 5mg (Desloratadin)', 'viên', 7800, 150, ['DESLORATADINE', 5, 'mg']),
  BILAXTEN: m('Bilaxten 20mg (Bilastin)', 'viên', 11000, 100, ['BILASTINE', 20, 'mg']),
  CHLORPHENIRAMINE: m('Clorpheniramin 4mg', 'viên', 300, 500, ['CHLORPHENIRAMINE', 4, 'mg']),
  PREDNISOLONE: m('Prednisolon 5mg', 'viên', 600, 500, ['PREDNISOLONE', 5, 'mg']),
  MEDROL16: m('Medrol 16mg (Methylprednisolon)', 'viên', 4200, 200, ['METHYLPREDNISOLONE', 16, 'mg']),
  LAMISIL_TAB: m('Lamisil 250mg (Terbinafin)', 'viên', 18000, 100, ['TERBINAFINE', 250, 'mg']),
  LAMISIL_CREAM: m('Lamisil Cream 1% 15g (Terbinafin)', 'tuýp', 95000, 15, ['TERBINAFINE', 1, '%']),
  SPORAL: m('Sporal 100mg (Itraconazol)', 'viên', 15500, 150, ['ITRACONAZOLE', 100, 'mg']),
  FLUCONAZOLE: m('Fluconazol 150mg', 'viên', 9000, 100, ['FLUCONAZOLE', 150, 'mg']),
  NIZORAL_CREAM: m('Nizoral Cream 2% 10g (Ketoconazol)', 'tuýp', 45000, 20, ['KETOCONAZOLE', 2, '%']),
  NIZORAL_SHAMPOO: m('Nizoral Shampoo 2% 50ml (Ketoconazol)', 'chai', 95000, 10, ['KETOCONAZOLE', 2, '%']),
  CANESTEN: m('Canesten Cream 1% 20g (Clotrimazol)', 'tuýp', 45000, 15, ['CLOTRIMAZOLE', 1, '%']),
  PERMETHRIN: m('Permethrin 5% Cream 30g', 'tuýp', 85000, 15, ['PERMETHRIN', 5, '%']),
  ACYCLOVIR400: m('Aciclovir 400mg (Acyclovir Stada)', 'viên', 1500, 300, ['ACYCLOVIR', 400, 'mg']),
  VALTREX: m('Valtrex 500mg (Valaciclovir)', 'viên', 22000, 100, ['VALACYCLOVIR', 500, 'mg']),
  ACYCLOVIR_CREAM: m('Aciclovir Cream 5% 5g', 'tuýp', 35000, 15, ['ACYCLOVIR', 5, '%']),
  FUCIDIN: m('Fucidin Cream 2% 15g (Acid fusidic)', 'tuýp', 98000, 15, ['FUSIDIC_ACID', 2, '%']),
  BACTROBAN: m('Bactroban 2% 5g (Mupirocin)', 'tuýp', 105000, 10, ['MUPIROCIN', 2, '%']),
  CEPHALEXIN: m('Cefalexin 500mg', 'viên', 1800, 300, ['CEPHALEXIN', 500, 'mg']),
  AUGMENTIN: m('Augmentin 625mg (Amoxicilin + Clavulanat)', 'viên', 9500, 150, ['AMOX_CLAV', 625, 'mg']),
  TRANSAMIN: m('Transamin 250mg (Acid tranexamic)', 'viên', 3200, 200, ['TRANEXAMIC_ACID', 250, 'mg']),
  EUKITOL: m('Hydroquinon 4% Cream 30g', 'tuýp', 120000, 8, ['HYDROQUINONE', 4, '%']),
  MINOXIDIL5: m('Minoxidil 5% dung dịch 60ml (Regaine)', 'chai', 290000, 8, ['MINOXIDIL', 5, '%']),
  EUCERIN_UREA: m('Eucerin UreaRepair Plus 10% Urea 75ml', 'tuýp', 260000, 8, ['UREA', 10, '%']),
  PLAQUENIL: m('Plaquenil 200mg (Hydroxycloroquin)', 'viên', 6800, 100, ['HYDROXYCHLOROQUINE', 200, 'mg']),
  VEROSPIRON: m('Verospiron 25mg (Spironolacton)', 'viên', 2100, 150, ['SPIRONOLACTONE', 25, 'mg']),
  ZINC: m('Kẽm gluconat 70mg (Zinc 10mg)', 'viên', 1500, 200, ['ZINC', 70, 'mg']),
  KENACORT: m('Kenacort 40mg/ml (Triamcinolon acetonid) lọ 1ml', 'lọ', 45000, 20, ['TRIAMCINOLONE', 40, 'mg/ml']),
  DERMATIX: m('Dermatix Ultra 15g (Silicone gel)', 'tuýp', 380000, 6, ['SILICONE', null, null]),
  EMLA: m('EMLA 5% Cream 5g (Lidocain + Prilocain)', 'tuýp', 95000, 20, ['LIDOCAINE_PRILOCAINE', 5, '%']),
  CICAPLAST: m('La Roche-Posay Cicaplast Baume B5 40ml', 'tuýp', 285000, 10, ['PANTHENOL', 5, '%']),
  ANTHELIOS: m('La Roche-Posay Anthelios UVMune 400 SPF50+ 50ml', 'tuýp', 495000, 10, ['SUNSCREEN', null, null]),
  ALDARA: m('Aldara 5% Cream (Imiquimod) gói 250mg', 'gói', 42000, 24, ['IMIQUIMOD', 5, '%']),
  VITAMIN_A: m('Vitamin A 5000 IU', 'viên', 700, 200, ['VITAMIN_A', 5000, 'IU']),
} as const;
export type MedicineKey = keyof typeof MEDICINES;

// ---------------------------------------------------------------------------
// TƯƠNG TÁC HOẠT CHẤT (theo Dược thư Quốc gia VN & tờ HDSD)
// ---------------------------------------------------------------------------
export const INTERACTIONS: Array<{ a: IngredientKey; b: IngredientKey; type: string; severity: 'MODERATE' | 'HIGH' | 'CONTRAINDICATED'; description: string; recommendation: string; minIntervalHours?: number }> = [
  { a: 'ISOTRETINOIN', b: 'DOXYCYCLINE', type: 'INTRACRANIAL_HYPERTENSION', severity: 'CONTRAINDICATED', description: 'Phối hợp isotretinoin với tetracyclin làm tăng nguy cơ tăng áp lực nội sọ lành tính (giả u não): đau đầu, buồn nôn, phù gai thị.', recommendation: 'Chống chỉ định phối hợp. Ngừng doxycyclin ít nhất 1 tuần trước khi khởi trị isotretinoin.' },
  { a: 'ISOTRETINOIN', b: 'MINOCYCLINE', type: 'INTRACRANIAL_HYPERTENSION', severity: 'CONTRAINDICATED', description: 'Isotretinoin + minocyclin làm tăng nguy cơ tăng áp lực nội sọ lành tính.', recommendation: 'Chống chỉ định phối hợp; chọn phác đồ khác.' },
  { a: 'ACITRETIN', b: 'DOXYCYCLINE', type: 'INTRACRANIAL_HYPERTENSION', severity: 'CONTRAINDICATED', description: 'Acitretin + tetracyclin làm tăng nguy cơ tăng áp lực nội sọ.', recommendation: 'Không phối hợp.' },
  { a: 'ACITRETIN', b: 'METHOTREXATE', type: 'ADDITIVE_TOXICITY', severity: 'CONTRAINDICATED', description: 'Acitretin làm tăng nồng độ methotrexat, tăng nguy cơ viêm gan nhiễm độc.', recommendation: 'Chống chỉ định phối hợp. Theo dõi men gan nếu chuyển đổi thuốc.' },
  { a: 'ISOTRETINOIN', b: 'VITAMIN_A', type: 'ADDITIVE_RETINOID_TOXICITY', severity: 'HIGH', description: 'Cộng hợp độc tính retinoid (thừa vitamin A): khô niêm mạc, tăng men gan, đau đầu.', recommendation: 'Không bổ sung vitamin A trong thời gian dùng isotretinoin.' },
  { a: 'ACITRETIN', b: 'VITAMIN_A', type: 'ADDITIVE_RETINOID_TOXICITY', severity: 'HIGH', description: 'Cộng hợp độc tính retinoid khi dùng cùng vitamin A liều cao.', recommendation: 'Tránh phối hợp.' },
  { a: 'ISOTRETINOIN', b: 'TRETINOIN', type: 'ADDITIVE_IRRITATION', severity: 'MODERATE', description: 'Retinoid uống phối hợp retinoid bôi gây khô, bong vảy, kích ứng da mạnh.', recommendation: 'Hạn chế retinoid bôi khi đang uống isotretinoin; ưu tiên dưỡng ẩm phục hồi.' },
  { a: 'ISOTRETINOIN', b: 'ADAPALENE', type: 'ADDITIVE_IRRITATION', severity: 'MODERATE', description: 'Tăng khô da, đỏ da, bong vảy khi phối hợp retinoid uống và bôi.', recommendation: 'Ngừng adapalene hoặc giảm tần suất bôi xuống 2–3 lần/tuần.' },
  { a: 'BENZOYL_PEROXIDE', b: 'TRETINOIN', type: 'REDUCED_EFFICACY', severity: 'MODERATE', description: 'Benzoyl peroxide oxy hóa và làm mất hoạt tính tretinoin khi bôi cùng lúc.', recommendation: 'Bôi benzoyl peroxide buổi sáng, tretinoin buổi tối.', minIntervalHours: 8 },
  { a: 'DOXYCYCLINE', b: 'ZINC', type: 'REDUCED_ABSORPTION', severity: 'MODERATE', description: 'Ion kẽm tạo phức chelat với doxycyclin, giảm hấp thu kháng sinh.', recommendation: 'Uống cách nhau ít nhất 2–3 giờ.', minIntervalHours: 3 },
  { a: 'MINOCYCLINE', b: 'ZINC', type: 'REDUCED_ABSORPTION', severity: 'MODERATE', description: 'Kẽm làm giảm hấp thu minocyclin.', recommendation: 'Uống cách nhau ít nhất 2–3 giờ.', minIntervalHours: 3 },
  { a: 'ITRACONAZOLE', b: 'METHYLPREDNISOLONE', type: 'INCREASED_EXPOSURE', severity: 'MODERATE', description: 'Itraconazol ức chế CYP3A4, tăng nồng độ methylprednisolon, tăng tác dụng phụ của corticoid.', recommendation: 'Cân nhắc giảm liều corticoid, theo dõi đường huyết, huyết áp.' },
  { a: 'FLUCONAZOLE', b: 'METHYLPREDNISOLONE', type: 'INCREASED_EXPOSURE', severity: 'MODERATE', description: 'Fluconazol ức chế CYP3A4 mức độ vừa, có thể tăng nồng độ corticoid.', recommendation: 'Theo dõi tác dụng phụ corticoid.' },
  { a: 'METHOTREXATE', b: 'AMOX_CLAV', type: 'INCREASED_TOXICITY', severity: 'HIGH', description: 'Penicilin làm giảm thải trừ methotrexat qua thận, tăng nguy cơ ức chế tủy.', recommendation: 'Tránh phối hợp; nếu bắt buộc phải theo dõi công thức máu sát.' },
  { a: 'SPIRONOLACTONE', b: 'TRANEXAMIC_ACID', type: 'MONITORING', severity: 'MODERATE', description: 'Cần đánh giá nguy cơ huyết khối và cân bằng điện giải khi phối hợp liệu trình nội tiết – chống tiêu fibrin.', recommendation: 'Hỏi tiền sử huyết khối, thuốc tránh thai; theo dõi kali máu.' },
  { a: 'CHLORPHENIRAMINE', b: 'CETIRIZINE', type: 'ADDITIVE_SEDATION', severity: 'MODERATE', description: 'Phối hợp 2 kháng histamin làm tăng an thần, khô miệng.', recommendation: 'Chỉ phối hợp khi mày đay nặng; dặn không lái xe.' },
];

// ---------------------------------------------------------------------------
// VẬT TƯ TIÊU HAO
// ---------------------------------------------------------------------------
export const SUPPLIES = {
  GLOVE: ['Găng tay y tế không bột (hộp 100 chiếc)', 'hộp', 95000, 10],
  STERILE_GLOVE: ['Găng tay phẫu thuật vô khuẩn', 'đôi', 6500, 100],
  GAUZE: ['Gạc vô khuẩn 10x10cm (gói 10 miếng)', 'gói', 8500, 100],
  COTTON: ['Bông y tế 100g', 'gói', 22000, 30],
  ALCOHOL: ['Cồn 70 độ 500ml', 'chai', 28000, 20],
  SALINE: ['Natri clorid 0.9% 500ml', 'chai', 12000, 40],
  NEEDLE_30G: ['Kim tiêm 30G x 13mm', 'cái', 1800, 200],
  SYRINGE_1ML: ['Bơm tiêm 1ml', 'cái', 1500, 200],
  ULTRASOUND_GEL: ['Gel làm mát laser/IPL 250ml', 'chai', 65000, 15],
  EYE_SHIELD: ['Miếng che mắt bảo vệ laser dùng 1 lần', 'cái', 12000, 100],
  TCA15: ['Dung dịch peel TCA 15% 30ml', 'chai', 450000, 3],
  GLYCOLIC35: ['Dung dịch peel Glycolic acid 35% 30ml', 'chai', 380000, 3],
  SALICYLIC30: ['Dung dịch peel Salicylic acid 30% 30ml', 'chai', 420000, 3],
  KOH10: ['Dung dịch KOH 10% 100ml', 'chai', 55000, 5],
  SLIDE: ['Lam kính hiển vi (hộp 72 cái)', 'hộp', 48000, 5],
  BLADE15: ['Lưỡi dao mổ số 15', 'cái', 3500, 100],
  PUNCH4: ['Dụng cụ sinh thiết bấm (punch) 4mm', 'cái', 45000, 20],
  SUTURE: ['Chỉ nylon 5-0', 'sợi', 25000, 40],
  COMEDONE: ['Cây nặn mụn tiệt trùng dùng 1 lần', 'cái', 8000, 100],
  DERMAPEN_TIP: ['Đầu kim lăn vi điểm 36 kim', 'cái', 120000, 20],
  LIQUID_N2: ['Nitơ lỏng (lít)', 'lít', 60000, 10],
  PRP_KIT: ['Bộ kit tách PRP 10ml', 'bộ', 650000, 10],
  MASK: ['Khẩu trang y tế 4 lớp (hộp 50 cái)', 'hộp', 45000, 10],
  BANDAGE: ['Băng dán vô khuẩn', 'cái', 2500, 200],
} as const satisfies Record<string, readonly [string, string, number, number]>;
export type SupplyKey = keyof typeof SUPPLIES;

// ---------------------------------------------------------------------------
// THIẾT BỊ
// ---------------------------------------------------------------------------
export const EQUIPMENT = {
  QSWITCH: ['Laser Q-switched Nd:YAG 1064/532nm – Lutronic Spectra XT', 'LUT-SPXT-2023-0187'],
  PICO: ['Laser Picosecond 1064/532nm – Cynosure PicoSure Pro', 'CYN-PSP-2024-0412'],
  CO2: ['Laser CO2 Fractional 10.600nm – Lutronic eCO2 Plus', 'LUT-ECO2-2022-0951'],
  PDL: ['Laser mạch máu Pulsed Dye 595nm – Candela Vbeam Perfecta', 'CAN-VBP-2023-0233'],
  IPL: ['Hệ thống IPL/ResurFX – Lumenis M22', 'LUM-M22-2021-1144'],
  NBUVB_CABIN: ['Buồng chiếu NB-UVB 311nm toàn thân – Waldmann UV 7002', 'WAL-UV7002-2022-0076'],
  EXCIMER: ['Laser Excimer 308nm – STRATA XTRAC', 'STR-XTR-2023-0058'],
  DERMOSCOPE_DIGITAL: ['Hệ thống soi da kỹ thuật số – FotoFinder Medicam 1000', 'FOT-MC1000-2022-0390'],
  DERMOSCOPE_HAND: ['Kính soi da cầm tay – HEINE Delta 30', 'HEI-D30-2024-1205'],
  WOOD: ['Đèn Wood UVA 365nm – Burton', 'BUR-WOOD-2021-0044'],
  VISIA: ['Máy phân tích da – Canfield VISIA Gen 7', 'CAN-VISIA7-2023-0310'],
  RF_MICRONEEDLE: ['Máy RF vi điểm – Lutronic Infini', 'LUT-INF-2022-0612'],
  ELECTROSURGERY: ['Máy đốt điện cao tần – Ellman Surgitron Dual RF', 'ELL-SDRF-2021-0729'],
  CRYO: ['Bình xịt nitơ lỏng – Brymill Cry-Ac 500ml', 'BRY-CRYAC-2022-0188'],
  MICROSCOPE: ['Kính hiển vi quang học – Olympus CX23', 'OLY-CX23-2021-2231'],
  CENTRIFUGE: ['Máy ly tâm PRP – Hettich EBA 200', 'HET-EBA200-2023-0517'],
  AUTOCLAVE: ['Nồi hấp tiệt trùng – Tuttnauer 2540EK', 'TUT-2540EK-2020-0864'],
} as const satisfies Record<string, readonly [string, string]>;
export type EquipmentKey = keyof typeof EQUIPMENT;

// ---------------------------------------------------------------------------
// DANH MỤC DỊCH VỤ (ServiceCatalog) — SEED-DV01 là phí khám mà module thu ngân đọc.
// category: CONSULTATION | LAB | IMAGING | PROCEDURE
// ---------------------------------------------------------------------------
export const SERVICES = {
  EXAM: ['SEED-DV01', 'Khám chuyên khoa Da liễu', 'CONSULTATION', 200000],
  EXAM_EXPERT: ['KB-002', 'Khám chuyên gia Da liễu (BSCKII/ThS)', 'CONSULTATION', 350000],
  EXAM_RE: ['KB-003', 'Tái khám Da liễu', 'CONSULTATION', 150000],
  EXAM_CHILD: ['KB-004', 'Khám Da liễu nhi', 'CONSULTATION', 200000],
  KOH: ['XN-001', 'Soi tươi tìm nấm (KOH 10%)', 'LAB', 120000],
  DEMODEX: ['XN-002', 'Soi tìm Demodex (sinh thiết bề mặt chuẩn hóa)', 'LAB', 150000],
  SCABIES: ['XN-003', 'Soi tìm cái ghẻ', 'LAB', 100000],
  FUNGAL_CULTURE: ['XN-004', 'Nuôi cấy và định danh nấm', 'LAB', 350000],
  TZANCK: ['XN-005', 'Phết Tzanck tìm tế bào gai/tế bào khổng lồ đa nhân', 'LAB', 150000],
  CBC: ['XN-006', 'Tổng phân tích tế bào máu ngoại vi (laser)', 'LAB', 120000],
  LIVER: ['XN-007', 'Định lượng AST, ALT', 'LAB', 100000],
  LIPID: ['XN-008', 'Bộ mỡ máu (Cholesterol, Triglycerid, HDL-C, LDL-C)', 'LAB', 200000],
  RENAL: ['XN-009', 'Định lượng Creatinin, Ure máu', 'LAB', 90000],
  GLUCOSE: ['XN-010', 'Định lượng Glucose máu', 'LAB', 50000],
  BHCG: ['XN-011', 'Định lượng β-hCG (thử thai máu)', 'LAB', 150000],
  IGE: ['XN-012', 'Định lượng IgE toàn phần', 'LAB', 250000],
  ANA: ['XN-013', 'Kháng thể kháng nhân (ANA – IFA)', 'LAB', 350000],
  SYPHILIS: ['XN-014', 'Test giang mai RPR + TPHA', 'LAB', 150000],
  HIV: ['XN-015', 'Test nhanh HIV', 'LAB', 120000],
  HBV: ['XN-016', 'HBsAg test nhanh', 'LAB', 90000],
  PATCH: ['XN-017', 'Test áp (Patch test) bộ dị nguyên chuẩn châu Âu', 'LAB', 800000],
  BIOPSY: ['XN-018', 'Sinh thiết da + giải phẫu bệnh', 'LAB', 1200000],
  DERMOSCOPY: ['CĐHA-001', 'Soi da kỹ thuật số (Dermoscopy)', 'IMAGING', 250000],
  PHOTO: ['CĐHA-002', 'Chụp ảnh lâm sàng chuẩn hóa', 'IMAGING', 150000],
  WOOD: ['CĐHA-003', 'Khám đèn Wood', 'IMAGING', 100000],
  VISIA: ['CĐHA-004', 'Phân tích da VISIA', 'IMAGING', 300000],
  TRICHOSCOPY: ['CĐHA-005', 'Soi da đầu – tóc (Trichoscopy)', 'IMAGING', 250000],
  NBUVB: ['TT-001', 'Chiếu đèn NB-UVB toàn thân (1 buổi)', 'PROCEDURE', 250000],
  EXCIMER: ['TT-002', 'Chiếu Excimer 308nm tại chỗ (1 buổi)', 'PROCEDURE', 600000],
  PDL: ['TT-003', 'Laser mạch máu Vbeam 595nm (1 vùng)', 'PROCEDURE', 2500000],
  QS_TONING: ['TT-004', 'Laser toning Nd:YAG 1064nm điều trị nám', 'PROCEDURE', 2000000],
  PICO: ['TT-005', 'Laser Picosecond điều trị tàn nhang/đồi mồi', 'PROCEDURE', 3000000],
  CO2_FRACTIONAL: ['TT-006', 'Laser CO2 Fractional điều trị sẹo rỗ', 'PROCEDURE', 3500000],
  CO2_ABLATION: ['TT-007', 'Đốt laser CO2 thương tổn lành tính (mụn cóc, dày sừng, u mềm)', 'PROCEDURE', 800000],
  CRYO: ['TT-008', 'Áp nitơ lỏng (Cryotherapy)', 'PROCEDURE', 500000],
  PEEL_SA: ['TT-009', 'Peel hóa học Salicylic acid 30%', 'PROCEDURE', 1000000],
  PEEL_GA: ['TT-010', 'Peel hóa học Glycolic acid 35%', 'PROCEDURE', 1200000],
  EXTRACTION: ['TT-011', 'Lấy nhân mụn y khoa', 'PROCEDURE', 400000],
  ILK: ['TT-012', 'Tiêm Triamcinolon trong thương tổn (sẹo lồi, rụng tóc từng vùng)', 'PROCEDURE', 500000],
  PRP_HAIR: ['TT-013', 'Tiêm PRP da đầu', 'PROCEDURE', 3000000],
  SUBCISION: ['TT-014', 'Cắt đáy sẹo (Subcision)', 'PROCEDURE', 1500000],
  IPL: ['TT-015', 'IPL điều trị giãn mạch/đỏ da', 'PROCEDURE', 1800000],
  EXCISION: ['TT-016', 'Cắt bỏ u da lành tính + khâu thẩm mỹ', 'PROCEDURE', 2500000],
  RF_MN: ['TT-017', 'RF vi điểm (Infini) điều trị sẹo/lỗ chân lông', 'PROCEDURE', 4000000],
} as const satisfies Record<string, readonly [string, string, string, number]>;
export type ServiceKey = keyof typeof SERVICES;

// ---------------------------------------------------------------------------
// DANH MỤC THỦ THUẬT (ProcedureCatalog) — dùng cho phác đồ điều trị
// ---------------------------------------------------------------------------
export const PROCEDURES = {
  NBUVB: { code: 'PROC-NBUVB', name: 'Chiếu đèn NB-UVB 311nm toàn thân', category: 'PHOTOTHERAPY', minutes: 15, price: 250000, consent: true, service: 'NBUVB' as ServiceKey, equipment: 'NBUVB_CABIN' as EquipmentKey, description: 'Liều khởi đầu theo type da Fitzpatrick (thường 0.3 J/cm² với type III–IV), tăng 10–20% mỗi buổi nếu không đỏ da.' },
  EXCIMER: { code: 'PROC-EXCIMER', name: 'Chiếu Excimer 308nm tại chỗ', category: 'PHOTOTHERAPY', minutes: 20, price: 600000, consent: true, service: 'EXCIMER' as ServiceKey, equipment: 'EXCIMER' as EquipmentKey, description: 'Chiếu khu trú dát bạch biến/mảng vảy nến kháng trị, 2 lần/tuần.' },
  PDL: { code: 'PROC-PDL', name: 'Laser mạch máu Pulsed Dye 595nm', category: 'LASER', minutes: 30, price: 2500000, consent: true, service: 'PDL' as ServiceKey, equipment: 'PDL' as EquipmentKey, description: 'Điều trị giãn mạch, rosacea thể đỏ da, u máu phẳng, sẹo đỏ.' },
  QS_TONING: { code: 'PROC-QSTONING', name: 'Laser toning Q-switched Nd:YAG 1064nm', category: 'LASER', minutes: 30, price: 2000000, consent: true, service: 'QS_TONING' as ServiceKey, equipment: 'QSWITCH' as EquipmentKey, description: 'Năng lượng thấp, nhiều lượt, điều trị nám hỗn hợp.' },
  PICO: { code: 'PROC-PICO', name: 'Laser Picosecond 532/1064nm', category: 'LASER', minutes: 30, price: 3000000, consent: true, service: 'PICO' as ServiceKey, equipment: 'PICO' as EquipmentKey, description: 'Điều trị tàn nhang, đồi mồi, bớt sắc tố.' },
  CO2_FRACTIONAL: { code: 'PROC-CO2F', name: 'Laser CO2 Fractional', category: 'LASER', minutes: 60, price: 3500000, consent: true, service: 'CO2_FRACTIONAL' as ServiceKey, equipment: 'CO2' as EquipmentKey, description: 'Tái tạo bề mặt vi điểm điều trị sẹo rỗ sau mụn; ủ tê EMLA 45–60 phút.' },
  CO2_ABLATION: { code: 'PROC-CO2A', name: 'Đốt laser CO2 thương tổn lành tính', category: 'LASER', minutes: 30, price: 800000, consent: true, service: 'CO2_ABLATION' as ServiceKey, equipment: 'CO2' as EquipmentKey, description: 'Bốc bay mụn cóc, dày sừng tiết bã, u mềm treo, mụn thịt.' },
  CRYO: { code: 'PROC-CRYO', name: 'Áp nitơ lỏng', category: 'CRYOTHERAPY', minutes: 15, price: 500000, consent: false, service: 'CRYO' as ServiceKey, equipment: 'CRYO' as EquipmentKey, description: '2 chu kỳ đông – tan, mỗi chu kỳ 10–15 giây, cách 2–3 tuần.' },
  PEEL_SA: { code: 'PROC-PEELSA', name: 'Peel Salicylic acid 30%', category: 'PEEL', minutes: 30, price: 1000000, consent: true, service: 'PEEL_SA' as ServiceKey, equipment: null, description: 'Peel nông, thích hợp mụn trứng cá, da dầu.' },
  PEEL_GA: { code: 'PROC-PEELGA', name: 'Peel Glycolic acid 35%', category: 'PEEL', minutes: 30, price: 1200000, consent: true, service: 'PEEL_GA' as ServiceKey, equipment: null, description: 'Peel nông hỗ trợ điều trị nám, tăng sắc tố sau viêm.' },
  EXTRACTION: { code: 'PROC-EXTRACT', name: 'Lấy nhân mụn y khoa', category: 'ACNE', minutes: 45, price: 400000, consent: false, service: 'EXTRACTION' as ServiceKey, equipment: null, description: 'Lấy nhân mụn đầu đen, đầu trắng bằng dụng cụ vô khuẩn.' },
  ILK: { code: 'PROC-ILK', name: 'Tiêm Triamcinolon trong thương tổn', category: 'INJECTION', minutes: 20, price: 500000, consent: true, service: 'ILK' as ServiceKey, equipment: null, description: 'Nồng độ 10–40 mg/ml tùy thương tổn, mỗi 3–4 tuần.' },
  PRP_HAIR: { code: 'PROC-PRP', name: 'Tiêm PRP da đầu', category: 'PRP', minutes: 60, price: 3000000, consent: true, service: 'PRP_HAIR' as ServiceKey, equipment: 'CENTRIFUGE' as EquipmentKey, description: 'Huyết tương giàu tiểu cầu tự thân, 3–4 buổi cách 4 tuần.' },
  SUBCISION: { code: 'PROC-SUBCISION', name: 'Cắt đáy sẹo (Subcision)', category: 'SURGERY', minutes: 45, price: 1500000, consent: true, service: 'SUBCISION' as ServiceKey, equipment: null, description: 'Dùng kim 18G cắt dải xơ kéo đáy sẹo rỗ dạng lăn.' },
  IPL: { code: 'PROC-IPL', name: 'IPL điều trị đỏ da, giãn mạch', category: 'IPL', minutes: 30, price: 1800000, consent: true, service: 'IPL' as ServiceKey, equipment: 'IPL' as EquipmentKey, description: 'Kính lọc 560–590nm.' },
  BIOPSY: { code: 'PROC-BIOPSY', name: 'Sinh thiết da bấm (punch biopsy)', category: 'DIAGNOSTIC', minutes: 20, price: 1200000, consent: true, service: 'BIOPSY' as ServiceKey, equipment: null, description: 'Punch 3–4mm, khâu 1 mũi nylon 5-0.' },
  DERMOSCOPY: { code: 'PROC-DERMOSCOPY', name: 'Soi da kỹ thuật số và lưu ảnh theo dõi', category: 'DIAGNOSTIC', minutes: 15, price: 250000, consent: false, service: 'DERMOSCOPY' as ServiceKey, equipment: 'DERMOSCOPE_DIGITAL' as EquipmentKey, description: 'Theo dõi nốt ruồi, thương tổn sắc tố.' },
  RF_MN: { code: 'PROC-RFMN', name: 'RF vi điểm (Infini)', category: 'RF', minutes: 60, price: 4000000, consent: true, service: 'RF_MN' as ServiceKey, equipment: 'RF_MICRONEEDLE' as EquipmentKey, description: 'Điều trị sẹo rỗ, lỗ chân lông to, da chảy xệ nhẹ.' },
} as const;
export type ProcedureKey = keyof typeof PROCEDURES;

// ---------------------------------------------------------------------------
// MẪU ĐỒNG THUẬN
// ---------------------------------------------------------------------------
export const CONSENT_TEMPLATES = {
  LASER: ['Phiếu đồng ý thực hiện thủ thuật Laser – Ánh sáng', `Tôi đã được bác sĩ giải thích về mục đích, quy trình, số buổi dự kiến và các tác dụng không mong muốn có thể gặp sau điều trị laser/IPL gồm: đỏ da, phù nề, đóng mài, tăng hoặc giảm sắc tố sau viêm, hiếm gặp bỏng, phồng rộp hoặc sẹo.
Tôi cam kết: không phơi nắng trực tiếp 2 tuần trước và sau điều trị; không dùng retinoid bôi 5–7 ngày trước buổi điều trị; thông báo cho bác sĩ nếu đang mang thai, có tiền sử sẹo lồi, động kinh nhạy sáng hoặc đang dùng thuốc gây nhạy cảm ánh sáng.
Tôi đồng ý cho phòng khám chụp ảnh vùng điều trị để theo dõi kết quả; ảnh chỉ sử dụng trong hồ sơ bệnh án.`],
  PEEL: ['Phiếu đồng ý thực hiện Peel hóa học', `Tôi được giải thích về peel hóa học nông (Salicylic/Glycolic/TCA nồng độ thấp), cảm giác châm chích, nóng rát trong khi thực hiện, bong vảy 3–7 ngày sau peel và nguy cơ tăng sắc tố sau viêm nếu không chống nắng.
Tôi cam kết ngưng tretinoin/adapalene 5 ngày trước peel, không cạy vảy, sử dụng kem chống nắng SPF ≥ 50 và tái khám đúng hẹn.`],
  INJECTION: ['Phiếu đồng ý tiêm thuốc trong thương tổn', `Tôi đồng ý tiêm Triamcinolon acetonid/huyết tương giàu tiểu cầu (PRP) vào vùng tổn thương theo chỉ định. Tôi đã được thông báo các nguy cơ: đau, bầm tím, teo da, giãn mạch, giảm sắc tố tại chỗ tiêm, hiếm gặp nhiễm trùng.`],
  ISOTRETINOIN: ['Cam kết sử dụng Isotretinoin đường uống', `Tôi hiểu isotretinoin có nguy cơ gây dị tật thai nhi nghiêm trọng. Tôi (với bệnh nhân nữ) cam kết: thử thai âm tính trước khi bắt đầu; sử dụng biện pháp tránh thai hiệu quả từ 1 tháng trước, trong suốt quá trình và 1 tháng sau khi ngừng thuốc; thử thai lại mỗi tháng.
Tôi được thông báo các tác dụng phụ: khô môi, khô mắt, chảy máu cam, tăng men gan, tăng mỡ máu, thay đổi tâm trạng. Tôi sẽ xét nghiệm máu định kỳ theo hẹn, không hiến máu, không dùng chung thuốc với người khác và không uống kèm vitamin A hoặc kháng sinh nhóm tetracyclin.`],
  PHOTOTHERAPY: ['Phiếu đồng ý điều trị bằng ánh sáng NB-UVB/Excimer', `Tôi đồng ý điều trị bằng tia cực tím dải hẹp NB-UVB 311nm/Excimer 308nm, 2–3 buổi/tuần. Tôi được giải thích các tác dụng phụ: đỏ da như cháy nắng, ngứa, khô da, tăng sắc tố vùng lành; nguy cơ lâu dài lão hóa da do ánh sáng. Tôi cam kết đeo kính bảo hộ, che vùng sinh dục khi chiếu và không tự ý phơi nắng thêm trong ngày chiếu.`],
  BIOPSY: ['Phiếu đồng ý sinh thiết da', `Tôi đồng ý lấy một mẫu da nhỏ (3–4 mm) dưới gây tê tại chỗ để làm xét nghiệm giải phẫu bệnh. Tôi hiểu có thể chảy máu, nhiễm trùng, để lại sẹo nhỏ; kết quả có sau 5–7 ngày làm việc.`],
  PHOTO: ['Đồng ý chụp và lưu trữ ảnh lâm sàng', `Tôi đồng ý cho phòng khám chụp ảnh tổn thương da theo tư thế chuẩn hóa để theo dõi điều trị. Ảnh được lưu trong hồ sơ bệnh án điện tử, không công bố khi chưa có sự đồng ý bằng văn bản của tôi.`],
} as const satisfies Record<string, readonly [string, string]>;
export type ConsentKey = keyof typeof CONSENT_TEMPLATES;
