import type { MetadataRoute } from 'next';
import { PAGES, absoluteUrl, isIndexable, type PageKey } from '@/features/marketing/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  return (Object.keys(PAGES) as PageKey[])
    .filter((key) => isIndexable(key))
    .map((key) => ({
      url: absoluteUrl(PAGES[key].path),
      changeFrequency: 'monthly' as const,
      priority: key === 'home' ? 1 : 0.7,
    }));
}
