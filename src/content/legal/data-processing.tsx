import type { LegalEntity } from '@/content/site';

const or = (value: string) => value.trim() || '[pendiente]';

export default function DataProcessingText({ legal, brand }: { legal: LegalEntity; brand: string }) {
  return (
    <>
      <p>Esta política describe cómo se tratan los datos que los consultorios gestionan dentro de {brand}.</p>

      <h2>1. Roles</h2>
      <p>
        Cada consultorio es el responsable del tratamiento de los datos de sus pacientes. {or(legal.companyName)}{' '}
        actúa como encargado: trata esos datos por cuenta del consultorio y siguiendo sus instrucciones.
      </p>

      <h2>2. Datos tratados</h2>
      <ul>
        <li>Datos de identificación y contacto de pacientes.</li>
        <li>Citas, tareas de seguimiento y facturas.</li>
        <li>Notas y registros clínicos, que son datos sensibles de salud.</li>
      </ul>

      <h2>3. Finalidad</h2>
      <p>Prestar al consultorio el servicio de gestión contratado. No usamos los datos de pacientes para otros fines.</p>

      <h2>4. Acceso y roles</h2>
      <p>
        La información de cada consultorio está aislada de la de los demás. Dentro del consultorio, las notas
        clínicas solo son visibles para los roles clínicos autorizados.
      </p>

      <h2>5. Seguridad</h2>
      <ul>
        <li>Control de acceso por rol.</li>
        <li>Transmisión cifrada entre el navegador y el servicio.</li>
        <li>Aislamiento de la información entre consultorios.</li>
      </ul>

      <h2>6. Subencargados</h2>
      <p>
        Para prestar el servicio intervienen proveedores de alojamiento y base de datos, de facturación electrónica
        y de envío de notificaciones.
      </p>

      <h2>7. Conservación y devolución</h2>
      <p>
        Los datos se conservan mientras la suscripción esté activa. Al cancelar, el consultorio puede solicitar la
        exportación y la eliminación de su información.
      </p>

      <h2>8. Derechos de los pacientes</h2>
      <p>
        Los pacientes ejercen sus derechos ante su consultorio. {or(legal.companyName)} asiste al consultorio para
        atender esas solicitudes.
      </p>

      <h2>9. Contacto</h2>
      <p>Para consultas sobre el tratamiento de datos escribe a {or(legal.dataContactEmail)}.</p>
    </>
  );
}
