import type { User } from '@/types';

export function countActiveProfessionalProfiles(users: User[]): number {
  return users.filter((user) => user.professionalProfile?.isActive === true).length;
}
