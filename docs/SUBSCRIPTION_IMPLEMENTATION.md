# Sistema de Suscripción - Documentación de Implementación

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Guía de Uso](#guía-de-uso)
4. [Componentes](#componentes)
5. [Hooks](#hooks)
6. [Integración en el Dashboard](#integración-en-el-dashboard)
7. [Ejemplos de Código](#ejemplos-de-código)

---

## Descripción General

Sistema completo de gestión de suscripciones basado en el modelo de negocio definido en `SUBSCRIPTION_MODEL.md`. Incluye:

- ✅ Gestión de tipos TypeScript completos
- ✅ API endpoints para suscripciones y almacenamiento
- ✅ React Query hooks con cache management
- ✅ Modales de límites (seats, patients, storage)
- ✅ Feature gating para funciones PRO
- ✅ Widgets de uso para dashboard
- ✅ Página de gestión de almacenamiento
- ✅ Banners de estado de suscripción
- ✅ Helpers para validación de límites

---

## Arquitectura

### Estructura de Archivos

```
src/
├── types/
│   ├── index.ts              # Tipos: Subscription, Plans, Limits, Features
│   └── guards.ts             # Type guards y helpers de validación
├── lib/
│   ├── api/endpoints.ts      # subscriptionApi, storageApi
│   └── constants.ts          # ROUTES, API endpoints, query keys
├── hooks/
│   ├── useSubscription.ts    # Queries y mutations de suscripción
│   ├── useStorage.ts         # Queries y mutations de storage
│   └── useLimits.tsx         # Custom hooks para validación de límites
├── features/subscription/
│   ├── seat-limit-modal.tsx
│   ├── patient-limit-modal.tsx
│   ├── storage-limit-modal.tsx
│   ├── feature-locked-modal.tsx
│   ├── integration-examples.tsx
│   └── index.ts
├── components/
│   ├── dashboard/
│   │   ├── usage-card.tsx
│   │   └── usage-widgets.tsx
│   └── layout/
│       └── subscription-banners.tsx
└── app/(dashboard)/admin/storage/
    └── page.tsx
```

---

## Guía de Uso

### 1. Configuración Inicial

El sistema se conecta automáticamente a tu API. Asegúrate de que tus endpoints respondan según los contratos definidos en `src/lib/api/endpoints.ts`:

**Endpoints requeridos:**
- `GET /api/subscription` → Subscription
- `GET /api/subscription/usage/:period` → UsageMetrics
- `POST /api/subscription/upgrade` → UpgradeResponse
- `POST /api/subscription/downgrade` → void
- `POST /api/subscription/seats` → AddSeatResponse
- `GET /api/storage/files` → StorageFile[]
- `GET /api/storage/breakdown` → StorageBreakdown
- `DELETE /api/storage/files/:id` → void

### 2. Agregar al Layout Principal

```tsx
// app/(dashboard)/layout.tsx
import { SubscriptionBanners } from '@/components/layout/subscription-banners';

export default function DashboardLayout({ children }) {
  return (
    <div>
      <SubscriptionBanners />  {/* ← Agregar aquí */}
      {children}
    </div>
  );
}
```

### 3. Integrar Widgets en Dashboard

```tsx
// app/(dashboard)/page.tsx
import { UsageOverview } from '@/components/dashboard/usage-widgets';

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <UsageOverview />  {/* ← Muestra psychologists, patients, storage */}
    </div>
  );
}
```

---

## Componentes

### Modales de Límites

#### SeatLimitModal
Se muestra cuando se alcanza el límite de psicólogos.

```tsx
import { SeatLimitModal } from '@/features/subscription';

<SeatLimitModal 
  open={isOpen} 
  onOpenChange={setIsOpen}
/>
```

**Comportamiento:**
- **BASIC**: Muestra upgrade a PRO (€79/mo, 15 psicólogos)
- **PRO**: Muestra "Contactar Ventas" para CUSTOM

#### PatientLimitModal
Se muestra cuando se alcanza el límite de pacientes.

```tsx
import { PatientLimitModal } from '@/features/subscription';

<PatientLimitModal 
  open={isOpen} 
  onOpenChange={setIsOpen}
/>
```

**Opciones:**
1. Archivar pacientes inactivos
2. Actualizar plan (BASIC→PRO o PRO→CUSTOM)

#### StorageLimitModal
Se muestra cuando se alcanza el límite de almacenamiento o al subir un archivo que excede el espacio.

```tsx
import { StorageLimitModal } from '@/features/subscription';

<StorageLimitModal 
  open={isOpen} 
  onOpenChange={setIsOpen}
  fileName="documento.pdf"  // Opcional
  fileSize={2048576}        // Opcional, en bytes
/>
```

**Opciones:**
1. Eliminar archivos (navega a /admin/storage)
2. Actualizar plan (BASIC: 2GB→50GB, PRO: 50GB→500GB)

#### FeatureLockedModal
Se muestra cuando un usuario BASIC intenta usar una función PRO.

```tsx
import { FeatureLockedModal } from '@/features/subscription';

<FeatureLockedModal 
  open={isOpen} 
  onOpenChange={setIsOpen}
  featureName="Notas Clínicas"
  featureDescription="Las notas clínicas te permiten..."  // Opcional
  benefits={[                                              // Opcional
    'Registro seguro de sesiones',
    'Control de acceso por rol',
  ]}
/>
```

### Widgets de Uso

#### UsageCard (componente base)
Componente reutilizable para mostrar uso con barra de progreso.

```tsx
import { UsageCard } from '@/components/dashboard/usage-card';
import { Users } from 'lucide-react';

<UsageCard
  title="Psicólogos"
  description="Miembros del equipo activos"
  icon={Users}
  current={8}
  limit={15}
  unit="psicólogos"
  onUpgrade={() => router.push('/subscription?action=upgrade')}
  onManage={() => router.push('/users')}
/>
```

#### Widgets Específicos

```tsx
import { 
  PsychologistsUsageWidget,
  PatientsUsageWidget,
  StorageUsageWidget,
  UsageOverview  // Combina los 3
} from '@/components/dashboard/usage-widgets';

// Uso individual
<PsychologistsUsageWidget />

// O todos juntos
<UsageOverview />
```

### Banners de Estado

#### SubscriptionStatusBanner
Muestra avisos para estados problemáticos (PAST_DUE, SUSPENDED, CANCELED, ARCHIVED, DELETED).

#### TrialExpirationBanner
Muestra aviso en los últimos 3 días de trial.

```tsx
import { SubscriptionBanners } from '@/components/layout/subscription-banners';

// Usa ambos banners automáticamente
<SubscriptionBanners />
```

---

## Hooks

### useSubscription
Hook principal para datos de suscripción.

```tsx
import { useSubscription } from '@/hooks/useSubscription';

const { data: subscription, isLoading } = useSubscription();

// subscription contiene:
// - plan: { tier, name, price }
// - status: SubscriptionStatus
// - limits: ResourceLimits
// - features: FeatureFlags
// - currentPeriodEnd, trialEnd, etc.
```

### useUsageMetrics
Obtiene métricas de uso actuales.

```tsx
import { useUsageMetrics } from '@/hooks/useSubscription';

const { data: usage } = useUsageMetrics('current'); // o 'last_30_days'

// usage contiene:
// - users: { activePsychologists, activeAssistants }
// - patients: { active, archived }
// - storage: { usedGB, fileCount }
// - notifications: { sent, received }
```

### useFeatureAccess
Verifica si una feature está disponible.

```tsx
import { useFeatureAccess } from '@/hooks/useSubscription';

const canUseClinicalNotes = useFeatureAccess('clinicalNotes');
const canUseTasks = useFeatureAccess('tasks');
```

### useSubscriptionStatus
Obtiene flags de estado de la suscripción.

```tsx
import { useSubscriptionStatus } from '@/hooks/useSubscription';

const status = useSubscriptionStatus();

if (status.isActive) { /* ... */ }
if (status.isTrial) { /* ... */ }
if (status.isPastDue) { /* ... */ }
if (status.isSuspended) { /* ... */ }
```

### useLimits - Validación Pre-Acción

#### useCanInviteUser
Valida antes de invitar un psicólogo.

```tsx
import { useCanInviteUser } from '@/hooks/useLimits';

const { 
  canInvite,           // boolean
  remaining,           // número de seats restantes
  checkAndProceed,     // función que valida y ejecuta callback
  showSeatLimitModal,  // estado del modal
  setShowSeatLimitModal 
} = useCanInviteUser();

const handleInvite = () => {
  checkAndProceed(() => {
    // Abrir diálogo de invitación
    openInviteDialog();
  });
};
```

#### useCanCreatePatient
Valida antes de crear un paciente.

```tsx
import { useCanCreatePatient } from '@/hooks/useLimits';

const { 
  canCreate, 
  remaining, 
  checkAndProceed,
  showPatientLimitModal,
  setShowPatientLimitModal 
} = useCanCreatePatient();
```

#### useCanUploadFile
Valida antes de subir un archivo.

```tsx
import { useCanUploadFile } from '@/hooks/useLimits';

const { 
  checkAndProceed, 
  remainingGB,
  showStorageLimitModal,
  setShowStorageLimitModal,
  rejectedFile  // { name, size } si fue rechazado
} = useCanUploadFile();

const handleFileSelect = (file: File) => {
  checkAndProceed(file, () => {
    // Proceder con upload
    uploadFile(file);
  });
};
```

#### useFeatureGate
Valida acceso a features PRO.

```tsx
import { useFeatureGate } from '@/hooks/useLimits';

const { 
  isAvailable, 
  checkAndProceed,
  showFeatureLockedModal,
  setShowFeatureLockedModal 
} = useFeatureGate('clinicalNotes');
```

### useUsageStats
Obtiene todas las estadísticas de uso con porcentajes.

```tsx
import { useUsageStats } from '@/hooks/useLimits';

const stats = useUsageStats();

// stats.psychologists
// - current: 8
// - limit: 15
// - remaining: 7
// - percentage: 53.3

// stats.patients, stats.storage (misma estructura)
```

---

## Integración en el Dashboard

### Paso 1: Layout con Banners

```tsx
// app/(dashboard)/layout.tsx
import { SubscriptionBanners } from '@/components/layout/subscription-banners';

export default function DashboardLayout({ children }) {
  return (
    <>
      <SubscriptionBanners />
      <main>{children}</main>
    </>
  );
}
```

### Paso 2: Dashboard con Widgets de Uso

```tsx
// app/(dashboard)/page.tsx
import { UsageOverview } from '@/components/dashboard/usage-widgets';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1>Panel de Control</h1>
      
      {/* Widgets de Uso */}
      <section>
        <h2>Uso de Recursos</h2>
        <UsageOverview />
      </section>
      
      {/* Resto del dashboard */}
    </div>
  );
}
```

### Paso 3: Botones con Validación de Límites

```tsx
// components/team/invite-button.tsx
import { useCanInviteUser } from '@/hooks/useLimits';
import { SeatLimitModal } from '@/features/subscription';

export function InviteButton() {
  const { checkAndProceed, showSeatLimitModal, setShowSeatLimitModal } = useCanInviteUser();
  
  return (
    <>
      <Button onClick={() => checkAndProceed(() => openInviteDialog())}>
        Invitar Psicólogo
      </Button>
      
      <SeatLimitModal 
        open={showSeatLimitModal} 
        onOpenChange={setShowSeatLimitModal}
      />
    </>
  );
}
```

---

## Ejemplos de Código

Ver `src/features/subscription/integration-examples.tsx` para ejemplos completos de:

1. **InviteUserButton** - Botón de invitar con límite de seats
2. **CreatePatientButton** - Botón de crear paciente con límite
3. **FileUploadButton** - Upload con validación de storage
4. **ClinicalNotesButton** - Feature gating para función PRO
5. **PatientProfileActions** - Múltiples validaciones en un componente

---

## Type Guards y Helpers

### Validación de Límites

```tsx
import { 
  canAddPsychologist,
  canAddPatient,
  canUploadFile,
  getRemainingSeats,
  getRemainingPatients,
  getRemainingStorageGB,
} from '@/types/guards';

const canAdd = canAddPsychologist(subscription, usage);
const remaining = getRemainingSeats(subscription, usage);
```

### Validación de Features

```tsx
import { isFeatureAvailable } from '@/types/guards';

const hasAccess = isFeatureAvailable(subscription, 'clinicalNotes');
```

### Validación de Estado

```tsx
import { isSubscriptionActive } from '@/types/guards';

const isActive = isSubscriptionActive(subscription);
```

### Display Helpers

```tsx
import { 
  getPlanDisplayName,
  getStatusDisplayName,
  getStatusColor,
} from '@/types/guards';

const planName = getPlanDisplayName('PRO');           // "Plan PRO"
const statusName = getStatusDisplayName('PAST_DUE');  // "Pago Pendiente"
const color = getStatusColor('SUSPENDED');            // "red"
```

---

## Configuración de Rutas

Asegúrate de tener estas rutas definidas en `src/lib/constants.ts`:

```ts
export const ROUTES = {
  ADMIN_SUBSCRIPTION: '/admin/subscription',
  ADMIN_STORAGE: '/admin/storage',
  ADMIN_USERS: '/admin/users',
  // ...
};
```

---

## Testing

### Simular Estados de Suscripción

Para probar diferentes estados, modifica el mock de `useSubscription`:

```tsx
// En desarrollo/testing
const mockSubscription = {
  status: 'PAST_DUE',  // Cambia esto para probar diferentes estados
  plan: { tier: 'BASIC' },
  limits: {
    maxPsychologists: 3,
    maxPatients: 50,
    storageGB: 2,
  },
  // ...
};
```

### Simular Límites Alcanzados

```tsx
const mockUsage = {
  users: { activePsychologists: 3 },  // = límite
  patients: { active: 48 },           // cerca del límite
  storage: { usedGB: 1.9 },           // cerca del límite
};
```

---

## Troubleshooting

### Los modales no se muestran
- Verifica que el `Dialog` de shadcn/ui esté correctamente configurado
- Asegúrate de que el estado `open` se esté actualizando

### Los hooks devuelven `undefined`
- Verifica que el `QueryClientProvider` esté en el layout raíz
- Chequea que la API responda correctamente

### Los límites no se validan correctamente
- Asegúrate de que `subscription` y `usage` no sean `null`/`undefined`
- Verifica que los valores de límites en el backend coincidan con los esperados

### Los widgets no muestran datos
- Verifica la conexión con la API
- Chequea la consola para errores de React Query
- Asegúrate de que `useSubscription()` y `useUsageMetrics()` devuelvan datos válidos

---

## Próximos Pasos

1. **Implementar página de checkout**: Flujo completo de upgrade con Stripe/Payment gateway
2. **Dashboard de administración**: Página completa `/admin/subscription` con gestión de plan
3. **Webhooks de pago**: Handlers para events de Stripe (payment.succeeded, payment.failed)
4. **Emails transaccionales**: Notificaciones de cambios en suscripción
5. **Analíticas**: Tracking de conversiones y upgrades

---

## Documentos Relacionados

- **SUBSCRIPTION_MODEL.md**: Modelo de negocio y reglas de suscripción
- **src/types/index.ts**: Tipos TypeScript del sistema
- **src/lib/api/endpoints.ts**: Contratos de API
