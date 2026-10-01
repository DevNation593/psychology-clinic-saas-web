import { describe, expect, it } from 'vitest';
import { site, type SiteContent } from '@/content/site';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import {
  PAGES, absoluteUrl, breadcrumbLd, buildMetadata, faqLd, isIndexable,
  localBusinessLd, softwareApplicationLd, type PageKey,
} from './seo';

const keys = Object.keys(PAGES) as PageKey[];
const withContent = (overrides: Partial<SiteContent>): SiteContent => ({ ...site, ...overrides });

describe('page metadata', () => {
  it('gives every page a unique title and description', () => {
    const titles = keys.map((key) => PAGES[key].title);
    const descriptions = keys.map((key) => PAGES[key].description);
    expect(new Set(titles).size).toBe(keys.length);
    expect(new Set(descriptions).size).toBe(keys.length);
    for (const description of descriptions) expect(description.length).toBeLessThanOrEqual(160);
  });

  it('builds canonical, Open Graph and Twitter data', () => {
    const metadata = buildMetadata('plans');
    expect(metadata.title).toBe(PAGES.plans.title);
    expect(metadata.alternates?.canonical).toBe(`${site.brand.baseUrl}/planes`);
    expect(metadata.openGraph).toMatchObject({ url: `${site.brand.baseUrl}/planes`, locale: 'es_EC' });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' });
  });

  it('joins the base URL and path with exactly one slash', () => {
    const content = withContent({ brand: { ...site.brand, baseUrl: 'https://example.com' } });
    expect(absoluteUrl('/', content)).toBe('https://example.com/');
    expect(absoluteUrl('/planes', content)).toBe('https://example.com/planes');
    expect(absoluteUrl('planes', content)).toBe('https://example.com/planes');
  });
});

describe('indexability', () => {
  it('never indexes the thank-you page', () => {
    expect(isIndexable('thanks')).toBe(false);
    expect(buildMetadata('thanks').robots).toMatchObject({ index: false });
  });

  it('indexes legal pages only after legal review', () => {
    expect(isIndexable('privacy')).toBe(false);
    expect(isIndexable('privacy', withContent({ legal: { ...site.legal, reviewed: true } }))).toBe(true);
  });

  it('indexes case studies only when some exist', () => {
    expect(isIndexable('caseStudies')).toBe(false);
    const content = withContent({ caseStudies: [{ clinic: 'A', challenge: 'B', result: 'C' }] });
    expect(isIndexable('caseStudies', content)).toBe(true);
  });
});

describe('structured data', () => {
  it('describes the product with fixed-price offers only', () => {
    const data = softwareApplicationLd();
    expect(data['@type']).toBe('SoftwareApplication');
    expect(data.offers.map((offer: { price: string }) => offer.price)).toEqual(['0', '29', '59', '99', '199']);
    expect(data).not.toHaveProperty('aggregateRating');
  });

  it('adds ratings only from real reviews', () => {
    const data = softwareApplicationLd(withContent({
      reviews: [
        { author: 'A', role: 'R', quote: 'Q', rating: 5 },
        { author: 'B', role: 'R', quote: 'Q', rating: 4 },
      ],
    }));
    expect(data.aggregateRating).toMatchObject({ ratingValue: '4.5', reviewCount: 2 });
  });

  it('builds a FAQ page entity', () => {
    const data = faqLd(site.faq);
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity).toHaveLength(5);
  });

  it('omits the local business without a location', () => {
    expect(localBusinessLd()).toBeNull();
    const data = localBusinessLd(withContent({
      location: { address: 'Av. 1', city: 'Quito', country: 'EC', latitude: -0.18, longitude: -78.47, directions: 'x' },
    }));
    expect(data).toMatchObject({ '@type': 'LocalBusiness', geo: { latitude: -0.18, longitude: -78.47 } });
  });

  it('builds breadcrumbs starting at home', () => {
    const data = breadcrumbLd([{ label: 'Planes', path: '/planes' }]);
    expect(data.itemListElement.map((item: { name: string }) => item.name)).toEqual(['Inicio', 'Planes']);
    expect(data.itemListElement[1].position).toBe(2);
  });
});

describe('robots and sitemap', () => {
  it('disallows private areas and links the sitemap', () => {
    const result = robots();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule.disallow).toEqual(expect.arrayContaining(['/dashboard', '/login', '/gracias', '/onboarding', '/activate']));
    expect(result.sitemap).toBe(`${site.brand.baseUrl}/sitemap.xml`);
  });

  it('lists only indexable pages', () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain(`${site.brand.baseUrl}/`);
    expect(urls).toContain(`${site.brand.baseUrl}/planes`);
    expect(urls).not.toContain(`${site.brand.baseUrl}/gracias`);
    expect(urls).not.toContain(`${site.brand.baseUrl}/privacidad`);
    expect(urls).not.toContain(`${site.brand.baseUrl}/casos-de-exito`);
  });
});
