import { describe, expect, it } from 'vitest';
import { UserRole, type User } from '@/types';
import { countActiveProfessionalProfiles } from './professional-profiles';

describe('countActiveProfessionalProfiles', () => {
  it('counts active profiles including clinical administrators, independent of role', () => {
    const users = [
      { role: UserRole.ADMIN, professionalProfile: { isActive: true } },
      { role: UserRole.PROFESIONAL, professionalProfile: { isActive: true } },
      { role: UserRole.ADMIN },
      { role: UserRole.PSICOLOGO, professionalProfile: { isActive: false } },
    ] as User[];
    expect(countActiveProfessionalProfiles(users)).toBe(2);
  });

  it('returns zero for an empty team', () => {
    expect(countActiveProfessionalProfiles([])).toBe(0);
  });
});
