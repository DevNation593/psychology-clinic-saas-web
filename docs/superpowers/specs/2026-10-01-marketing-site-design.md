# Sitio público de presentación — diseño

Fecha: 2026-10-01 · Repositorio: web · Rama: `feat/marketing-site` (desde `dev`)

## Objetivo

Hoy `/` solo redirige a `/login` o `/dashboard`. Se necesita un sitio público que
presente el sistema a clínicas y profesionales de salud (qué es, cómo funciona,
planes) y los lleve a solicitar una demo. Los usuarios existentes siguen entrando
por `/login`.

Éxito: un visitante entiende qué hace el sistema, ve precios y puede pedir una
demo sin hacer scroll; el sitio cumple la lista de SEO, legales y consentimiento
acordada; nada del panel autenticado cambia de comportamiento.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| CTA principal | Formulario de solicitud de demo; WhatsApp como CTA secundario |
| Destino de leads | Solo web: el formulario abre WhatsApp con los datos prellenados y lleva a `/gracias`. No se almacena nada |
| Contenido real | Un archivo de contenido tipado; reseñas, casos, equipo y mapa no se renderizan mientras estén vacíos. No se publica contenido inventado |
| Precios | Los de la API (`api/src/subscription/subscription-pricing.ts`), copiados a mano |
| Cookies | Se requiere consentimiento: Google Analytics y el mapa incrustado solo se cargan tras aceptar |
| Arquitectura | Grupo de rutas `(marketing)` dentro de la app Next.js 14 existente |

## Rutas

| Ruta | Contenido | Indexable |
|---|---|---|
| `/` | Hero con CTA sobre el pliegue, cómo funciona (resumen), módulos, planes (resumen), casos, reseñas, 5 preguntas frecuentes, contacto | Sí |
| `/planes` | Los seis planes con precio, límites y CTA | Sí |
| `/como-funciona` | Flujo paso a paso | Sí |
| `/casos-de-exito` | Lista de casos. Sin casos: `notFound()` y fuera del sitemap y de la navegación | Condicional |
| `/nosotros` | Equipo con fotos, mapa y dirección; cada bloque solo si tiene datos | Sí |
| `/contacto` | Formulario de demo, WhatsApp, correo, promesa de respuesta | Sí |
| `/gracias` | Confirmación tras el formulario, repite la promesa de respuesta, enlaces internos | No |
| `/terminos`, `/privacidad`, `/cookies`, `/tratamiento-de-datos` | Textos legales | Solo si `legal.reviewed` |
| `not-found` (global) | 404 con marca y enlaces a inicio, planes, contacto y login | No |

`src/app/page.tsx` se elimina; `/` pasa a `src/app/(marketing)/page.tsx`, un
componente de servidor. No hay redirección automática para usuarios con sesión:
el botón del encabezado muestra "Ir al panel" en lugar de "Iniciar sesión" una
vez hidratado el store de autenticación.

## Estructura de archivos

```
src/content/site.ts                 contenido y tipos (única fuente editable)
src/content/legal/*.tsx             cuerpo de los cuatro textos legales
src/app/(marketing)/layout.tsx      encabezado, pie, CTA móvil, banner de cookies, analítica
src/app/(marketing)/**/page.tsx     una página por ruta, cada una con su `metadata`
src/app/not-found.tsx
src/app/robots.ts, sitemap.ts, opengraph-image.tsx
src/features/marketing/             componentes y lógica
  sections/                         hero, how-it-works, modules, plans, cases, reviews, faq, team, location
  demo-request-form.tsx
  whatsapp.ts                       construcción del enlace wa.me
  breadcrumbs.tsx
  mobile-cta.tsx
  consent/                          store, banner, GoogleAnalytics, ConsentGate
  seo.ts                            buildMetadata() y generadores JSON-LD
```

## Contenido (`src/content/site.ts`)

Un objeto tipado exportado. Campos:

- `brand`: nombre, descripción corta, URL base (de `NEXT_PUBLIC_APP_URL`).
- `contact`: `whatsappNumber`, `email`, `responseTime` (texto de la promesa,
  p. ej. "Respondemos en menos de 24 horas hábiles").
- `plans`: seis entradas con nombre, precio base, precio por usuario adicional,
  usuarios incluidos, pacientes activos, almacenamiento, notificaciones y tipo
  (personal o clínica). Valores iniciales:

  | Plan | Base USD/mes | Usuario extra | Usuarios | Pacientes | Almacenamiento |
  |---|---|---|---|---|---|
  | Prueba | 0 | — | 1 | 10 | — |
  | Personal Básico | 29 | — | 1 | 50 | — |
  | Personal Pro | 59 | — | 1 | 200 | 1 GB |
  | Clínica Básica | 99 | 15 | 3 | 150 | 1 GB |
  | Clínica Pro | 199 | 12 | 10 | 500 | 5 GB |
  | Enterprise | A medida | — | — | — | — |

- `faq`: exactamente cinco pares pregunta/respuesta sobre el producto.
- `reviews`, `caseStudies`, `team`: arreglos, vacíos por defecto.
- `location`: `null` por defecto; con datos lleva dirección, ciudad, país,
  coordenadas e indicaciones.
- `legal`: razón social, identificación fiscal, domicilio, correo de contacto de
  datos, `reviewed: false`.

Todo tipo que incluya imagen exige `alt: string` no vacío.

Campos de contacto vacíos: si falta `whatsappNumber`, los CTA de WhatsApp no se
muestran y el formulario usa `mailto:` con `contact.email`; si faltan ambos, el
formulario no se renderiza y `/contacto` muestra solo un aviso. Esto se cubre
con pruebas.

## Componentes

- **Encabezado**: logo textual, navegación (Cómo funciona, Planes, Nosotros,
  Contacto), "Iniciar sesión" / "Ir al panel", botón "Solicitar demo".
- **Pie**: navegación, enlaces legales, contacto, "Preferencias de cookies".
- **Breadcrumbs**: en todas las páginas salvo `/`; emite también `BreadcrumbList`.
- **CTA móvil fijo**: barra inferior visible bajo `md`, con "Solicitar demo" y
  WhatsApp. El layout reserva espacio inferior para que no tape contenido ni el
  banner de cookies.
- **Formulario de demo**: nombre, clínica, correo, teléfono, tamaño del equipo,
  mensaje opcional y casilla de aceptación de la política de privacidad.
  Validación con zod y react-hook-form. Al enviar: abre el enlace de WhatsApp en
  una pestaña nueva y navega a `/gracias`. No hace peticiones de red.
- **Secciones condicionales**: `reviews`, `caseStudies`, `team` y `location`
  devuelven `null` con datos vacíos.

## SEO

- `buildMetadata({ title, description, path, noIndex })` produce título único,
  metadescripción, canónica, Open Graph y Twitter para cada página.
- `opengraph-image.tsx` genera la imagen social 1200×630 con marca y lema.
- `robots.ts`: permite el sitio público; desautoriza panel, autenticación,
  onboarding, activación y `/gracias`; enlaza el sitemap.
- `sitemap.ts`: rutas públicas indexables; omite las condicionales sin datos y
  las legales mientras `legal.reviewed` sea falso.
- JSON-LD: `SoftwareApplication` con ofertas de los planes de precio fijo y
  `FAQPage` en `/`; `LocalBusiness` solo con `location`; `aggregateRating` y
  `review` solo con reseñas reales cargadas.

## Consentimiento y analítica

- Estado `unset | accepted | rejected` en `localStorage`, con acceso protegido
  por try/catch; por defecto no hay consentimiento.
- Banner con Aceptar, Rechazar y enlace a `/cookies`; se reabre desde el pie.
- `GoogleAnalytics` inyecta gtag solo si el consentimiento es `accepted` y
  `NEXT_PUBLIC_GA_ID` existe. Al rechazar tras haber aceptado se deja de enviar
  y se recarga la página para descargar el script.
- `ConsentGate` envuelve el mapa incrustado; sin consentimiento muestra la
  dirección y un enlace "Ver en Google Maps".
- La analítica solo se monta en el layout de marketing, no en el panel.

## Legales

Cuatro textos en español redactados como borrador, con el responsable tomado
de `legal`. Mientras `legal.reviewed` sea falso cada página muestra un aviso de
"borrador pendiente de revisión legal" y lleva `noindex`. Requieren revisión de
un abogado antes de marcarse como revisados; la normativa de referencia para
Ecuador es la LOPDP.

## Manejo de errores

- Formulario: errores por campo junto al campo; si no se puede abrir la ventana
  de WhatsApp, se muestra el enlace para abrirlo manualmente y no se navega.
- `localStorage` no disponible: se trata como sin consentimiento.
- Ruta condicional sin datos: 404 de la plataforma.

## Pruebas

Vitest + Testing Library, test primero:

- Secciones condicionales: no renderizan con datos vacíos, renderizan con datos.
- Formulario: validación, enlace de WhatsApp generado, alternativa `mailto`,
  navegación a `/gracias`, fallo al abrir ventana.
- Consentimiento: estados, persistencia, GA ausente sin consentimiento o sin ID.
- `buildMetadata`: títulos únicos entre todas las rutas, canónica, `noIndex`.
- JSON-LD: forma válida, omisión de `LocalBusiness` y reseñas sin datos.
- `robots` y `sitemap`: rutas incluidas y excluidas según contenido.
- Contenido: cinco FAQ, todo `alt` no vacío, planes coinciden con la tabla.
- 404: enlaces internos presentes.

Verificación final: lint, type-check, pruebas completas, build y revisión visual
en escritorio y móvil.

## Fuera de alcance

- Almacenar leads o avisar por correo.
- Registro autónomo de clínicas.
- Corregir los precios de `admin/subscription/page.tsx`, que no coinciden con la
  API (tarea aparte).
- Blog e internacionalización.

## Pendiente del propietario

Número de WhatsApp, correo de contacto, texto de la promesa de respuesta, ID de
Google Analytics, datos legales del responsable, y reseñas, casos, fotos del
equipo y dirección reales.
