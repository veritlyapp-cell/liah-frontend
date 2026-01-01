# 📘 Manual de Usuario - LIAH

## Sistema de Reclutamiento Inteligente con IA

---

## 📱 Instalación en Celular (PWA)

1. Abre **liah.tudominio.com** en Chrome
2. Aparecerá un mensaje "Agregar a pantalla de inicio"
3. Toca **Instalar**
4. ¡Listo! LIAH aparecerá como app en tu celular

---

## 👥 Roles y Accesos

| Rol | Qué puede hacer |
|-----|-----------------|
| **Super Admin** | Gestionar todos los Holdings y configuraciones globales |
| **Admin Holding** | Gestionar marcas, tiendas, usuarios y configuración del tenant |
| **Jefe de Marca** | Aprobar RQs de su marca, ver tiendas asignadas |
| **Recruiter** | Gestionar candidatos, asignar a tiendas, validar CUL |
| **Store Manager** | Crear RQs, invitar candidatos, confirmar ingresos |

---

## 📋 Crear un Requerimiento (RQ)

### Como Store Manager:

1. Ve a tu dashboard → tab **"RQs"**
2. Clic en **"+ Nuevo RQ"**
3. Completa los datos:
   - Puesto (ej: Cajero, Cocinero)
   - Cantidad de vacantes
   - Modalidad (Full Time / Part Time)
   - Fecha límite (opcional)
4. Clic en **"Crear RQ"**
5. El RQ pasa a aprobación del Jefe de Marca

### Estados del RQ:
- 🟡 **Pendiente**: Esperando aprobación
- 🟢 **Aprobado**: Listo para reclutar
- 🔵 **En Proceso**: Hay candidatos postulando
- ✅ **Cubierto**: Todas las vacantes llenas
- ❌ **Rechazado**: No aprobado (ver observaciones)

---

## 👤 Gestión de Candidatos

### Flujo del Candidato:

```
WhatsApp → Bot LIAH → Screening IA → Invitación → Entrevista → Aprobación → Ingreso
```

### Estados del Candidato:
- **Invitado**: Ha sido invitado a postular
- **Completó Chat**: Terminó el screening del bot
- **Entrevista Programada**: Tiene fecha de entrevista
- **Aprobado**: Pasó todas las validaciones
- **CUL Apto**: Verificación laboral completada
- **Ingresado**: Ya está trabajando

### Como Recruiter:

1. Ve a **"Candidatos"** → Filtrar por marca/tienda
2. Revisa el perfil del candidato
3. Valida el CUL (Certificado Único Laboral)
4. Marca como **Apto** o **No Apto**

### Como Store Manager:

1. Ve a **"Candidatos Aptos"**
2. Selecciona candidato → **"Marcar Ingreso"**
3. Indica fecha de inicio
4. El candidato queda como **Ingresado**

---

## 📊 Dashboard de Analítica

### Métricas Principales:

| KPI | Descripción |
|-----|-------------|
| **Total RQs** | Requerimientos creados en el período |
| **Fill Rate** | % de vacantes cubiertas |
| **Hire Rate** | % de candidatos que llegan a ingresar |
| **Tiempo Prom.** | Días promedio para cubrir una vacante |

### Gráficos Disponibles:
- 📈 Funnel de conversión
- 📊 Tendencia de candidatos
- 🥧 Fuentes de reclutamiento
- 📉 Razones de rechazo
- 👥 Demografía (edades)

### Exportar Datos:
1. Clic en **"📥 Exportar"** (arriba derecha)
2. Elige formato:
   - **Excel**: Archivo .xls con tablas formateadas
   - **CSV**: Texto plano para importar
   - **PDF**: Imprimir reporte

---

## 📱 Bot de WhatsApp (LIAH)

### Qué hace el bot:
1. Recibe mensaje del candidato
2. Acepta Términos y Condiciones (Ley 29733)
3. Recopila datos básicos:
   - Nombre completo
   - Fecha de nacimiento
   - DNI o CE
   - Email
4. Verifica disponibilidad (turnos, cierres)
5. Pregunta expectativa salarial
6. Sugiere tiendas cercanas
7. Programa entrevista

### Tracking de Fuentes:
- WhatsApp Directo
- Link de Postulación
- Referidos
- Facebook / Instagram / TikTok
- LinkedIn
- CompuTrabajo / Bumerán / Indeed
- Volantes / Radio / Eventos

---

## ⬇️ Exportar Candidatos Aptos

### Desde Recruiter o Admin:

1. Ve a **"Candidatos"**
2. Filtra por estado: **"Aptos"**
3. Clic en **"Exportar APTOS (Excel)"**

### Columnas del Excel:
- Marca
- RQ
- Tienda
- Puesto
- Modalidad
- Apellidos y Nombres
- DNI
- **Fecha Nacimiento**
- **Edad**
- Dirección
- Celular
- Correo

---

## 🔔 Notificaciones (Próximamente)

- Resumen de pendientes a las 12:00 PM
- Resumen vespertino a las 6:00 PM
- No spam: solo un push con el resumen del día

---

## ❓ Soporte

¿Tienes dudas o problemas?

📧 soporte@liah.app  
📱 WhatsApp: +51 999 999 999

---

*LIAH - Reclutamiento Inteligente*  
*Versión 1.0 - Diciembre 2024*
