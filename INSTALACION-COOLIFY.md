# Instalación en Coolify

## 📋 Dos Soluciones Disponibles

Este proyecto ofrece **dos soluciones** para actualizar la base de datos:

| Solución | Tiempo Real | Frecuencia | Complejidad |
|-----------|--------------|-------------|--------------|
| **Estática (URL)** | ❌ | Manual | Baja |
| **Dinámica (/api/update-db)** | ✅ | Configurable | Media |

### Recomendación

**Usa la solución dinámica** para actualizaciones casi en tiempo real.

---

## 🔄 Solución 1: Estática (URL durante construcción)

Esta solución descarga el archivo `kuma.db` una sola vez durante la construcción de la imagen Docker.

### Requisitos Previos

#### 1. Hacer accesible el archivo kuma.db

Necesitas hacer accesible el archivo `kuma.db` de Uptime Kuma. Opciones:

**Opción A**: Servidor HTTP (Recomendada)
- Copiar el archivo `kuma.db` a una carpeta pública en tu servidor
- Hacerlo accesible vía HTTP

**Opción B**: GitHub/GitLab/Cloud Storage
- Subir el archivo `kuma.db` a un repositorio o servicio de almacenamiento
- Obtener una URL pública o de descarga directa

**Opción C**: URL temporal
- Usar un servicio como `transfer.sh` para compartir temporalmente el archivo

#### 2. Obtener la URL del archivo

Una vez que tengas el archivo accesible, necesitarás una URL como:
- `http://tu-servidor.com/kuma.db`
- `https://tu-repositorio.com/kuma.db`
- `https://transfer.sh/xyz/kuma.db`

### Configuración en Coolify

#### Paso 1: Configurar la variable de entorno

En Coolify, para tu servicio `uptime-kuma-bridge`, agrega una variable de entorno:

**Nombre de la variable**: `KUMA_DB_URL`
**Valor**: La URL donde está alojado el archivo `kuma.db`

Ejemplo:
```
KUMA_DB_URL=http://mi-servidor.com/kuma.db
```

#### Paso 2: Redesplegar

1. Ve a tu servicio en Coolify
2. Haz clic en "Redeploy" o "Rebuild"
3. Espera a que la construcción se complete

#### Paso 3: Verificar los logs

Deberías ver:

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
  ...

STEP 3: Connecting to database...
============================================================
✅ Connected to database              ← ¡ÉXITO!
✅ Database verified - X monitors found  ← ¡ÉXITO!

============================================================
✅ SERVER STARTED SUCCESSFULLY
============================================================
```

### Actualización del archivo kuma.db

El archivo `kuma.db` se descarga **una sola vez** durante la construcción de la imagen Docker. Si Uptime Kuma agrega nuevos datos, estos no se reflejarán automáticamente.

Para actualizar:
1. Copia el archivo `kuma.db` actualizado
2. Sube el nuevo archivo a la misma URL
3. Redespliega en Coolify

---

## 🔄 Solución 2: Dinámica (Endpoint /api/update-db) - RECOMENDADA

Esta solución permite **actualizar la base de datos dinámicamente sin reconstruir el contenedor**, logrando datos casi en tiempo real.

### Ventajas

✅ **Casi tiempo real** - Actualización cada 5 minutos
✅ **Sin reconstrucción** - El contenedor no se reinicia
✅ **Backup automático** - Guarda copia del archivo anterior
✅ **Escalable** - Puedes ajustar el intervalo
✅ **Monitoreo completo** - Logs claros de cada actualización

### Requisitos

- El volumen `uptime-kuma-data` debe montarse como **writeable** (no read-only)
- El Bridge API debe estar corriendo
- Conectividad desde el servidor de Uptime Kuma al Bridge API

### Implementación

Para instrucciones completas de implementación, consulta el archivo:
**[ACTUALIZACION-DINAMICA.md](./ACTUALIZACION-DINAMICA.md)**

### Resumen Rápido

1. Crea un script que copie `kuma.db` del contenedor de Uptime Kuma
2. El script envía el archivo al endpoint `/api/update-db` cada X minutos
3. El Bridge API actualiza la base de datos dinámicamente
4. El frontend usa los datos actualizados casi en tiempo real

### Endpoint del Bridge API

**POST** `/api/update-db`

- **Content-Type**: `multipart/form-data`
- **Campo**: `db` (archivo)
- **Tamaño máximo**: 100MB

Ejemplo de solicitud:
```bash
curl -X POST \
  -F "db=@kuma.db" \
  https://uptime-bridge.davisa.store/api/update-db
```

Respuesta:
```json
{
  "success": true,
  "message": "Database updated successfully",
  "monitorsCount": 5,
  "timestamp": "2026-04-01T22:00:00.000Z"
}
```

---

## 🐛 Solución de Problemas Comunes

### Solución Estática

#### El archivo no se descarga durante la construcción

Si ves:
```
curl: (35) SSL connect error
```
Asegúrate de que la URL sea **HTTP** no HTTPS, o usa `curl -k` para ignorar errores SSL.

#### El archivo está corrupto

Si ves errores de SQLite después del despliegue:
1. Verifica que el archivo `kuma.db` no esté corrupto
2. Prueba el archivo localmente con `sqlite3 kuma.db "SELECT COUNT(*) FROM monitor"`
3. Vuelve a subir una copia fresca

### Solución Dinámica

#### El script falla al copiar el archivo

**Error**:
```
docker cp: Error: No such container: uptime-kuma
```
**Solución**:
Verifica el nombre del contenedor:
```bash
docker ps | grep uptime
```

#### La API rechaza el archivo

**Error**:
```
curl: (52) Empty reply from server
```
**Solución**:
1. Verifica que el Bridge API esté corriendo
2. Revisa los logs del Bridge API en Coolify
3. Verifica que el puerto 3003 sea accesible

---

## 📄 Comparación de Soluciones

| Aspecto | Estática (URL) | Dinámica (API) |
|-----------|----------------|-----------------|
| Tiempo real | ❌ | ✅ |
| Configuración inicial | Media | Media |
| Mantenimiento | Manual (redespliegue) | Automático (script) |
| Complejidad | Baja | Media |
| Uso de volumen | No | Sí (writeable) |
| Ideal para | Pruebas/Demo | Producción |

## 🚀 Siguientes Pasos

### Para Solución Estática

1. Hacer accesible el archivo `kuma.db`
2. Configurar `KUMA_DB_URL` en Coolify
3. Redesplegar

### Para Solución Dinámica (Recomendada)

1. Consulta [ACTUALIZACION-DINAMICA.md](./ACTUALIZACION-DINAMICA.md)
2. Implementa el script de actualización
3. Configura como servicio o cron job
4. Monitorea los logs

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs en Coolify
2. Verifica la documentación específica de cada solución
3. Asegúrate de que Uptime Kuma esté corriendo
4. Verifica la conectividad entre servidores
