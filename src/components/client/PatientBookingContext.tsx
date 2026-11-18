'use client'

import { createContext, useContext, type ReactNode } from 'react'

const PatientBookingContext = createContext<string | null>(null)

export function PatientBookingProvider({ name, children }: { name: string | null; children: ReactNode }) {
  return <PatientBookingContext.Provider value={name}>{children}</PatientBookingContext.Provider>
}

export function usePatientBookingName() {
  return useContext(PatientBookingContext)
}
