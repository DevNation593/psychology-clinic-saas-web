import type { LegalEntity } from '@/content/site';

const or = (value: string) => value.trim() || '[pendiente]';

export default function CookiesText({ legal, brand }: { legal: LegalEntity; brand: string }) {
  return (
    <>
      <h2>1. Qué son las cookies</h2>
      <p>
        Son pequeños archivos que un sitio guarda en tu navegador para recordar información entre visitas. {brand}{' '}
        también usa el almacenamiento local del navegador con el mismo fin.
      </p>

      <h2>2. Almacenamiento esencial</h2>
      <ul>
        <li>
          <code>cookie-consent</code>: se guarda en el almacenamiento local para recordar si aceptaste o rechazaste
          las cookies no esenciales.
        </li>
        <li>Datos de sesión de la aplicación, una vez que inicias sesión en el panel.</li>
      </ul>
      <p>Este almacenamiento es necesario para que el sitio funcione y no requiere consentimiento.</p>

      <h2>3. Cookies de analítica</h2>
      <p>
        Usamos Google Analytics (cookies <code>_ga</code> y <code>_ga_*</code>) para conocer de forma agregada cómo
        se usa el sitio. Solo se cargan después de que aceptas, y con la dirección IP anonimizada.
      </p>

      <h2>4. Cookies de terceros en el mapa</h2>
      <p>
        El mapa de Google Maps instala cookies propias de Google. Solo se muestra incrustado si aceptaste las
        cookies; en caso contrario verás un enlace para abrirlo en Google Maps.
      </p>

      <h2>5. Cómo aceptar, rechazar o cambiar tu elección</h2>
      <p>
        En tu primera visita aparece un aviso para aceptar o rechazar. Puedes cambiar tu elección en cualquier
        momento desde «Preferencias de cookies» en el pie de página. Si rechazas después de haber aceptado, la
        página se recarga para dejar de cargar la analítica.
      </p>

      <h2>6. Contacto</h2>
      <p>
        Responsable: {or(legal.companyName)}. Para consultas escribe a {or(legal.dataContactEmail)}.
      </p>
    </>
  );
}
