import TermsText from '@/content/legal/terms';
import { site } from '@/content/site';
import { LegalPage } from '@/features/marketing/legal-page';
import { buildMetadata } from '@/features/marketing/seo';

export const metadata = buildMetadata('terms');

export default function TermsPage() {
  return (
    <LegalPage page="terms" legal={site.legal}>
      <TermsText legal={site.legal} brand={site.brand.name} />
    </LegalPage>
  );
}
