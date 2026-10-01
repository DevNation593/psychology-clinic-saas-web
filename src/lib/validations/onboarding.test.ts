import { describe, expect, it } from 'vitest';
import { UserRole } from '@/types';
import { clinicOnboardingSchema, tenantTeamMemberSchema, tenantTeamMemberUpdateSchema } from './schemas';

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
  it('accepts an assistant without a profile', () => {
    expect(tenantTeamMemberSchema.safeParse(member({ role: UserRole.ASISTENTE })).success).toBe(true);
  });

  it.each([UserRole.MASTER, UserRole.ADMIN, UserRole.SOPORTE])('rejects creating a %s member', (role) => {
    expect(tenantTeamMemberSchema.safeParse(member({ role })).success).toBe(false);
  });

  it.each([UserRole.PROFESIONAL])('requires one specialty profile for %s', (role) => {
    expect(tenantTeamMemberSchema.safeParse(member({ role })).success).toBe(false);
    expect(tenantTeamMemberSchema.safeParse(member({ role, professionalProfile: { specialtyId: 'specialty-1', isActive: true } })).success).toBe(true);
    expect(tenantTeamMemberSchema.safeParse(member({ role, professionalProfile: { specialtyId: '' } })).success).toBe(false);
  });

  it('prohibits a clinical profile for an assistant', () => {
    const professionalProfile = { specialtyId: 'specialty-1', isActive: true };
    expect(tenantTeamMemberSchema.safeParse(member({ role: UserRole.ASISTENTE, professionalProfile })).success).toBe(false);
  });

  it('requires clinical-profile activity metadata for create and update profiles', () => {
    const profileWithoutActivity = { specialtyId: 'specialty-1' };
    expect(tenantTeamMemberSchema.safeParse(member({
      role: UserRole.PROFESIONAL,
      professionalProfile: profileWithoutActivity,
    })).success).toBe(false);
    expect(tenantTeamMemberUpdateSchema.safeParse({
      email: 'member@example.com',
      firstName: 'Luis',
      lastName: 'Paz',
      role: UserRole.MASTER,
      professionalProfile: profileWithoutActivity,
    }).success).toBe(false);
  });

  it('rejects unsupported roles, missing passwords, and tenant/provider fields', () => {
    expect(tenantTeamMemberSchema.safeParse(member({ role: UserRole.SOPORTE })).success).toBe(false);
    expect(tenantTeamMemberSchema.safeParse(member({ password: undefined })).success).toBe(false);
    expect(tenantTeamMemberSchema.safeParse(member({ password: 'short' })).success).toBe(false);
    expect(tenantTeamMemberSchema.safeParse(member({ tenantId: 'other-tenant' })).success).toBe(false);
    expect(tenantTeamMemberSchema.safeParse(member({ managedByProvider: true })).success).toBe(false);
    expect(tenantTeamMemberSchema.safeParse(member({ role: UserRole.PROFESIONAL, specialtyIds: ['s1', 's2'], professionalProfile: { specialtyId: 's1' } })).success).toBe(false);
  });

  it('normalizes create identity and profile metadata through the shared contract', () => {
    const result = tenantTeamMemberSchema.parse(member({
      email: ' Ana@Example.com ',
      firstName: ' Ana ',
      lastName: ' Vega ',
      phone: ' +593 99 ',
      role: UserRole.PROFESIONAL,
      professionalProfile: {
        specialtyId: ' specialty-1 ',
        professionalTitle: ' Psicóloga ',
        licenseNumber: ' LIC-8 ',
        bio: ' Clínica ',
        isActive: true,
      },
    }));

    expect(result).toEqual({
      email: 'ana@example.com',
      password: 'Secret123',
      firstName: 'Ana',
      lastName: 'Vega',
      phone: '+593 99',
      role: UserRole.PROFESIONAL,
      professionalProfile: {
        specialtyId: 'specialty-1',
        professionalTitle: 'Psicóloga',
        licenseNumber: 'LIC-8',
        bio: 'Clínica',
        isActive: true,
      },
    });
  });
});

describe('tenantTeamMemberUpdateSchema', () => {
  const holder = { email: 'ana@example.com', firstName: 'Ana', lastName: 'Vega', role: UserRole.MASTER };

  it('accepts editing the account holder with or without a clinical profile', () => {
    expect(tenantTeamMemberUpdateSchema.safeParse(holder).success).toBe(true);
    expect(tenantTeamMemberUpdateSchema.safeParse({
      ...holder,
      professionalProfile: { specialtyId: 'specialty-1', isActive: true },
    }).success).toBe(true);
  });

  it('rejects editing a member into ADMIN', () => {
    expect(tenantTeamMemberUpdateSchema.safeParse({ ...holder, role: UserRole.ADMIN }).success).toBe(false);
  });

  it('validates edits without requiring or accepting a password', () => {
    const result = tenantTeamMemberUpdateSchema.safeParse({
      email: ' Ana@Example.com ',
      firstName: ' Ana ',
      lastName: ' Vega ',
      role: UserRole.MASTER,
    });

    expect(result).toMatchObject({
      success: true,
      data: {
        email: 'ana@example.com',
        firstName: 'Ana',
        lastName: 'Vega',
        role: UserRole.MASTER,
      },
    });
    expect(tenantTeamMemberUpdateSchema.safeParse({
      ...member(),
      role: UserRole.MASTER,
    }).success).toBe(false);
  });

  it('requires a profile for professionals and rejects forbidden transport metadata', () => {
    expect(tenantTeamMemberUpdateSchema.safeParse({
      email: 'member@example.com', firstName: 'Luis', lastName: 'Paz', role: UserRole.PROFESIONAL,
    }).success).toBe(false);
    expect(tenantTeamMemberUpdateSchema.safeParse({
      email: 'member@example.com', firstName: 'Luis', lastName: 'Paz', role: UserRole.ASISTENTE,
      professionalProfile: { specialtyId: 'specialty-1' },
    }).success).toBe(false);
    expect(tenantTeamMemberUpdateSchema.safeParse({
      email: 'member@example.com', firstName: 'Luis', lastName: 'Paz', role: UserRole.MASTER,
      tenantId: 'tenant-other',
    }).success).toBe(false);
    expect(tenantTeamMemberUpdateSchema.safeParse({
      email: 'member@example.com', firstName: 'Luis', lastName: 'Paz', role: UserRole.MASTER,
      managedByProvider: true,
    }).success).toBe(false);
  });
});
