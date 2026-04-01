# Uptime Kuma Bridge - Solución Completa para Datos Históricos

## 📋 Resumen Rápido

Has solicitado acceso a datos históricos completos de Uptime Kuma para generar reportes mensuales con todos los heartbeats (sin el límite de 100 del API público).

## 🎯 La Solución

He creado un **Servicio Intermediario (Bridge API)** que:
- Se conecta directamente a la base de datos SQLite de Uptime Kuma
- Expone una REST API sin limitaciones
- Permite acceder a TODOS los heartbeats históricos
- Filtra por rangos de fechas específicos

## 📁 Archivos Creados

### 1. **uptime-kuma-bridge/server.js**
Servicio Express que expone la API Bridge con endpoints:
- `GET /health` - Verificación de estado
- `GET /api/monitors` - Lista de todos los monitores
- `GET /api/monitors/:id` - Detalles de un monitor
- `GET /api/monitors/:id/heartbeats` - Todos los heartbeats (SIN LÍMITE)
- `GET /api/monitors/:id/heartbeats/range` - Heartbeats en rango de fechas
- `GET /api/stats` - Estadísticas generales

### 2. **uptime-kuma-bridge/package.json**
Dependencias del servicio Bridge:
- `express` - Servidor web
- `better-sqlite3` - Acceso a SQLite
- `cors` - Soporte para CORS

### 3. **uptime-kuma-bridge/Dockerfile**
Dockerfile para despliegue en Coolify u otras plataformas.

### 4. **uptime-kuma-bridge/docker-compose.yml**
Configuración Docker para despliegue manual.

### 5. **api/services/uptimeKumaService.ts** (MODIFICADO)
Actualizado para usar la API Bridge:
- Nuevo método `getMonthlyReport()` que usa Bridge API primero
- Fallback a `getMonthlyReportFallback()` si Bridge no está disponible
- Configuración vía `BRIDGE_API_URL` en `.env`

### 6. **.env** (CREADO)
Configuración del proyecto:
```env
UPTIME_KUMA_URL=https://uptime.davisa.store
STATUS_PAGE_SLUG=davisa
BRIDGE_API_URL=http://localhost:3003
```

## 🚀 Cómo Usar - Coolify (Recomendado)

### Paso 1: Subir a Repositorio Git

Sube la carpeta `uptime-kuma-bridge` a un repositorio Git (GitHub, GitLab, etc.).

### Paso 2: Crear Servicio en Coolify

1. Accede a tu panel de Coolify
2. **Create New Service** → **Docker**
3. Conecta tu repositorio
4. Configura:
   - **Name**: `uptime-kuma-bridge`
   - **Build Type**: `Dockerfile`
   - **Dockerfile Path**: `Dockerfile`
5. **Create Service**

### Paso 3: Configurar Variables de Entorno

En Coolify, agrega:
- `PORT=3003`
- `DB_PATH=/app/data/kuma.db`
- `NODE_ENV=production`

### Paso 4: Configurar Volumen

En Coolify, ve a **Volumes** y agrega:
- **Volume Path**: `/app/data`
- **Volume Name**: El mismo volumen que usa Uptime Kuma (ej: `coolify-uptime-kuma-data`)
- **Read Only**: ✅ (IMPORTANTE)

### Paso 5: Configurar Dominio

1. Ve a **Domains** en Coolify
2. Agrega: `uptime-bridge.davisa.store`
3. Puerto: `3003`

### Paso 6: Verificar

```bash
curl https://uptime-bridge.davisa.store/health
```

### Paso 7: Configurar tu Proyecto

Actualiza `.env`:
```env
BRIDGE_API_URL=https://uptime-bridge.davisa.store
```

📖 **Instrucciones completas para Coolify**: Ver `COOLIFY-DESPLEGUE.md`

## 🚀 Cómo Usar - Docker Manual (Alternativa)

### Paso 1: Desplegar el Bridge API

Lee las instrucciones en `INSTRUCCIONES-DESPLEGUE.md`

Resumen rápido:
```bash
cd uptime-kuma-bridge
docker-compose up -d
curl http://localhost:3003/health
```

### Paso 2: Configurar tu proyecto local

Actualiza el archivo `.env`:
```env
BRIDGE_API_URL=http://TU_SERVIDOR_IP:3003
```

## ✅ Verificación

### Comprueba que funciona:

1. **Bridge API corriendo:**
   ```bash
   curl https://uptime-bridge.davisa.store/health
   ```
   Respuesta esperada: `{"status":"ok",...}`

2. **Obtener monitores:**
   ```bash
   curl https://uptime-bridge.davisa.store/api/monitors
   ```

3. **Obtener heartbeats sin límite:**
   ```bash
   curl "https://uptime-bridge.davisa.store/api/monitors/1/heartbeats?limit=10000"
   ```
   Deberías ver más de 100 heartbeats

4. **Obtener rango de fechas:**
   ```bash
   curl "https://uptime-bridge.davisa.store/api/monitors/1/heartbeats/range?startDate=2026-04-01T00:00:00Z&endDate=2026-04-30T23:59:59Z"
   ```

## 📊 Ventajas

| Antes (API Público) | Después (Bridge API) |
|---------------------|---------------------|
| ❌ Solo últimos 100 heartbeats | ✅ TODOS los heartbeats |
| ❌ No se puede filtrar por fechas | ✅ Filtrado por rangos de fechas |
| ❌ Reportes mensuales incompletos | ✅ Reportes mensuales completos |
| ❌ Datos desde ~17:52 | ✅ Datos desde las 11:12 (o cuando inició) |

## 🔧 Arquitectura

```
Tu Aplicación (React + Express)
    ↓
UptimeKumaService (api/services/uptimeKumaService.ts)
    ↓ (usa Bridge API si disponible, sino fallback)
┌─────────────────────────────────┐
│ Uptime Kuma Bridge API          │
│ (https://uptime-bridge.davisa.store)│
│                                 │
│ server.js (Express)             │
│    ↓                            │
│ better-sqlite3                  │
│    ↓                            │
│ /app/data/kuma.db (SQLite)     │
└─────────────────────────────────┘
    ↑
    | (read-only volume)
    ↑
┌─────────────────────────────────┐
│ Uptime Kuma (Coolify)          │
│ - uptime-kuma-data volume       │
│ - kuma.db (base de datos)      │
└─────────────────────────────────┘
```

## 🛠️ Solución de Problemas

### Bridge API no responde (Coolify)

1. Verifica logs en Coolify
2. Verifica que el volumen esté montado correctamente
3. Verifica las variables de entorno

### No se puede conectar desde tu proyecto

1. Verifica `BRIDGE_API_URL` en `.env`
2. Verifica que el dominio sea accesible
3. Prueba: `curl https://uptime-bridge.davisa.store/health`

### Sigue mostrando solo 100 heartbeats

1. Verifica que `BRIDGE_API_URL` esté configurado
2. Verifica logs del backend - debería decir "from Bridge API"
3. Si dice "from public API", el Bridge no está accesible

## 📝 Notas Importantes

1. **El Bridge es opcional**: Si el Bridge no está disponible, el sistema automáticamente usa el API público (fallback)
2. **No modifica Uptime Kuma**: El Bridge solo LEE datos, no escribe nada
3. **Seguridad**: El Bridge usa modo read-only en la base de datos
4. **Performance**: SQLite es muy rápido para consultas de lectura
5. **Coolify**: HTTPS automático, gestión fácil, despliegue continuo

## 🎉 Resultado Esperado

Una vez que despliegues el Bridge API en Coolify:

✅ **Reportes mensuales completos** con todos los heartbeats históricos  
✅ **Datos desde las 11:12** (o cuando iniciaron los monitores)  
✅ **Sin límite de 100 heartbeats**  
✅ **Filtrado por rangos de fechas**  
✅ **HTTPS automático** con Let's Encrypt  
✅ **Gestión fácil desde Coolify**  

## 📖 Documentación Detallada

- **COOLIFY-DESPLEGUE.md** - Instrucciones paso a paso para Coolify
- **INSTRUCCIONES-DESPLEGUE.md** - Instrucciones para despliegue manual con Docker
- **README.md** - Documentación técnica de la API

## 🔄 Actualizaciones

### En Coolify:
1. Commit al repositorio Git
2. "Redeploy" en Coolify

### Manual:
```bash
docker-compose pull
docker-compose up -d
```

---

**¡Listo! Ahora tienes acceso completo a los datos históricos de Uptime Kuma, optimizado para Coolify.** 🚀
