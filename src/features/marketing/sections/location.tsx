import type { SiteLocation } from '@/content/site';
import { ConsentGate } from '../consent/consent-gate';

export function LocationSection({ location }: { location: SiteLocation | null }) {
  if (!location) return null;
  const coordinates = `${location.latitude},${location.longitude}`;
  // Numeric coordinates need no encoding; keeping the comma readable.
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${coordinates}`;
  return (
    <section aria-labelledby="location-title" className="mx-auto max-w-6xl px-4 py-16">
      <h2 id="location-title" className="text-2xl font-bold">Dónde estamos</h2>
      <address className="mt-4 not-italic">{location.address}, {location.city}, {location.country}</address>
      <p className="mt-2 text-sm text-muted-foreground">{location.directions}</p>
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-primary underline">Ver en Google Maps</a>
      <div className="mt-6">
        {/* The embed sets third-party cookies, so it waits for consent. */}
        <ConsentGate fallback={<p className="text-sm text-muted-foreground">Acepta las cookies para ver el mapa aquí.</p>}>
          <iframe
            title="Mapa de ubicación"
            src={`https://www.google.com/maps?q=${encodeURIComponent(coordinates)}&output=embed`}
            className="h-80 w-full rounded-lg border"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </ConsentGate>
      </div>
    </section>
  );
}
