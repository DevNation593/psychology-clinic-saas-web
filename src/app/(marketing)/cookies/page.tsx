import CookiesText from '@/content/legal/cookies';
import { site } from '@/content/site';
import { LegalPage } from '@/features/marketing/legal-page';
import { buildMetadata } from '@/features/marketing/seo';

export const metadata = buildMetadata('cookies');

export default function CookiesPage() {
  return (
    <LegalPage page="cookies" legal={site.legal}>
      <CookiesText legal={site.legal} brand={site.brand.name} />
    </LegalPage>
  );
}
