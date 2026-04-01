# Desplegar Uptime Kuma Bridge en Coolify

## 📋 Requisitos Previos

- Tener acceso a Coolify
- Uptime Kuma ya desplegado en Coolify
- Repositorio Git con el código del Bridge

## 🚀 Pasos para Desplegar

### Paso 1: Preparar el Repositorio Git

1. Sube la carpeta `uptime-kuma-bridge` a un repositorio Git (GitHub, GitLab, Bitbucket, etc.)

2. Asegúrate de incluir estos archivos:
   - `Dockerfile`
   - `package.json`
   - `server.js`
   - `.gitignore` (opcional)

### Paso 2: Crear el Servicio en Coolify

1. Accede a tu panel de Coolify
2. Haz clic en **"Create New Service"** → **"Docker"**
3. Conecta tu repositorio Git
4. Selecciona el repositorio del Bridge
5. Configura:
   - **Name**: `uptime-kuma-bridge`
   - **Branch**: `main` (o la que uses)
   - **Build Type**: `Dockerfile`
   - **Dockerfile Path**: `Dockerfile`
   - **Context Path**: `/uptime-kuma-bridge` (o la ruta correcta)

6. Haz clic en **"Create Service"**

### Paso 3: Configurar Variables de Entorno

En la configuración del servicio en Coolify, agrega las siguientes variables:

#### Variables Requeridas:

| Variable | Valor | Descripción |
|----------|--------|-------------|
| `PORT` | `3003` | Puerto del servicio Bridge |
| `DB_PATH` | `/app/data/kuma.db` | Ruta a la base de datos |
| `NODE_ENV` | `production` | Entorno de producción |

### Paso 4: Configurar el Volumen de Datos

**IMPORTANTE**: El servicio necesita acceso a la base de datos de Uptime Kuma.

#### Opción A: Volumen Compartido (Recomendada)

1. En Coolify, encuentra el servicio de Uptime Kuma
2. Copia el nombre del volumen que usa (usualmente algo como `coolify-uptime-kuma-data`)
3. En el servicio del Bridge, ve a **"Volumes"**
4. Agrega un volumen:
   - **Volume Path**: `/app/data`
   - **Type**: `Volume`
   - **Volume Name**: El nombre del volumen de Uptime Kuma (ej: `coolify-uptime-kuma-data`)
   - **Read Only**: ✅ Marcar esta opción (IMPORTANTE: el Bridge solo debe LEER)

#### Opción B: Montar Directorio Host (Alternativa)

Si usas un directorio en el host para la base de datos:

1. En Coolify, en el servicio del Bridge, ve a **"Volumes"**
2. Agrega:
   - **Volume Path**: `/app/data`
   - **Type**: `Bind Mount`
   - **Host Path**: `/ruta/donde/esta/kuma.db` (la ruta real en el servidor)
   - **Read Only**: ✅ Marcar esta opción

### Paso 5: Configurar Puertos y Dominio

1. En la configuración del servicio, ve a **"Domains"**
2. Configura:
   - **Domain**: `uptime-bridge.davisa.store` (o subdominio que prefieras)
   - **Port**: `3003`
3. Guarda los cambios

### Paso 6: Verificar el Despliegue

1. Espera a que Coolify termine el despliegue
2. Ve a la URL configurada (ej: `https://uptime-bridge.davisa.store/health`)
3. Deberías ver:
   ```json
   {
     "status": "ok",
     "message": "Uptime Kuma Bridge API is running"
   }
   ```

### Paso 7: Probar los Endpoints

```bash
# Obtener monitores
curl https://uptime-bridge.davisa.store/api/monitors

# Obtener heartbeats de un monitor
curl https://uptime-bridge.davisa.store/api/monitors/1/heartbeats

# Obtener rango de fechas
curl "https://uptime-bridge.davisa.store/api/monitors/1/heartbeats/range?startDate=2026-04-01T00:00:00Z&endDate=2026-04-30T23:59:59Z"
```

## 🔧 Configuración en tu Proyecto Local

Actualiza el archivo `.env` en tu proyecto:

```env
UPTIME_KUMA_URL=https://uptime.davisa.store
STATUS_PAGE_SLUG=davisa
BRIDGE_API_URL=https://uptime-bridge.davisa.store
```

## 🐛 Solución de Problemas

### Problema: "Failed to connect to database"

**Causa**: El volumen no está montado correctamente o el nombre es incorrecto.

**Solución**:
1. Verifica el nombre del volumen en el servicio de Uptime Kuma en Coolify
2. Asegúrate de que el nombre coincida exactamente en el servicio del Bridge
3. Verifica que la ruta sea `/app/data`

### Problema: "Permission denied"

**Causa**: Permisos incorrectos en el volumen.

**Solución**:
1. Asegúrate de marcar "Read Only" en el volumen
2. Si persiste, verifica que Uptime Kuma esté corriendo y haya creado la base de datos

### Problema: El servicio no responde

**Causa**: Error de configuración o problemas de red.

**Solución**:
1. Verifica los logs del servicio en Coolify
2. Verifica que el puerto 3003 esté disponible
3. Verifica la configuración de dominio

### Problema: Sigue mostrando solo 100 heartbeats

**Causa**: El proyecto no está usando la URL del Bridge.

**Solución**:
1. Verifica que `BRIDGE_API_URL` esté configurado en `.env`
2. Verifica que sea la URL correcta del Bridge en Coolify
3. Reinicia el servicio backend

## 📊 Verificación de Funcionamiento

### 1. Verificar que Bridge esté conectado a la DB

En los logs de Coolify del servicio Bridge, deberías ver:
```
✓ Connected to Uptime Kuma database: /app/data/kuma.db
```

### 2. Verificar datos históricos completos

```bash
# Prueba obtener heartbeats de un mes completo
curl "https://uptime-bridge.davisa.store/api/monitors/1/heartbeats/range?startDate=2026-04-01T00:00:00Z&endDate=2026-04-30T23:59:59Z" | jq '.total'
```

Deberías ver un número mayor a 100 (ej: 1500+, 3000+, etc.)

### 3. Generar reporte mensual en tu aplicación

1. Inicia tu aplicación local
2. Genera un reporte mensual para abril 2026
3. En los logs del backend deberías ver:
   ```
   Fetched 1500+ heartbeats for monitor XXX from Bridge API
   ```

## 🔐 Seguridad Recomendada

### 1. Configurar HTTPS

En Coolify, el dominio debería usar HTTPS automáticamente (Coolify gestiona certificados SSL con Let's Encrypt).

### 2. Restringir Acceso por IP (Opcional)

Si deseas que solo tu IP pueda acceder al Bridge:

1. En Coolify, ve a **"Network"** del servicio Bridge
2. Configura **"Allowed IPs"** (si está disponible)
3. O usa reglas de firewall en el servidor

### 3. Agregar Autenticación Básica (Opcional)

Para mayor seguridad, puedes agregar autenticación básica:

Modifica `server.js` para incluir:
```javascript
const basicAuth = require('express-basic-auth');

app.use(basicAuth({
  users: { 'admin': 'tu-contraseña-segura' },
  challenge: true,
}));

// Luego actualizar BRIDGE_API_URL con usuario:contraseña
// https://admin:contraseña@uptime-bridge.davisa.store
```

## 📝 Notas Importantes

1. **El Bridge es opcional**: Si el Bridge no está disponible, el sistema automáticamente usa el API público (fallback)
2. **No modifica Uptime Kuma**: El Bridge solo LEE datos, no escribe nada
3. **Seguridad**: El Bridge usa modo read-only en la base de datos
4. **Performance**: SQLite es muy rápido para consultas de lectura
5. **Coolify gestiona SSL**: Certificados HTTPS automáticos

## 🎯 Resultado Esperado

Una vez desplegado en Coolify:

✅ **Reportes mensuales completos** con todos los heartbeats históricos  
✅ **Datos desde las 11:12** (o cuando iniciaron los monitores)  
✅ **Sin límite de 100 heartbeats**  
✅ **Filtrado por rangos de fechas**  
✅ **HTTPS automático** con Let's Encrypt  
✅ **Gestión fácil** desde Coolify  

## 🔄 Actualizaciones

Para actualizar el servicio Bridge:

1. Haz commit de los cambios al repositorio Git
2. En Coolify, ve al servicio Bridge
3. Haz clic en **"Redeploy"**
4. Coolify reconstruirá el contenedor con los nuevos cambios

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs en Coolify
2. Verifica la configuración de volúmenes
3. Verifica las variables de entorno
4. Verifica la conectividad de red entre servicios

---

**¡Listo! Tu Uptime Kuma Bridge API está funcionando en Coolify.** 🚀
