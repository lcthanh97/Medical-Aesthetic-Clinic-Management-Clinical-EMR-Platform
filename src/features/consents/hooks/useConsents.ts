'use client';

import { useState, useEffect, useCallback } from 'react';
import { consentsApi } from '../api/consentsApi';
import type {
  ConsentTemplateDto,
  SignedConsentDto,
  CreateConsentTemplateDto,
  UpdateConsentTemplateDto,
  CreateTemplateVersionDto,
  SignConsentDto,
} from '../types/consents.types';

export function useConsents(initialVisitId?: string) {
  const [templates, setTemplates] = useState<ConsentTemplateDto[]>([]);
  const [signedConsents, setSignedConsents] = useState<SignedConsentDto[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ConsentTemplateDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await consentsApi.getTemplates();
      if (res.success && res.data) {
        setTemplates(res.data);
        if (res.data.length > 0 && !selectedTemplate) {
          setSelectedTemplate(res.data[0]);
        }
      } else {
        setError(res.error?.code || res.message || 'Lỗi khi tải danh sách biểu mẫu');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ khi tải biểu mẫu');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTemplate]);

  const loadSignedConsents = useCallback(async (visitId?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await consentsApi.getSignedConsents(visitId || initialVisitId);
      if (res.success && res.data) {
        setSignedConsents(res.data);
      } else {
        setError(res.error?.code || res.message || 'Lỗi khi tải danh sách cam kết đã ký');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ khi tải cam kết đã ký');
    } finally {
      setIsLoading(false);
    }
  }, [initialVisitId]);

  useEffect(() => {
    loadTemplates();
    loadSignedConsents();
  }, [loadTemplates, loadSignedConsents]);

  const handleCreateTemplate = async (dto: CreateConsentTemplateDto) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await consentsApi.createTemplate(dto);
      if (res.success && res.data) {
        await loadTemplates();
        setSelectedTemplate(res.data);
        return res.data;
      }
      throw new Error(res.error?.code || res.message || 'Không thể tạo biểu mẫu');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTemplate = async (id: string, dto: UpdateConsentTemplateDto) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await consentsApi.updateTemplate(id, dto);
      if (res.success && res.data) {
        await loadTemplates();
        setSelectedTemplate(res.data);
        return res.data;
      }
      throw new Error(res.error?.code || res.message || 'Không thể cập nhật biểu mẫu');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateVersion = async (templateId: string, dto: CreateTemplateVersionDto) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await consentsApi.createTemplateVersion(templateId, dto);
      if (res.success && res.data) {
        await loadTemplates();
        setSelectedTemplate(res.data);
        return res.data;
      }
      throw new Error(res.error?.code || res.message || 'Không thể nâng phiên bản');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignConsent = async (dto: SignConsentDto) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await consentsApi.signConsent(dto);
      if (res.success && res.data) {
        await loadSignedConsents();
        await loadTemplates();
        return res.data;
      }
      throw new Error(res.error?.code || res.message || 'Lỗi khi ký cam kết');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    templates,
    signedConsents,
    selectedTemplate,
    setSelectedTemplate,
    isLoading,
    isSubmitting,
    error,
    refreshTemplates: loadTemplates,
    refreshSignedConsents: loadSignedConsents,
    createTemplate: handleCreateTemplate,
    updateTemplate: handleUpdateTemplate,
    createTemplateVersion: handleCreateVersion,
    signConsent: handleSignConsent,
  };
}
