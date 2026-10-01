import PrivacyText from '@/content/legal/privacy';
import { site } from '@/content/site';
import { LegalPage } from '@/features/marketing/legal-page';
import { buildMetadata } from '@/features/marketing/seo';

export const metadata = buildMetadata('privacy');

export default function PrivacyPage() {
  return (
    <LegalPage page="privacy" legal={site.legal}>
      <PrivacyText legal={site.legal} brand={site.brand.name} />
    </LegalPage>
  );
}
