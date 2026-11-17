const vnd = new Intl.NumberFormat('vi-VN');

export function money(value: string | null) {
  if (value === null) return 'Chưa xác định';
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return '—';
  const magnitude = BigInt(match[2]) + (match[3]?.[0] >= '5' ? 1n : 0n);
  return `${vnd.format(match[1] ? -magnitude : magnitude)} đ`;
}

export const dayLabel = (date: string) => date.split('-').reverse().join('/');
export const shortDay = (date: string) => date.slice(5).split('-').reverse().join('/');
export const panel = 'rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5';
export const control = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-600';
export const action = 'rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';
export const secondaryAction = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-blue-600';
