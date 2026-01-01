# 🚀 Guía Rápida: Crear Datos de Prueba

## Método Simple (Navegador)

### Paso 1: Abrir la App
Abre en tu navegador: **http://localhost:3000**

### Paso 2: Abrir DevTools
Presiona **F12** o **Click derecho → Inspeccionar**

### Paso 3: Ir a Console
Click en la pestaña **Console** en DevTools

### Paso 4: Copiar y Pegar el Script

Copia **TODO** el contenido del archivo `scripts/setup-test-data.js` y pégalo en la consola.

**ℹ️ Tip:** Puedes abrir el archivo desde VS Code, seleccionar todo (Ctrl+A) y copiar (Ctrl+C).

### Paso 5: Presionar Enter

El script se ejecutará automáticamente y verás:

```
🚀 Iniciando creación de datos de prueba...

📝 Creando approval_config...
✅ approval_config creado: abc123...

📝 Creando job_profiles...
✅ Perfil creado: Delivery Driver (def456...)
✅ Perfil creado: Cajero/a (ghi789...)
✅ Perfil creado: Cocinero/a (jkl012...)

✨ ¡Datos de prueba creados exitosamente!

📋 Resumen:
- 1 configuración de aprobación (5 niveles)
- 3 perfiles de trabajo
```

---

## ¿El script no funciona?

### Problema: "Cannot find module"

**Solución:** Asegúrate de que estás en una página de la app (http://localhost:3000), no en `about:blank`.

### Problema: "db is not defined"

**Solución:** El archivo `lib/firebase.ts` debe exportar `db`. Verifica que exista el export.

### Problema: "Permission denied"

**Solución:** Verifica las reglas de Firestore. Temporalmente puedes usar:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // ⚠️ Solo para desarrollo
    }
  }
}
```

---

## Verificar que se crearon los datos

### Opción 1: Firebase Console
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Firestore Database
3. Deberías ver las collections `approval_config` y `job_profiles`

### Opción 2: Desde la consola del navegador
```javascript
import { collection, getDocs } from 'firebase/firestore';
import { db } from './lib/firebase';

// Ver approval configs
const configs = await getDocs(collection(db, 'approval_config'));
console.log('Configs:', configs.size);

// Ver job profiles
const profiles = await getDocs(collection(db, 'job_profiles'));
console.log('Profiles:', profiles.size);
```

---

## Siguiente Paso

Una vez que veas "✨ ¡Datos de prueba creados exitosamente!", ve a:

**http://localhost:3000/store-manager**

Y prueba crear un RQ! 🎉
