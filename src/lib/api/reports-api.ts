import { apiClient } from './client';

export interface ActivityCounts {
  /** Appointments that start in the period, whatever their status. */
  appointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  /** Encounters started in the period. */
  encounters: number;
}

export interface ActivityReport {
  from: string;
  to: string;
  branchId: string | null;
  totals: ActivityCounts;
  appointmentsByStatus: Record<string, number>;
  encountersByType: Record<string, number>;
  /** `branchId` is null for the appointments from before the clinic had branches. */
  branches: (ActivityCounts & { branchId: string | null; name: string; isActive: boolean })[];
  professionals: (ActivityCounts & { professionalId: string; name: string })[];
}

export interface ActivityReportParams {
  /** Start of the period, inclusive (ISO). */
  from: string;
  /** End of the period, exclusive (ISO). */
  to: string;
  branchId?: string;
}

export const reportsApi = {
  /** Counts of appointments and encounters; it carries no clinical content. */
  activity: (tenantId: string, params: ActivityReportParams) =>
    apiClient.get<ActivityReport>(`/tenants/${tenantId}/reports/activity`, { params }),
};
