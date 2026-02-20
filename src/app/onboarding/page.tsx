'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { authApi, tenantsApi, usersApi } from '@/lib/api/endpoints';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/authStore';
import {
  onboardingTenantSchema,
  onboardingAdminSchema,
  onboardingInviteSchema,
  type OnboardingTenantFormData,
  type OnboardingAdminFormData,
  type OnboardingInviteFormData,
} from '@/lib/validations/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Brain, Building2, User, Users, Check } from 'lucide-react';
import { UserRole } from '@/types';
import { toast } from 'sonner';

type Step = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setUser = useAuthStore((state) => state.setUser);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [tenantData, setTenantData] = useState<OnboardingTenantFormData | null>(null);
  const [invites, setInvites] = useState<OnboardingInviteFormData[]>([]);

  // Step 1: Tenant Info
  const tenantForm = useForm<OnboardingTenantFormData>({
    resolver: zodResolver(onboardingTenantSchema),
    defaultValues: {
      timezone: 'America/Mexico_City',
      locale: 'es',
    },
  });

  // Step 2: Admin Info
  const adminForm = useForm<OnboardingAdminFormData>({
    resolver: zodResolver(onboardingAdminSchema),
  });

  // Step 3: Invite Users
  const inviteForm = useForm<OnboardingInviteFormData>({
    resolver: zodResolver(onboardingInviteSchema),
    defaultValues: {
      role: UserRole.PSYCHOLOGIST,
    },
  });

  // Create Tenant Mutation
  const createTenantMutation = useMutation({
    mutationFn: async (data: OnboardingTenantFormData & OnboardingAdminFormData) => {
      await tenantsApi.create(data);
      return authApi.login({
        email: data.email,
        password: data.password,
      });
    },
    onSuccess: async (response) => {
      const { accessToken, refreshToken, user } = response;
      apiClient.setTokens(accessToken, refreshToken);
      setUser(user);
      
      // Fetch tenant details
      try {
        const tenant = await tenantsApi.get(user.tenantId);
        setAuth(user, tenant);
      } catch {
        console.warn('Could not fetch tenant details');
      }
      
      toast.success('¡Clínica creada exitosamente!');
      setCurrentStep(3);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear la clínica');
    },
  });

  // Complete Onboarding Mutation
  const completeOnboardingMutation = useMutation({
    mutationFn: async (users: OnboardingInviteFormData[]) => {
      for (const invite of users) {
        await usersApi.invite(invite);
      }
      await tenantsApi.completeOnboarding();
    },
    onSuccess: () => {
      setCurrentStep(4);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al enviar invitaciones');
    },
  });

  const onTenantSubmit = (data: OnboardingTenantFormData) => {
    setTenantData(data);
    setCurrentStep(2);
  };

  const onAdminSubmit = (data: OnboardingAdminFormData) => {
    if (!tenantData) return;
    createTenantMutation.mutate({ ...tenantData, ...data });
  };

  const addInvite = (data: OnboardingInviteFormData) => {
    setInvites([...invites, data]);
    inviteForm.reset({ role: UserRole.PSYCHOLOGIST });
    toast.success('Usuario agregado a la lista de invitaciones');
  };

  const removeInvite = (index: number) => {
    setInvites(invites.filter((_, i) => i !== index));
  };

  const finishOnboarding = () => {
    if (invites.length > 0) {
      completeOnboardingMutation.mutate(invites);
    } else {
      router.push('/dashboard');
    }
  };

  const steps = [
    { number: 1, title: 'Información de la Clínica', icon: Building2 },
    { number: 2, title: 'Tu Perfil de Administrador', icon: User },
    { number: 3, title: 'Invitar Equipo (Opcional)', icon: Users },
    { number: 4, title: 'Completado', icon: Check },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-3xl mx-auto py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
              <Brain className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Configura tu Clínica</h1>
          <p className="text-muted-foreground mt-2">
            Completa estos pasos para comenzar a usar la plataforma
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-12">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <div key={step.number} className="flex-1 relative">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {isCompleted ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                  </div>
                  <p className="text-xs mt-2 text-center hidden sm:block">{step.title}</p>
                </div>
                {step.number < 4 && (
                  <div
                    className={`absolute top-6 left-1/2 w-full h-0.5 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: Tenant Info */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Información de la Clínica</CardTitle>
              <CardDescription>
                Ingresa los datos básicos de tu consultorio o clínica
              </CardDescription>
            </CardHeader>
            <form onSubmit={tenantForm.handleSubmit(onTenantSubmit)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clinicName" required>
                    Nombre de la Clínica
                  </Label>
                  <Input
                    id="clinicName"
                    placeholder="Clínica de Psicología Integral"
                    {...tenantForm.register('clinicName')}
                    error={tenantForm.formState.errors.clinicName?.message}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail" required>
                    Email de Contacto
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="contacto@clinica.com"
                    {...tenantForm.register('contactEmail')}
                    error={tenantForm.formState.errors.contactEmail?.message}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug" required>
                    Slug de la clínica
                  </Label>
                  <Input
                    id="slug"
                    placeholder="mi-clinica"
                    {...tenantForm.register('slug')}
                    error={tenantForm.formState.errors.slug?.message}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Teléfono de Contacto</Label>
                  <Input
                    id="contactPhone"
                    placeholder="+52 55 1234 5678"
                    {...tenantForm.register('contactPhone')}
                  />
                </div>
              </CardContent>
              <div className="p-6 pt-0 flex justify-end">
                <Button type="submit">Continuar</Button>
              </div>
            </form>
          </Card>
        )}

        {/* Step 2: Admin Profile */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Tu Perfil de Administrador</CardTitle>
              <CardDescription>
                Crea tu cuenta como administrador de la clínica
              </CardDescription>
            </CardHeader>
            <form onSubmit={adminForm.handleSubmit(onAdminSubmit)}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" required>
                      Nombre
                    </Label>
                    <Input
                      id="firstName"
                      {...adminForm.register('firstName')}
                      error={adminForm.formState.errors.firstName?.message}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" required>
                      Apellido
                    </Label>
                    <Input
                      id="lastName"
                      {...adminForm.register('lastName')}
                      error={adminForm.formState.errors.lastName?.message}
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
                    {...adminForm.register('email')}
                    error={adminForm.formState.errors.email?.message}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="professionalTitle">Título Profesional</Label>
                  <Input
                    id="professionalTitle"
                    placeholder="Lic. en Psicología"
                    {...adminForm.register('professionalTitle')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" required>
                    Contraseña
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    {...adminForm.register('password')}
                    error={adminForm.formState.errors.password?.message}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" required>
                    Confirmar Contraseña
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...adminForm.register('confirmPassword')}
                    error={adminForm.formState.errors.confirmPassword?.message}
                  />
                </div>
              </CardContent>
              <div className="p-6 pt-0 flex justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCurrentStep(1)}
                >
                  Atrás
                </Button>
                <Button type="submit" loading={createTenantMutation.isPending}>
                  Crear Clínica
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Step 3: Invite Team */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Invitar a tu Equipo</CardTitle>
              <CardDescription>
                Invita psicólogos y asistentes (puedes hacerlo después)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={inviteForm.handleSubmit(addInvite)}
                className="space-y-4 p-4 border rounded-lg"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteFirstName">Nombre</Label>
                    <Input
                      id="inviteFirstName"
                      {...inviteForm.register('firstName')}
                      error={inviteForm.formState.errors.firstName?.message}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inviteLastName">Apellido</Label>
                    <Input
                      id="inviteLastName"
                      {...inviteForm.register('lastName')}
                      error={inviteForm.formState.errors.lastName?.message}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">Email</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    {...inviteForm.register('email')}
                    error={inviteForm.formState.errors.email?.message}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inviteRole">Rol</Label>
                  <select
                    id="inviteRole"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    {...inviteForm.register('role')}
                  >
                    <option value={UserRole.PSYCHOLOGIST}>Psicólogo/a</option>
                    <option value={UserRole.ASSISTANT}>Asistente</option>
                  </select>
                </div>
                <Button type="submit" className="w-full">
                  Agregar a la lista
                </Button>
              </form>

              {invites.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Invitaciones ({invites.length})</h4>
                  {invites.map((invite, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div>
                        <p className="font-medium">
                          {invite.firstName} {invite.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{invite.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInvite(index)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <div className="p-6 pt-0 flex justify-end gap-2">
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                Omitir
              </Button>
              <Button onClick={finishOnboarding} loading={completeOnboardingMutation.isPending}>
                {invites.length > 0 ? 'Enviar Invitaciones' : 'Finalizar'}
              </Button>
            </div>
          </Card>
        )}

        {/* Step 4: Completion */}
        {currentStep === 4 && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="h-20 w-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
                <Check className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">¡Todo listo!</h2>
              <p className="text-muted-foreground mb-4">
                Tu clínica ha sido configurada exitosamente
              </p>
              <p className="text-sm text-muted-foreground">
                Redirigiendo al panel de control...
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
