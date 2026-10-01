import { describe, expect, it } from 'vitest';
import { describeModule } from './module-labels';

describe('describeModule', () => {
  it('names known modules in Spanish with a description', () => {
    expect(describeModule('psychology.assessments')).toEqual({
      name: 'Evaluaciones psicológicas',
      description: expect.stringMatching(/\S/),
    });
    expect(describeModule('nutrition.assessments').name).toBe('Evaluaciones nutricionales');
    expect(describeModule('dentistry.odontogram').name).toBe('Odontograma');
  });

  it('turns an unknown key into readable text instead of showing the raw key', () => {
    expect(describeModule('laboratory.blood_tests')).toEqual({ name: 'Blood tests' });
    expect(describeModule('imaging.x-ray').name).toBe('X ray');
  });

  it('never returns an empty name', () => {
    expect(describeModule('single').name).toBe('Single');
    expect(describeModule('trailing.').name).toBe('trailing.');
    expect(describeModule('').name).toBe('Módulo sin nombre');
  });
});
