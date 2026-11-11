import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';

export const MAX_TREATMENT_IMAGE_BYTES = 10 * 1024 * 1024;
export type ClinicalImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

type ImageStorageConfig = { client: S3Client; bucket: string };

let storageConfig: ImageStorageConfig | null | undefined;

function getStorageConfig(): ImageStorageConfig | null {
  if (storageConfig !== undefined) return storageConfig;
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const region = process.env.AWS_REGION;
  const bucket = process.env.NEON_STORAGE_BUCKET || process.env.NEON_CLINICAL_RESULTS_BUCKET || 'clinical-results';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
    storageConfig = null;
    return null;
  }
  const parsed = new URL(endpoint);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('IMAGE_STORAGE_CONFIG_INVALID');
  }
  storageConfig = {
    bucket,
    client: new S3Client({
      endpoint: parsed.origin,
      region,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
  return storageConfig;
}

export function isTreatmentImageStorageConfigured(): boolean {
  try {
    return Boolean(getStorageConfig());
  } catch {
    return false;
  }
}

export function detectClinicalImageMime(bytes: Buffer): ClinicalImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export async function normalizeClinicalImage(input: Buffer, mimeType: ClinicalImageMime): Promise<Buffer> {
  let image = sharp(input, { limitInputPixels: 50_000_000, failOn: 'error' }).rotate();
  if (mimeType === 'image/jpeg') image = image.jpeg({ quality: 94, mozjpeg: true });
  else if (mimeType === 'image/png') image = image.png({ compressionLevel: 8 });
  else image = image.webp({ quality: 94 });
  return image.toBuffer();
}

export async function putPrivateTreatmentImage(key: string, body: Buffer, mimeType: ClinicalImageMime): Promise<void> {
  const config = getStorageConfig();
  if (!config) throw new Error('IMAGE_STORAGE_NOT_CONFIGURED');
  await config.client.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: body,
    ContentType: mimeType,
    CacheControl: 'private, no-store, max-age=0',
    Metadata: { privacy: 'clinical' },
  }));
}

export async function deletePrivateTreatmentImage(key: string): Promise<void> {
  const config = getStorageConfig();
  if (!config) throw new Error('IMAGE_STORAGE_NOT_CONFIGURED');
  await config.client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}

export async function getPrivateTreatmentImage(key: string): Promise<{ bytes: Uint8Array; contentType: string | undefined }> {
  const config = getStorageConfig();
  if (!config) throw new Error('IMAGE_STORAGE_NOT_CONFIGURED');
  const result = await config.client.send(new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  }));
  if (!result.Body) throw new Error('IMAGE_OBJECT_EMPTY');
  return { bytes: await result.Body.transformToByteArray(), contentType: result.ContentType };
}
