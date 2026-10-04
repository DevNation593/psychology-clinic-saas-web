import { TenantDetail } from '@/features/platform/tenant-detail';

export default function PlatformTenantDetailPage({ params }: { params: { tenantId: string } }) {
  return <TenantDetail tenantId={params.tenantId} />;
}
