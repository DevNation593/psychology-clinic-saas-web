const APPOINTMENT_ERROR_MESSAGES: Record<string, string> = {
  APPOINTMENT_CONFLICT: 'El profesional ya tiene una cita en ese horario.',
  PROFESSIONAL_SPECIALTY_MISMATCH:
    'El profesional no pertenece a la especialidad seleccionada.',
  SPECIALTY_NOT_ENABLED:
    'La especialidad ya no está habilitada en el consultorio.',
  PROFESSIONAL_NOT_AUTHORIZED:
    'El profesional ya no está disponible para atención.',
};

export function getAppointmentErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && !Array.isArray(error)) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && APPOINTMENT_ERROR_MESSAGES[code]) {
      return APPOINTMENT_ERROR_MESSAGES[code];
    }
  }

  return 'No se pudo completar la operación. Inténtalo nuevamente.';
}
