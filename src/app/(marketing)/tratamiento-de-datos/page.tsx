import DataProcessingText from '@/content/legal/data-processing';
import { site } from '@/content/site';
import { LegalPage } from '@/features/marketing/legal-page';
import { buildMetadata } from '@/features/marketing/seo';

export const metadata = buildMetadata('dataProcessing');

export default function DataProcessingPage() {
  return (
    <LegalPage page="dataProcessing" legal={site.legal}>
      <DataProcessingText legal={site.legal} brand={site.brand.name} />
    </LegalPage>
  );
}
