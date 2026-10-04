import { Alert } from '@/components/ui/alert';

/** Shown when an administration page is opened by someone who is not the account holder. */
export function RestrictedAccess() {
  return (
    <Alert variant="warning" title="Acceso restringido">
      Solo el titular de la cuenta puede acceder a esta sección.
    </Alert>
  );
}
