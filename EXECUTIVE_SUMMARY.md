# LIAH - Resumen Ejecutivo y Pricing

## 🎯 Overview del Producto

**LIAH** es una plataforma SaaS multi-tenant para automatizar y optimizar el reclutamiento masivo en empresas con múltiples sucursales (retail, restaurantes, servicios).

---

## ✅ Funcionalidades Implementadas

### 🔐 Sistema de Autenticación y Seguridad
- **Firebase Authentication** con email/password
- **Custom Claims** para roles y permisos
- **Multi-tenancy** - Aislamiento total entre empresas
- **Role-Based Access Control (RBAC):**
  - Super Admin (plataforma)
  - Client Admin (holding)
  - Jefe de Marca
  - Supervisor/Jefe de Zona
  - Store Manager
  - Brand Recruiter

### 📋 Gestión de Requerimientos (RQs)
- **Creación simplificada:** 2 pasos (selección + detalles)
- **Perfiles de posición precargados**
- **Carga masiva por Excel** (job profiles)
- **Múltiples instancias:** 1 RQ por vacante
- **Estados dinámicos:** tracking completo del ciclo

### ✅ Sistema de Aprobaciones Configurables
- **1 a 5 niveles configurables**
- **Multiple choice approvers** (ej: "Jefe Marca O Admin")
- **Historial de aprobaciones** completo
- **Configuración por marca o holding**
- **Flujo visual** del proceso

### 🚨 Sistema de Alertas
- **RQs sin cubrir +7 días** (visual destacado)
- **Aprobaciones pendientes** por rol
- **Solicitudes de eliminación** al equipo
- **Real-time notifications**

### 🗑️ Eliminación Jerárquica
- **Jefe/Supervisor:** Elimina directamente
- **Store Manager:** Solicita eliminación (requiere aprobación)
- **Alertas automáticas** al equipo de reclutamiento

### 📊 Dashboards Específicos por Rol

#### Store Manager Dashboard
- Ver RQs de su tienda
- Crear nuevos RQs
- Solicitar eliminación
- Filtros avanzados (estado, posición)
- KPIs en tiempo real

#### Recruiter Dashboard (En desarrollo)
- RQs aprobados de toda la marca
- Iniciar/finalizar reclutamiento
- Alertas de +7 días
- Métricas de conversión

#### Admin Holding Dashboard
- Vista consolidada todas las marcas
- Configurar niveles de aprobación
- Carga masiva de perfiles
- Reportes y analytics

### 📈 Métricas y Analytics
- **Time to Fill:** Días desde creación hasta aprobación final
- **Time to Hire:** Días hasta confirmación de ingreso (Full Stack)
- **Tasa de conversión/desistimiento** (Full Stack)
- **RQs pendientes por nivel**
- **Performance por tienda/marca**

### 🎨 UI/UX Premium
- **Diseño glassmorphism** moderno
- **Gradientes dinámicos**
- **Animaciones micro-interactivas**
- **Responsive mobile-first**
- **Dark mode compatible**
- **Badges de estado dinámicos**

---

## 🛠️ Stack Técnico

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **UI:** React 18 + TailwindCSS
- **State:** React Hooks + Context API
- **Real-time:** Firebase Realtime Listeners

### Backend
- **Database:** Cloud Firestore (NoSQL)
- **Authentication:** Firebase Auth
- **Functions:** Cloud Functions (para alertas)
- **Storage:** Firebase Storage (para Excel, documentos)

### AI/Bot (Plan Bot Recruit y Full Stack)
- **Engine:** Google Gemini 3 Pro
- **Platform:** WhatsApp Business API
- **NLP:** Evaluación automática de perfiles

### DevOps
- **Hosting:** Vercel / Firebase Hosting
- **CI/CD:** GitHub Actions
- **Monitoring:** Firebase Analytics
- **Error Tracking:** Sentry (opcional)

---

## 🔒 Seguridad y Compliance

### Nivel de Aplicación
✅ **Multi-tenancy estricto** - Datos completamente aislados
✅ **Custom Claims en JWT** - Autorización granular
✅ **Firestore Security Rules** - Validación server-side
✅ **HTTPS Only** - Encriptación en tránsito
✅ **Session Management** - Tokens refresh automático

### Nivel de Datos
✅ **Encriptación at rest** (Firebase por defecto)
✅ **Backup automático** diario
✅ **Audit logs** de acciones críticas
✅ **GDPR Compliant** - Control de datos personales
✅ **SOC 2 Type II** (infraestructura Firebase/GCP)

### Permisos por Rol
```
Store Manager:
  ✅ Ver/Crear RQs de su tienda
  ❌ Ver RQs de otras tiendas
  ❌ Modificar configuración

Recruiter:
  ✅ Ver RQs aprobados de su marca
  ✅ Asignar candidatos
  ❌ Aprobar RQs
  ❌ Eliminar RQs

Admin Holding:
  ✅ Todo el sistema
  ✅ Configurar aprobaciones
  ✅ Reportes consolidados
```

---

## 💰 Modelo de Pricing Sugerido

### Estrategia: Value-Based Pricing

**Base de cálculo:**
- Ahorro promedio: 3-5 horas/semana por recruiter
- Reducción de errores: 40-60% menos RQs duplicados
- Visibilidad en tiempo real: Priceless
- ROI típico: 6-12 meses

---

## 📊 PRICING RECOMENDADO

### 🥉 Plan STARTER (RQ Only)
**$299 USD/mes** (facturación anual)
**$349 USD/mes** (facturación mensual)

**Incluye:**
- ✅ Hasta 3 marcas
- ✅ Hasta 50 tiendas
- ✅ RQs ilimitados
- ✅ 5 niveles de aprobación configurables
- ✅ Dashboards básicos
- ✅ Perfiles de posición
- ✅ Carga masiva Excel
- ✅ 5 usuarios admin
- ✅ Soporte email (48h)

**Ideal para:** PyMEs con 10-50 tiendas

---

### 🥈 Plan PROFESSIONAL (Bot Recruit)
**$599 USD/mes** (facturación anual)
**$699 USD/mes** (facturación mensual)

**Incluye:**
- ✅ Todo de STARTER +
- ✅ Bot WhatsApp con IA
- ✅ Hasta 500 candidatos/mes
- ✅ Evaluación automática (Gemini AI)
- ✅ Base de datos candidatos
- ✅ Filtros avanzados
- ✅ 10 usuarios
- ✅ Soporte prioritario (24h)

**Ideal para:** Empresas con alto volumen de captación

---

### 🥇 Plan ENTERPRISE (Full Stack)
**$999 USD/mes** (facturación anual)
**$1,199 USD/mes** (facturación mensual)

**Incluye:**
- ✅ Todo de PROFESSIONAL +
- ✅ Candidatos ilimitados
- ✅ Asignación RQ ↔ Candidato
- ✅ Confirmación de ingreso
- ✅ Analytics avanzado
- ✅ Time to Hire completo
- ✅ Reportes personalizados
- ✅ Usuarios ilimitados
- ✅ Soporte 24/7
- ✅ Account Manager dedicado
- ✅ Onboarding personalizado

**Ideal para:** Holdings con múltiples marcas

---

### 💎 Plan CUSTOM (Enterprise+)
**Precio a medida**

Para organizaciones con:
- +100 tiendas
- Múltiples países
- Integración con HRIS/ATS
- SLA personalizado
- White-label
- On-premise option

**Contactar ventas**

---

## 📈 Add-ons Opcionales

| Add-on | Precio/mes | Descripción |
|--------|------------|-------------|
| 🤖 Conversaciones Bot Extra | $0.10/conversación | Más de 500 conv/mes |
| 📊 Power BI Integration | $99 | Conectar a Power BI |
| 📱 Mobile App (iOS/Android) | $199 | Apps nativas |
| 🎓 Training & Onboarding | $499 one-time | Capacitación personalizada |
| 🔌 API Access | $149 | Integración con otros sistemas |
| 📞 WhatsApp Business Verified | $299 setup + $99/mes | Cuenta verificada |

---

## 💡 Justificación del Pricing

### Comparativa de Mercado

**Competidores:**
- **Workday Recruiting:** $15-25 USD/empleado/mes (muy caro para masivo)
- **Greenhouse:** $6,000+ USD/año (enfocado en white collar)
- **Lever:** $500-800 USD/mes (no incluye bot)
- **Breezy HR:** $189-299 USD/mes (limitado)

**LIAH Diferenciadores:**
- ✅ **Especializado en masivo** (retail, food service)
- ✅ **Bot IA incluido** (otros cobran extra)
- ✅ **Multi-tenancy nativo** (no workarounds)
- ✅ **Full Stack español** (soporte local)
- ✅ **Precio competitivo** (30-50% más barato)

### Cálculo de ROI para Cliente

**Ejemplo: Cadena 30 tiendas, 2 recruiters**

**Costos actuales (manual):**
- Tiempo recruiters: 20h/semana × $15/h × 4.3 = $1,290/mes
- Errores/duplicados: ~$500/mes
- Falta de visibilidad: ~$300/mes
- **Total: ~$2,090/mes**

**Con LIAH (Plan Professional $599/mes):**
- Ahorro tiempo: 60% = $774/mes
- Reducción errores: 80% = $400/mes
- **Ahorro neto: $575/mes**
- **ROI: +96% en 12 meses**

---

## 🎁 Estrategia de Lanzamiento

### Fase 1: Early Adopters (3 meses)
- **50% OFF primer año** para primeros 10 clientes
- Plan Professional: $299 (vs $599)
- Plan Enterprise: $499 (vs $999)
- A cambio: testimonios + caso de estudio

### Fase 2: Beta Pública (6 meses)
- **30% OFF primer año**
- Professional: $419
- Enterprise: $699

### Fase 3: Precio Regular
- Pricing completo según tabla

---

## 📊 Proyección de Ingresos (12 meses)

### Escenario Conservador
```
Mes 1-3:  5 clientes × $400 (promedio) = $2,000/mes
Mes 4-6:  10 clientes × $450 = $4,500/mes
Mes 7-12: 20 clientes × $550 = $11,000/mes

MRR Año 1: ~$6,000
ARR Año 1: ~$72,000
```

### Escenario Optimista
```
Mes 1-3:  10 clientes × $500 = $5,000/mes
Mes 4-6:  25 clientes × $600 = $15,000/mes
Mes 7-12: 50 clientes × $700 = $35,000/mes

MRR Año 1: ~$18,000
ARR Año 1: ~$216,000
```

---

## ✅ Ventajas Competitivas

1. **🚀 Time to Market:** Implementación en 48h
2. **🎯 Vertical-Specific:** 100% enfocado en masivo
3. **🤖 AI Nativa:** Bot incluido desde Professional
4. **🌎 LATAM-First:** Soporte, idioma, timezone
5. **💰 Precio justo:** 30-50% vs competidores
6. **📱 Mobile-Ready:** Funciona perfecto en celular
7. **🔒 Enterprise Security:** Firebase/GCP backbone
8. **📊 Real-Time:** Todo en tiempo real
9. **🎨 Modern UX:** UI/UX 2024+
10. **🔧 Configurable:** Sin código custom

---

## 🎯 Recomendación Final

**Pricing Inicial Sugerido:**

| Plan | Mensual | Anual (16% OFF) | Target |
|------|---------|-----------------|--------|
| Starter (RQ Only) | $349 | $299/mes ($3,588/año) | 10-50 tiendas |
| Professional (Bot) | $699 | $599/mes ($7,188/año) | 20-100 tiendas |
| Enterprise (Full) | $1,199 | $999/mes ($11,988/año) | 50+ tiendas |

**Descuento Early Adopter (3 meses):**
- Starter: $174/mes (50% OFF)
- Professional: $349/mes (50% OFF)
- Enterprise: $499/mes (58% OFF)

**Incluir:**
- ✅ Trial gratuito 14 días (sin tarjeta)
- ✅ Setup fee: $0 (primeros 50 clientes)
- ✅ Migración de datos gratis
- ✅ Onboarding incluido

---

**¿Quieres que ajuste algo del pricing o prefieres una estrategia diferente?**
