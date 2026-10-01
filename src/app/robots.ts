import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/features/marketing/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard', '/patients', '/calendar', '/tasks', '/profile', '/admin',
        '/login', '/forgot-password', '/reset-password', '/onboarding', '/activate', '/gracias',
      ],
    }],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
