import { NextRequest, NextResponse } from 'next/server';

export interface DiseaseRecord {
  id: number;
  icd10_code: string;
  label_en: string;
  label_vi: string;
  symptoms: string;
  home_care: string;
  red_flags: string;
  created_at: string;
  updated_at: string;
}

export interface VisionPrediction {
  icd10_code: string;
  label_en: string;
  label_vi: string;
  confidence_percent: number;
}

export interface ConsultationResponse {
  is_dermatology: boolean;
  is_urgent?: boolean;
  reply: string;
  vision_status: 'not_requested' | 'unavailable' | 'ready';
  predictions: VisionPrediction[];
  references: string[];
  provider: 'local' | 'gemini';
  log_id: number | null;
}

export interface LogRecord {
  id: number;
  user_query: string;
  image_path: string | null;
  vision_top_prediction: string | null;
  vision_confidence: number | null;
  is_dermatology: boolean;
  ai_response: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}

const FASTAPI_BASE_URL = (process.env.DERMA_FASTAPI_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export async function proxyToFastApi(
  req: NextRequest,
  endpointPath: string,
  initOverrides?: RequestInit
): Promise<NextResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const url = new URL(`${FASTAPI_BASE_URL}${endpointPath}`);
    req.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    const headers = new Headers();
    const adminKey = req.headers.get('X-Admin-Key') || process.env.DERMA_ADMIN_KEY || '';
    if (adminKey) headers.set('X-Admin-Key', adminKey);

    const contentType = req.headers.get('content-type');
    if (contentType) {
      headers.set('content-type', contentType);
    }

    const response = await fetch(url.toString(), {
      method: req.method,
      headers,
      body: initOverrides?.body !== undefined
        ? initOverrides.body
        : req.method !== 'GET' && req.method !== 'HEAD'
          ? await req.arrayBuffer()
          : undefined,
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'error',
    });

    clearTimeout(timeout);

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json',
        'x-derma-backend': 'fastapi',
      },
    });
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

