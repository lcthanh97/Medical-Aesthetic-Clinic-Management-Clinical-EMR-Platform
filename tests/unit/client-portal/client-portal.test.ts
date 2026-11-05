import { describe, expect, it } from 'vitest'
import { selectMostActivePatient } from '@/features/client-portal/server/getClientPortalData'

describe('Client portal patient selection', () => {
  it('chọn bệnh nhân có nhiều dữ liệu lâm sàng nhất', () => {
    expect(selectMostActivePatient([
      { id: 'empty', _count: { visits: 0, appointments: 1, treatmentPlans: 0 } },
      { id: 'complete', _count: { visits: 8, appointments: 3, treatmentPlans: 2 } },
      { id: 'medium', _count: { visits: 4, appointments: 2, treatmentPlans: 1 } },
    ])).toBe('complete')
  })

  it('trả null khi database không có bệnh nhân', () => {
    expect(selectMostActivePatient([])).toBeNull()
  })

  it('không làm thay đổi thứ tự đầu vào', () => {
    const source = [
      { id: 'a', _count: { visits: 0, appointments: 0, treatmentPlans: 0 } },
      { id: 'b', _count: { visits: 2, appointments: 0, treatmentPlans: 0 } },
    ]
    selectMostActivePatient(source)
    expect(source.map(x => x.id)).toEqual(['a', 'b'])
  })
})
