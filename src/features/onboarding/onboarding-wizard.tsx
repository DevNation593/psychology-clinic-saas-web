'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSpecialtyCatalog } from '@/hooks/useSpecialties';
import { authApi, onboardingApi, tenantsApi } from '@/lib/api/endpoints';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/authStore';
import { clinicOnboardingSchema, type ClinicOnboardingFormData } from '@/lib/validations/schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Step = 0 | 1 | 2 | 3;
type SubmissionState = 'editing' | 'creating' | 'create-error' | 'created' | 'session-error';
const steps = ['Consultorio', 'Especialidades', 'Administrador', 'Confirmación'] as const;
const clinicFields: FieldPath<ClinicOnboardingFormData>[] = ['clinicName', 'contactEmail', 'contactPhone', 'timezone', 'locale'];
const adminFields: FieldPath<ClinicOnboardingFormData>[] = ['adminFirstName', 'adminLastName', 'adminEmail', 'adminPassword', 'adminProvidesCare'];
const clinicalFields: FieldPath<ClinicOnboardingFormData>[] = ['adminSpecialtyCode', 'adminProfessionalTitle', 'adminLicenseNumber', 'adminBio'];

export function OnboardingWizard() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const catalog = useSpecialtyCatalog();
  const [step, setStep] = useState<Step>(0);
  const [submission, setSubmission] = useState<SubmissionState>('editing');
  const [createdEmail, setCreatedEmail] = useState('');
  const submitting = useRef(false);
  const created = useRef(false);
  const { register, watch, getValues, setValue, unregister, trigger, setError, formState: { errors } } = useForm<ClinicOnboardingFormData>({
    resolver: zodResolver(clinicOnboardingSchema),
    shouldUnregister: false,
    defaultValues: {
      clinicName: '', contactEmail: '', contactPhone: '', address: '', timezone: 'America/Guayaquil', locale: 'es',
      specialtyCodes: [], adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '', adminProvidesCare: false,
    },
  });
  const selected = watch('specialtyCodes');
  const providesCare = watch('adminProvidesCare');
  const selectedCatalog = (catalog.data ?? []).filter((item) => selected.includes(item.code));

  async function next() {
    if (step === 1 && (catalog.isLoading || catalog.isError || !catalog.data?.length || !selected.length)) {
      if (!selected.length) setError('specialtyCodes', { message: 'Selecciona al menos una especialidad' });
      return;
    }
    const fields = step === 0 ? clinicFields : step === 1 ? ['specialtyCodes' as const] :
      providesCare ? [...adminFields, ...clinicalFields] : adminFields;
    if (await trigger(fields)) setStep((step + 1) as Step);
  }

  function toggleSpecialty(code: string, checked: boolean) {
    const nextSelection = checked ? [...selected, code] : selected.filter((value) => value !== code);
    setValue('specialtyCodes', nextSelection, { shouldValidate: true });
    if (!nextSelection.includes(getValues('adminSpecialtyCode') ?? '')) setValue('adminSpecialtyCode', undefined);
  }

  function toggleCare(checked: boolean) {
    setValue('adminProvidesCare', checked, { shouldValidate: true });
    if (!checked) unregister(clinicalFields);
  }

  async function submit() {
    if (submitting.current || created.current) return;
    const parsed = clinicOnboardingSchema.safeParse(getValues());
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      if (first?.path[0]) setError(first.path[0] as FieldPath<ClinicOnboardingFormData>, { message: first.message });
      setStep(first?.path[0] === 'specialtyCodes' ? 1 : String(first?.path[0]).startsWith('admin') ? 2 : 0);
      return;
    }
    submitting.current = true;
    setSubmission('creating');
    let result;
    try {
      result = await onboardingApi.createClinic(parsed.data);
      created.current = true;
      setCreatedEmail(result.admin.email);
      setSubmission('created');
    } catch {
      submitting.current = false;
      setSubmission('create-error');
      return;
    }
    try {
      const session = await authApi.login({ email: result.admin.email, password: parsed.data.adminPassword });
      apiClient.setTokens(session.accessToken, session.refreshToken);
      const tenant = await tenantsApi.get(session.user.tenantId);
      setAuth(session.user, tenant);
      router.replace('/dashboard');
    } catch {
      useAuthStore.getState().clearAuth();
      setSubmission('session-error');
    } finally {
      submitting.current = false;
    }
  }

  const field = (name: keyof ClinicOnboardingFormData, label: string, type = 'text') => (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} type={type} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} {...register(name)} />
      {errors[name] && <p id={`${name}-error`} role="alert" className="text-sm text-destructive">{errors[name]?.message}</p>}
    </div>
  );

  return <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4"><div className="mx-auto max-w-3xl py-12">
    <header className="mb-8 text-center"><h1 className="text-3xl font-bold">Configura tu consultorio</h1><p className="mt-2 text-muted-foreground">Completa estos pasos para comenzar a usar la plataforma.</p></header>
    <ol aria-label="Pasos de registro" className="mb-8 grid grid-cols-4 gap-2 text-center text-sm">{steps.map((name, index) => <li key={name} aria-current={step === index ? 'step' : undefined} className={step === index ? 'font-semibold text-primary' : 'text-muted-foreground'}>{index + 1}. {name}</li>)}</ol>
    <Card>{created.current && submission === 'session-error' ? <>
      <CardHeader><CardTitle>Consultorio creado</CardTitle></CardHeader>
      <CardContent className="space-y-4"><p>Tu consultorio ya existe. No pudimos iniciar la sesión automáticamente.</p><p>Ingresa con <strong>{createdEmail}</strong> y la contraseña que elegiste.</p><Link href="/login" className="text-primary underline">Ir a iniciar sesión</Link></CardContent>
    </> : <><CardHeader><CardTitle>{steps[step]}</CardTitle></CardHeader><CardContent className="space-y-5">
      {step === 0 && <div className="space-y-4">{field('clinicName', 'Nombre del consultorio')}{field('contactEmail', 'Correo de contacto', 'email')}{field('contactPhone', 'Teléfono de contacto', 'tel')}{field('address', 'Dirección')}{field('timezone', 'Zona horaria')}<div className="space-y-2"><Label htmlFor="locale">Idioma</Label><select id="locale" className="h-10 w-full rounded-md border px-3" {...register('locale')}><option value="es">Español</option></select></div></div>}
      {step === 1 && <div className="space-y-4"><p>Elige una o más especialidades para tu consultorio.</p>
        {catalog.isLoading && <p role="status">Cargando especialidades…</p>}
        {catalog.isError && <div role="alert"><p>No se pudieron cargar las especialidades.</p><Button type="button" variant="outline" onClick={() => void catalog.refetch()}>Reintentar catálogo</Button></div>}
        {!catalog.isLoading && !catalog.isError && !catalog.data?.length && <p role="status">No hay especialidades disponibles.</p>}
        {catalog.data?.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-md border p-3"><input type="checkbox" checked={selected.includes(item.code)} onChange={(event) => toggleSpecialty(item.code, event.target.checked)} />{item.name}</label>)}
        {errors.specialtyCodes && <p role="alert" className="text-sm text-destructive">{errors.specialtyCodes.message}</p>}
      </div>}
      {step === 2 && <div className="space-y-4">{field('adminFirstName', 'Nombre del administrador')}{field('adminLastName', 'Apellido del administrador')}{field('adminEmail', 'Correo del administrador', 'email')}{field('adminPassword', 'Contraseña', 'password')}
        <label className="flex items-center gap-3"><input type="checkbox" checked={providesCare} onChange={(event) => toggleCare(event.target.checked)} />Atenderé pacientes</label>
        {providesCare && <><div className="space-y-2"><Label htmlFor="adminSpecialtyCode">Especialidad del administrador</Label><select id="adminSpecialtyCode" className="h-10 w-full rounded-md border px-3" {...register('adminSpecialtyCode')}><option value="">Selecciona una especialidad</option>{selectedCatalog.map((item) => <option key={item.id} value={item.code}>{item.name}</option>)}</select>{errors.adminSpecialtyCode && <p role="alert" className="text-sm text-destructive">{errors.adminSpecialtyCode.message}</p>}</div>{field('adminProfessionalTitle', 'Título profesional')}{field('adminLicenseNumber', 'Número de licencia')}<div className="space-y-2"><Label htmlFor="adminBio">Biografía</Label><textarea id="adminBio" className="min-h-24 w-full rounded-md border px-3 py-2" {...register('adminBio')} /></div></>}
      </div>}
      {step === 3 && <div className="space-y-4"><p>Revisa estos datos antes de crear tu consultorio.</p><dl className="grid gap-3 sm:grid-cols-2">
        <div><dt className="font-semibold">Consultorio</dt><dd>{getValues('clinicName').trim()}</dd></div><div><dt className="font-semibold">Contacto</dt><dd>{getValues('contactEmail').trim()}</dd></div><div><dt className="font-semibold">Especialidades</dt><dd>{selectedCatalog.map((item) => item.name).join(', ')}</dd></div><div><dt className="font-semibold">Administrador</dt><dd>{getValues('adminFirstName').trim()} {getValues('adminLastName').trim()}</dd><dd>{getValues('adminEmail').trim()}</dd></div><div><dt className="font-semibold">Atención clínica</dt><dd>{providesCare ? `Atiende pacientes: ${selectedCatalog.find((item) => item.code === getValues('adminSpecialtyCode'))?.name ?? ''}` : 'No atiende pacientes'}</dd></div>
      </dl>{submission === 'create-error' && <p role="alert" className="text-sm text-destructive">No se pudo crear el consultorio. Revisa tu conexión y vuelve a intentarlo.</p>}{submission === 'created' && <p role="status">Consultorio creado. Iniciando sesión…</p>}</div>}
      {!created.current && <div className="flex justify-between gap-3 pt-4">{step > 0 ? <Button type="button" variant="outline" disabled={submission === 'creating'} onClick={() => setStep((step - 1) as Step)}>Atrás</Button> : <span />}{step < 3 ? <Button type="button" onClick={() => void next()}>Continuar</Button> : <Button type="button" loading={submission === 'creating'} onClick={() => void submit()}>{submission === 'create-error' ? 'Reintentar creación' : 'Crear consultorio'}</Button>}</div>}
    </CardContent></>}</Card>
  </div></main>;
}
