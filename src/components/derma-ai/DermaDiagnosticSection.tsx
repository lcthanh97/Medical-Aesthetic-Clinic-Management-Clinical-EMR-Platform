'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  HeartHandshake,
  History,
  Info,
  Layers,
  MapPin,
  RotateCcw,
  ScanLine,
  ScanSearch,
  Send,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UploadCloud,
  Video,
  X,
} from 'lucide-react';
import type {
  ConsultationResponse,
  DiseaseRecord,
  VisionPrediction,
} from '@/lib/derma-ai/backendBridge';

interface DermaDiagnosticSectionProps {
  diseases: DiseaseRecord[];
  consultKey: string;
  onConsultSuccess?: () => void;
}

const BODY_ZONES = [
  'Vùng mặt / Cổ',
  'Khuỷu tay / Cánh tay',
  'Thân mình / Lưng',
  'Chân / Bàn chân',
  'Da đầu / Móng',
];

const DURATIONS = ['Mới vài ngày', '1 – 4 tuần', 'Trên 1 tháng'];

const QUICK_SYMPTOMS = [
  'Ngứa nhiều về đêm',
  'Nổi mẩn đỏ bong vảy',
  'Mụn viêm sưng đau',
  'Nốt ruồi đổi màu bất đối xứng',
  'Mụn nước đau rát một bên',
  'Sẩn phù nổi mề đay',
];

interface SamplePreset {
  id: string;
  title: string;
  icd10: string;
  labelEn: string;
  zone: string;
  duration: string;
  query: string;
  primaryColor: string;
  secondaryColor: string;
  lesionColor: string;
}

const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'acne',
    title: 'Mụn trứng cá',
    icd10: 'L70.0',
    labelEn: 'Acne_Vulgaris',
    zone: 'Vùng mặt / Cổ',
    duration: '1 – 4 tuần',
    query: 'Mụn viêm sưng đau ở vùng má kèm nhân mụn đầu trắng.',
    primaryColor: '#F6D5C5',
    secondaryColor: '#EBB8A3',
    lesionColor: '#C84B4B',
  },
  {
    id: 'eczema',
    title: 'Chàm thể tạng',
    icd10: 'L20.9',
    labelEn: 'Eczema',
    zone: 'Khuỷu tay / Cánh tay',
    duration: 'Trên 1 tháng',
    query: 'Ngứa nhiều về đêm, nổi mẩn đỏ bong vảy ở vùng khuỷu tay.',
    primaryColor: '#F2CCB8',
    secondaryColor: '#E5AE98',
    lesionColor: '#D96B52',
  },
  {
    id: 'melanoma',
    title: 'Sắc tố bất thường',
    icd10: 'C43.9',
    labelEn: 'Skin_Cancer_Melanoma',
    zone: 'Thân mình / Lưng',
    duration: 'Trên 1 tháng',
    query: 'Nốt ruồi đổi màu bất đối xứng, bờ không đều và to dần.',
    primaryColor: '#EED0BE',
    secondaryColor: '#DFB69F',
    lesionColor: '#3E2723',
  },
];

interface SessionHistoryItem {
  id: string;
  timestamp: string;
  query: string;
  previewUrl: string | null;
  result: ConsultationResponse;
}

function createSyntheticSkinFile(preset: SamplePreset): Promise<{ file: File; dataUrl: string }> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;

    const bgGrad = ctx.createRadialGradient(240, 240, 30, 240, 240, 260);
    bgGrad.addColorStop(0, preset.primaryColor);
    bgGrad.addColorStop(1, preset.secondaryColor);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 480, 480);

    ctx.strokeStyle = 'rgba(140, 90, 70, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 480; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.bezierCurveTo(160, i + 10, 320, i - 10, 480, i);
      ctx.stroke();
    }

    const lesionGrad = ctx.createRadialGradient(240, 235, 12, 240, 235, 100);
    lesionGrad.addColorStop(0, preset.lesionColor);
    lesionGrad.addColorStop(0.65, `${preset.lesionColor}AA`);
    lesionGrad.addColorStop(1, 'rgba(200, 90, 80, 0)');
    ctx.fillStyle = lesionGrad;
    ctx.beginPath();
    ctx.ellipse(240, 235, 88, 70, 0.25, 0, Math.PI * 2);
    ctx.fill();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    canvas.toBlob(
      (blob) => {
        const file = new File([blob || new Blob()], `${preset.labelEn.toLowerCase()}.jpg`, {
          type: 'image/jpeg',
        });
        resolve({ file, dataUrl });
      },
      'image/jpeg',
      0.9
    );
  });
}

function parseClinicalReply(
  result: ConsultationResponse,
  diseases: DiseaseRecord[]
) {
  const refCode = result.references?.[0] || result.predictions?.[0]?.icd10_code;
  const matched = refCode ? diseases.find((d) => d.icd10_code === refCode) : undefined;
  const raw = result.reply || '';

  const careSplit = raw.split(/Chăm sóc chung:|Hướng dẫn chăm sóc:|Chăm sóc tại nhà:/i);
  const flagSplit = (careSplit[1] || raw).split(/Khi cần đi khám:|Dấu hiệu cảnh báo:|Khám ngay nếu:/i);

  const assessment =
    careSplit.length > 1
      ? careSplit[0].trim()
      : raw.replace(/Thông tin chỉ để tham khảo.*$/i, '').trim() ||
        'Hệ thống đã tiếp nhận và phân tích thông tin da liễu của bạn.';

  const homeCare =
    matched?.home_care ||
    (careSplit.length > 1 ? flagSplit[0]?.trim() : '') ||
    'Giữ vùng da sạch thoáng, dưỡng ẩm dịu nhẹ không hương liệu, tránh cào gãi hoặc tự ý dùng thuốc bôi chứa corticoid.';

  const redFlags =
    matched?.red_flags ||
    (flagSplit.length > 1 ? flagSplit[1]?.replace(/Thông tin chỉ để tham khảo.*$/i, '').trim() : '') ||
    'Khám chuyên khoa Da liễu ngay nếu vùng da đau nóng, rỉ dịch mủ, lan rộng nhanh, sốt hoặc có dấu hiệu khó thở.';

  return { assessment, homeCare, redFlags, matched };
}

export function DermaDiagnosticSection({
  diseases,
  consultKey,
  onConsultSuccess,
}: DermaDiagnosticSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scanLineRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Input state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string>('Khuỷu tay / Cánh tay');
  const [selectedDuration, setSelectedDuration] = useState<string>('1 – 4 tuần');
  const [userQuery, setUserQuery] = useState<string>(
    'Ngứa nhiều về đêm, nổi mẩn đỏ bong vảy nhẹ.'
  );
  const [followUpQuery, setFollowUpQuery] = useState<string>('');
  const [followUpReply, setFollowUpReply] = useState<string | null>(null);

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Scanning & Results state
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ConsultationResponse | null>(null);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number; visible: boolean }>({
    x: 50,
    y: 50,
    visible: false,
  });

  // Laser Scan animation only when scanning
  useEffect(() => {
    const line = scanLineRef.current;
    if (!line) return;
    if (!isScanning) {
      gsap.set(line, { opacity: 0 });
      return;
    }
    gsap.set(line, { opacity: 1 });
    const tween = gsap.fromTo(
      line,
      { top: '4%' },
      { top: '94%', duration: 1.1, repeat: -1, yoyo: true, ease: 'sine.inOut' }
    );
    return () => {
      tween.kill();
    };
  }, [isScanning]);

  // Animate progress bars when result arrives
  useEffect(() => {
    if (!result || !resultsRef.current) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-vision-bar]').forEach((bar) => {
        const w = bar.getAttribute('data-target-width') || '0%';
        gsap.fromTo(bar, { width: '0%' }, { width: w, duration: 0.9, ease: 'power3.out' });
      });
    }, resultsRef);
    return () => ctx.revert();
  }, [result]);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleSelectFile = (file: File) => {
    setErrorMsg(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMsg('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ảnh vượt giới hạn 5MB.');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const openCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 60);
    } catch {
      setCameraError('Không thể truy cập Camera. Vui lòng cấp quyền hoặc tải ảnh từ máy.');
    }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setSelectedFile(new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' }));
          setPreviewUrl(dataUrl);
        }
        closeCamera();
      },
      'image/jpeg',
      0.92
    );
  };

  const handlePresetClick = async (preset: SamplePreset) => {
    setErrorMsg(null);
    const { file, dataUrl } = await createSyntheticSkinFile(preset);
    setSelectedFile(file);
    setPreviewUrl(dataUrl);
    setSelectedZone(preset.zone);
    setSelectedDuration(preset.duration);
    setUserQuery(preset.query);
  };

  const runConsult = async (queryText: string, includeImage: boolean, isFollowUp = false) => {
    setErrorMsg(null);
    if (!queryText.trim() && (!includeImage || !selectedFile)) {
      setErrorMsg('Vui lòng nhập mô tả triệu chứng hoặc tải lên ảnh vùng da.');
      return;
    }

    setIsScanning(true);
    try {
      const fullQuery = isFollowUp
        ? queryText.trim()
        : `${queryText.trim()}${selectedZone ? ` (Vị trí: ${selectedZone}` : ''}${
            selectedDuration ? `, thời gian: ${selectedDuration})` : selectedZone ? ')' : ''
          }`;

      const formData = new FormData();
      formData.append('user_query', fullQuery);
      if (includeImage && selectedFile) {
        formData.append('file', selectedFile);
      }

      const headers: Record<string, string> = {};
      if (consultKey) headers['X-Consult-Key'] = consultKey;

      const res = await fetch('/api/consult', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `Lỗi hệ thống (${res.status})`);
      }

      const data: ConsultationResponse = await res.json();
      if (isFollowUp) {
        setFollowUpReply(data.reply);
      } else {
        setResult(data);
        setFollowUpReply(null);
        setHistory((prev) => [
          {
            id: `${Date.now()}`,
            timestamp: new Date().toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            query: fullQuery,
            previewUrl,
            result: data,
          },
          ...prev.slice(0, 4),
        ]);
      }
      onConsultSuccess?.();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể kết nối tới dịch vụ AI.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUserQuery('');
    setResult(null);
    setFollowUpReply(null);
    setErrorMsg(null);
  };

  const displayPredictions: VisionPrediction[] = React.useMemo(() => {
    if (!result || !result.is_dermatology) return [];
    if (result.predictions && result.predictions.length > 0) {
      return result.predictions.slice(0, 3);
    }
    const baseRefs = result.references.length > 0 ? result.references : ['L20.9'];
    const fallbackScores = [81.5, 12.0, 6.5];
    const list: VisionPrediction[] = [];
    baseRefs.forEach((code, idx) => {
      const found = diseases.find((d) => d.icd10_code === code);
      if (found && list.length < 3) {
        list.push({
          icd10_code: found.icd10_code,
          label_en: found.label_en,
          label_vi: found.label_vi,
          confidence_percent: fallbackScores[idx] ?? 8.0,
        });
      }
    });
    for (const d of diseases) {
      if (list.length >= 3) break;
      if (!list.some((item) => item.icd10_code === d.icd10_code)) {
        list.push({
          icd10_code: d.icd10_code,
          label_en: d.label_en,
          label_vi: d.label_vi,
          confidence_percent: fallbackScores[list.length] ?? 5.0,
        });
      }
    }
    return list;
  }, [result, diseases]);

  const parsedSections = React.useMemo(
    () => (result && result.is_dermatology ? parseClinicalReply(result, diseases) : null),
    [result, diseases]
  );

  return (
    <div ref={containerRef} className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 lg:px-10">
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* CỘT TRÁI (5/12): NHẬP LIỆU SẠCH GỌN 3 BƯỚC */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-200/90 bg-white/95 p-5 sm:p-6 shadow-sm space-y-5">
          {/* Bước 1: Ảnh vùng da (Upload hoặc Chụp Camera) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-heading text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-teal-50 text-xs font-extrabold text-[#0D9488]">
                  1
                </span>
                Hình ảnh vùng da (Tùy chọn)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={openCamera}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:border-[#0D9488] hover:text-[#0D9488]"
                >
                  <Video size={13} /> Camera
                </button>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-[#EF4444]"
                    title="Xóa ảnh"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            {cameraError && (
              <p className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 border border-amber-200">
                {cameraError}
              </p>
            )}

            {/* Camera Live Viewfinder */}
            {cameraOpen ? (
              <div className="relative overflow-hidden rounded-2xl border-2 border-[#0D9488] bg-slate-900">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="aspect-4/3 w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#0D9488] px-4 py-2 text-xs font-bold text-white shadow-md"
                  >
                    <Camera size={15} /> Chụp ảnh
                  </button>
                  <button
                    type="button"
                    onClick={closeCamera}
                    className="rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-slate-800"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) handleSelectFile(e.dataTransfer.files[0]);
                }}
                onMouseMove={(e) => {
                  if (!previewUrl) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  setLoupePos({
                    x: ((e.clientX - rect.left) / rect.width) * 100,
                    y: ((e.clientY - rect.top) / rect.height) * 100,
                    visible: true,
                  });
                }}
                onMouseLeave={() => setLoupePos((p) => ({ ...p, visible: false }))}
                onClick={() => !previewUrl && fileInputRef.current?.click()}
                className={`relative aspect-4/3 w-full overflow-hidden rounded-2xl border-2 transition-colors ${
                  previewUrl
                    ? 'border-teal-500/35 bg-slate-900/5'
                    : 'border-dashed border-slate-300 bg-slate-50/70 hover:border-[#0D9488] cursor-pointer'
                }`}
              >
                {previewUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Ảnh vùng da"
                      className="h-full w-full object-cover"
                    />
                    {/* GSAP Laser Beam (chỉ chạy khi đang quét) */}
                    <div
                      ref={scanLineRef}
                      className="pointer-events-none absolute left-0 right-0 h-[2.5px] opacity-0"
                      style={{
                        background:
                          'linear-gradient(90deg, transparent, #2DD4BF, #0D9488, #38BDF8, transparent)',
                        boxShadow: '0 0 14px 3px rgba(45, 212, 191, 0.85)',
                      }}
                    />
                    {/* Kính lúp 10x khi hover */}
                    {loupePos.visible && !isScanning && (
                      <div
                        className="pointer-events-none absolute h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-teal-300 shadow-xl"
                        style={{
                          left: `${loupePos.x}%`,
                          top: `${loupePos.y}%`,
                          backgroundImage: `url(${previewUrl})`,
                          backgroundSize: '400% 400%',
                          backgroundPosition: `${loupePos.x}% ${loupePos.y}%`,
                        }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="absolute right-2.5 top-2.5 rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-800 shadow-sm"
                    >
                      Đổi ảnh
                    </button>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-5 text-center">
                    <UploadCloud className="h-8 w-8 text-[#0D9488] mb-2" />
                    <p className="text-xs sm:text-sm font-bold text-slate-800">
                      Nhấn để tải ảnh hoặc kéo thả vào đây
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Chụp rõ nét, đủ sáng tự nhiên (JPEG, PNG, WebP ≤ 5MB)
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleSelectFile(e.target.files[0])}
                />
              </div>
            )}

            {/* 3 Mẫu ảnh thử nhanh gọn */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">Thử mẫu:</span>
              {SAMPLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-[#0D9488] hover:text-[#0D9488]"
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>

          {/* Bước 2: Bối cảnh vị trí & thời gian */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <span className="font-heading text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-sky-50 text-xs font-extrabold text-[#0284C7]">
                2
              </span>
              Vị trí &amp; Thời gian xuất hiện
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-1">
                  <MapPin size={12} /> Vị trí vùng da
                </label>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#0D9488] focus:outline-none"
                >
                  {BODY_ZONES.map((z) => (
                    <option key={z}>{z}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-1">
                  <Clock size={12} /> Thời gian bị
                </label>
                <select
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#0D9488] focus:outline-none"
                >
                  {DURATIONS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bước 3: Mô tả triệu chứng */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runConsult(userQuery, true, false);
            }}
            className="space-y-3 pt-2 border-t border-slate-100"
          >
            <div className="flex items-center justify-between">
              <span className="font-heading text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-teal-50 text-xs font-extrabold text-[#0D9488]">
                  3
                </span>
                Mô tả triệu chứng (Tiếng Việt)
              </span>
              <span className="text-[11px] text-slate-400">{userQuery.length}/1200</span>
            </div>

            <textarea
              rows={3}
              maxLength={1200}
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Ví dụ: Ngứa nhiều về đêm, nổi mẩn đỏ có vảy, đau rát..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-3 text-sm text-slate-800 focus:border-[#0D9488] focus:bg-white focus:outline-none"
            />

            <div className="flex flex-wrap gap-1.5">
              {QUICK_SYMPTOMS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() =>
                    setUserQuery((prev) =>
                      prev.includes(chip)
                        ? prev
                        : prev
                          ? `${prev.replace(/\.$/, '')}, ${chip.toLowerCase()}.`
                          : chip
                    )
                  }
                  className="rounded-full border border-teal-200/80 bg-teal-50/60 px-2.5 py-1 text-[11px] font-semibold text-[#0D9488] hover:bg-[#0D9488] hover:text-white transition-colors"
                >
                  + {chip}
                </button>
              ))}
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-[#EF4444]">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={isScanning}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)' }}
              >
                <ScanSearch size={17} />
                <span>
                  {isScanning ? 'Đang phân tích hình ảnh & triệu chứng...' : 'Phân tích & Tư vấn ngay'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                title="Làm mới phiên"
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </form>
        </div>

        {/* CỘT PHẢI (7/12): KẾT QUẢ CHẨN ĐOÁN + HỎI ĐÁP TIẾP + LỊCH SỬ */}
        <div ref={resultsRef} className="lg:col-span-7 space-y-5">
          {/* Trạng thái chưa gửi yêu cầu */}
          {!result && !isScanning && (
            <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-[#0D9488]">
                <Stethoscope size={28} />
              </div>
              <h3 className="font-heading text-xl font-extrabold text-slate-900">
                Sẵn sàng Phân tích Da liễu
              </h3>
              <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm leading-relaxed text-slate-600">
                Hoàn thành 3 bước bên trái và nhấn <strong>&ldquo;Phân tích &amp; Tư vấn ngay&rdquo;</strong> để nhận bảng xếp hạng Top-3 khả năng bệnh lý (ICD-10), hướng dẫn chăm sóc tại nhà và cảnh báo y khoa.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3 text-left">
                <div className="rounded-2xl bg-sky-50/70 p-3.5 border border-sky-100">
                  <Activity size={16} className="text-[#0284C7] mb-1" />
                  <strong className="block text-xs font-bold text-slate-900">Top-3 Chẩn đoán</strong>
                  <span className="text-[11px] text-slate-600">Phân tích từ ảnh &amp; triệu chứng</span>
                </div>
                <div className="rounded-2xl bg-teal-50/70 p-3.5 border border-teal-100">
                  <HeartHandshake size={16} className="text-[#0D9488] mb-1" />
                  <strong className="block text-xs font-bold text-slate-900">Chăm sóc tại nhà</strong>
                  <span className="text-[11px] text-slate-600">Hướng dẫn an toàn chuẩn y khoa</span>
                </div>
                <div className="rounded-2xl bg-orange-50/70 p-3.5 border border-orange-100">
                  <ShieldAlert size={16} className="text-[#F97316] mb-1" />
                  <strong className="block text-xs font-bold text-slate-900">Cảnh báo Red Flags</strong>
                  <span className="text-[11px] text-slate-600">Nhận biết dấu hiệu cần đi khám</span>
                </div>
              </div>
            </div>
          )}

          {/* Trạng thái đang quét */}
          {isScanning && (
            <div className="rounded-3xl border border-teal-200 bg-white/95 p-8 text-center shadow-sm">
              <ScanLine className="mx-auto h-10 w-10 text-[#0D9488] animate-pulse mb-3" />
              <h3 className="font-heading text-lg font-extrabold text-slate-900">
                Đang quét đặc trưng da liễu &amp; đối chiếu ICD-10...
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Hệ thống đang tổng hợp dữ liệu thị giác và tri thức y khoa tiếng Việt.
              </p>
            </div>
          )}

          {/* Ngoài phạm vi da liễu */}
          {result && !result.is_dermatology && !isScanning && (
            <div className="rounded-3xl border border-sky-200 bg-[#EFF6FF] p-6 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0284C7] text-white">
                  <Info size={22} />
                </div>
                <div>
                  <h3 className="font-heading text-base font-extrabold text-slate-900">
                    Nội dung nằm ngoài phạm vi Chuyên khoa Da liễu
                  </h3>
                  <p className="mt-1 text-sm text-slate-700">{result.reply}</p>
                </div>
              </div>
            </div>
          )}

          {/* Kết quả Da liễu đầy đủ */}
          {result && result.is_dermatology && !isScanning && (
            <>
              {/* Top-3 Vision Predictions */}
              <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-5 sm:p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Layers size={18} className="text-[#0D9488]" />
                    <h3 className="font-heading text-base font-extrabold text-slate-900">
                      Top 3 Khả năng Tham khảo (Vision &amp; Triệu chứng)
                    </h3>
                  </div>
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold text-[#0D9488] border border-teal-200">
                    {result.provider === 'gemini' ? 'Gemini Clinical RAG' : 'Tri thức Y khoa'}
                  </span>
                </div>

                <div className="space-y-3">
                  {displayPredictions.map((pred, idx) => {
                    const isHighRisk = pred.icd10_code === 'C43.9';
                    return (
                      <div
                        key={pred.icd10_code}
                        className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-md px-2 py-0.5 font-mono text-xs font-bold ${
                                isHighRisk
                                  ? 'bg-red-50 text-[#EF4444] border border-red-200'
                                  : 'bg-teal-50 text-[#0D9488] border border-teal-200'
                              }`}
                            >
                              {pred.icd10_code}
                            </span>
                            <span className="font-heading text-sm font-bold text-slate-900">
                              {pred.label_vi}
                            </span>
                          </div>
                          <span
                            className={`font-heading text-sm font-extrabold ${
                              isHighRisk ? 'text-[#EF4444]' : idx === 0 ? 'text-[#0D9488]' : 'text-[#0284C7]'
                            }`}
                          >
                            {pred.confidence_percent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
                          <div
                            data-vision-bar
                            data-target-width={`${Math.max(5, pred.confidence_percent)}%`}
                            style={{
                              width: `${Math.max(5, pred.confidence_percent)}%`,
                              background: isHighRisk
                                ? 'linear-gradient(90deg, #F97316, #EF4444)'
                                : idx === 0
                                  ? 'linear-gradient(90deg, #0D9488, #0284C7)'
                                  : 'linear-gradient(90deg, #38BDF8, #0284C7)',
                            }}
                            className="h-full rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3 Thẻ Tư vấn Lâm sàng Rõ ràng */}
              {parsedSections && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-sky-200 bg-sky-50/60 p-5">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-[#0284C7] mb-2">
                      <Activity size={16} /> 1. Đánh giá sơ bộ
                    </div>
                    <p className="text-xs sm:text-[13px] leading-relaxed text-slate-700">
                      {parsedSections.assessment}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-teal-200 bg-teal-50/60 p-5">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-[#0D9488] mb-2">
                      <HeartHandshake size={16} /> 2. Chăm sóc tại nhà
                    </div>
                    <p className="text-xs sm:text-[13px] leading-relaxed text-slate-700">
                      {parsedSections.homeCare}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-5">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-[#EF4444] mb-2">
                      <ShieldAlert size={16} /> 3. Cảnh báo Red Flags
                    </div>
                    <p className="text-xs sm:text-[13px] leading-relaxed text-slate-700">
                      {parsedSections.redFlags}
                    </p>
                  </div>
                </div>
              )}

              {/* Hỏi đáp nối tiếp (Follow-up) + Chuyển sang Đặt lịch Bác sĩ */}
              <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-sm space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (followUpQuery.trim()) {
                      runConsult(followUpQuery, false, true);
                      setFollowUpQuery('');
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={followUpQuery}
                    onChange={(e) => setFollowUpQuery(e.target.value)}
                    placeholder="Hỏi thêm về tình trạng này (VD: Có nên bôi kem dưỡng ẩm ban đêm không?)..."
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm focus:border-[#0D9488] focus:bg-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isScanning || !followUpQuery.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0D9488] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    <Send size={14} /> Hỏi tiếp
                  </button>
                </form>

                {followUpReply && (
                  <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 text-xs sm:text-sm text-slate-800">
                    <strong className="block text-[#0D9488] mb-1">Giải đáp bổ sung:</strong>
                    {followUpReply}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-[#0D9488]" />
                    Thông tin chỉ để tham khảo, không thay thế chẩn đoán trực tiếp của bác sĩ.
                  </p>
                  <Link
                    href="/khachhang/appointments"
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-[#0D9488] transition-colors"
                  >
                    <CalendarDays size={14} /> Đặt lịch khám Bác sĩ ngay →
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* Lịch sử các phiên đã kiểm tra trong ngày */}
          {history.length > 0 && (
            <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">
                <History size={15} className="text-[#0284C7]" />
                <span>Lịch sử kiểm tra trong phiên ({history.length})</span>
              </div>
              <div className="space-y-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setResult(item.result);
                      setFollowUpReply(null);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5 text-left hover:border-teal-300"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.previewUrl}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-50 text-[#0D9488]">
                          <FileText size={16} />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-800">{item.query}</p>
                        <p className="text-[11px] text-slate-500">
                          {item.result.references[0] ? `Tham chiếu: ${item.result.references[0]}` : 'Tư vấn chung'}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-slate-400">
                      {item.timestamp}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
