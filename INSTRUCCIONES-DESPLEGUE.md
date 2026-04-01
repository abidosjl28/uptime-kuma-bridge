# Instrucciones para Desplegar Uptime Kuma Bridge API

## Resumen

Este servicio proporciona acceso completo a los datos históricos de Uptime Kuma sin el límite de 100 heartbeats del API público.

## ¿Qué hace este servicio?

El **Uptime Kuma Bridge API** es un servicio intermediario que:
- Se conecta directamente a la base de datos SQLite de Uptime Kuma
- Expone una REST API sin limitaciones
- Permite acceder a TODOS los heartbeats históricos
- Filtra por rangos de fechas específicos

## Pasos para Desplegar

### 1. Subir archivos al servidor

Sube la carpeta `uptime-kuma-bridge` completa al servidor donde corre Uptime Kuma:

```bash
# Usar SCP, FTP, o tu método preferido
scp -r uptime-kuma-bridge usuario@servidor:/ruta/donde/esta/uptime-kuma/
```

### 2. Navegar a la carpeta

```bash
cd /ruta/donde/esta/uptime-kuma/uptime-kuma-bridge
```

### 3. Verificar que el volumen existe

El servicio necesita acceso al volumen `uptime-kuma-data` donde está la base de datos:

```bash
docker volume ls | grep uptime-kuma-data
```

Si no existe, verifica el nombre del volumen en tu docker-compose original de Uptime Kuma y actualiza el archivo `docker-compose.yml` del Bridge.

### 4. Iniciar el servicio

```bash
docker-compose up -d
```

### 5. Verificar que esté funcionando

```bash
# Ver logs
docker-compose logs -f

# En otra terminal, probar el endpoint
curl http://localhost:3003/health
```

Deberías ver:
```json
{
  "status": "ok",
  "message": "Uptime Kuma Bridge API is running"
}
```

### 6. Probar obtener monitores

```bash
curl http://localhost:3003/api/monitors
```

### 7. Probar obtener heartbeats históricos completos

```bash
curl "http://localhost:3003/api/monitors/1/heartbeats?limit=1000"
```

### 8. Probar rango de fechas

```bash
curl "http://localhost:3003/api/monitors/1/heartbeats/range?startDate=2026-04-01T00:00:00Z&endDate=2026-04-30T23:59:59Z"
```

## Configuración del Firewall

Asegúrate de que el puerto 3003 esté abierto en el firewall del servidor:

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 3003

# firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=3003/tcp
sudo firewall-cmd --reload
```

## Actualizar el Proyecto Principal

Una vez que el servicio Bridge esté funcionando, actualiza el archivo `.env` en tu proyecto:

```env
BRIDGE_API_URL=http://TU_SERVIDOR_IP:3003
```

Por ejemplo:
```env
BRIDGE_API_URL=http://192.168.1.100:3003
# o
BRIDGE_API_URL=https://uptime.davisa.store:3003
```

## Verificación

1. **Verificar que el servicio está corriendo:**
   ```bash
   docker ps | grep uptime-kuma-bridge
   ```

2. **Verificar logs:**
   ```bash
   docker-compose logs uptime-kuma-bridge
   ```

3. **Verificar conectividad desde tu máquina local:**
   ```bash
   curl http://TU_SERVIDOR_IP:3003/health
   ```

## Solución de Problemas

### Problema: "Failed to connect to database"

**Causa:** El volumen `uptime-kuma-data` no existe o el nombre es diferente.

**Solución:**
1. Verifica el nombre del volumen en el docker-compose de Uptime Kuma original
2. Actualiza el archivo `docker-compose.yml` del Bridge con el nombre correcto

### Problema: "Permission denied" al acceder a la DB

**Causa:** Permisos de archivos en el volumen.

**Solución:** El Bridge usa modo `readonly:ro` que debería funcionar sin problemas. Si persiste, verifica que Uptime Kuma esté corriendo y tenga la base de datos creada.

### Problema: Puerto 3003 no accesible desde fuera

**Causa:** Firewall bloqueando el puerto.

**Solución:** Abre el puerto 3003 en el firewall (ver sección "Configuración del Firewall" arriba).

### Problema: No se puede conectar desde tu proyecto local

**Causa:** URL incorrecta en `.env` o firewall.

**Solución:**
1. Verifica que puedes hacer ping al servidor desde tu máquina
2. Verifica que el puerto 3003 está abierto
3. Verifica la URL en `.env` sea la IP pública o dominio correcto

## Ventajas vs API Público

| Característica | API Público | Bridge API |
|---------------|-------------|-------------|
| Límite de heartbeats | ❌ Solo últimos 100 | ✅ Sin límite |
| Filtrado por fechas | ❌ No disponible | ✅ Sí disponible |
| Datos históricos completos | ❌ No | ✅ Sí |
| Rendimiento | Limitado | Óptimo (SQLite directo) |

## Monitoreo

Para monitorear el servicio Bridge:

```bash
# Ver logs en tiempo real
docker-compose logs -f uptime-kuma-bridge

# Ver uso de recursos
docker stats uptime-kuma-bridge
```

## Seguridad

El servicio Bridge está diseñado para ser seguro:
- Usa conexión readonly a la base de datos
- No expone credenciales de Uptime Kuma
- Solo permite operaciones GET (lectura)
- No modifica la base de datos

Sin embargo, si deseas más seguridad:
1. Configura un reverse proxy (nginx) con HTTPS
2. Agrega autenticación básica en el Bridge
3. Limita el acceso por IP usando reglas del firewall

## Próximos Pasos

Una vez que el servicio Bridge esté funcionando:
1. Genera un reporte mensual en tu aplicación
2. Verifica que obtienes más de 100 heartbeats
3. Confirma que los datos cubren el rango de fechas completo
4. Disfruta de los reportes con datos históricos completos 🎉
