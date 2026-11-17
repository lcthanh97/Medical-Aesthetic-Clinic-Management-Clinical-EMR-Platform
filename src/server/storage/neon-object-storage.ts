import 'server-only';

import { AwsClient } from 'aws4fetch';

const BUCKET = 'clinical-results';
const EXPIRY_SECONDS = 600;
const UPLOAD_TIMEOUT_MS = 12_000;
const DELETE_TIMEOUT_MS = 5_000;

function getStorageClient() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const region = process.env.AWS_REGION;
  if (!accessKeyId || !secretAccessKey || !endpoint || !region) {
    throw new Error('Thiếu cấu hình Neon Object Storage cho ảnh theo dõi.');
  }
  return { client: new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region }), endpoint: endpoint.replace(/\/$/, '') };
}

function objectUrl(key: string) {
  const { endpoint } = getStorageClient();
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  return `${endpoint}/${BUCKET}/${encodedKey}`;
}

export async function uploadTreatmentImage(key: string, contentType: string, body: Buffer) {
  const { client } = getStorageClient();
  const request = await client.sign(objectUrl(key), {
    method: 'PUT',
    headers: { 'content-type': contentType },
  });

  // Both attempts use the same object key, so retrying a dropped response cannot duplicate the file.
  for (let attempt = 0; attempt < 2; attempt++) {
    const signal = AbortSignal.timeout(UPLOAD_TIMEOUT_MS);
    const response = await fetch(request.url, {
      method: 'PUT',
      headers: request.headers,
      body: body as unknown as BodyInit,
      signal,
      cache: 'no-store',
    }).catch((error: unknown) => {
      if (attempt === 0) return null;
      throw error;
    });
    if (!response) continue;
    void response.body?.cancel().catch(() => undefined);
    if (response.ok) return;
    if (attempt === 0 && (response.status === 429 || response.status >= 500)) continue;
    throw new Error('Neon Object Storage từ chối lưu tệp.', { cause: { code: response.status } });
  }
}

export async function deleteTreatmentImageObject(key: string) {
  const { client } = getStorageClient();
  const request = await client.sign(objectUrl(key), { method: 'DELETE' });
  const response = await fetch(request, { signal: AbortSignal.timeout(DELETE_TIMEOUT_MS), cache: 'no-store' });
  void response.body?.cancel().catch(() => undefined);
  if (!response.ok && response.status !== 404) throw new Error(`Không thể hoàn tác tệp ảnh (${response.status}).`);
}

export async function getTreatmentImageUrl(key: string) {
  const { client } = getStorageClient();
  const request = new Request(`${objectUrl(key)}?X-Amz-Expires=${EXPIRY_SECONDS}`, { method: 'GET' });
  const signed = await client.sign(request, { aws: { signQuery: true } });
  return signed.url.toString();
}

export function isStoredTreatmentImage(value: string) {
  return value.startsWith('treatment-images/');
}

export function isStoredClinicalObject(value: string) {
  return value.startsWith('treatment-images/') || value.startsWith('cls-results/');
}
