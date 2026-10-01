import { ImageResponse } from 'next/og';
import { site } from '@/content/site';

export const runtime = 'edge';
export const alt = `${site.brand.name}: ${site.brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: 80, color: '#ffffff',
          background: 'linear-gradient(135deg, #1d4ed8 0%, #312e81 100%)',
        }}
      >
        <div style={{ fontSize: 36, opacity: 0.85 }}>{site.brand.name}</div>
        <div style={{ fontSize: 72, fontWeight: 700, marginTop: 24, lineHeight: 1.1 }}>{site.brand.tagline}</div>
        <div style={{ fontSize: 30, marginTop: 32, opacity: 0.9 }}>Agenda · Pacientes · Notas clínicas · Facturación</div>
      </div>
    ),
    size,
  );
}
