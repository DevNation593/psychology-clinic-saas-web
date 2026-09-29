import { describe, expect, it } from 'vitest';
import { appointmentSchema, patientSchema } from './schemas';

describe('canonical patient and appointment forms', () => {
  it('strips the legacy assignment from patient demographics', () => {
    const result = patientSchema.parse({
      firstName: 'Ana', lastName: 'Paz', assignedPsychologistId: 'legacy-user',
    });
    expect(result).not.toHaveProperty('assignedPsychologistId');
  });

  it('requires a patient, professional and specialty for appointment creation', () => {
    const base = { patientId: 'patient-1', professionalId: 'pro-1', specialtyId: 'nutrition',
      title: 'Consulta', startTime: '2026-10-01T10:00', duration: 60, isOnline: false };
    for (const field of ['patientId', 'professionalId', 'specialtyId'] as const) {
      expect(appointmentSchema.safeParse({ ...base, [field]: '' }).success).toBe(false);
    }
    expect(appointmentSchema.parse({ ...base, psychologistId: 'legacy-user' })).toEqual(base);
  });
});
