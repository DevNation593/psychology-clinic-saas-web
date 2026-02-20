'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userInviteSchema, type UserInviteFormData } from '@/lib/validations/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/constants';
import { UserRole } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserDialog({ open, onOpenChange }: InviteUserDialogProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UserInviteFormData>({
    resolver: zodResolver(userInviteSchema),
    defaultValues: {
      role: UserRole.PSYCHOLOGIST,
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (data: UserInviteFormData) => usersApi.invite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USERS });
      toast.success('Invitación enviada exitosamente');
      reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al enviar invitación');
    },
  });

  const onSubmit = (data: UserInviteFormData) => {
    inviteMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar Usuario</DialogTitle>
          <DialogDescription>
            Envía una invitación para que se una a tu equipo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" required>
                Nombre
              </Label>
              <Input
                id="firstName"
                {...register('firstName')}
                error={errors.firstName?.message}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" required>
                Apellido
              </Label>
              <Input
                id="lastName"
                {...register('lastName')}
                error={errors.lastName?.message}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" required>
              Email
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" required>
              Rol
            </Label>
            <select
              id="role"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register('role')}
            >
              <option value={UserRole.PSYCHOLOGIST}>Psicólogo/a</option>
              <option value={UserRole.ASSISTANT}>Asistente</option>
            </select>
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="professionalTitle">Título Profesional (Opcional)</Label>
            <Input
              id="professionalTitle"
              placeholder="Lic. en Psicología"
              {...register('professionalTitle')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={inviteMutation.isPending}>
              Enviar Invitación
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
