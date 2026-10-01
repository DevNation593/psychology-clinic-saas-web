import type { LegalEntity } from '@/content/site';

const or = (value: string) => value.trim() || '[pendiente]';

export default function PrivacyText({ legal, brand }: { legal: LegalEntity; brand: string }) {
  return (
    <>
      <p>Esta política aplica a quienes visitan el sitio público de {brand}.</p>

      <h2>1. Responsable</h2>
      <p>
        El responsable del tratamiento es {or(legal.companyName)}, con identificación fiscal {or(legal.taxId)} y
        domicilio en {or(legal.address)}. Contacto: {or(legal.dataContactEmail)}.
      </p>

      <h2>2. Datos que recopilamos</h2>
      <ul>
        <li>
          Formulario de solicitud de demo: nombre, consultorio, correo, teléfono, tamaño del equipo y mensaje. Este
          sitio no almacena esos datos: el formulario abre WhatsApp o tu aplicación de correo con el mensaje
          preparado y los datos viajan por ese canal cuando tú lo envías.
        </li>
        <li>Datos de uso del sitio mediante analítica, únicamente si aceptas las cookies.</li>
      </ul>

      <h2>3. Finalidad</h2>
      <p>Responder a tu solicitud de demostración y medir cómo se usa el sitio para mejorarlo.</p>

      <h2>4. Base legal</h2>
      <p>Tu consentimiento, que otorgas al enviar el mensaje y al aceptar las cookies de analítica.</p>

      <h2>5. Terceros</h2>
      <ul>
        <li>WhatsApp (Meta), cuando envías el mensaje por ese medio.</li>
        <li>Google Analytics, solo si aceptas las cookies.</li>
        <li>Google Maps, solo si aceptas las cookies y se muestra el mapa.</li>
      </ul>

      <h2>6. Conservación</h2>
      <p>
        Conservamos los mensajes mientras dure la conversación comercial. Los datos de analítica se conservan según
        la configuración de retención de Google Analytics.
      </p>

      <h2>7. Tus derechos</h2>
      <p>
        Puedes solicitar el acceso, la rectificación, la eliminación, la oposición y la portabilidad de tus datos
        escribiendo a {or(legal.dataContactEmail)}.
      </p>

      <h2>8. Cambios</h2>
      <p>Podemos actualizar esta política. Publicaremos aquí la versión vigente y su fecha de actualización.</p>
    </>
  );
}
