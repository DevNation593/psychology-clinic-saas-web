import { describe, expect, it } from 'vitest';
import { UserRole, type User } from '@/types';
import { assignableUsers } from './task-assignees';

const user = (id: string, role: UserRole) => ({ id, role, firstName: id, lastName: 'Test' }) as User;
const clinic = [
  user('admin-1', UserRole.ADMIN),
  user('pro-1', UserRole.PROFESIONAL),
  user('pro-2', UserRole.PROFESIONAL),
];

describe('assignableUsers', () => {
  it.each([UserRole.PROFESIONAL, UserRole.PSICOLOGO])('limits a %s to themselves', (role) => {
    expect(assignableUsers(clinic, user('pro-1', role)).map((item) => item.id)).toEqual(['pro-1']);
  });

  it('still offers the professional when the clinic list has not loaded or omits them', () => {
    const actor = user('pro-9', UserRole.PROFESIONAL);
    expect(assignableUsers(undefined, actor)).toEqual([actor]);
    expect(assignableUsers(clinic, actor)).toEqual([actor]);
  });

  it.each([UserRole.ADMIN, UserRole.CLIENTE, UserRole.ASISTENTE])('offers every clinic user to %s', (role) => {
    expect(assignableUsers(clinic, user('admin-1', role))).toEqual(clinic);
  });

  it('offers nobody without a session or a loaded list', () => {
    expect(assignableUsers(undefined, null)).toEqual([]);
    expect(assignableUsers(undefined, user('admin-1', UserRole.ADMIN))).toEqual([]);
  });
});
