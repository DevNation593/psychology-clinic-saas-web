import { CreateTenantForm } from '@/features/platform/create-tenant-form';

export default function PlatformNewTenantPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nuevo consultorio</h1>
      <CreateTenantForm />
    </div>
  );
}
