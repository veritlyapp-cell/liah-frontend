# Guía de Pruebas - Sistema RQ

## 📋 Checklist de Pruebas

### Paso 1: Verificar que el Servidor Está Corriendo ✅

```bash
cd lia-frontend
npm run dev
```

**Debe mostrar:**
```
> next dev
ready - started server on 0.0.0.0:3000
```

Abre: http://localhost:3000

---

### Paso 2: Crear Datos de Prueba en Firestore

**Opción A: Desde Firebase Console (Recomendado)**

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Seleccionar tu proyecto
3. Ir a Firestore Database

**Crear collection `approval_config`:**

```json
{
  "holdingId": "ngr_holding",
  "marcaId": null,
  "levels": [
    {
      "level": 1,
      "name": "Supervisor de Tienda",
      "approvers": ["store_manager"],
      "isMultipleChoice": false
    },
    {
      "level": 2,
      "name": "Jefe de Zona",
      "approvers": ["supervisor"],
      "isMultipleChoice": false
    },
    {
      "level": 3,
      "name": "Jefe de Marca",
      "approvers": ["jefe_marca", "client_admin"],
      "isMultipleChoice": true
    }
  ],
  "createdAt": <Timestamp>,
  "updatedAt": <Timestamp>
}
```

**Crear collection `job_profiles`** (crear 2-3 documentos):

```json
{
  "marcaId": "marca_papajohns",
  "marcaNombre": "Papa Johns",
  "posicion": "Delivery Driver",
  "modalidad": "Part Time",
  "turno": "Mañana",
  "requisitos": {
    "edadMin": 18,
    "edadMax": 45,
    "experiencia": {
      "requerida": true,
      "meses": 6
    },
    "disponibilidad": {
      "horarios": ["mañana"],
      "dias": ["lunes", "martes", "miercoles", "jueves", "viernes"]
    },
    "distanciaMax": 10
  },
  "salario": 1200,
  "beneficios": ["Propinas", "Comida", "Movilidad"],
  "assignedStores": ["store_1"],
  "createdAt": <Timestamp>,
  "updatedAt": <Timestamp>
}
```

**Opción B: Desde el navegador console**

1. Abrir http://localhost:3000
2. Abrir DevTools (F12)
3. Ir a Console
4. Copiar el contenido de `scripts/setup-test-data.ts`
5. Ejecutar `setupTestData()`

---

### Paso 3: Probar Login

1. Navegar a: http://localhost:3000/login
2. Iniciar sesión con credenciales de prueba
3. Verificar redirección según rol

**Roles esperados:**
- `store_manager` → `/store-manager`
- `client_admin` → `/admin`
- `brand_recruiter` → `/recruiter`

---

### Paso 4: Probar Store Manager Dashboard

URL: http://localhost:3000/store-manager

**✅ Verificar:**

1. **Header correcto:**
   - [ ] Muestra "🍕 Papa Johns Miraflores"
   - [ ] Botón "📋 Crear RQ" visible
   - [ ] Botón de logout funcional

2. **Tabs de navegación:**
   - [ ] Tab "Mis Requerimientos" activo
   - [ ] Tab "Entrevistas Hoy" presente

3. **Vista inicial (sin RQs):**
   - [ ] Muestra mensaje "No hay RQs que coincidan con los filtros"
   - [ ] KPIs en 0

---

### Paso 5: Crear un RQ

1. Click en "📋 Crear RQ"

**PASO 1: Selección de Perfil**

✅ Verificar:
- [ ] Modal se abre correctamente
- [ ] Muestra "Paso 1 de 2"
- [ ] Barra de progreso al 50%
- [ ] Lista de perfiles cargada desde Firestore
- [ ] Cada perfil muestra:
  - Posición
  - Modalidad • Turno
  - Salario
  - Al seleccionar: Requisitos y Beneficios expandidos

**Acción:** Seleccionar un perfil (ejemplo: "Delivery Driver")

**PASO 2: Confirmación**

✅ Verificar:
- [ ] Muestra "Paso 2 de 2"
- [ ] Barra de progreso al 100%
- [ ] Resumen del perfil seleccionado visible
- [ ] Input "Número de Vacantes" presente
- [ ] Preview del flujo de aprobación mostrado

**Acciones:**
- Ingresar número de vacantes: `2`
- Click en "Crear Requerimiento"

**Resultado esperado:**
- [ ] Mensaje de confirmación: "✅ 2 instancia(s) de RQ creadas correctamente!"
- [ ] Modal se cierra
- [ ] Dashboard se actualiza automáticamente

---

### Paso 6: Verificar RQs Creados

En el dashboard:

✅ Verificar:

1. **KPIs actualizados:**
   - [ ] Total RQs: 2
   - [ ] Pendientes: 2
   - [ ] En Reclutamiento: 0
   - [ ] Finalizados: 0

2. **Cards de RQs visibles:**
   - [ ] Muestra 2 cards (instancia #1 y #2)
   - [ ] Cada card muestra:
     - Posición + badge #1 o #2
     - Tienda • Modalidad • Turno
     - Badge "🟡 Pendiente Nivel 1: Supervisor de Tienda"
     - Salario S/ 1200
     - Beneficios (tags pequeños)
     - Botón "⚠️ Solicitar Eliminación"

3. **Sin botones de aprobación** (porque el store_manager no es aprobador de su propio RQ)

---

### Paso 7: Verificar Filtros

**Probar filtros:**

1. **Búsqueda:**
   - [ ] Escribir "Delivery" → filtra correctamente
   - [ ] Escribir "Miraflores" → filtra correctamente
   
2. **Filtro de estado:**
   - [ ] Click en "Pendientes" → muestra 2 RQs
   - [ ] Click en "Aprobados" → muestra 0 RQs
   - [ ] Click en "Todos" → vuelve a mostrar 2

3. **Filtro por tienda:**
   - [ ] Dropdown muestra "Papa Johns Miraflores"
   - [ ] Seleccionar filtra correctamente

---

### Paso 8: Verificar en Firestore

Ir a Firebase Console → Firestore Database

**Collection `rqs`:**

✅ Verificar 2 documentos creados:

```
rqs/
  ├─ {id1}
  │   ├─ batchId: "batch_..."  ← Mismo para ambos
  │   ├─ instanceNumber: 1
  │   ├─ posicion: "Delivery Driver"
  │   ├─ estado: "pendiente_nivel_1"
  │   ├─ currentLevel: 1
  │   └─ ... (otros campos)
  └─ {id2}
      ├─ batchId: "batch_..."  ← Mismo para ambos
      ├─ instanceNumber: 2
      └─ ...
```

**Campos importantes a verificar:**
- [ ] `batchId` es igual en ambas instancias
- [ ] `instanceNumber` es 1 y 2
- [ ] `estado` es "pendiente_nivel_1"
- [ ] `currentLevel` es 1
- [ ] `jobProfileId` apunta al perfil seleccionado
- [ ] `approvalHistory` es array vacío
- [ ] `alert_unfilled` es false
- [ ] `createdAt` y `updatedAt` tienen timestamps

---

## 🐛 Problemas Comunes

### Error: "Cannot read property 'toDate' of undefined"

**Causa:** Los timestamps de Firestore no están sincronizados.

**Solución:**
```typescript
// En RQCard.tsx, cambiar:
const startDate = rq.recruitment_started_at.toDate();

// Por:
const startDate = rq.recruitment_started_at?.toDate?.() || new Date();
```

### Error: "profiles is not iterable"

**Causa:** Hook useJobProfiles no está retornando un array.

**Solución:** Verificar que hay perfiles en Firestore con `assignedStores` que incluya `store_1`.

### Error: "Cannot find module '@/lib/hooks/useRQs'"

**Causa:** Path alias no configurado.

**Solución:** Verificar `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Modal no se abre

**Causa:** Estado del modal no se actualiza.

**Solución:** Verificar que `isOpen` se pasa correctamente:
```typescript
<CreateRQModal
    isOpen={showCreateRQModal}  // ← Debe ser true cuando se clickea
    onClose={() => setShowCreateRQModal(false)}
    ...
/>
```

---

## ✅ Checklist Final

Antes de continuar, asegúrate de que:

- [ ] El servidor corre sin errores
- [ ] Login funciona
- [ ] Store Manager Dashboard carga
- [ ] Modal "Crear RQ" se abre
- [ ] Perfiles de Firestore se muestran
- [ ] Se pueden crear RQs
- [ ] RQs aparecen en el dashboard
- [ ] Filtros funcionan
- [ ] Datos se guardan en Firestore correctamente

---

## 🎯 Qué NO Debería Funcionar Aún

Esto es normal porque no está implementado:

- ❌ Aprobar/Rechazar RQs (requiere rol de aprobador)
- ❌ Admin Dashboard completo
- ❌ Recruiter Dashboard
- ❌ Alertas de +7 días (requiere Cloud Function)
- ❌ Importar Excel
- ❌ Configurar niveles de aprobación (UI pendiente)

---

## 📸 Screenshots Esperados

### Dashboard Vacío
```
┌─────────────────────────────────────────┐
│ 🍕 Papa Johns Miraflores    📋 Crear RQ │
├─────────────────────────────────────────┤
│ [Mis Requerimientos] [Entrevistas Hoy] │
├─────────────────────────────────────────┤
│ KPIs: 0  0  0  0                        │
│                                          │
│ 📋 No hay RQs que coincidan             │
│                                          │
└─────────────────────────────────────────┘
```

### Modal Paso 1
```
┌─────────────────────────────────────────┐
│ Crear Requerimiento          Paso 1 de 2│
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░                  │
├─────────────────────────────────────────┤
│ Seleccionar Perfil de Posición          │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ Delivery Driver      S/ 1200        │ │
│ │ Part Time • Mañana                  │ │
│ │ ✓ SELECCIONADO                      │ │
│ │ • Edad 18-45 • 6 meses exp          │ │
│ │ • Beneficios: Propinas, Comida...   │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ [Cancelar]              [Siguiente →]   │
└─────────────────────────────────────────┘
```

### Dashboard con RQs
```
┌─────────────────────────────────────────┐
│ 📋 Delivery Driver #1                   │
│ Papa Johns Miraflores • Part Time       │
│ 🟡 Pendiente Nivel 1: Supervisor       │
│ S/ 1200 • Propinas, Comida, Movilidad  │
│ [⚠️ Solicitar Eliminación]             │
└─────────────────────────────────────────┘
```
