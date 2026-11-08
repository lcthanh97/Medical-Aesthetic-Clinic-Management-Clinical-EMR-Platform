'use client';

import React, { useState } from 'react';
import { useConsents } from '../hooks/useConsents';
import type { SignerType } from '../types/consents.types';
import { ConsentSignaturePad } from './ConsentSignaturePad';

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
    <div className="flex flex-col gap-6">
      {/* Header Module */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#e1e9f2] gap-4">
        <div>
          <h1 className="text-[25px] font-bold text-[#20334b]">
            Biểu mẫu & Cam kết điều trị
          </h1>
          <p className="text-[12px] text-[#6c7e93] mt-1">
            Quản lý biểu mẫu y khoa, phiên bản lựa chọn và chữ ký trực tiếp của người bệnh / người đại diện.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-[#edf5ff] p-1 rounded-[9px] border border-[#dce5ef] self-start md:self-auto">
          <button
            onClick={() => setActiveTab('SIGNING')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[7px] transition-all cursor-pointer ${
              activeTab === 'SIGNING'
                ? 'bg-white text-[#235f9e] shadow-xs'
                : 'text-[#6c7e93] hover:text-[#20334b]'
            }`}
          >
            Ký cam kết trên thiết bị
          </button>
          <button
            onClick={() => setActiveTab('TEMPLATES')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[7px] transition-all cursor-pointer ${
              activeTab === 'TEMPLATES'
                ? 'bg-white text-[#235f9e] shadow-xs'
                : 'text-[#6c7e93] hover:text-[#20334b]'
            }`}
          >
            Quản lý biểu mẫu
          </button>
          <button
            onClick={() => setActiveTab('SIGNED_LIST')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[7px] transition-all cursor-pointer ${
              activeTab === 'SIGNED_LIST'
                ? 'bg-white text-[#235f9e] shadow-xs'
                : 'text-[#6c7e93] hover:text-[#20334b]'
            }`}
          >
            Danh sách đã ký ({signedConsents.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-[7px] text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: KÝ CAM KẾT TRÊN THIẾT BỊ (CON-02) */}
      {activeTab === 'SIGNING' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái: Cấu hình lượt khám, chỉ định & người ký (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <div className="bg-white border border-[#dce5ef] rounded-[9px] p-5 shadow-2xs flex flex-col gap-4">
              <h3 className="text-sm font-bold text-[#20334b] border-b border-[#e6edf5] pb-2">
                1. Thông tin Lượt khám & Chỉ định
              </h3>

              <div>
                <label className="block text-xs font-medium text-[#6c7e93] mb-1">
                  Mã lượt khám (Visit ID) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={visitId}
                  onChange={(e) => setVisitId(e.target.value)}
                  placeholder="Nhập mã lượt khám..."
                  className="w-full px-3 py-2 text-xs border border-[#dce5ef] rounded-[7px] focus:outline-none focus:border-[#246dce]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6c7e93] mb-1">
                  Mã chỉ định / Thủ thuật liên quan (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={clinicalOrderId}
                  onChange={(e) => setClinicalOrderId(e.target.value)}
                  placeholder="Ví dụ: ord-cls-01"
                  className="w-full px-3 py-2 text-xs border border-[#dce5ef] rounded-[7px] focus:outline-none focus:border-[#246dce] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6c7e93] mb-1">
                  Chọn biểu mẫu cam kết <span className="text-rose-500">*</span>
                </label>
                {templates.length === 0 ? (
                  <div className="text-xs text-[#6c7e93] p-3 bg-[#f5f8fc] rounded-[7px] border border-[#dce5ef]">
                    Chưa có biểu mẫu nào. Vui lòng chuyển sang tab &quot;Quản lý Biểu mẫu&quot; để tạo.
                  </div>
                ) : (
                  <select
                    value={selectedTemplate?.id || ''}
                    onChange={(e) => {
                      const found = templates.find((t) => t.id === e.target.value);
                      if (found) setSelectedTemplate(found);
                    }}
                    className="w-full px-3 py-2 text-xs border border-[#dce5ef] rounded-[7px] focus:outline-none focus:border-[#246dce] bg-white text-[#20334b]"
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

            <div className="bg-white border border-[#dce5ef] rounded-[9px] p-5 shadow-2xs flex flex-col gap-4">
              <h3 className="text-sm font-bold text-[#20334b] border-b border-[#e6edf5] pb-2">
                2. Thông tin Người ký cam kết
              </h3>

              <div>
                <label className="block text-xs font-medium text-[#6c7e93] mb-1.5">
                  Tư cách người ký
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSignerType('PATIENT')}
                    className={`px-3 py-2 text-xs font-semibold rounded-[7px] border text-center transition-all cursor-pointer ${
                      signerType === 'PATIENT'
                        ? 'bg-[#edf5ff] border-[#246dce] text-[#235f9e]'
                        : 'border-[#dce5ef] text-[#6c7e93] hover:bg-[#f8fafd]'
                    }`}
                  >
                    Bệnh nhân trực tiếp
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignerType('REPRESENTATIVE')}
                    className={`px-3 py-2 text-xs font-semibold rounded-[7px] border text-center transition-all cursor-pointer ${
                      signerType === 'REPRESENTATIVE'
                        ? 'bg-[#edf5ff] border-[#246dce] text-[#235f9e]'
                        : 'border-[#dce5ef] text-[#6c7e93] hover:bg-[#f8fafd]'
                    }`}
                  >
                    Người đại diện hợp pháp
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6c7e93] mb-1">
                  Họ và tên người ký <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Nhập đầy đủ họ tên..."
                  className="w-full px-3 py-2 text-xs border border-[#dce5ef] rounded-[7px] focus:outline-none focus:border-[#246dce]"
                />
              </div>

              {signerType === 'REPRESENTATIVE' && (
                <div>
                  <label className="block text-xs font-medium text-[#6c7e93] mb-1">
                    Quan hệ với người bệnh (Bố, Mẹ, Vợ, Chồng...) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    placeholder="Ví dụ: Mẹ ruột của bệnh nhân"
                    className="w-full px-3 py-2 text-xs border border-[#dce5ef] rounded-[7px] focus:outline-none focus:border-[#246dce]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Cột phải: Khung tài liệu A4 điện tử & Signature Pad (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            <div className="bg-white border border-[#dce5ef] rounded-[9px] p-6 shadow-2xs flex flex-col gap-5">
              <div className="border-b-2 border-[#20334b] pb-4 text-center">
                <span className="text-[11px] uppercase tracking-widest font-semibold text-[#6c7e93]">
                  Phòng Khám Da Liễu & Thẩm Mỹ Y Khoa
                </span>
                <h2 className="text-lg font-bold text-[#20334b] uppercase mt-1">
                  {selectedTemplate?.name || 'BẢN CAM KẾT ĐỒNG THUẬN ĐIỀU TRỊ'}
                </h2>
                <div className="flex items-center justify-center gap-4 text-xs text-[#6c7e93] mt-1">
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

              <div className="bg-[#f8fafd] p-4 rounded-[7px] border border-[#e6edf5] max-h-72 overflow-y-auto text-xs text-[#20334b] leading-relaxed font-sans whitespace-pre-wrap select-none">
                {selectedTemplate?.content || 'Chưa có nội dung cam kết.'}
              </div>

              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-[7px]">
                <input
                  type="checkbox"
                  id="consentAgreement"
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#246dce] rounded border-[#dce5ef] focus:ring-[#246dce] cursor-pointer"
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
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-[7px] text-xs text-rose-700">
                  {signErrorMessage}
                </div>
              )}

              {signSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-[7px] text-xs text-emerald-800 font-medium">
                  {signSuccessMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e6edf5]">
                <button
                  type="button"
                  onClick={handleSubmitSignature}
                  disabled={isSubmitting || !isAgreed || !signatureData}
                  className="px-5 py-2.5 rounded-[7px] text-xs font-semibold text-white bg-[#246dce] hover:bg-[#1f5cb0] disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang xử lý chữ ký...
                    </>
                  ) : (
                    <>
                      <span>Xác nhận Ký Cam Kết</span>
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
              <h2 className="text-sm font-bold text-[#20334b]">
                Danh mục Biểu mẫu Cam kết & Lựa chọn Phiên bản
              </h2>
              <p className="text-xs text-[#6c7e93]">
                Quản lý nội dung biểu mẫu, phân loại theo thủ thuật và cập nhật phiên bản.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Lọc theo phân loại */}
              <select
                value={filterProcedure}
                onChange={(e) => setFilterProcedure(e.target.value)}
                className="px-3 py-1.5 text-xs border border-[#dce5ef] rounded-[7px] bg-white text-[#20334b] focus:outline-none focus:border-[#246dce]"
              >
                <option value="ALL">Tất cả thủ thuật / dịch vụ</option>
                <option value="Laser">Thủ thuật Laser & Ánh sáng</option>
                <option value="Phẫu thuật">Tiểu phẫu da liễu</option>
                <option value="Vi kim">Vi kim & Thay da sinh học</option>
              </select>

              <button
                onClick={handleOpenNewTemplate}
                className="px-3 py-1.5 bg-[#246dce] hover:bg-[#1f5cb0] text-white rounded-[7px] text-xs font-semibold transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
              >
                + Tạo biểu mẫu mới
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white border border-[#dce5ef] rounded-[9px] p-5 shadow-2xs flex flex-col justify-between hover:border-[#246dce] transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-[#edf5ff] text-[#235f9e]">
                      Phiên bản v{tpl.version}
                    </span>
                    <span className="text-xs text-[#6c7e93]">
                      {tpl.signedCount || 0} lượt đã ký
                    </span>
                  </div>
                  <h3 className="font-bold text-[#20334b] text-sm mb-2">
                    {tpl.name}
                  </h3>
                  <div className="text-xs text-[#6c7e93] line-clamp-4 bg-[#f8fafd] p-2.5 rounded-[7px] border border-[#e6edf5] font-mono">
                    {tpl.content}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#e6edf5] gap-2">
                  <button
                    onClick={() => {
                      setSelectedTemplate(tpl);
                      setActiveTab('SIGNING');
                    }}
                    className="text-xs font-semibold text-[#246dce] hover:text-[#1f5cb0] cursor-pointer"
                  >
                    Sử dụng để ký ➔
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Cho phép sửa trực tiếp nếu chưa có ai ký */}
                    {(tpl.signedCount || 0) === 0 ? (
                      <button
                        onClick={() => handleOpenEditModal(tpl)}
                        className="text-xs font-medium text-[#6c7e93] hover:text-[#20334b] cursor-pointer"
                      >
                        Sửa
                      </button>
                    ) : null}

                    <button
                      onClick={() => handleOpenVersionModal(tpl)}
                      className="text-xs font-medium text-[#6c7e93] hover:text-[#20334b] cursor-pointer"
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
        <div className="bg-white border border-[#dce5ef] rounded-[9px] p-5 shadow-2xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#e6edf5] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#20334b]">
                Danh sách Cam kết đã ký trên thiết bị
              </h2>
              <p className="text-xs text-[#6c7e93]">
                Lưu giữ thông tin người ký, chữ ký điện tử và thời điểm ký từ hệ thống.
              </p>
            </div>
            <span className="text-xs font-medium text-[#6c7e93]">
              Tổng số: <strong>{signedConsents.length}</strong> bản ký
            </span>
          </div>

          {signedConsents.length === 0 ? (
            <div className="py-12 text-center text-[#6c7e93] text-xs">
              Chưa có bản cam kết nào được ký. Vui lòng chuyển sang tab &quot;Ký cam kết trên thiết bị&quot; để thực hiện.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[7px] border border-[#dce5ef]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#dce5ef] bg-[#f5f8fc] text-[11px] font-semibold text-[#6c7e93]">
                    <th className="py-2.5 px-3">Mã bản cam kết</th>
                    <th className="py-2.5 px-3">Tên biểu mẫu</th>
                    <th className="py-2.5 px-3">Mã lượt khám</th>
                    <th className="py-2.5 px-3">Người ký</th>
                    <th className="py-2.5 px-3">Chữ ký điện tử</th>
                    <th className="py-2.5 px-3">Thời điểm ký</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6edf5] text-xs text-[#20334b]">
                  {signedConsents.map((item) => (
                    <tr key={item.id} className="hover:bg-[#f8fafd] transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold text-[#246dce]">
                        {item.id.slice(0, 8)}...
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#20334b]">{item.templateName || 'Biểu mẫu'}</div>
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] bg-[#edf5ff] text-[#235f9e] font-mono">
                          v{item.templateVersion || 1}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono">{item.visitId}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-[#20334b]">{item.signerName}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        {item.signatureUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.signatureUrl}
                            alt="Chữ ký"
                            className="h-9 max-w-[110px] object-contain border border-[#dce5ef] rounded-[5px] bg-white p-1"
                          />
                        ) : (
                          <span className="text-[#6c7e93]">Không có ảnh</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#6c7e93]">
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
          <div className="bg-white rounded-[9px] max-w-2xl w-full p-6 shadow-xl border border-[#dce5ef] flex flex-col gap-4">
            <h3 className="text-base font-bold text-[#20334b] border-b border-[#e6edf5] pb-2">
              Tạo mới Biểu mẫu Cam kết Y tế (Phiên bản v1)
            </h3>
            <form onSubmit={handleSaveNewTemplate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-[#6c7e93] mb-1">
                  Tên biểu mẫu cam kết <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Ví dụ: Cam kết làm thủ thuật Laser CO2 Fractional"
                  className="w-full px-3 py-2 text-xs border border-[#dce5ef] rounded-[7px] focus:outline-none focus:border-[#246dce]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6c7e93] mb-1">
                  Nội dung điều khoản cam kết y khoa <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={8}
                  value={newTemplateContent}
                  onChange={(e) => setNewTemplateContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#dce5ef] rounded-[7px] focus:outline-none focus:border-[#246dce] font-sans leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e6edf5]">
                <button
                  type="button"
                  onClick={() => setShowNewTemplateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#6c7e93] hover:text-[#20334b] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#246dce] hover:bg-[#1f5cb0] rounded-[7px] shadow-2xs cursor-pointer"
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
          <div className="bg-white rounded-[9px] max-w-2xl w-full p-6 shadow-xl border border-[#dce5ef] flex flex-col gap-4">
            <h3 className="text-base font-bold text-[#20334b] border-b border-[#e6edf5] pb-2">
              Chỉnh sửa Biểu mẫu Cam kết
            </h3>
            <form onSubmit={handleSaveEditTemplate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-[#6c7e93] mb-1">
                  Tên biểu mẫu cam kết
                </label>
                <input
                  type="text"
                  value={editTemplateName}
                  onChange={(e) => setEditTemplateName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#dce5ef] rounded-[7px] focus:outline-none focus:border-[#246dce]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6c7e93] mb-1">
                  Nội dung điều khoản <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={8}
                  value={editTemplateContent}
                  onChange={(e) => setEditTemplateContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#dce5ef] rounded-[7px] focus:outline-none focus:border-[#246dce] font-sans leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e6edf5]">
                <button
                  type="button"
                  onClick={() => setShowEditTemplateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#6c7e93] hover:text-[#20334b] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#246dce] hover:bg-[#1f5cb0] rounded-[7px] shadow-2xs cursor-pointer"
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
          <div className="bg-white rounded-[9px] max-w-2xl w-full p-6 shadow-xl border border-[#dce5ef] flex flex-col gap-4">
            <h3 className="text-base font-bold text-[#20334b] border-b border-[#e6edf5] pb-2">
              Phát hành Phiên bản mới: v{selectedTemplate.version + 1}
            </h3>
            <p className="text-xs text-[#6c7e93]">
              Biểu mẫu: <strong>{selectedTemplate.name}</strong>. Phiên bản mới sẽ có hiệu lực cho các lần tạo yêu cầu ký tiếp theo.
            </p>
            <form onSubmit={handleSaveNewVersion} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-[#6c7e93] mb-1">
                  Nội dung điều khoản phiên bản mới <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={8}
                  value={versionContent}
                  onChange={(e) => setVersionContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#dce5ef] rounded-[7px] focus:outline-none focus:border-[#246dce] font-sans leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e6edf5]">
                <button
                  type="button"
                  onClick={() => setShowVersionModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#6c7e93] hover:text-[#20334b] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#246dce] hover:bg-[#1f5cb0] rounded-[7px] shadow-2xs cursor-pointer"
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
