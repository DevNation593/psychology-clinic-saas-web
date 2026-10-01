import type { LegalEntity } from '@/content/site';

const or = (value: string) => value.trim() || '[pendiente]';

export default function TermsText({ legal, brand }: { legal: LegalEntity; brand: string }) {
  return (
    <>
      <h2>1. Quiénes somos</h2>
      <p>
        {brand} es un servicio operado por {or(legal.companyName)}, con identificación fiscal {or(legal.taxId)} y
        domicilio en {or(legal.address)}. Al usar el servicio aceptas estos términos.
      </p>

      <h2>2. Objeto del servicio</h2>
      <p>
        {brand} es un software de gestión para consultorios y profesionales de la salud. Permite administrar citas,
        pacientes, registros clínicos, tareas de seguimiento y facturación electrónica. Es una herramienta de
        gestión: no presta atención médica ni ofrece recomendaciones clínicas.
      </p>

      <h2>3. Cuentas y acceso</h2>
      <p>
        El administrador de cada consultorio crea las cuentas de su equipo y asigna sus roles. El consultorio es
        responsable de mantener la confidencialidad de las credenciales y de la actividad realizada con ellas.
      </p>

      <h2>4. Planes y pagos</h2>
      <p>
        El servicio se contrata por planes mensuales con precios en dólares estadounidenses, publicados en la página
        de planes. Los planes de clínica incluyen un número de usuarios y cada usuario adicional se cobra según el
        plan contratado. Los precios pueden cambiar y se comunicarán con anticipación.
      </p>

      <h2>5. Uso aceptable</h2>
      <ul>
        <li>Usar el servicio únicamente para fines lícitos y propios de la actividad del consultorio.</li>
        <li>No compartir credenciales entre personas.</li>
        <li>No intentar acceder a información de otros consultorios ni vulnerar la seguridad del servicio.</li>
      </ul>

      <h2>6. Responsabilidad sobre los datos clínicos</h2>
      <p>
        El consultorio decide qué datos de sus pacientes registra y es responsable de contar con la base legal para
        tratarlos. El detalle se encuentra en la política de tratamiento de datos personales.
      </p>

      <h2>7. Disponibilidad y limitación de responsabilidad</h2>
      <p>
        Hacemos esfuerzos razonables para mantener el servicio disponible, pero no garantizamos que funcione sin
        interrupciones. No respondemos por decisiones clínicas ni por el contenido que el consultorio registra.
      </p>

      <h2>8. Terminación</h2>
      <p>
        Cualquiera de las partes puede dar por terminado el servicio. La política de tratamiento de datos personales
        explica qué ocurre con la información del consultorio tras la cancelación.
      </p>

      <h2>9. Contacto</h2>
      <p>Para consultas sobre estos términos escribe a {or(legal.dataContactEmail)}.</p>
    </>
  );
}
