'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TAX_ID_TYPES, TAX_ID_TYPE_LABELS,
  type BillingCustomer, type BillingCustomerErrors, type TaxIdType,
} from './billing-customer';

interface Props {
  value: BillingCustomer;
  onChange: (next: BillingCustomer) => void;
  errors?: BillingCustomerErrors;
  /** Keeps ids unique when the group appears in more than one form. */
  idPrefix: string;
  disabled?: boolean;
}

export function BillingCustomerFields({ value, onChange, errors = {}, idPrefix, disabled }: Props) {
  const set = <K extends keyof BillingCustomer>(key: K, next: BillingCustomer[K]) =>
    onChange({ ...value, [key]: next });
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor={id('name')}>Nombre o razón social</Label>
        <Input id={id('name')} value={value.name} disabled={disabled} error={errors.name}
          onChange={(event) => set('name', event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id('taxIdType')}>Tipo de identificación</Label>
        <select
          id={id('taxIdType')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={value.taxIdType}
          disabled={disabled}
          onChange={(event) => set('taxIdType', event.target.value as TaxIdType | '')}
        >
          <option value="">Seleccionar</option>
          {TAX_ID_TYPES.map((type) => <option key={type} value={type}>{TAX_ID_TYPE_LABELS[type]}</option>)}
        </select>
        {errors.taxIdType && <p role="alert" className="text-sm text-destructive">{errors.taxIdType}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor={id('taxId')}>Número de identificación</Label>
        <Input id={id('taxId')} value={value.taxId} disabled={disabled} error={errors.taxId} inputMode="text"
          onChange={(event) => set('taxId', event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id('email')}>Correo del receptor</Label>
        <Input id={id('email')} type="email" value={value.email} disabled={disabled} error={errors.email}
          onChange={(event) => set('email', event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id('address')}>Dirección</Label>
        <Input id={id('address')} value={value.address} disabled={disabled}
          onChange={(event) => set('address', event.target.value)} />
      </div>
    </div>
  );
}
