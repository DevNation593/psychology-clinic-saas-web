import { z } from 'zod';

export const TEAM_SIZES = ['1', '2-5', '6-15', '16+'] as const;

export const demoRequestSchema = z.object({
  name: z.string().trim().min(2, 'Escribe tu nombre'),
  clinic: z.string().trim().min(2, 'Escribe el nombre de tu consultorio'),
  email: z.string().trim().email('Correo inválido'),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{6,}$/, 'Teléfono inválido'),
  teamSize: z.string().min(1, 'Selecciona el tamaño de tu equipo'),
  message: z.string().trim().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
  acceptPrivacy: z.boolean().refine((value) => value, 'Debes aceptar la política de privacidad'),
});

export type DemoRequest = z.infer<typeof demoRequestSchema>;

export function buildDemoMessage(data: DemoRequest): string {
  const lines = [
    'Hola, quiero solicitar una demo.',
    `Nombre: ${data.name}`,
    `Consultorio: ${data.clinic}`,
    `Correo: ${data.email}`,
    `Teléfono: ${data.phone}`,
    `Tamaño del equipo: ${data.teamSize}`,
  ];
  if (data.message) lines.push(`Mensaje: ${data.message}`);
  return lines.join('\n');
}

export function whatsappUrl(number: string, text: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}

export function mailtoUrl(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
