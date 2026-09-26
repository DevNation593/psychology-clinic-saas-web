import { describe, expectTypeOf, it } from 'vitest';
import type {
  ClinicOnboardingResult,
  CreateClinicOnboardingInput,
  CreateTenantUserInput,
  SpecialtyCatalogItem,
  SpecialtyPricingSummary,
  SpecialtySelectionResult,
  TenantSpecialty,
  TenantModule,
  TenantModuleSelection,
} from './index';
import type { ClinicOnboardingFormData, TenantTeamMemberFormData } from '@/lib/validations/schemas';
import { tenantSpecialtiesApi } from '@/lib/api/endpoints';

describe('specialty onboarding wire contracts', () => {
  it('keeps the public catalog and selection modules distinct from database rows', () => {
    expectTypeOf<SpecialtyCatalogItem>().toEqualTypeOf<{
      id: string;
      code: string;
      name: string;
      description: string | null;
      modules: { id: string; moduleKey: string }[];
    }>();
    expectTypeOf<TenantModuleSelection>().toEqualTypeOf<{ moduleKey: string; enabled: boolean }>();
    expectTypeOf<TenantModule>().toHaveProperty('tenantId');
    expectTypeOf<SpecialtySelectionResult['modules'][number]>().toEqualTypeOf<TenantModuleSelection>();
    expectTypeOf<TenantSpecialty['description']>().toEqualTypeOf<string | null>();
    expectTypeOf<Awaited<ReturnType<typeof tenantSpecialtiesApi.list>>>().toEqualTypeOf<TenantSpecialty[]>();
  });

  it('keeps the complete numeric pricing summary and safe onboarding projections', () => {
    expectTypeOf<SpecialtyPricingSummary>().toEqualTypeOf<{
      includedSpecialties: number;
      selectedSpecialties: number;
      billableSpecialties: number;
      specialtyUnitPrice: number;
      basePlanPrice: number;
      featureAddonsPrice: number;
      specialtyAddonsPrice: number;
      totalMonthly: number;
      currency: string;
    }>();
    expectTypeOf<ClinicOnboardingResult['tenant']>().toHaveProperty('onboardingCompleted');
    expectTypeOf<ClinicOnboardingResult['admin']['professionalProfile']>().toEqualTypeOf<{
      isActive: boolean;
      specialty: { id: string; code: string; name: string };
    } | null>();
    expectTypeOf<ClinicOnboardingResult['admin']>().toHaveProperty('email');
    expectTypeOf<ClinicOnboardingResult['admin']>().not.toHaveProperty('password');
    expectTypeOf<ClinicOnboardingFormData>().toExtend<CreateClinicOnboardingInput>();
    expectTypeOf<TenantTeamMemberFormData>().toExtend<CreateTenantUserInput>();
  });
});
