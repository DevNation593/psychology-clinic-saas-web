import { TenantsTable } from '@/features/platform/tenants-table';

export default function PlatformTenantsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Consultorios</h1>
      <TenantsTable />
    </div>
  );
}
