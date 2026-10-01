import { site } from '@/content/site';
import { CookieBanner } from '@/features/marketing/consent/cookie-banner';
import { GoogleAnalytics } from '@/features/marketing/consent/google-analytics';
import { MobileCta } from '@/features/marketing/mobile-cta';
import { SiteFooter } from '@/features/marketing/site-footer';
import { SiteHeader } from '@/features/marketing/site-header';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-background focus:p-2">
        Saltar al contenido
      </a>
      <SiteHeader />
      {/* Bottom padding keeps content clear of the fixed mobile CTA. */}
      <main id="contenido" className="flex-1 pb-20 md:pb-0">{children}</main>
      <SiteFooter />
      <MobileCta contact={site.contact} />
      <CookieBanner />
      <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_ID} />
    </div>
  );
}
