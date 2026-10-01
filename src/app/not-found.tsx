import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/content/site';

export const metadata: Metadata = {
  title: 'Página no encontrada',
  description: 'La página que buscas no existe o cambió de dirección.',
  robots: { index: false, follow: false },
};

const link = 'inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-accent';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold text-primary">{site.brand.name} · Error 404</p>
      <h1 className="mt-2 text-3xl font-bold">No encontramos esta página</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Puede que el enlace esté desactualizado o que la dirección tenga un error. Estas secciones sí existen:
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={`${link} bg-primary text-primary-foreground hover:bg-primary/90`}>Ir al inicio</Link>
        <Link href="/planes" className={link}>Ver planes</Link>
        <Link href="/contacto" className={link}>Contacto</Link>
        <Link href="/login" className={link}>Iniciar sesión</Link>
      </div>
    </main>
  );
}
