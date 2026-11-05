export interface AuditViewModel {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  ipAddress: string | null;
  accountId: string | null;
  username: string | null;
  createdAt: string;
}

export interface AuditFilters {
  query?: string;
  entity?: string;
  accountId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditPage {
  items: AuditViewModel[];
  total: number;
  page: number;
  pageSize: number;
}
