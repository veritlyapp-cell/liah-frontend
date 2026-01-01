# LIAH - Store Manager Dashboard Mockup

## Vista Principal

```
╔════════════════════════════════════════════════════════════════════════════════╗
║  LIAH Logo    Dashboard - Sábado, 21 de diciembre de 2024          [🚨 PÁNICO]║
║                                                                                 ║
║  ┌─────────────┐  ┌────────────────┐  ┌─────────────────────┐                ║
║  │ Estado: ▼   │  │ Fecha: Hoy  ▼  │  │ [Solicitar Personal]│                ║
║  │ • Todos     │  │                │  └─────────────────────┘                ║
║  │   Por entrev│  │                │                                          ║
║  │   Asistieron│  │                │                                          ║
║  │   Aprobados │  │                │                                          ║
║  │   Rechazados│  │                │                                          ║
║  └─────────────┘  └────────────────┘                                          ║
╠════════════════════════════════════════════════════════════════════════════════╣
║  ┌─────────────┬─────────────────┐                                            ║
║  │ Candidatos  │ Requerimientos  │                                            ║
║  └─────────────┴─────────────────┘                                            ║
╠════════════════════════════════════════════════════════════════════════════════╣
║  ⚠️ 3 candidatos seleccionados  [✓ Aprobar Todos] [✗ Rechazar Todos]         ║
╠════════════════════════════════════════════════════════════════════════════════╣
║  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                     ║
║  │  📊 5    │  │  ✅ 3    │  │  ✓  2    │  │  📈 60%  │                     ║
║  │Confirmad.│  │Asistieron│  │ Aprobad. │  │Asistencia│                     ║
║  └──────────┘  └──────────┘  └──────────┘  └──────────┘                     ║
╠════════════════════════════════════════════════════════════════════════════════╣
║  Entrevistas (5)                                                               ║
║                                                                                 ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │ ☐  [JP]  Juan Pérez                            ✓ Asistió  ✓ Aprobado   │  ║
║  │          10:00 AM • Pizzero                                              │  ║
║  │          [WhatsApp] [Asignar a RQ]                                       │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                 ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │ ☑  [MG]  María González                                                 │  ║
║  │          11:00 AM • Cajero                                               │  ║
║  │          [✓ Llegó] [✗ No vino]                                          │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                 ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │ ☑  [CR]  Carlos Ruiz                           ✓ Asistió                │  ║
║  │          11:30 AM • Pizzero                                              │  ║
║  │          [✓ Aprobar] [✗ Desaprobar]                                     │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                 ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │ ☑  [AT]  Ana Torres                            ✗ No vino                │  ║
║  │          12:00 PM • Delivery                                             │  ║
║  │          [WhatsApp]                                                      │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                 ║
╠════════════════════════════════════════════════════════════════════════════════╣
║                                    Plan: Full Stack                            ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

---

## Modal de Rechazo

```
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                 ║
║     ┌────────────────────────────────────────────────────────────────┐        ║
║     │                                                                 │        ║
║     │  Motivo de Rechazo de Candidatos (3 seleccionados)            │        ║
║     │                                                                 │        ║
║     │  ○ ⏰ Horario no compatible                                    │        ║
║     │  ● 📍 Distancia muy lejos                                      │        ║
║     │  ○ 👥 No encaja culturalmente                                  │        ║
║     │  ○ 📝 Otros                                                     │        ║
║     │                                                                 │        ║
║     │  Comentarios adicionales:                                       │        ║
║     │  ┌───────────────────────────────────────────────────────────┐│        ║
║     │  │ El candidato vive a 2 horas de distancia y no tiene       ││        ║
║     │  │ disponibilidad para relocalizarse...                       ││        ║
║     │  └───────────────────────────────────────────────────────────┘│        ║
║     │                                                                 │        ║
║     │           [Cancelar]          [Confirmar Rechazo]              │        ║
║     │                                                                 │        ║
║     └────────────────────────────────────────────────────────────────┘        ║
║                                                                                 ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

---

## Elementos Clave

### 1. **Header Superior**
- **Izquierda:** Logo + Título "Dashboard" + Fecha actual
- **Centro:** 2 Dropdowns de filtros (Estado, Fecha)
- **Derecha:** Botón "🚨 Cancelar Todo" (rojo, emergencias)

### 2. **Tabs de Navegación**
- Candidatos (activo, underline violet)
- Requerimientos (solo si plan tiene RQ)

### 3. **Toolbar de Acciones Bulk** (aparece cuando hay seleccionados)
- Fondo amarillo/amber claro
- Texto: "X candidatos seleccionados"
- Botón verde "✓ Aprobar Todos"
- Botón rojo "✗ Rechazar Todos"

### 4. **KPIs Cards** (4 cards)
- Confirmados (violet)
- Asistieron (green)
- Aprobados (cyan)
- % Asistencia (amber)

### 5. **Lista de Candidatos**
Cada card tiene:
- **Checkbox izquierdo:** Para selección múltiple
- **Avatar circular:** Gradient violet→cyan con initiales
- **Info:** Nombre, hora, puesto
- **Badges de estado:** 
  - Verde "✓ Asistió"
  - Cyan "✓ Aprobado"
  - Rojo "✗ No vino" / "✗ Desaprobado"
- **Botones de acción:**
  - Paso 1: "Llegó" / "No vino"
  - Paso 2: "Aprobar" / "Desaprobar" (solo si asistió)
  - Paso 3: "Asignar a RQ" (solo si aprobado + plan RQ)
  - WhatsApp (si plan bot)

### 6. **Modal de Rechazo**
- **Título:** "Motivo de Rechazo de Candidatos (X seleccionados)"
- **4 Radio buttons:**
  - ⏰ Horario no compatible
  - 📍 Distancia muy lejos
  - 👥 No encaja culturalmente
  - 📝 Otros
- **Textarea:** Comentarios adicionales (opcional)
- **Botones:** Cancelar (gray) / Confirmar Rechazo (red)

### 7. **Filtro de Estado** (Dropdown)
- Todos
- Por Entrevistar (confirmado = true, asistio = null)
- Asistieron (asistio = true)
- Aprobados (aprobado = true)
- Rechazados (aprobado = false)

### 8. **Filtro de Fecha** (Dropdown/Datepicker)
- Hoy
- Mañana
- Esta Semana
- Personalizado (date picker)

---

## Flujo de Usuario

### Escenario 1: Aprobación Individual
1. Candidato llega → Click "Llegó"
2. Badge verde "✓ Asistió" aparece
3. Aparecen botones "Aprobar" / "Desaprobar"
4. Click "Aprobar" → Badge cyan "✓ Aprobado"
5. Si plan RQ: aparece botón "Asignar a RQ"

### Escenario 2: Rechazo con Motivo
1. Candidato llega → Click "Llegó"
2. Click "Desaprobar"
3. **Modal aparece** con razones
4. Seleccionar motivo + comentarios
5. Click "Confirmar Rechazo"
6. Badge gris "✗ Desaprobado" con motivo guardado

### Escenario 3: Aprobación Masiva
1. Seleccionar checkboxes de 3 candidatos que asistieron
2. Toolbar amarillo aparece: "3 candidatos seleccionados"
3. Click "✓ Aprobar Todos"
4. Los 3 quedan con badge "✓ Aprobado"
5. Checkboxes se desmarcan

### Escenario 4: Emergencia - Cancelar Todo
1. Click botón rojo "🚨 Cancelar Todo"
2. Confirmación: "¿Seguro? Esta acción no se puede deshacer"
3. Si confirma: TODOS los candidatos de hoy → confirmado = false

---

## Colores

- **Violet:** #7C3AED (primary actions, active tabs)
- **Cyan:** #06B6D4 (aprobados, info)
- **Green:** #22C55E (asistió, aprobar)
- **Red:** #EF4444 (rechazar, pánico)
- **Amber:** #F59E0B (toolbar bulk, warning)
- **Gray:** #6B7280 (neutral, inactive)

---

## ¿Te parece bien este diseño?

**Cambios sugeridos vs original:**
✅ Filtros en header (no tabs separados)
✅ Bulk selection con checkboxes
✅ Modal de rechazo con razones
✅ Botón pánico prominente
✅ Vista organizada (no solo "hoy")

¿Hay algo que quieras cambiar antes de que lo implemente?
