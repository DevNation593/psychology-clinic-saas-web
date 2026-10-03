import { beforeEach, describe, expect, it, vi } from 'vitest';
import OnboardingPage from './page';

const navigation = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock('next/navigation', () => ({ redirect: navigation.redirect }));

describe('/onboarding', () => {
  beforeEach(() => navigation.redirect.mockClear());

  it('redirects /onboarding to /contacto', () => {
    OnboardingPage();
    expect(navigation.redirect).toHaveBeenCalledWith('/contacto');
  });
});
