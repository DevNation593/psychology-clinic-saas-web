import { redirect } from 'next/navigation';

// Public sign-up is closed: clinics are created by the platform admin.
export default function OnboardingPage() {
  redirect('/contacto');
}
