'use client'

import { useEffect, useState } from 'react'
import { getCustomerAppointmentSlots } from '../actions'

type Slot = { time: string; status: 'past' | 'booked' | 'available' }

export function useCustomerAppointmentSlots(date: string, employeeId = '', roomId = '') {
  const key = JSON.stringify([date, employeeId, roomId])
  const [result, setResult] = useState<{ key: string; slots: Slot[]; error?: string } | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!date) return
    let active = true
    getCustomerAppointmentSlots(date, employeeId, roomId).then((response) => {
      if (!active) return
      setResult(response.success
        ? { key, slots: response.data }
        : { key, slots: [], error: response.error })
    }).catch(() => {
      if (active) setResult({ key, slots: [], error: 'Không thể tải khung giờ. Vui lòng thử lại.' })
    })
    return () => { active = false }
  }, [date, employeeId, roomId, key, attempt])

  const current = result?.key === key ? result : null
  return {
    slots: current?.slots ?? [],
    error: current?.error,
    loading: Boolean(date) && !current,
    reload: () => {
      setResult(null)
      setAttempt((value) => value + 1)
    },
  }
}
