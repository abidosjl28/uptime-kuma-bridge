# Sincronización Automática con Uptime Kuma - Solución Completa

## 🎯 Objetivo

Esta solución permite **sincronizar automáticamente** la base de datos del Bridge API con Uptime Kuma usando la **API REST oficial**, logrando datos casi en tiempo real **sin necesidad de acceso al servidor**.

## 🔄 Cómo Funciona

```
┌─────────────────────────────────────────────────────────┐
│  Bridge API (Coolify)                         │
│  - Tiene credenciales de Uptime Kuma           │
│  - Se autentica con la API REST              │
│  - Obtiene monitores y heartbeats              │
│  - Actualiza base de datos local                  │
└──────────────────┬────────────────────────────────────┘
                   │
                   │ POST /api/sync
                   │ (puedes llamarlo manualmente o cron)
                   ↓
┌─────────────────────────────────────────────────────────┐
│  Uptime Kuma REST API                       │
│  - Endpoint: /login/access-token                │
│  - Endpoint: /monitors                       │
│  - Endpoint: /monitors/:id/heartbeats          │
└─────────────────────────────────────────────────────────┘
```

## 📋 Requisitos

### Credenciales de Uptime Kuma

Necesitas:
- **Usuario**: El mismo que usas para entrar al panel de Uptime Kuma
- **Contraseña**: La misma que usas para entrar al panel de Uptime Kuma

Estas credenciales se usarán para autenticarte con la API REST.

## ⚙️ Configuración en Coolify

### Paso 1: Agregar Variables de Entorno

En Coolify, para tu servicio `uptime-kuma-bridge`, agrega estas variables de entorno:

| Variable | Descripción | Ejemplo | Requerido |
|-----------|--------------|---------|-----------|
| `UPTIME_KUMA_API` | URL de la API de Uptime Kuma | `https://uptime.davisa.store/api` | No |
| `UPTIME_KUMA_USERNAME` | Tu usuario de Uptime Kuma | `davisa` | ✅ Sí |
| `UPTIME_KUMA_PASSWORD` | Tu contraseña de Uptime Kuma | `davisa1234` | ✅ Sí |
| `UPTIME_KUMA_API_KEY` | (Opcional) Llave de API | `uk1_...` | No |

### Ejemplo de Configuración

```
UPTIME_KUMA_API=https://uptime.davisa.store/api
UPTIME_KUMA_USERNAME=davisa
UPTIME_KUMA_PASSWORD=davisa1234
```

### Paso 2: Redesplegar

1. Ve a tu servicio `uptime-kuma-bridge` en Coolify
2. Haz clic en "Redeploy" o "Rebuild"
3. Espera a que la construcción se complete
4. Verifica los logs - debería conectar exitosamente a la base de datos

### Paso 3: Iniciar la Sincronización

Hay **dos opciones** para iniciar la sincronización:

#### Opción A: Manual (Para Pruebas)

Desde tu terminal local, ejecuta:

```bash
curl -X POST https://uptime-bridge.davisa.store/api/sync
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "Database synchronized with Uptime Kuma",
  "syncedMonitors": 5,
  "timestamp": "2026-04-01T22:00:00.000Z"
}
```

#### Opción B: Automática con Cron Job (Recomendado)

Usa un servicio de cron jobs externo (como cron-job.org, EasyCron, o GitHub Actions) para llamar `/api/sync` automáticamente.

**Frecuencia recomendada**: Cada 5 minutos

Ejemplo de configuración en cron-job.org:
```bash
URL: https://uptime-bridge.davisa.store/api/sync
Schedule: */5 * * * *  (Cada 5 minutos)
Method: POST
```

#### Opción C: Automática desde el Frontend

Agrega un botón en tu frontend que llame `/api/sync` cuando el usuario quiera actualizar los datos.

## 📊 Endpoint del Bridge API

### POST /api/sync

Sincroniza la base de datos local con Uptime Kuma.

**Solicitud**:
- **Método**: POST
- **Sin cuerpo requerido**: Usa credenciales de entorno

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Database synchronized with Uptime Kuma",
  "syncedMonitors": 5,
  "timestamp": "2026-04-01T22:00:00.000Z"
}
```

**Proceso Interno**:

1. **Autenticación**: Login con username/password para obtener token de acceso
2. **Obtener Monitores**: Llama a `/monitors` con el token
3. **Obtener Heartbeats**: Para cada monitor, llama a `/monitors/:id/heartbeats?limit=100`
4. **Actualizar Base de Datos**: Inserta o reemplaza heartbeats en `kuma.db`
5. **Rate Limiting**: Espera 500ms entre monitores para evitar bloqueos

## 📄 Logs en Coolify

Deberías ver logs como estos:

```
============================================================
🚀 UPTIME KUMA BRIDGE API
============================================================

STEP 1: Importing modules...
✅ All modules imported successfully

STEP 2: Creating Express app...
✅ Express app created

Configuration:
  Port: 3003
  Database: /app/data/kuma.db
  Uptime Kuma API: https://uptime.davisa.store/api
  ...

STEP 3: Connecting to database...
============================================================
✅ Connected to database
✅ Database verified - 5 monitors found

============================================================
✅ API ready, listening...
============================================================
```

Cuando llames `/api/sync`, verás:

```
🔄 Sync request received
🔐 Logging in to Uptime Kuma...
✅ Login successful, access token obtained
📊 Fetching monitors from Uptime Kuma...
✅ Fetched 5 monitors from Uptime Kuma
💓 Fetching heartbeats from Uptime Kuma...
  ✅ Synced 100 heartbeats for monitor "Monitor 1"
  ✅ Synced 98 heartbeats for monitor "Monitor 2"
  ✅ Synced 45 heartbeats for monitor "Monitor 3"
✅ Sync completed
```

## 🔒 Seguridad

### Protección del Endpoint

Por defecto, `/api/sync` es público. Si necesitas protegerlo, agrega:

**En server.js**:
```javascript
// Agregar antes del endpoint /api/sync
const SYNC_SECRET = process.env.SYNC_SECRET || '';

app.post('/api/sync', (req, res) => {
  if (SYNC_SECRET && req.headers['x-sync-secret'] !== SYNC_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  // ... resto del código
});
```

**Variable de entorno en Coolify**:
```
SYNC_SECRET=tu-llave-secreta-muy-segura
```

**Llamada protegida**:
```bash
curl -X POST \
  -H "x-sync-secret: tu-llave-secreta-muy-segura" \
  https://uptime-bridge.davisa.store/api/sync
```

## 🐛 Solución de Problemas

### Error: "Missing Uptime Kuma credentials"

**Causa**: Faltan las variables `UPTIME_KUMA_USERNAME` o `UPTIME_KUMA_PASSWORD` en Coolify.

**Solución**:
1. Ve a tu servicio en Coolify
2. Agrega las variables de entorno:
   - `UPTIME_KUMA_USERNAME=davisa`
   - `UPTIME_KUMA_PASSWORD=davisa1234`
3. Redespliega el servicio

### Error: "Authentication failed"

**Causa**: Usuario o contraseña incorrectos.

**Solución**:
1. Verifica que las credenciales sean correctas
2. Asegúrate de usar las mismas que usas para entrar al panel de Uptime Kuma

### Error: "Failed to fetch monitors"

**Causa**: Error de red o Uptime Kuma no está accesible.

**Solución**:
1. Verifica que la URL `UPTIME_KUMA_API` sea correcta
2. Revisa los logs para más detalles del error
3. Verifica que Uptime Kuma esté corriendo

### Error: "Failed to sync database"

**Causa**: Error al insertar heartbeats en la base de datos.

**Solución**:
1. Revisa los logs en Coolify para detalles del error
2. Verifica que la base de datos no esté corrupta
3. Asegúrate de que el volumen tenga permisos de escritura

## 🔄 Ventajas de Esta Solución

✅ **No requiere acceso al servidor** - Todo desde Coolify
✅ **API REST oficial** - Usa endpoints documentados y soportados
✅ **Autenticación segura** - Basic Auth estándar
✅ **Casi tiempo real** - Sincronización manual o automática
✅ **Rate limiting inteligente** - Espera entre monitores para evitar bloqueos
✅ **Fácil de probar** - Llama `/api/sync` manualmente
✅ **Escalable** - Ajusta frecuencia según necesites
✅ **Backup automático** - Solo se actualiza, no se borra nada

## 📄 Comparación con Otras Soluciones

| Aspecto | Volume Mounting | API Sync |
|-----------|----------------|----------|
| Tiempo real | ❌ | ✅ |
| Acceso a servidor | ✅ Necesario | ❌ No |
| Configuración | Media | Baja |
| Mantenimiento | Manual | Automático |
| Estabilidad | Media | Alta |
| Complejidad | Alta | Media |

## 🚀 Siguientes Pasos

1. **Configurar variables de entorno** en Coolify
2. **Redesplegar** el servicio
3. **Verificar logs** para confirmar inicio correcto
4. **Probar manualmente**: `curl -X POST https://uptime-bridge.davisa.store/api/sync`
5. **Configurar sincronización automática** (cron job o desde frontend)

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs en Coolify
2. Verifica las credenciales de Uptime Kuma
3. Confirma que Uptime Kuma esté corriendo
4. Verifica la conectividad entre Coolify y Uptime Kuma
