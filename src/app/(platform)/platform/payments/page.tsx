import { PaymentsTable } from '@/features/platform/payments-table';

export default function PlatformPaymentsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pagos de suscripción</h1>
      <PaymentsTable />
    </div>
  );
}
