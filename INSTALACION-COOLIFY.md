# Instalación en Coolify - Nueva Solución

## 🔄 Cambio de Estrategia

Dado que Coolify no puede montar el volumen externo `uptime-kuma-data` correctamente, cambiamos la estrategia:

**Antes**: Intentar montar volumen externo (no funcionaba)
**Ahora**: Descargar archivo `kuma.db` desde una URL durante la construcción

## 📋 Requisitos Previos

### 1. Hacer accesible el archivo kuma.db

Necesitas hacer accesible el archivo `kuma.db` de Uptime Kuma. Opciones:

**Opción A**: Servidor HTTP (Recomendada)
- Copiar el archivo `kuma.db` a una carpeta pública en tu servidor
- Hacerlo accesible vía HTTP

**Opción B**: GitHub/GitLab/Cloud Storage
- Subir el archivo `kuma.db` a un repositorio o servicio de almacenamiento
- Obtener una URL pública o de descarga directa

**Opción C**: URL temporal
- Usar un servicio como `transfer.sh` para compartir temporalmente el archivo

### 2. Obtener la URL del archivo

Una vez que tengas el archivo accesible, necesitarás una URL como:
- `http://tu-servidor.com/kuma.db`
- `https://tu-repositorio.com/kuma.db`
- `https://transfer.sh/xyz/kuma.db`

## ⚙️ Configuración en Coolify

### Paso 1: Configurar la variable de entorno

En Coolify, para tu servicio `uptime-kuma-bridge`, agrega una variable de entorno:

**Nombre de la variable**: `KUMA_DB_URL`
**Valor**: La URL donde está alojado el archivo `kuma.db`

Ejemplo:
```
KUMA_DB_URL=http://mi-servidor.com/kuma.db
```

### Paso 2: Redesplegar

1. Ve a tu servicio en Coolify
2. Haz clic en "Redeploy" o "Rebuild"
3. Espera a que la construcción se complete

### Paso 3: Verificar los logs

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

## 🔄 Actualización del archivo kuma.db

El archivo `kuma.db` se descarga **una sola vez** durante la construcción de la imagen Docker. Si Uptime Kuma agrega nuevos datos, estos no se reflejarán automáticamente.

### Solución: Actualización periódica

Para mantener los datos actualizados, tienes dos opciones:

**Opción 1**: Actualización manual
1. Copia el archivo `kuma.db` actualizado
2. Sube el nuevo archivo a la misma URL
3. Redespliega en Coolify

**Opción 2**: Automatización con script
Crea un script que:
1. Copie el archivo `kuma.db` del contenedor de Uptime Kuma
2. Lo suba a la URL configurada
3. Dispare un webhook o notifique para actualizar

### Script de ejemplo para copiar kuma.db

```bash
#!/bin/bash

# Obtener el ID del contenedor de Uptime Kuma
KUMA_CONTAINER=$(docker ps -q -f name=uptime-kuma)

# Copiar el archivo
docker cp $KUMA_CONTAINER:/app/data/kuma.db ./kuma.db

# Subir a tu servidor (ajusta esto)
scp ./kuma.db usuario@servidor.com:/ruta/publica/kuma.db

echo "Archivo kuma.db actualizado"
```

## 🐛 Solución de Problemas

### El archivo no se descarga durante la construcción

Si ves:
```
curl: (35) SSL connect error
```
Asegúrate de que la URL sea **HTTP** no HTTPS, o usa `curl -k` para ignorar errores SSL.

### El archivo está corrupto

Si ves errores de SQLite después del despliegue:
1. Verifica que el archivo `kuma.db` no esté corrupto
2. Prueba el archivo localmente con `sqlite3 kuma.db "SELECT COUNT(*) FROM monitor"`
3. Vuelve a subir una copia fresca

## 📄 Ventajas de esta solución

✅ **No depende de volúmenes externos** - Funciona en cualquier plataforma
✅ **Archivo incluido en la imagen** - No hay tiempo de espera
✅ **Fácil de actualizar** - Solo necesitas cambiar el archivo en la URL
✅ **Portabilidad** - El archivo está en la imagen Docker

## 📄 Desventajas

⚠️ **Actualización manual** - Necesitas actualizar periódicamente
⚠️ **Tamaño de imagen** - La imagen Docker será más grande con el archivo
⚠️ **No en tiempo real** - Los datos no se actualizan automáticamente

## 🔄 Solución Futura: Sincronización Automática

Para una solución más robusta, podríamos implementar:

1. **API de sincronización** - Un endpoint que acepte actualizaciones del archivo
2. **Webhook de Uptime Kuma** - Notificar cuando haya nuevos datos
3. **Cron job** - Actualizar automáticamente cada X horas

Esto requeriría modificar el código de Uptime Kuma para agregar estos hooks.
