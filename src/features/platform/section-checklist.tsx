'use client';

import type { SectionCatalog, SectionKey } from '@/types';

interface SectionChecklistProps {
  catalog: SectionCatalog['sections'];
  value: SectionKey[];
  onChange: (next: SectionKey[]) => void;
  disabled?: boolean;
}

/** Every section `key` needs, directly or through another section. */
function withRequirements(catalog: SectionCatalog['sections'], keys: Set<SectionKey>): Set<SectionKey> {
  const result = new Set(keys);
  let grew = true;
  while (grew) {
    grew = false;
    for (const section of catalog) {
      if (!result.has(section.key)) continue;
      for (const required of section.requires) {
        if (!result.has(required)) {
          result.add(required);
          grew = true;
        }
      }
    }
  }
  return result;
}

/** Removes `key` and every section that needs it, directly or through another section. */
function withoutDependents(catalog: SectionCatalog['sections'], keys: Set<SectionKey>, key: SectionKey): Set<SectionKey> {
  const result = new Set(keys);
  result.delete(key);
  let shrank = true;
  while (shrank) {
    shrank = false;
    for (const section of catalog) {
      if (result.has(section.key) && section.requires.some((required) => !result.has(required))) {
        result.delete(section.key);
        shrank = true;
      }
    }
  }
  return result;
}

export function SectionChecklist({ catalog, value, onChange, disabled }: SectionChecklistProps) {
  function toggle(key: SectionKey, checked: boolean) {
    const current = new Set(value);
    const next = checked ? withRequirements(catalog, current.add(key)) : withoutDependents(catalog, current, key);
    onChange(catalog.map((section) => section.key).filter((sectionKey) => next.has(sectionKey)));
  }

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="font-medium">Secciones habilitadas</legend>
      {catalog.map((section) => (
        <label key={section.key} className="flex cursor-pointer items-center gap-3 rounded-md border p-3">
          <input
            type="checkbox"
            checked={value.includes(section.key)}
            onChange={(event) => toggle(section.key, event.target.checked)}
          />
          {section.name}
        </label>
      ))}
    </fieldset>
  );
}
