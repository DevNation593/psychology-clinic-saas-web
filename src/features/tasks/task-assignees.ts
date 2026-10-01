import { UserRole, type User } from '@/types';

/**
 * Users a task may be assigned to by the actor. Professionals keep their tasks to
 * themselves (the API enforces the same rule); other roles may pick any clinic user.
 */
export function assignableUsers(users: User[] | undefined, actor: User | null): User[] {
  if (!actor) return [];
  if (actor.role !== UserRole.PROFESIONAL) return users ?? [];
  return [users?.find((user) => user.id === actor.id) ?? actor];
}
