# Desplegar Uptime Kuma Bridge en Coolify

## 📋 Requisitos Previos

- Tener acceso a Coolify
- Uptime Kuma ya desplegado en Coolify
- Repositorio Git con el código del Bridge: https://github.com/abidosjl28/uptime-kuma-bridge.git

## 🚀 Pasos para Desplegar

### Paso 1: Verificar el Repositorio

1. Ve a: https://github.com/abidosjl28/uptime-kuma-bridge
2. Verifica que estos archivos estén en la raíz:
   - ✅ `Dockerfile`
   - ✅ `package.json`
   - ✅ `server.js`
   - ✅ `build.sh`
   - ✅ `.dockerignore`
   - ✅ `.coolifyignore`

### Paso 2: Crear el Servicio en Coolify

1. Accede a tu panel de Coolify
2. Haz clic en **"Create New Service"** → **"Docker"**
3. Conecta tu repositorio:
   - **GitHub** → Buscar: `uptime-kuma-bridge`
   - Selecciona el repositorio: `abidosjl28/uptime-kuma-bridge`
4. Configura:
   - **Name**: `uptime-kuma-bridge`
   - **Branch**: `main`
   - **Build Type**: `Dockerfile`
   - **Dockerfile Path**: `Dockerfile` (dejar vacío o escribir solo "Dockerfile")
   - **Context Path**: `/` (o dejar vacío para usar la raíz)
5. Haz clic en **"Create Service"**

### ⚠️ SOLUCIÓN DE ERRORES COMUNES

#### Error: "failed to read dockerfile: open Dockerfile: no such file or directory"

**Causa:** Coolify no puede encontrar el Dockerfile en la ruta especificada.

**Solución 1:** Configurar Context Path correcto
- En **Dockerfile Path**: escribir solo `Dockerfile`
- En **Context Path**: dejar vacío `/`

**Solución 2:** Usar "Docker Compose" en lugar de "Dockerfile"
1. En **Build Type**: seleccionar **"Docker Compose"**
2. En **Docker Compose Path**: escribir `docker-compose.yml`
3. En **Context Path**: dejar vacío `/`
4. Crear servicio

**Solución 3:** Crear Dockerfile en subdirectorio
Si ninguna de las anteriores funciona:
1. En Coolify, **Dockerfile Path**: `./Dockerfile`
2. **Context Path**: `.` (punto solo)

### Paso 3: Configurar Variables de Entorno

En la configuración del servicio en Coolify, ve a **"Environment Variables"** y agrega:

| Variable | Valor | Descripción |
|----------|--------|-------------|
| `PORT` | `3003` | Puerto del servicio Bridge |
| `DB_PATH` | `/app/data/kuma.db` | Ruta a la base de datos |
| `NODE_ENV` | `production` | Entorno de producción |

### Paso 4: Configurar el Volumen de Datos

**IMPORTANTE**: El servicio necesita acceso a la base de datos de Uptime Kuma.

1. En Coolify, encuentra el servicio de Uptime Kuma
2. Ve a **"Volumes"** y copia el nombre exacto del volumen que usa (ejemplo: `coolify-uptime-kuma-data`, `vsc-uptime-kuma-data`, etc.)
3. En el servicio del Bridge, ve a **"Volumes"**
4. Agrega un volumen:
   - **Mount Path** (o Volume Path): `/app/data`
   - **Type**: `Volume`
   - **Volume Name**: El nombre exacto del volumen de Uptime Kuma (copiado en paso 2)
   - **Read Only**: ✅ Marcar esta opción (CRUCIAL: el Bridge solo debe LEER)

### Paso 5: Configurar Puertos y Dominio

1. En la configuración del servicio, ve a **"Domains"** o **"Port"**
2. Configura:
   - **Domain**: `uptime-bridge.davisa.store` (o subdominio que prefieras)
   - **Port**: `3003`
3. Guarda los cambios

### Paso 6: Verificar el Despliegue

1. Espera a que Coolify termine el despliegue
2. Si falla, ve a los logs (más abajo en "Solución de Errores")
3. Si tiene éxito, ve a la URL configurada (ej: `https://uptime-bridge.davisa.store/health`)
4. Deberías ver:
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

### Problema: "failed to read dockerfile: open Dockerfile: no such file or directory"

**Opción 1: Usar Docker Compose**
```
Build Type: Docker Compose
Docker Compose Path: docker-compose.yml
Context Path: /
```

**Opción 2: Verificar rutas**
```
Dockerfile Path: Dockerfile
Context Path: /
```

**Opción 3: Contactar soporte de Coolify**
Si ninguna opción funciona, podría ser un bug de Coolify. 
Verifica que todos los archivos estén en la raíz del repositorio: https://github.com/abidosjl28/uptime-kuma-bridge

### Problema: "Failed to connect to database"

**Causa**: El volumen no está montado correctamente o el nombre es incorrecto.

**Solución**:
1. Verifica el nombre exacto del volumen en el servicio de Uptime Kuma en Coolify
2. Asegúrate de que el nombre coincida EXACTAMENTE en el servicio del Bridge (respetar mayúsculas/minúsculas)
3. Verifica que la ruta sea `/app/data`
4. Verifica que "Read Only" esté marcado

### Problema: "Permission denied"

**Causa**: Permisos incorrectos en el volumen.

**Solución**:
1. Asegúrate de marcar "Read Only" en el volumen
2. Si persiste, verifica que Uptime Kuma esté corriendo y haya creado la base de datos
3. En los logs del Bridge, busca mensajes de error específicos

### Problema: El servicio no responde

**Causa**: Error de configuración o problemas de red.

**Solución**:
1. Verifica los logs del servicio en Coolify (botón "Logs")
2. Verifica que el puerto 3003 esté disponible
3. Verifica la configuración de dominio
4. En los logs, deberías ver: "✓ Connected to Uptime Kuma database: /app/data/kuma.db"

### Problema: Sigue mostrando solo 100 heartbeats

**Causa**: El proyecto no está usando la URL del Bridge.

**Solución**:
1. Verifica que `BRIDGE_API_URL` esté configurado en `.env`
2. Verifica que sea la URL correcta del Bridge en Coolify
3. Reinicia el servicio backend
4. En los logs del backend, deberías ver: "from Bridge API" en lugar de "from public API"

## 📊 Verificación de Funcionamiento

### 1. Verificar que Bridge esté conectado a la DB

En los logs de Coolify del servicio Bridge, deberías ver:
```
✓ Connected to Uptime Kuma database: /app/data/kuma.db
✓ Uptime Kuma Bridge API running on port 3003
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
   (en lugar de los ~100 del API público)

## 🔐 Seguridad Recomendada

### 1. Configurar HTTPS

En Coolify, el dominio debería usar HTTPS automáticamente (Coolify gestiona certificados SSL con Let's Encrypt).

### 2. Restringir Acceso por IP (Opcional)

Si deseas que solo tu IP pueda acceder al Bridge:

1. En Coolify, ve a **"Network"** del servicio Bridge
2. Configura reglas de firewall o allowed IPs si está disponible

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
5. **Coolify gestiona SSL**: Certificados HTTPS automáticos con Let's Encrypt
6. **Volumen compartido**: El Bridge debe compartir el volumen EXACTO de Uptime Kuma

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
3. Haz clic en **"Redeploy"** o **"Deploy"**
4. Coolify reconstruirá el contenedor con los nuevos cambios

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs en Coolify (botón "Logs")
2. Verifica la configuración de volúmenes (el nombre debe ser EXACTO)
3. Verifica las variables de entorno
4. Verifica la conectividad de red entre servicios
5. Verifica que todos los archivos estén en la raíz del repositorio GitHub

---

**¡Listo! Tu Uptime Kuma Bridge API está funcionando en Coolify.** 🚀
