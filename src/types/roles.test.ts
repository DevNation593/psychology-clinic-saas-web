import { describe, expect, it } from 'vitest';
import { ROLE_LABELS } from '@/lib/constants';
import { UserRole, type User } from './index';
import { hasActiveProfessionalProfile, isAdminRole, isProfessionalRole, toCanonicalRole } from './guards';

describe('role families', () => {
  it.each([UserRole.CLIENTE, UserRole.ADMIN])('%s is administrative', (role) => {
    expect(isAdminRole(role)).toBe(true);
    expect(isProfessionalRole(role)).toBe(false);
  });

  it.each([UserRole.PSICOLOGO, UserRole.PROFESIONAL])('%s is professional', (role) => {
    expect(isProfessionalRole(role)).toBe(true);
    expect(isAdminRole(role)).toBe(false);
  });

  it('does not classify an assistant as administrative or professional', () => {
    expect(isAdminRole(UserRole.ASISTENTE)).toBe(false);
    expect(isProfessionalRole(UserRole.ASISTENTE)).toBe(false);
  });

  it('canonicalizes legacy roles and preserves the others', () => {
    expect(toCanonicalRole(UserRole.CLIENTE)).toBe(UserRole.ADMIN);
    expect(toCanonicalRole(UserRole.PSICOLOGO)).toBe(UserRole.PROFESIONAL);
    expect(toCanonicalRole(UserRole.ASISTENTE)).toBe(UserRole.ASISTENTE);
  });

  it('labels canonical and legacy roles', () => {
    expect(ROLE_LABELS).toMatchObject({
      ADMIN: 'Administrador', PROFESIONAL: 'Profesional', ASISTENTE: 'Asistente',
      SOPORTE: 'Soporte', PACIENTE: 'Paciente', CLIENTE: 'Administrador',
      PSICOLOGO: 'Psicólogo/a',
    });
  });

  it('recognizes an active profile regardless of role', () => {
    const admin = { role: UserRole.ADMIN, professionalProfile: { isActive: true } } as User;
    expect(hasActiveProfessionalProfile(admin)).toBe(true);
    expect(hasActiveProfessionalProfile({ ...admin, professionalProfile: { ...admin.professionalProfile!, isActive: false } })).toBe(false);
    expect(hasActiveProfessionalProfile({ ...admin, professionalProfile: undefined })).toBe(false);
  });
});
