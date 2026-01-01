# LIAH - Planes y Features

## 🎯 Modelo de Negocio

LIAH ofrece 3 planes modulares para reclutamiento masivo:

---

## 📊 Comparativa de Planes

| Feature | RQ Only | Bot Recruit | Full Stack |
|---------|:-------:|:-----------:|:----------:|
| **Gestión RQs** | ✅ | ❌ | ✅ |
| Crear requerimientos | ✅ | ❌ | ✅ |
| Aprobación multinivel (1-5 niveles) | ✅ | ❌ | ✅ |
| Dashboard de RQs | ✅ | ❌ | ✅ |
| Perfiles de posición | ✅ | ❌ | ✅ |
| **Bot WhatsApp** | ❌ | ✅ | ✅ |
| Captación automática | ❌ | ✅ | ✅ |
| Evaluación AI (Gemini) | ❌ | ✅ | ✅ |
| **Base de Datos Candidatos** | ❌ | ✅ | ✅ |
| Almacenamiento candidatos | ❌ | ✅ | ✅ |
| Búsqueda y filtros | ❌ | ✅ | ✅ |
| Perfiles de candidatos | ❌ | ✅ | ✅ |
| **Integración RQ ↔ Candidatos** | ❌ | ❌ | ✅ |
| Asignar candidato a RQ | ❌ | ❌ | ✅ |
| Confirmación de ingreso | ❌ | ❌ | ✅ |
| Tracking end-to-end | ❌ | ❌ | ✅ |
| **Analytics** | Básico | Básico | Avanzado |
| Time to Fill | ✅ | ❌ | ✅ |
| Time to Hire | ❌ | ❌ | ✅ |
| Tasa de conversión | ❌ | ❌ | ✅ |
| Tasa de desistimiento | ❌ | ❌ | ✅ |

---

## 💼 Plan 1: RQ Only

**Ideal para:** Empresas que quieren digitalizar solo el proceso de aprobación de requerimientos.

### ✅ Incluye:
- Creación de RQs
- Workflow de aprobación configurable (1-5 niveles)
- Dashboards por rol (Store Manager, Supervisor, Jefe, Admin)
- Perfiles de posición precargados
- Carga masiva por Excel
- Alertas de RQs sin cubrir (+7 días)
- Métricas básicas (Time to Fill)

### ❌ No incluye:
- Bot de WhatsApp
- Base de datos de candidatos
- Asignación de candidatos
- Tracking de ingreso

### 📈 Flujo:
```
Crear RQ → Aprobación L1 → L2 → ... → L5 → Aprobado ✅ [FIN]
```

---

## 🤖 Plan 2: Bot Recruit

**Ideal para:** Empresas que quieren automatizar la captación y evaluación de candidatos sin proceso formal de RQs.

### ✅ Incluye:
- Bot WhatsApp con IA (Gemini 3 Pro)
- Captura automática de datos
- Evaluación de perfil
- Base de datos de candidatos
- Búsqueda y filtros avanzados
- Sugerencias de candidatos por perfil
- Métricas de captación

### ❌ No incluye:
- Sistema de RQs
- Aprobaciones formales
- Vinculación RQ-Candidato
- Tracking de ingreso

### 📈 Flujo:
```
Candidato → Bot → Evaluación AI → BD Candidatos → 
Recruiter busca y selecciona manualmente
```

---

## 🚀 Plan 3: Full Stack

**Ideal para:** Empresas que necesitan el flujo completo end-to-end de reclutamiento.

### ✅ Incluye TODO:
- ✅ Todo de "RQ Only"
- ✅ Todo de "Bot Recruit"
- ✅ **Plus exclusivo:**
  - Asignación candidato → RQ
  - Confirmación de ingreso
  - Time to Hire
  - Tasa de conversión/desistimiento
  - Dashboard consolidado con métricas completas

### 📈 Flujo Completo:
```
Crear RQ → Aprobaciones → Aprobado → 
Bot captura candidatos → 
Recruiter asigna candidato a RQ → 
Store Manager confirma ingreso → 
Métricas finales ✅
```

---

## 🔧 Implementación Técnica

### Feature Flags

```typescript
type TenantPlan = 'rq_only' | 'bot_recruit' | 'full_stack';

interface TenantFeatures {
  // RQ Management (RQ Only + Full Stack)
  rq_management: boolean;
  approval_workflow: boolean;
  job_profiles: boolean;
  
  // Bot & Candidates (Bot Recruit + Full Stack)
  bot_integration: boolean;
  candidate_database: boolean;
  ai_evaluation: boolean;
  
  // Integration (Solo Full Stack)
  rq_candidate_linking: boolean;
  ingress_confirmation: boolean;
  advanced_analytics: boolean;
}

const PLAN_FEATURES: Record<TenantPlan, TenantFeatures> = {
  rq_only: {
    rq_management: true,
    approval_workflow: true,
    job_profiles: true,
    bot_integration: false,
    candidate_database: false,
    ai_evaluation: false,
    rq_candidate_linking: false,
    ingress_confirmation: false,
    advanced_analytics: false
  },
  bot_recruit: {
    rq_management: false,
    approval_workflow: false,
    job_profiles: false,
    bot_integration: true,
    candidate_database: true,
    ai_evaluation: true,
    rq_candidate_linking: false,
    ingress_confirmation: false,
    advanced_analytics: false
  },
  full_stack: {
    rq_management: true,
    approval_workflow: true,
    job_profiles: true,
    bot_integration: true,
    candidate_database: true,
    ai_evaluation: true,
    rq_candidate_linking: true,
    ingress_confirmation: true,
    advanced_analytics: true
  }
};
```

### Conditional Rendering Examples

```tsx
const { hasFeature, plan } = useFeatures();

// Mostrar sección de candidatos solo si tiene bot
{hasFeature('candidate_database') && (
  <CandidatesSection />
)}

// Botón de asignación solo en Full Stack
{hasFeature('rq_candidate_linking') && (
  <button>Asignar Candidato a RQ</button>
)}

// Dashboard adaptativo
{plan === 'rq_only' && <RQOnlyDashboard />}
{plan === 'bot_recruit' && <BotRecruitDashboard />}
{plan === 'full_stack' && <FullStackDashboard />}
```

---

## 💰 Precios Sugeridos (Referencia)

| Plan | Precio/mes | Target |
|------|------------|--------|
| RQ Only | $199 | PyMEs con proceso manual |
| Bot Recruit | $299 | Empresas con alto volumen |
| Full Stack | $499 | Empresas con reclutamiento complejo |

---

## 🎯 Casos de Uso

### RQ Only
- Restaurant chains con proceso de aprobación formal
- Retail con múltiples niveles jerárquicos
- Empresas que ya tienen proceso de captación establecido

### Bot Recruit
- Empresas con alto volumen de candidatos
- Negocios que quieren automatizar captación
- Compañías sin proceso formal de RQs

### Full Stack
- Holdings con múltiples marcas
- Empresas con compliance estricto
- Organizaciones que necesitan métricas completas
- Negocios que quieren automatización end-to-end

---

## 📝 Notas de Implementación

### Migración entre Planes
- ✅ RQ Only → Full Stack: Data se preserva
- ✅ Bot Recruit → Full Stack: Candidatos se integran
- ⚠️ Full Stack → RQ Only: Se pierde vinculación candidatos
- ⚠️ Full Stack → Bot Recruit: Se pierden RQs

### Multi-tenancy
- Cada tenant puede tener un plan diferente
- Features se validan a nivel de tenant
- UI se adapta automáticamente según plan

---

**Última actualización:** 2025-12-22
