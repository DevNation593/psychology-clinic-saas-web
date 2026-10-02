import { ROUTES } from '@/lib/constants';
import type { User } from '@/types';
import { isPlatformAdmin } from '@/types/guards';

/** Where a signed-in user belongs: the forced password change comes before anything else. */
export function postLoginRoute(user: Pick<User, 'role' | 'mustChangePassword'>): string {
  if (user.mustChangePassword) return ROUTES.CHANGE_PASSWORD;
  if (isPlatformAdmin(user)) return ROUTES.PLATFORM;
  return ROUTES.DASHBOARD;
}
