'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { DermaCanvas3D } from './DermaCanvas3D';
import { DermaHeader, type ActiveTab } from './DermaHeader';
import { DermaDiagnosticSection } from './DermaDiagnosticSection';
import { DermaDiseaseCrudSection } from './DermaDiseaseCrudSection';
import type { DiseaseRecord, PaginatedResponse } from '@/lib/derma-ai/backendBridge';

export function DermaAiExperience() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('consult');
  const [systemOnline, setSystemOnline] = useState<boolean>(true);
  const [diseases, setDiseases] = useState<DiseaseRecord[]>([]);
  const [adminKey, setAdminKey] = useState<string>('');
  const [consultKey, setConsultKey] = useState<string>('');

  // Load saved keys from sessionStorage if available
  useEffect(() => {
    try {
      const savedAdmin = sessionStorage.getItem('derma_admin_key') || '';
      const savedConsult = sessionStorage.getItem('derma_consult_key') || '';
      setAdminKey(savedAdmin);
      setConsultKey(savedConsult);
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleSaveKeys = (newAdminKey: string, newConsultKey: string) => {
    setAdminKey(newAdminKey);
    setConsultKey(newConsultKey);
    try {
      sessionStorage.setItem('derma_admin_key', newAdminKey);
      sessionStorage.setItem('derma_consult_key', newConsultKey);
    } catch {
      // ignore storage errors
    }
  };

  const refreshDiseasesAndHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/diseases?page=1&page_size=50');
      if (res.ok) {
        const data: PaginatedResponse<DiseaseRecord> = await res.json();
        setDiseases(data.items || []);
        setSystemOnline(true);
      } else {
        setSystemOnline(false);
      }
    } catch {
      setSystemOnline(false);
    }
  }, []);

  useEffect(() => {
    refreshDiseasesAndHealth();
  }, [refreshDiseasesAndHealth]);

  return (
    <div className="relative min-h-screen text-slate-800 selection:bg-teal-500 selection:text-white font-body">
      {/* Interactive Three.js 3D Epidermis & Collagen Background */}
      <DermaCanvas3D />

      {/* Top Glassmorphism Header & Navigation */}
      <DermaHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        systemOnline={systemOnline}
        diseaseCount={diseases.length || 10}
        adminKey={adminKey}
        consultKey={consultKey}
        onSaveKeys={handleSaveKeys}
      />

      {/* Main Content Area */}
      <main className="relative z-10">
        {activeTab === 'consult' ? (
          <DermaDiagnosticSection
            diseases={diseases}
            consultKey={consultKey}
            onConsultSuccess={refreshDiseasesAndHealth}
          />
        ) : (
          <DermaDiseaseCrudSection
            adminKey={adminKey}
            onDiseasesUpdated={refreshDiseasesAndHealth}
          />
        )}
      </main>
    </div>
  );
}
