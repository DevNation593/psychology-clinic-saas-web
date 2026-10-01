export interface ModuleLabel {
  name: string;
  description?: string;
}

// The API identifies modules only by key, so their display names live here.
const MODULE_LABELS: Record<string, ModuleLabel> = {
  'psychology.assessments': { name: 'Evaluaciones psicológicas', description: 'Registro de evaluaciones y pruebas por paciente.' },
  'psychology.assessment': { name: 'Evaluaciones psicológicas', description: 'Registro de evaluaciones y pruebas por paciente.' },
  'psychology.notes': { name: 'Notas de psicología', description: 'Notas de sesión propias de la especialidad.' },
  'psychology.session-notes': { name: 'Notas de sesión', description: 'Notas de cada sesión de psicología.' },
  'nutrition.assessments': { name: 'Evaluaciones nutricionales', description: 'Medidas, hábitos y valoración del estado nutricional.' },
  'nutrition.assessment': { name: 'Evaluaciones nutricionales', description: 'Medidas, hábitos y valoración del estado nutricional.' },
  'nutrition.diet': { name: 'Planes de alimentación', description: 'Planes y pautas alimentarias por paciente.' },
  'nutrition.diet-plans': { name: 'Planes de alimentación', description: 'Planes y pautas alimentarias por paciente.' },
  'dentistry.odontogram': { name: 'Odontograma', description: 'Registro del estado de cada pieza dental.' },
  'dentistry.treatments': { name: 'Tratamientos dentales', description: 'Seguimiento de tratamientos realizados y pendientes.' },
  'physiotherapy.evolution': { name: 'Evolución de fisioterapia', description: 'Notas de evolución por sesión.' },
  'physiotherapy.exercise-plans': { name: 'Planes de ejercicios', description: 'Ejercicios indicados y su frecuencia.' },
  'core.tasks': { name: 'Tareas', description: 'Pendientes y seguimiento por paciente.' },
  'core.team': { name: 'Equipo', description: 'Gestión de usuarios del consultorio.' },
  'commercial.export': { name: 'Exportación de datos', description: 'Descarga de la información del consultorio.' },
};

/** Display name for a module key; unknown keys become readable text rather than a raw identifier. */
export function describeModule(moduleKey: string): ModuleLabel {
  const known = MODULE_LABELS[moduleKey];
  if (known) return known;
  if (!moduleKey.trim()) return { name: 'Módulo sin nombre' };

  const segment = moduleKey.slice(moduleKey.lastIndexOf('.') + 1).replace(/[_-]+/g, ' ').trim();
  if (!segment) return { name: moduleKey };
  return { name: segment.charAt(0).toUpperCase() + segment.slice(1) };
}
