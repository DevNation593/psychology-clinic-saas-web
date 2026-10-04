'use client';

import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useSaveUserPermissions, useUserPermissions } from '@/hooks/usePermissions';

export interface UserPermissionsDialogProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

/**
 * Lets the account holder decide what one user can do: take permissions of the role away, and
 * give the few permissions the role lacks but can receive.
 */
export function UserPermissionsDialog({ userId, userName, onClose }: UserPermissionsDialogProps) {
  const query = useUserPermissions(userId);
  const save = useSaveUserPermissions(userId);
  const [allowed, setAllowed] = useState<string[]>([]);

  // The checkboxes start from what the server has stored for this user.
  useEffect(() => {
    if (query.data) {
      setAllowed(query.data.permissions.filter((entry) => entry.allowed).map((entry) => entry.key));
    }
  }, [query.data]);

  const entries = query.data?.permissions ?? [];
  const groups = [...new Set(entries.map((entry) => entry.group))];
  const toggle = (permission: string) =>
    setAllowed((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (save.isPending) return;
    try {
      await save.mutateAsync({
        revoked: entries
          .filter((entry) => entry.source === 'role' && !allowed.includes(entry.key))
          .map((entry) => entry.key),
        granted: entries
          .filter((entry) => entry.source === 'grant' && allowed.includes(entry.key))
          .map((entry) => entry.key),
      });
      onClose();
    } catch {
      // The hook already reported the error; the dialog stays open to retry.
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>Permisos de {userName}</DialogTitle>
            <DialogDescription>
              Marca lo que esta persona puede hacer. Los permisos señalados como «adicional» no
              vienen con su rol: solo los tiene si los marcas aquí.
            </DialogDescription>
          </DialogHeader>

          {query.isError ? (
            <Alert variant="destructive" title="No se pudieron cargar los permisos" />
          ) : query.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : !query.data.restrictable ? (
            <Alert title="El titular de la cuenta conserva siempre todos los permisos." />
          ) : (
            groups.map((group) => (
              <fieldset key={group} className="space-y-2">
                <legend className="text-sm font-semibold">{group}</legend>
                {query.data.permissions
                  .filter((entry) => entry.group === group)
                  .map((entry) => (
                    <label key={entry.key} className="flex min-h-[36px] items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={allowed.includes(entry.key)}
                        onChange={() => toggle(entry.key)}
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                      />
                      {entry.label}
                      {entry.source === 'grant' && (
                        <span className="rounded border border-input px-1.5 text-xs text-muted-foreground">
                          adicional
                        </span>
                      )}
                    </label>
                  ))}
              </fieldset>
            ))
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!query.data?.restrictable}
              loading={save.isPending}
            >
              Guardar permisos
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
