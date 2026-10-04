import { PlatformSummary } from '@/features/platform/platform-summary';

export default function PlatformHomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Resumen</h1>
      <PlatformSummary />
    </div>
  );
}
