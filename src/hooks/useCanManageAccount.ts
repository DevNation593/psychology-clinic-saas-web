import { useAuthStore } from '@/store/authStore';
import { canManageSubscription } from '@/types/guards';

/** True for the account holder: the only one who can open the administration pages. */
export function useCanManageAccount(): boolean {
  const user = useAuthStore((state) => state.user);
  return !!user && canManageSubscription(user);
}
