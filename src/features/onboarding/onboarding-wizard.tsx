'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
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
type SubmissionState = 'editing' | 'creating' | 'create-error' | 'create-conflict' | 'created' | 'session-error';
type RecoveryMarker = { tenantId: string; adminEmail: string };
const recoveryKey = 'clinic-onboarding-created:v1';
const recoveryEvent = 'clinic-onboarding-recovery-change';

function markerSnapshot(): string | null {
  try { return typeof window === 'undefined' ? null : sessionStorage.getItem(recoveryKey); }
  catch { return null; }
}

function subscribeMarker(onChange: () => void) {
  window.addEventListener(recoveryEvent, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(recoveryEvent, onChange);
    window.removeEventListener('storage', onChange);
  };
}

function readMarker(raw: string | null): RecoveryMarker | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === 'object' && 'tenantId' in value && 'adminEmail' in value &&
      typeof value.tenantId === 'string' && typeof value.adminEmail === 'string') {
      return { tenantId: value.tenantId, adminEmail: value.adminEmail };
    }
  } catch { /* Ignore a corrupt marker; the user can start a new registration. */ }
  return null;
}

function storeMarker(marker: RecoveryMarker) {
  sessionStorage.setItem(recoveryKey, JSON.stringify(marker));
  window.dispatchEvent(new Event(recoveryEvent));
}

function clearMarker() {
  sessionStorage.removeItem(recoveryKey);
  window.dispatchEvent(new Event(recoveryEvent));
}

function isDuplicateError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { status?: number; code?: string; response?: { status?: number } };
  return value.status === 409 || value.response?.status === 409 ||
    /CONFLICT|DUPLICATE|ALREADY_EXISTS|EMAIL_IN_USE/i.test(value.code ?? '');
}
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
  const [retryEmail, setRetryEmail] = useState('');
  const [catalogChanged, setCatalogChanged] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const submitting = useRef(false);
  const created = useRef(false);
  const mounted = useRef(true);
  const temporaryTokens = useRef(false);
  const recovery = readMarker(useSyncExternalStore(subscribeMarker, markerSnapshot, () => null));
  const { register, watch, getValues, setValue, unregister, trigger, setError, reset, formState: { errors } } = useForm<ClinicOnboardingFormData>({
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

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (temporaryTokens.current) {
        apiClient.clearAuthData();
        temporaryTokens.current = false;
      }
    };
  }, []);

  useEffect(() => {
    if (!catalog.data || created.current || !selected.length) return;
    const available = new Set(catalog.data.map((item) => item.code));
    const valid = selected.filter((code) => available.has(code));
    if (valid.length === selected.length) return;
    setValue('specialtyCodes', valid);
    if (!valid.includes(getValues('adminSpecialtyCode') ?? '')) setValue('adminSpecialtyCode', undefined);
    setCatalogChanged(true);
    setStep(1);
  }, [catalog.data, selected, getValues, setValue]);

  async function next() {
    if (step === 1 && (catalog.isFetching || catalog.isError || !catalog.data?.length || !selected.length || selectedCatalog.length !== selected.length)) {
      if (!selected.length) setError('specialtyCodes', { message: 'Selecciona al menos una especialidad' });
      return;
    }
    const fields = step === 0 ? clinicFields : step === 1 ? ['specialtyCodes' as const] :
      providesCare ? [...adminFields, ...clinicalFields] : adminFields;
    if (await trigger(fields)) {
      if (step === 1) setCatalogChanged(false);
      setStep((step + 1) as Step);
    }
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

  function discardRecovery() {
    clearMarker();
    created.current = false;
    submitting.current = false;
    setCreatedEmail('');
    setStorageFailed(false);
    setSubmission('editing');
    setStep(0);
    reset();
  }

  async function submit() {
    if (submitting.current || created.current || readMarker(markerSnapshot())) return;
    if (catalog.isFetching || catalog.isError || !catalog.data ||
      selected.some((code) => !catalog.data.some((item) => item.code === code))) {
      setCatalogChanged(true);
      setStep(1);
      return;
    }
    const parsed = clinicOnboardingSchema.safeParse(getValues());
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      if (first?.path[0]) setError(first.path[0] as FieldPath<ClinicOnboardingFormData>, { message: first.message });
      setStep(first?.path[0] === 'specialtyCodes' ? 1 : String(first?.path[0]).startsWith('admin') ? 2 : 0);
      return;
    }
    submitting.current = true;
    setRetryEmail(parsed.data.adminEmail);
    setSubmission('creating');
    let result;
    try {
      result = await onboardingApi.createClinic(parsed.data);
    } catch (error) {
      if (!mounted.current) return;
      submitting.current = false;
      setSubmission(isDuplicateError(error) ? 'create-conflict' : 'create-error');
      return;
    }
    created.current = true;
    try {
      storeMarker({ tenantId: result.tenant.id, adminEmail: result.admin.email });
    } catch {
      if (mounted.current) {
        setCreatedEmail(result.admin.email);
        setStorageFailed(true);
        setSubmission('session-error');
      }
      return;
    }
    if (!mounted.current) return;
    setCreatedEmail(result.admin.email);
    setSubmission('created');
    try {
      const session = await authApi.login({ email: result.admin.email, password: parsed.data.adminPassword });
      if (!mounted.current) return;
      if (session.user.tenantId !== result.tenant.id) throw new Error('Tenant mismatch');
      apiClient.setTokens(session.accessToken, session.refreshToken);
      temporaryTokens.current = true;
      const tenant = await tenantsApi.get(session.user.tenantId);
      if (!mounted.current) return;
      if (tenant.id !== result.tenant.id) throw new Error('Tenant mismatch');
      setAuth(session.user, tenant);
      temporaryTokens.current = false;
      clearMarker();
      router.replace('/dashboard');
    } catch {
      if (!mounted.current) return;
      useAuthStore.getState().clearAuth();
      temporaryTokens.current = false;
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
    <Card>{(recovery && submission === 'editing') || (created.current && submission === 'session-error') ? <>
      <CardHeader><CardTitle>Consultorio creado</CardTitle></CardHeader>
      <CardContent className="space-y-4"><p>{storageFailed ? 'Tu consultorio ya existe, pero no pudimos guardar el estado de este registro. Inicia sesión ahora.' : 'Tu consultorio ya existe. No pudimos iniciar la sesión automáticamente.'}</p><p>Ingresa con <strong>{createdEmail || recovery?.adminEmail}</strong> y la contraseña que elegiste.</p><Link href="/login" className="text-primary underline">Ir a iniciar sesión</Link><div><Button type="button" variant="outline" onClick={discardRecovery}>Descartar registro anterior y crear otro consultorio</Button></div></CardContent>
    </> : <><CardHeader><CardTitle>{steps[step]}</CardTitle></CardHeader><CardContent className="space-y-5">
      {step === 0 && <div className="space-y-4">{field('clinicName', 'Nombre del consultorio')}{field('contactEmail', 'Correo de contacto', 'email')}{field('contactPhone', 'Teléfono de contacto', 'tel')}{field('address', 'Dirección')}{field('timezone', 'Zona horaria')}<div className="space-y-2"><Label htmlFor="locale">Idioma</Label><select id="locale" className="h-10 w-full rounded-md border px-3" {...register('locale')}><option value="es">Español</option></select></div></div>}
      {step === 1 && <div className="space-y-4"><p>Elige una o más especialidades para tu consultorio.</p>
        {catalogChanged && <p id="catalog-changed-error" role="alert" className="text-sm text-destructive">Revisa las especialidades: el catálogo cambió y quitamos selecciones que ya no están disponibles.</p>}
        {catalog.isLoading && <p role="status">Cargando especialidades…</p>}
        {catalog.isError && <div role="alert"><p>No se pudieron cargar las especialidades.</p><Button type="button" variant="outline" onClick={() => void catalog.refetch()}>Reintentar catálogo</Button></div>}
        {!catalog.isLoading && !catalog.isError && !catalog.data?.length && <p role="status">No hay especialidades disponibles.</p>}
        <fieldset aria-invalid={!!errors.specialtyCodes || catalogChanged} aria-describedby={catalogChanged ? 'catalog-changed-error' : errors.specialtyCodes ? 'specialtyCodes-error' : undefined} className="space-y-3"><legend className="font-medium">Especialidades del consultorio</legend>
          {catalog.data?.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-md border p-3"><input type="checkbox" checked={selected.includes(item.code)} onChange={(event) => toggleSpecialty(item.code, event.target.checked)} />{item.name}</label>)}
        </fieldset>
        {errors.specialtyCodes && !catalogChanged && <p id="specialtyCodes-error" role="alert" className="text-sm text-destructive">{errors.specialtyCodes.message}</p>}
      </div>}
      {step === 2 && <div className="space-y-4">{field('adminFirstName', 'Nombre del administrador')}{field('adminLastName', 'Apellido del administrador')}{field('adminEmail', 'Correo del administrador', 'email')}{field('adminPassword', 'Contraseña', 'password')}
        <label className="flex items-center gap-3"><input type="checkbox" checked={providesCare} onChange={(event) => toggleCare(event.target.checked)} />Atenderé pacientes</label>
        {providesCare && <><div className="space-y-2"><Label htmlFor="adminSpecialtyCode">Especialidad del administrador</Label><select id="adminSpecialtyCode" aria-invalid={!!errors.adminSpecialtyCode} aria-describedby={errors.adminSpecialtyCode ? 'adminSpecialtyCode-error' : undefined} className="h-10 w-full rounded-md border px-3" {...register('adminSpecialtyCode')}><option value="">Selecciona una especialidad</option>{selectedCatalog.map((item) => <option key={item.id} value={item.code}>{item.name}</option>)}</select>{errors.adminSpecialtyCode && <p id="adminSpecialtyCode-error" role="alert" className="text-sm text-destructive">{errors.adminSpecialtyCode.message}</p>}</div>{field('adminProfessionalTitle', 'Título profesional')}{field('adminLicenseNumber', 'Número de licencia')}<div className="space-y-2"><Label htmlFor="adminBio">Biografía</Label><textarea id="adminBio" className="min-h-24 w-full rounded-md border px-3 py-2" {...register('adminBio')} /></div></>}
      </div>}
      {step === 3 && <div className="space-y-4"><p>Revisa estos datos antes de crear tu consultorio.</p><dl className="grid gap-3 sm:grid-cols-2">
        <div><dt className="font-semibold">Consultorio</dt><dd>{getValues('clinicName').trim()}</dd></div><div><dt className="font-semibold">Contacto</dt><dd>{getValues('contactEmail').trim()}</dd></div><div><dt className="font-semibold">Especialidades</dt><dd>{selectedCatalog.map((item) => item.name).join(', ')}</dd></div><div><dt className="font-semibold">Administrador</dt><dd>{getValues('adminFirstName').trim()} {getValues('adminLastName').trim()}</dd><dd>{getValues('adminEmail').trim()}</dd></div><div><dt className="font-semibold">Atención clínica</dt><dd>{providesCare ? `Atiende pacientes: ${selectedCatalog.find((item) => item.code === getValues('adminSpecialtyCode'))?.name ?? ''}` : 'No atiende pacientes'}</dd></div>
      </dl>{(submission === 'create-error' || submission === 'create-conflict') && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{submission === 'create-conflict' ? 'Este correo ya está en uso. Inicia sesión o cambia el correo del administrador.' : 'No se pudo crear el consultorio. Es posible que ya se haya creado; compruébalo antes de reintentar.'}</p><p>Correo: {retryEmail}</p><Link href="/login" className="underline">Ir a iniciar sesión</Link></div>}{submission === 'created' && <p role="status">Consultorio creado. Iniciando sesión…</p>}</div>}
      {!created.current && <div className="flex justify-between gap-3 pt-4">{step > 0 ? <Button type="button" variant="outline" disabled={submission === 'creating'} onClick={() => setStep((step - 1) as Step)}>Atrás</Button> : <span />}{step < 3 ? <Button type="button" onClick={() => void next()}>Continuar</Button> : <Button type="button" loading={submission === 'creating'} onClick={() => void submit()}>{submission === 'create-error' || submission === 'create-conflict' ? 'Reintentar creación' : 'Crear consultorio'}</Button>}</div>}
    </CardContent></>}</Card>
  </div></main>;
}
