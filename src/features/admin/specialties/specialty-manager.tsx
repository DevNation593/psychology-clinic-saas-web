'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useReplaceTenantSpecialties,
  useSetTenantModule,
  useSpecialtyCatalog,
  useTenantModules,
  useTenantSpecialties,
} from '@/hooks/useSpecialties';
import { useAuthStore } from '@/store/authStore';
import { isAdminRole } from '@/types/guards';
import { UserRole, type SpecialtyPricingSummary } from '@/types';

interface SpecialtyDraft {
  tenantId: string;
  codes: string[];
  baselineCodes: string[];
}

interface SavedPricing {
  tenantId: string;
  codes: string[];
  pricing: SpecialtyPricingSummary;
}

const EMPTY_CODES: string[] = [];

function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}

function formatMoney(amount: number, currency: string): string {
  try {
    return `${new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)} ${currency}`;
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function sameCodes(left: string[], right: string[]): boolean {
  const rightSet = new Set(right);
  return left.length === right.length && left.every((code) => rightSet.has(code));
}

function getActiveTenantId(): string | null {
  const state = useAuthStore.getState();
  return state.tenant?.id ?? state.user?.tenantId ?? null;
}

export function SpecialtyManager() {
  const tenantId = useAuthStore((state) => state.tenant?.id ?? state.user?.tenantId ?? null);
  const tenant = useAuthStore((state) => state.tenant);
  const user = useAuthStore((state) => state.user);
  const canConfigure = !!user && (isAdminRole(user.role) || user.role === UserRole.SOPORTE);
  const catalogQuery = useSpecialtyCatalog();
  const tenantSpecialtiesQuery = useTenantSpecialties();
  const tenantModulesQuery = useTenantModules();
  const replaceSpecialties = useReplaceTenantSpecialties();
  const setModuleEnabled = useSetTenantModule();
  const [draft, setDraft] = useState<SpecialtyDraft | null>(null);
  const [savedPricing, setSavedPricing] = useState<SavedPricing | null>(null);

  useEffect(() => {
    if (!tenantId || !catalogQuery.data || !tenantSpecialtiesQuery.data) return;

    const serverCodes = tenantSpecialtiesQuery.data.map((specialty) => specialty.code);
    setDraft((current) => {
      if (current?.tenantId !== tenantId) {
        return { tenantId, codes: serverCodes, baselineCodes: serverCodes };
      }
      const isClean = sameCodes(current.codes, current.baselineCodes);
      return {
        tenantId,
        codes: isClean ? serverCodes : current.codes,
        baselineCodes: serverCodes,
      };
    });
  }, [catalogQuery.data, tenantId, tenantSpecialtiesQuery.data]);

  const draftIsReady = Boolean(
    tenantId && catalogQuery.data && tenantSpecialtiesQuery.data && draft?.tenantId === tenantId,
  );
  const selectedCodes = draftIsReady && draft?.tenantId === tenantId ? draft.codes : EMPTY_CODES;
  const selectedCodeSet = useMemo(() => new Set(selectedCodes), [selectedCodes]);
  const selectedModuleKeys = useMemo(() => {
    const keys = (catalogQuery.data ?? [])
      .filter((specialty) => selectedCodeSet.has(specialty.code))
      .flatMap((specialty) => specialty.modules.map((module) => module.moduleKey));
    return [...new Set(keys)];
  }, [catalogQuery.data, selectedCodeSet]);
  const persistedCodes = draft?.tenantId === tenantId ? draft.baselineCodes : EMPTY_CODES;
  const persistedCodeSet = useMemo(() => new Set(persistedCodes), [persistedCodes]);
  const specialtyCodeByModuleKey = useMemo(() => new Map(
    (catalogQuery.data ?? [])
      .flatMap((specialty) => specialty.modules.map((module) => [module.moduleKey, specialty.code] as const)),
  ), [catalogQuery.data]);

  const pricingMetadata = tenant?.subscription?.specialtyPricing;
  const authoritativePricing = savedPricing?.tenantId === tenantId && sameCodes(savedPricing.codes, selectedCodes)
    ? savedPricing.pricing
    : null;
  const estimatedAddonsPrice = pricingMetadata
    ? Math.max(0, selectedCodes.length - pricingMetadata.includedSpecialties) * pricingMetadata.specialtyUnitPrice
    : null;
  const displayedAddonsPrice = authoritativePricing?.specialtyAddonsPrice ?? estimatedAddonsPrice;
  const displayedCurrency = authoritativePricing?.currency ?? pricingMetadata?.currency;

  const toggleSpecialty = (code: string) => {
    if (!tenantId || !draftIsReady) return;
    setDraft((current) => {
      if (!current || current.tenantId !== tenantId) return current;
      const codes = current.codes.includes(code)
        ? current.codes.filter((currentCode) => currentCode !== code)
        : [...current.codes, code];
      return { ...current, codes };
    });
    setSavedPricing(null);
  };

  const saveSpecialties = async () => {
    if (!tenantId || !draftIsReady || selectedCodes.length === 0) return;
    try {
      const result = await replaceSpecialties.mutateAsync(selectedCodes);
      if (getActiveTenantId() !== tenantId || result.tenantId !== tenantId) return;

      const canonicalCodes = result.specialties.map((specialty) => specialty.code);
      setDraft((current) => getActiveTenantId() === tenantId && current?.tenantId === tenantId
        ? { tenantId, codes: canonicalCodes, baselineCodes: canonicalCodes }
        : current);
      setSavedPricing((current) => getActiveTenantId() === tenantId
        ? { tenantId, codes: canonicalCodes, pricing: result.pricing }
        : current);
    } catch {
      // The mutation error is rendered below; retaining the draft keeps the attempted selection visible.
    }
  };

  const catalog = catalogQuery.data ?? [];
  const modules = tenantModulesQuery.data ?? [];
  const moduleStateKnown = tenantModulesQuery.isSuccess && !tenantModulesQuery.isError;
  const enabledModulesCount = modules.filter((module) => module.enabled).length;
  const canEdit = canConfigure && draftIsReady;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">Especialidades</h1>
        <p className="mt-1 text-muted-foreground">
          Selecciona las especialidades disponibles para este consultorio. El plan incluye un cupo y las adicionales se cobran según la tarifa vigente.
        </p>
      </div>

      {!tenantId && (
        <Alert variant="warning" title="Consultorio no disponible">
          Inicia sesión con un consultorio activo para consultar sus especialidades.
        </Alert>
      )}

      {catalogQuery.isError && (
        <Alert variant="destructive" title="No se pudo cargar el catálogo">
          {errorMessage(catalogQuery.error, 'No se pudieron cargar las especialidades disponibles.')}
          <div className="mt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void catalogQuery.refetch()}>
              Reintentar catálogo
            </Button>
          </div>
        </Alert>
      )}

      {tenantSpecialtiesQuery.isError && (
        <Alert variant="destructive" title="No se pudo cargar la selección del consultorio">
          {errorMessage(tenantSpecialtiesQuery.error, 'No se pudo cargar la selección de especialidades.')}
          <div className="mt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void tenantSpecialtiesQuery.refetch()}>
              Reintentar selección
            </Button>
          </div>
        </Alert>
      )}

      {replaceSpecialties.error && (
        <Alert variant="destructive" title="No se pudieron guardar las especialidades">
          {errorMessage(replaceSpecialties.error, 'No fue posible actualizar las especialidades.')}
        </Alert>
      )}

      {setModuleEnabled.error && (
        <Alert variant="destructive" title="No se pudo actualizar el módulo">
          {errorMessage(setModuleEnabled.error, 'No fue posible actualizar el módulo.')}
        </Alert>
      )}

      {(catalogQuery.isLoading || tenantSpecialtiesQuery.isLoading || !draftIsReady) && tenantId && (
        <p role="status" className="text-sm text-muted-foreground">
          {catalogQuery.isLoading ? 'Cargando catálogo de especialidades…' : 'Cargando selección de especialidades…'}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Especialidades del consultorio</CardTitle>
          <CardDescription>
            {tenantSpecialtiesQuery.isLoading || !draftIsReady
              ? 'La selección actual aparecerá cuando se hayan cargado el catálogo y los datos del consultorio.'
              : `${selectedCodes.length} especialidad${selectedCodes.length === 1 ? '' : 'es'} seleccionada${selectedCodes.length === 1 ? '' : 's'}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {catalogQuery.isLoading && catalog.length === 0 ? (
            <p className="text-sm text-muted-foreground">Cargando catálogo…</p>
          ) : catalog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay especialidades disponibles.</p>
          ) : (
            <div className="space-y-3">
              {catalog.map((specialty) => {
                const isSelected = selectedCodeSet.has(specialty.code);
                return (
                  <button
                    key={specialty.code}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={!canEdit || replaceSpecialties.isPending}
                    onClick={() => toggleSpecialty(specialty.code)}
                    className={`w-full rounded-lg border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{specialty.name}</p>
                        {specialty.description && <p className="text-sm text-muted-foreground">{specialty.description}</p>}
                      </div>
                      <Badge variant={isSelected ? 'default' : 'outline'}>
                        {isSelected ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                    {specialty.modules.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {specialty.modules.map((module) => (
                          <Badge key={module.moduleKey} variant="secondary">{module.moduleKey}</Badge>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {displayedAddonsPrice !== null && displayedCurrency && draftIsReady && (
            <p aria-live="polite" className="text-sm text-muted-foreground">
              {authoritativePricing ? 'Precio mensual por especialidades:' : 'Estimado mensual:'}{' '}
              {formatMoney(displayedAddonsPrice, displayedCurrency)} / mes
            </p>
          )}

          {canConfigure && (
            <Button
              type="button"
              onClick={() => void saveSpecialties()}
              disabled={!draftIsReady || selectedCodes.length === 0 || replaceSpecialties.isPending}
              loading={replaceSpecialties.isPending}
            >
              Guardar especialidades
            </Button>
          )}

          {!canConfigure && (
            <p className="text-sm text-muted-foreground">
              La selección de especialidades la administra el administrador del consultorio.
            </p>
          )}

          {canConfigure && draftIsReady && selectedCodes.length === 0 && (
            <p className="text-sm text-destructive">Selecciona al menos una especialidad para continuar.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Módulos clínicos</CardTitle>
          <CardDescription>
            {tenantModulesQuery.isLoading
              ? 'Cargando módulos habilitados…'
              : tenantModulesQuery.isError
                ? 'No se pudo confirmar cuántos módulos están habilitados.'
                : `${enabledModulesCount} módulo${enabledModulesCount === 1 ? '' : 's'} habilitado${enabledModulesCount === 1 ? '' : 's'} para este consultorio.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tenantModulesQuery.isLoading && (
            <p role="status" className="text-sm text-muted-foreground">
              Cargando módulos del consultorio…
            </p>
          )}
          {tenantModulesQuery.isError && (
            <Alert variant="destructive" title="No se pudieron cargar los módulos">
              {errorMessage(tenantModulesQuery.error, 'No se pudo consultar el estado de los módulos.')}
              <div className="mt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void tenantModulesQuery.refetch()}>
                  Reintentar módulos
                </Button>
              </div>
            </Alert>
          )}
          {selectedModuleKeys.some((moduleKey) => {
            const specialtyCode = specialtyCodeByModuleKey.get(moduleKey);
            return specialtyCode !== undefined && !persistedCodeSet.has(specialtyCode);
          }) && (
            <p id="module-needs-save-guidance" className="text-sm text-muted-foreground">
              Guarda las especialidades antes de activar sus módulos.
            </p>
          )}
          {selectedModuleKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">Selecciona una especialidad para ver sus módulos.</p>
          ) : moduleStateKnown ? selectedModuleKeys.map((moduleKey) => {
            const tenantModule = modules.find((item) => item.moduleKey === moduleKey);
            const specialtyCode = specialtyCodeByModuleKey.get(moduleKey);
            const requiresSavedSpecialty = specialtyCode !== undefined && !persistedCodeSet.has(specialtyCode);
            return (
              <label key={moduleKey} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <span className="text-sm font-medium">{moduleKey}</span>
                <input
                  type="checkbox"
                  aria-label={moduleKey}
                  aria-describedby={requiresSavedSpecialty ? 'module-needs-save-guidance' : undefined}
                  checked={tenantModule?.enabled ?? false}
                  disabled={!canConfigure || !draftIsReady || requiresSavedSpecialty || tenantModulesQuery.isLoading || tenantModulesQuery.isError || setModuleEnabled.isPending}
                  onChange={(event) => setModuleEnabled.mutate({ moduleKey, enabled: event.currentTarget.checked })}
                  className="h-4 w-4 accent-primary"
                />
              </label>
            );
          }) : null}
        </CardContent>
      </Card>
    </div>
  );
}
