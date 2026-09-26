import { describe, expect, it } from 'vitest';
import { UserRole } from '@/types';
import { clinicOnboardingSchema, tenantTeamMemberSchema } from './schemas';

const clinic = (overrides: Record<string, unknown> = {}) => ({
  clinicName: 'Centro Integral',
  contactEmail: 'contacto@example.com',
  timezone: 'America/Guayaquil',
  locale: 'es',
  specialtyCodes: ['PSYCHOLOGY'],
  adminFirstName: 'Ana',
  adminLastName: 'Vega',
  adminEmail: 'ana@example.com',
  adminPassword: 'Secret123',
  adminProvidesCare: false,
  ...overrides,
});

const member = (overrides: Record<string, unknown> = {}) => ({
  email: 'member@example.com',
  password: 'Secret123',
  firstName: 'Luis',
  lastName: 'Paz',
  role: UserRole.ASISTENTE,
  ...overrides,
});

describe('clinicOnboardingSchema', () => {
  it('normalizes emails and specialty codes, removing duplicates', () => {
    const result = clinicOnboardingSchema.parse(clinic({
      contactEmail: ' Contacto@Example.com ',
      adminEmail: ' Ana@Example.com ',
      specialtyCodes: [' psychology ', 'NUTRITION', 'PSYCHOLOGY'],
    }));
    expect(result.contactEmail).toBe('contacto@example.com');
    expect(result.adminEmail).toBe('ana@example.com');
    expect(result.specialtyCodes).toEqual(['PSYCHOLOGY', 'NUTRITION']);
  });

  it('requires at least one nonblank specialty after normalization', () => {
    expect(clinicOnboardingSchema.safeParse(clinic({ specialtyCodes: ['  ', ''] })).success).toBe(false);
  });

  it('requires the clinical admin specialty to belong to the selection', () => {
    expect(clinicOnboardingSchema.safeParse(clinic({ adminProvidesCare: true })).success).toBe(false);
    expect(clinicOnboardingSchema.safeParse(clinic({ adminProvidesCare: true, adminSpecialtyCode: 'NUTRITION' })).success).toBe(false);
    expect(clinicOnboardingSchema.parse(clinic({ adminProvidesCare: true, adminSpecialtyCode: ' psychology ' })).adminSpecialtyCode).toBe('PSYCHOLOGY');
  });

  it('allows a nonclinical admin without clinical metadata and rejects contradictory metadata', () => {
    expect(clinicOnboardingSchema.safeParse(clinic()).success).toBe(true);
    expect(clinicOnboardingSchema.safeParse(clinic({ adminProfessionalTitle: 'Psicóloga' })).success).toBe(false);
  });

  it('requires valid emails and the existing minimum password length', () => {
    expect(clinicOnboardingSchema.safeParse(clinic({ adminEmail: 'invalid' })).success).toBe(false);
    expect(clinicOnboardingSchema.safeParse(clinic({ adminPassword: 'short' })).success).toBe(false);
  });
});

describe('tenantTeamMemberSchema', () => {
  it.each([UserRole.ADMIN, UserRole.CLIENTE, UserRole.ASISTENTE])('accepts %s without a profile', (role) => {
    expect(tenantTeamMemberSchema.safeParse(member({ role })).success).toBe(true);
  });

  it.each([UserRole.PROFESIONAL, UserRole.PSICOLOGO])('requires one specialty profile for %s', (role) => {
    expect(tenantTeamMemberSchema.safeParse(member({ role })).success).toBe(false);
    expect(tenantTeamMemberSchema.safeParse(member({ role, professionalProfile: { specialtyId: 'specialty-1', isActive: true } })).success).toBe(true);
    expect(tenantTeamMemberSchema.safeParse(member({ role, professionalProfile: { specialtyId: '' } })).success).toBe(false);
  });

  it('allows an admin clinical profile but prohibits one for an assistant', () => {
    const professionalProfile = { specialtyId: 'specialty-1', isActive: true };
    expect(tenantTeamMemberSchema.safeParse(member({ role: UserRole.ADMIN, professionalProfile })).success).toBe(true);
    expect(tenantTeamMemberSchema.safeParse(member({ role: UserRole.ASISTENTE, professionalProfile })).success).toBe(false);
  });

  it('rejects unsupported roles, missing passwords, and tenant/provider fields', () => {
    expect(tenantTeamMemberSchema.safeParse(member({ role: UserRole.SOPORTE })).success).toBe(false);
    expect(tenantTeamMemberSchema.safeParse(member({ password: undefined })).success).toBe(false);
    expect(tenantTeamMemberSchema.safeParse(member({ password: 'short' })).success).toBe(false);
    expect(tenantTeamMemberSchema.safeParse(member({ tenantId: 'other-tenant' })).success).toBe(false);
    expect(tenantTeamMemberSchema.safeParse(member({ managedByProvider: true })).success).toBe(false);
    expect(tenantTeamMemberSchema.safeParse(member({ role: UserRole.PROFESIONAL, specialtyIds: ['s1', 's2'], professionalProfile: { specialtyId: 's1' } })).success).toBe(false);
  });
});
