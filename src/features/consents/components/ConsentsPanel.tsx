'use client';

import React, { useState } from 'react';
import { useConsents } from '../hooks/useConsents';
import { ConsentSignaturePad } from './ConsentSignaturePad';
import type { SignerType } from '../types/consents.types';

export function ConsentsPanel() {
  const {
    templates,
    signedConsents,
    selectedTemplate,
    setSelectedTemplate,
    isLoading,
    isSubmitting,
    error,
    createTemplate,
    updateTemplate,
    createTemplateVersion,
    signConsent,
  } = useConsents();

  const [activeTab, setActiveTab] = useState<'SIGNING' | 'TEMPLATES' | 'SIGNED_LIST'>('SIGNING');

  // Filter phân loại thủ thuật (CON-01)
  const [filterProcedure, setFilterProcedure] = useState<string>('ALL');

  // State Form tạo Template mới (CON-01)
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');

  // State Form chỉnh sửa Template chưa có bản ký (CON-01)
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState('');
  const [editTemplateName, setEditTemplateName] = useState('');
  const [editTemplateContent, setEditTemplateContent] = useState('');

  // State Form nâng phiên bản Template (CON-01 Versioning)
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionContent, setVersionContent] = useState('');

  // State Form Ký cam kết (CON-02)
  const [visitId, setVisitId] = useState('visit-sample-01');
  const [clinicalOrderId, setClinicalOrderId] = useState('');
  const [signerType, setSignerType] = useState<SignerType>('PATIENT');
  const [signerName, setSignerName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isAgreed, setIsAgreed] = useState(false);
  const [signSuccessMessage, setSignSuccessMessage] = useState<string | null>(null);
  const [signErrorMessage, setSignErrorMessage] = useState<string | null>(null);

  const handleOpenNewTemplate = () => {
    setNewTemplateName('Cam kết thực hiện thủ thuật Laser & Thẩm mỹ Da liễu');
    setNewTemplateContent(
      `1. MỤC ĐÍCH ĐIỀU TRỊ:
- Thực hiện thủ thuật da liễu theo chỉ định chuyên môn của Bác sĩ điều trị.

2. CÁC NGUY CƠ & TÁC DỤNG PHỤ CÓ THỂ GẶP:
- Đỏ da, sưng nhẹ, cảm giác châm chích hoặc bong vảy tạm thời trong 3-7 ngày đầu.
- Tăng hoặc giảm sắc tố sau viêm nếu không tuân thủ chống nắng và chăm sóc đúng hướng dẫn.

3. QUYỀN VÀ TRÁCH NHIỆM:
- Khách hàng đã được Bác sĩ giải thích đầy đủ về phác đồ, chi phí, tiên lượng và cách chăm sóc tại nhà.
- Khách hàng có quyền đặt câu hỏi và tự nguyện đồng ý thực hiện.`
    );
    setShowNewTemplateModal(true);
  };

  const handleOpenEditModal = (tpl: typeof templates[0]) => {
    setEditTemplateId(tpl.id);
    setEditTemplateName(tpl.name);
    setEditTemplateContent(tpl.content);
    setShowEditTemplateModal(true);
  };

  const handleOpenVersionModal = (tpl: typeof templates[0]) => {
    setSelectedTemplate(tpl);
    setVersionContent(tpl.content);
    setShowVersionModal(true);
  };

  const handleSaveNewTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim() || !newTemplateContent.trim()) return;

    try {
      await createTemplate({
        name: newTemplateName.trim(),
        content: newTemplateContent.trim(),
      });
      setShowNewTemplateModal(false);
      setNewTemplateName('');
      setNewTemplateContent('');
    } catch {
      // Error handled by hook
    }
  };

  const handleSaveEditTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTemplateId || !editTemplateContent.trim()) return;

    try {
      await updateTemplate(editTemplateId, {
        name: editTemplateName.trim(),
        content: editTemplateContent.trim(),
      });
      setShowEditTemplateModal(false);
    } catch {
      // Error handled by hook
    }
  };

  const handleSaveNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !versionContent.trim()) return;

    try {
      await createTemplateVersion(selectedTemplate.id, {
        content: versionContent.trim(),
      });
      setShowVersionModal(false);
    } catch {
      // Error handled by hook
    }
  };

  const handleSubmitSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignSuccessMessage(null);
    setSignErrorMessage(null);

    if (!selectedTemplate) {
      setSignErrorMessage('Vui lòng chọn biểu mẫu cam kết cần ký.');
      return;
    }
    if (!visitId.trim()) {
      setSignErrorMessage('Vui lòng nhập mã lượt khám (visitId).');
      return;
    }
    if (!signerName.trim()) {
      setSignErrorMessage('Vui lòng nhập họ và tên người ký.');
      return;
    }
    if (!isAgreed) {
      setSignErrorMessage('Vui lòng tích xác nhận đã đọc và hiểu rõ nội dung cam kết.');
      return;
    }
    if (!signatureData) {
      setSignErrorMessage('Vui lòng ký tên vào khung chữ ký Signature Pad trước khi xác nhận.');
      return;
    }

    try {
      const result = await signConsent({
        templateId: selectedTemplate.id,
        visitId: visitId.trim(),
        signerName: signerName.trim(),
        signerType,
        relationship: signerType === 'REPRESENTATIVE' ? relationship.trim() : undefined,
        signatureDataUrl: signatureData,
        notes: clinicalOrderId ? `Chỉ định CLS/Thủ thuật: ${clinicalOrderId}` : undefined,
      });

      setSignSuccessMessage(
        `Ký cam kết thành công! Mã hồ sơ: ${result.id}. Bản cam kết đã được lưu trữ vào hồ sơ lượt khám.`
      );
      setSignatureData(null);
      setIsAgreed(false);
    } catch (err: any) {
      setSignErrorMessage(err.message || 'Lỗi xử lý ký cam kết điện tử');
    }
  };

  const filteredTemplates = templates.filter((tpl) => {
    if (filterProcedure === 'ALL') return true;
    return tpl.name.toLowerCase().includes(filterProcedure.toLowerCase());
  });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header Module */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded bg-teal-100 text-teal-800">
              Phân hệ CON-01 & CON-02
            </span>
            <span className="text-xs text-slate-500 font-medium">Bản cam kết điều trị điện tử</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Bản Cam Kết & Chữ Ký Điện Tử (Electronic Medical Consents)
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Quản lý biểu mẫu y khoa, phiên bản lựa chọn và chữ ký trực tiếp của người bệnh / người đại diện.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('SIGNING')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'SIGNING'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ✍️ Ký cam kết trên thiết bị
          </button>
          <button
            onClick={() => setActiveTab('TEMPLATES')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'TEMPLATES'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📄 Quản lý Biểu mẫu (v1, v2...)
          </button>
          <button
            onClick={() => setActiveTab('SIGNED_LIST')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'SIGNED_LIST'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🗂️ Danh sách đã ký ({signedConsents.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: KÝ CAM KẾT TRÊN THIẾT BỊ (CON-02) */}
      {activeTab === 'SIGNING' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái: Cấu hình lượt khám, chỉ định & người ký (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
              <h3 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-2">
                1. Thông tin Lượt khám & Chỉ định
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã lượt khám (Visit ID) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={visitId}
                  onChange={(e) => setVisitId(e.target.value)}
                  placeholder="Nhập mã lượt khám..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã chỉ định / Thủ thuật liên quan (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={clinicalOrderId}
                  onChange={(e) => setClinicalOrderId(e.target.value)}
                  placeholder="Ví dụ: ord-cls-01"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chọn biểu mẫu cam kết <span className="text-rose-500">*</span>
                </label>
                {templates.length === 0 ? (
                  <div className="text-xs text-slate-500 p-3 bg-slate-50 rounded border border-slate-200">
                    Chưa có biểu mẫu nào. Vui lòng chuyển sang tab &quot;Quản lý Biểu mẫu&quot; để tạo.
                  </div>
                ) : (
                  <select
                    value={selectedTemplate?.id || ''}
                    onChange={(e) => {
                      const found = templates.find((t) => t.id === e.target.value);
                      if (found) setSelectedTemplate(found);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (Phiên bản v{t.version})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
              <h3 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-2">
                2. Thông tin Người ký cam kết
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tư cách người ký
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSignerType('PATIENT')}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-center transition-all ${
                      signerType === 'PATIENT'
                        ? 'bg-teal-50 border-teal-600 text-teal-800 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Bệnh nhân trực tiếp
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignerType('REPRESENTATIVE')}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-center transition-all ${
                      signerType === 'REPRESENTATIVE'
                        ? 'bg-teal-50 border-teal-600 text-teal-800 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Người đại diện hợp pháp
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên người ký <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Nhập đầy đủ họ tên..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {signerType === 'REPRESENTATIVE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quan hệ với người bệnh (Bố, Mẹ, Vợ, Chồng...) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    placeholder="Ví dụ: Mẹ ruột của bệnh nhân"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Cột phải: Khung tài liệu A4 điện tử & Signature Pad (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col gap-5">
              <div className="border-b-2 border-slate-800 pb-4 text-center">
                <span className="text-xs uppercase tracking-widest font-semibold text-slate-500">
                  Phòng Khám Da Liễu & Thẩm Mỹ Y Khoa
                </span>
                <h2 className="text-xl font-bold text-slate-900 uppercase mt-1">
                  {selectedTemplate?.name || 'BẢN CAM KẾT ĐỒNG THUẬN ĐIỀU TRỊ'}
                </h2>
                <div className="flex items-center justify-center gap-4 text-xs text-slate-500 mt-1">
                  <span>Phiên bản biểu mẫu: <strong>v{selectedTemplate?.version || 1}</strong></span>
                  <span>•</span>
                  <span>Lượt khám: <strong>{visitId || 'Chưa chọn'}</strong></span>
                  {clinicalOrderId && (
                    <>
                      <span>•</span>
                      <span>Chỉ định: <strong>{clinicalOrderId}</strong></span>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 max-h-72 overflow-y-auto text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-wrap select-none">
                {selectedTemplate?.content || 'Chưa có nội dung cam kết.'}
              </div>

              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <input
                  type="checkbox"
                  id="consentAgreement"
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  className="mt-1 w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="consentAgreement" className="text-xs text-amber-900 leading-5 cursor-pointer">
                  <strong>Tôi xác nhận rằng:</strong> Đã đọc, được Bác sĩ giải thích rõ ràng về tình trạng bệnh,
                  phương pháp điều trị, mục đích, chi phí, cũng như các rủi ro có thể xảy ra. Tôi hoàn toàn tự nguyện
                  đồng ý thực hiện thủ thuật và cam kết tuân thủ đúng hướng dẫn chuyên môn sau điều trị.
                </label>
              </div>

              {/* Khung Signature Pad */}
              <ConsentSignaturePad
                onSignatureChange={(dataUrl) => setSignatureData(dataUrl)}
                disabled={isSubmitting}
              />

              {signErrorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
                  {signErrorMessage}
                </div>
              )}

              {signSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 font-medium">
                  {signSuccessMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSubmitSignature}
                  disabled={isSubmitting || !isAgreed || !signatureData}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow transition-colors cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang xử lý chữ ký...
                    </>
                  ) : (
                    <>
                      <span>✍️ Xác nhận Ký Cam Kết</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUẢN LÝ BIỂU MẪU & PHIÊN BẢN (CON-01) */}
      {activeTab === 'TEMPLATES' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Danh mục Biểu mẫu Cam kết & Lựa chọn Phiên bản
              </h2>
              <p className="text-xs text-slate-500">
                Quản lý nội dung biểu mẫu, phân loại theo thủ thuật và cập nhật phiên bản.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Lọc theo phân loại */}
              <select
                value={filterProcedure}
                onChange={(e) => setFilterProcedure(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="ALL">Tất cả thủ thuật / dịch vụ</option>
                <option value="Laser">Thủ thuật Laser & Ánh sáng</option>
                <option value="Phẫu thuật">Tiểu phẫu da liễu</option>
                <option value="Vi kim">Vi kim & Thay da sinh học</option>
              </select>

              <button
                onClick={handleOpenNewTemplate}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer whitespace-nowrap"
              >
                + Tạo biểu mẫu mới
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-teal-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-teal-100 text-teal-800">
                      Phiên bản v{tpl.version}
                    </span>
                    <span className="text-xs text-slate-400">
                      {tpl.signedCount || 0} lượt đã ký
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 text-base mb-2">
                    {tpl.name}
                  </h3>
                  <div className="text-xs text-slate-600 line-clamp-4 bg-slate-50 p-2.5 rounded border border-slate-100 font-mono">
                    {tpl.content}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 gap-2">
                  <button
                    onClick={() => {
                      setSelectedTemplate(tpl);
                      setActiveTab('SIGNING');
                    }}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-800 cursor-pointer"
                  >
                    Sử dụng để ký ➔
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Cho phép sửa trực tiếp nếu chưa có ai ký */}
                    {(tpl.signedCount || 0) === 0 ? (
                      <button
                        onClick={() => handleOpenEditModal(tpl)}
                        className="text-xs font-medium text-slate-600 hover:text-teal-600 cursor-pointer"
                      >
                        Sửa
                      </button>
                    ) : null}

                    <button
                      onClick={() => handleOpenVersionModal(tpl)}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      Nâng bản (v{tpl.version + 1})
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DANH SÁCH CAM KẾT ĐÃ KÝ (CON-02) */}
      {activeTab === 'SIGNED_LIST' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                Danh sách Cam kết đã ký trên thiết bị
              </h2>
              <p className="text-xs text-slate-500">
                Lưu giữ thông tin người ký, chữ ký điện tử và thời điểm ký từ hệ thống.
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Tổng số: <strong>{signedConsents.length}</strong> bản ký
            </span>
          </div>

          {signedConsents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Chưa có bản cam kết nào được ký. Vui lòng chuyển sang tab &quot;Ký cam kết trên thiết bị&quot; để thực hiện.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                    <th className="py-3 px-4">Mã bản cam kết</th>
                    <th className="py-3 px-4">Tên biểu mẫu</th>
                    <th className="py-3 px-4">Mã lượt khám</th>
                    <th className="py-3 px-4">Người ký</th>
                    <th className="py-3 px-4">Chữ ký điện tử</th>
                    <th className="py-3 px-4">Thời điểm ký</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {signedConsents.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {item.id.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.templateName || 'Biểu mẫu'}</div>
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 font-mono">
                          v{item.templateVersion || 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">{item.visitId}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900">{item.signerName}</span>
                      </td>
                      <td className="py-3 px-4">
                        {item.signatureUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.signatureUrl}
                            alt="Chữ ký"
                            className="h-10 max-w-[120px] object-contain border border-slate-200 rounded bg-white p-1"
                          />
                        ) : (
                          <span className="text-slate-400">Không có ảnh</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {new Date(item.signedAt).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL TẠO TEMPLATE MỚI (CON-01) */}
      {showNewTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-slate-900 border-b pb-2">
              Tạo mới Biểu mẫu Cam kết Y tế (Phiên bản v1)
            </h3>
            <form onSubmit={handleSaveNewTemplate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên biểu mẫu cam kết <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Ví dụ: Cam kết làm thủ thuật Laser CO2 Fractional"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nội dung điều khoản cam kết y khoa <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={8}
                  value={newTemplateContent}
                  onChange={(e) => setNewTemplateContent(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-sans leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowNewTemplateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow cursor-pointer"
                >
                  Lưu & Tạo mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHỈNH SỬA TEMPLATE (CON-01 - KHI CHƯA CÓ BẢN KÝ) */}
      {showEditTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-slate-900 border-b pb-2">
              Chỉnh sửa Biểu mẫu Cam kết
            </h3>
            <form onSubmit={handleSaveEditTemplate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên biểu mẫu cam kết
                </label>
                <input
                  type="text"
                  value={editTemplateName}
                  onChange={(e) => setEditTemplateName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nội dung điều khoản <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={8}
                  value={editTemplateContent}
                  onChange={(e) => setEditTemplateContent(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-sans leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditTemplateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NÂNG PHIÊN BẢN TEMPLATE (CON-01 VERSIONING) */}
      {showVersionModal && selectedTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-slate-900 border-b pb-2">
              Phát hành Phiên bản mới: v{selectedTemplate.version + 1}
            </h3>
            <p className="text-xs text-slate-600">
              Biểu mẫu: <strong>{selectedTemplate.name}</strong>. Phiên bản mới sẽ có hiệu lực cho các lần tạo yêu cầu ký tiếp theo.
            </p>
            <form onSubmit={handleSaveNewVersion} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nội dung điều khoản phiên bản mới <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={8}
                  value={versionContent}
                  onChange={(e) => setVersionContent(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-sans leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowVersionModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow cursor-pointer"
                >
                  Phát hành v{selectedTemplate.version + 1}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
