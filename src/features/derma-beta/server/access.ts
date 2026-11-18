import 'server-only'

import { getDoctorSession } from '@/server/auth/doctor-session'
import { getStaffSession } from '@/server/auth/staff-session'

export function betaConfig() {
  const endpoint = process.env.DERMA_BETA_URL
  const key = process.env.DERMA_BETA_SERVICE_KEY
  if (!endpoint || !key || key.length < 32) return null
  try {
    const url = new URL('/api/consult', endpoint)
    const local = process.env.NODE_ENV !== 'production' && url.hostname === '127.0.0.1'
    return url.protocol === 'https:' || local ? { url, key } : null
  } catch {
    return null
  }
}

export async function getBetaReviewer() {
  const [doctor, admin] = await Promise.all([getDoctorSession(), getStaffSession('admin')])
  return doctor?.accountId ?? admin?.accountId ?? null
}
