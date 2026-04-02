# Actualización Dinámica de Base de Datos en Tiempo Real

## 🔄 Concepto

Esta solución permite **actualizar la base de datos dinámicamente sin reconstruir el contenedor**, logrando datos casi en tiempo real.

## 📋 Cómo Funciona

1. **Inicialización**: El contenedor se inicia con una base de datos inicial (opcional)
2. **Actualización dinámica**: Un endpoint `/api/update-db` permite subir un nuevo archivo `kuma.db`
3. **Actualización automática**: Un script copia periódicamente el archivo `kuma.db` de Uptime Kuma y lo envía al Bridge API

## 🎯 Endpoints del Bridge API

### POST /api/update-db

Actualiza la base de datos en tiempo real subiendo un archivo.

**Solicitud**:
- **Método**: POST
- **Content-Type**: `multipart/form-data`
- **Campo**: `db` (archivo)
- **Tamaño máximo**: 100MB

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Database updated successfully",
  "monitorsCount": 5,
  "timestamp": "2026-04-01T22:00:00.000Z"
}
```

**Respuesta con error**:
```json
{
  "error": "No database file provided"
}
```

## 🚀 Implementación de Actualización Automática

### Paso 1: Crear Script de Actualización

Crea un archivo `update-kuma-bridge.sh` en el servidor donde está Uptime Kuma:

```bash
#!/bin/bash

# Configuración
KUMA_CONTAINER="uptime-kuma"
BRIDGE_API_URL="https://uptime-bridge.davisa.store/api/update-db"
UPDATE_INTERVAL="300"  # 5 minutos en segundos

while true; do
    echo "📥 Starting database update..."
    
    # Copiar archivo kuma.db del contenedor de Uptime Kuma
    docker cp $KUMA_CONTAINER:/app/data/kuma.db /tmp/kuma.db
    
    # Verificar que el archivo se copió
    if [ -f /tmp/kuma.db ]; then
        echo "📄 File copied, size: $(stat -f%z /tmp/kuma.db) bytes"
        
        # Subir al Bridge API
        RESPONSE=$(curl -X POST \
            -F "db=@/tmp/kuma.db" \
            "$BRIDGE_API_URL")
        
        echo "📤 Response: $RESPONSE"
    else
        echo "❌ Failed to copy kuma.db from container"
    fi
    
    # Esperar el intervalo
    echo "⏰ Waiting $UPDATE_INTERVAL seconds before next update..."
    sleep $UPDATE_INTERVAL
done
```

### Paso 2: Hacer el Script Ejecutable

```bash
chmod +x update-kuma-bridge.sh
```

### Paso 3: Ejecutar el Script

**Opción A**: En primer plano (para pruebas)
```bash
./update-kuma-bridge.sh
```

**Opción B**: En segundo plano (producción)
```bash
nohup ./update-kuma-bridge.sh > kuma-bridge-updater.log 2>&1 &
```

**Opción C**: Como servicio systemd
```bash
# Crear archivo de servicio
sudo nano /etc/systemd/system/kuma-bridge-updater.service
```

Contenido del servicio:
```ini
[Unit]
Description=Uptime Kuma Bridge Updater
After=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/root
ExecStart=/root/update-kuma-bridge.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Activar el servicio:
```bash
sudo systemctl daemon-reload
sudo systemctl enable kuma-bridge-updater
sudo systemctl start kuma-bridge-updater
sudo systemctl status kuma-bridge-updater
```

## ⚙️ Configuración del Intervalo de Actualización

### 5 Minutos (Casi tiempo real)
```bash
UPDATE_INTERVAL="300"
```

### 10 Minutos (Balanceado)
```bash
UPDATE_INTERVAL="600"
```

### 30 Minutos (Frecuente pero no tiempo real)
```bash
UPDATE_INTERVAL="1800"
```

### 1 Hora (Menos frecuencia)
```bash
UPDATE_INTERVAL="3600"
```

**Recomendación**: Usa **5 minutos** para casi tiempo real. Ajusta según la frecuencia de heartbeats de Uptime Kuma.

## 🔒 Seguridad

### Autenticación (Opcional)

Si necesitas proteger el endpoint `/api/update-db`, agrega una llave secreta:

**En server.js**:
```javascript
const UPDATE_SECRET = process.env.UPDATE_SECRET || '';

app.post('/api/update-db', (req, res) => {
  // Verificar la llave secreta
  if (UPDATE_SECRET && req.headers['x-update-secret'] !== UPDATE_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  // ... resto del código
});
```

**En el script**:
```bash
curl -X POST \
  -H "x-update-secret: tu-llave-secreta" \
  -F "db=@/tmp/kuma.db" \
  "$BRIDGE_API_URL"
```

**Variable de entorno en Coolify**:
```
UPDATE_SECRET=tu-llave-secreta-muy-segura
```

## 📊 Monitoreo de Actualizaciones

### Ver Logs del Script

```bash
# Si ejecutas en segundo plano
tail -f kuma-bridge-updater.log

# Si usas systemd
sudo journalctl -u kuma-bridge-updater -f
```

### Ver Logs del Bridge API

En Coolify, ve a la sección de logs del servicio `uptime-kuma-bridge`.

Deberías ver:
```
📥 Database update request received
📄 Database file received: kuma.db, size: 1234567 bytes
💾 Creating backup of current database...
✅ Database updated successfully
✅ New database verified - 5 monitors found
```

## 🐛 Solución de Problemas

### El script falla al copiar el archivo

**Error**:
```
docker cp: Error: No such container: uptime-kuma
```

**Solución**:
Verifica el nombre del contenedor:
```bash
docker ps | grep uptime
```

Actualiza el nombre en el script:
```bash
KUMA_CONTAINER="nombre-correcto-del-contenedor"
```

### La API rechaza el archivo

**Error**:
```
curl: (52) Empty reply from server
```

**Solución**:
1. Verifica que el Bridge API esté corriendo
2. Revisa los logs del Bridge API en Coolify
3. Verifica que el puerto 3003 esté accesible

### El archivo es demasiado grande

**Error**:
```
Error: File too large
```

**Solución**:
El límite actual es 100MB. Para aumentarlo, modifica en `server.js`:
```javascript
limits: {
  fileSize: 200 * 1024 * 1024 // 200MB
}
```

### Actualización no se refleja en el frontend

**Solución**:
1. Verifica que el frontend esté usando el Bridge API
2. Revisa la variable `BRIDGE_API_URL` en el frontend
3. Limpia el caché del navegador
4. Actualiza la página

## 🔄 Ventajas de Esta Solución

✅ **Casi tiempo real** - Actualización cada 5 minutos
✅ **Sin reconstrucción** - El contenedor no se reinicia
✅ **Backup automático** - Guarda copia del archivo anterior
✅ **Escalable** - Puedes ajustar el intervalo
✅ **Monitoreo completo** - Logs claros de cada actualización

## 📄 Comparación con Otras Soluciones

| Solución | Tiempo Real | Frecuencia | Complejidad |
|-----------|--------------|-------------|--------------|
| Montaje de volumen | ❌ | N/A | Media |
| Copia manual | ❌ | Manual | Baja |
| Actualización dinámica | ✅ | Configurable | Media |
| Cron job + API | ✅ | Automática | Alta |

## 🚀 Siguientes Pasos

1. **Implementar el script** en tu servidor
2. **Ajustar el intervalo** según tus necesidades
3. **Probar manualmente** primero:
   ```bash
   ./update-kuma-bridge.sh
   ```
4. **Configurar como servicio** si funciona correctamente
5. **Monitorear** los logs regularmente

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs del script de actualización
2. Verifica los logs del Bridge API en Coolify
3. Asegúrate de que Uptime Kuma esté corriendo
4. Verifica la conectividad entre el servidor y Coolify
