'use client';

import { useEffect, useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useLookupSearch, type LookupSuggestion } from '@/hooks/useCatalogs';
import type { FormField } from '@/types/clinical';

const DEBOUNCE_MS = 250;

export interface LookupInputProps {
  id: string;
  lookup: NonNullable<FormField['lookup']>;
  value: string;
  onChange: (value: string) => void;
  /** Called when a suggestion is chosen, with the sibling values the catalog knows. */
  onPick: (suggestion: LookupSuggestion) => void;
  disabled?: boolean;
  invalid?: boolean;
  ariaLabel?: string;
  maxLength?: number;
}

/**
 * A text input that suggests entries of a catalog as the user types. The value remains free
 * text: an entry that is not in the catalog is still accepted.
 */
export function LookupInput({
  id,
  lookup,
  value,
  onChange,
  onPick,
  disabled,
  invalid,
  ariaLabel,
  maxLength,
}: LookupInputProps) {
  const search = useLookupSearch(lookup);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [suggestions, setSuggestions] = useState<LookupSuggestion[]>([]);

  useEffect(() => {
    if (!open || value.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      search(value)
        .then((found) => !cancelled && setSuggestions(found))
        .catch(() => !cancelled && setSuggestions([]));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, search, value]);

  const pick = (suggestion: LookupSuggestion) => {
    onPick(suggestion);
    setOpen(false);
    setActive(-1);
  };
  const expanded = open && suggestions.length > 0;

  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        disabled={disabled}
        maxLength={maxLength}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        // Leaves time for a click on a suggestion to land before the list closes.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(event) => {
          if (!expanded) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((index) => (index + 1) % suggestions.length);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
          } else if (event.key === 'Enter' && active >= 0) {
            event.preventDefault();
            pick(suggestions[active]);
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {expanded && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full min-w-[260px] overflow-y-auto rounded-md border bg-popover p-1 text-sm shadow-md"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.value}-${index}`}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              // Mouse down, not click: it fires before the input loses focus.
              onMouseDown={(event) => {
                event.preventDefault();
                pick(suggestion);
              }}
              className={`cursor-pointer rounded px-2 py-1.5 ${
                index === active ? 'bg-accent' : 'hover:bg-accent'
              }`}
            >
              <span className="font-medium">{suggestion.value}</span>
              {suggestion.detail && (
                <span className="text-muted-foreground"> · {suggestion.detail}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
