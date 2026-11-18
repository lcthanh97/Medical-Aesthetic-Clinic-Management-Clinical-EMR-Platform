const destinations = new Set([
  '/khachhang#dat-lich',
  '/khachhang/appointments#dat-lich',
  '/khachhang#ai-chan-doan',
  '/khachhang/ai-chan-doan',
  '/ai-chan-doan',
])

export function patientReturnPath(value: string | null | undefined) {
  return value && destinations.has(value) ? value : '/khachhang/profile'
}

export function patientAuthLink(kind: 'dang-nhap' | 'dang-ky', destination: string) {
  return `/khachhang/${kind}?next=${encodeURIComponent(patientReturnPath(destination))}`
}
