import { apiClient } from './client';

export interface UserPermissionEntry {
  key: string;
  group: string;
  label: string;
  /** Whether this user has it today. */
  allowed: boolean;
  /** 'role': the role has it and it can be withdrawn. 'grant': the role lacks it and it can be given. */
  source: 'role' | 'grant';
}

export interface UserPermissionChanges {
  /** Permissions of the role taken away from the user. */
  revoked: string[];
  /** Permissions the role lacks, given to the user. */
  granted: string[];
}

export interface UserPermissions {
  userId: string;
  role: string;
  /** False for the account holder, who always keeps every permission. */
  restrictable: boolean;
  effective: string[];
  permissions: UserPermissionEntry[];
}

const path = (tenantId: string, userId: string) =>
  `/tenants/${tenantId}/users/${userId}/permissions`;

export const userPermissionsApi = {
  /** `me` reads the signed-in user; another user is for the account holder only. */
  get: (tenantId: string, userId: string) => apiClient.get<UserPermissions>(path(tenantId, userId)),
  /** Replaces what was withdrawn from the user and what was given to them. */
  replace: (tenantId: string, userId: string, changes: UserPermissionChanges) =>
    apiClient.put<UserPermissions>(path(tenantId, userId), changes),
};
