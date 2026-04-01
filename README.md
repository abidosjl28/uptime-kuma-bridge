# Uptime Kuma Bridge API

Servicio intermediario para exponer acceso completo a los datos históricos de Uptime Kuma.

## Descripción

Este servicio se conecta directamente a la base de datos SQLite de Uptime Kuma y expone una REST API sin las limitaciones de 100 heartbeats del API público.

## Instalación

### 1. Crear el volumen Docker si no existe

```bash
docker volume create uptime-kuma-data
```

### 2. Construir y ejecutar el servicio

```bash
cd uptime-kuma-bridge
docker-compose up -d
```

### 3. Verificar que esté funcionando

```bash
curl http://localhost:3003/health
```

## Endpoints Disponibles

### GET /health
Verifica que el servicio esté funcionando.

**Respuesta:**
```json
{
  "status": "ok",
  "message": "Uptime Kuma Bridge API is running"
}
```

### GET /api/monitors
Obtiene la lista de todos los monitores.

**Respuesta:**
```json
{
  "monitors": [
    {
      "id": 1,
      "name": "Mi Monitor",
      "type": "http",
      "url": "https://example.com",
      "hostname": null,
      "port": null,
      "interval": 60,
      "maxretries": 1,
      "upsideDown": 0,
      "active": true,
      "weight": 1,
      "notificationIDList": [],
      "retryInterval": 60
    }
  ]
}
```

### GET /api/monitors/:id
Obtiene detalles de un monitor específico.

**Parámetros:**
- `id` (path): ID del monitor

**Respuesta:**
```json
{
  "monitor": {
    "id": 1,
    "name": "Mi Monitor",
    ...
  }
}
```

### GET /api/monitors/:id/heartbeats
Obtiene todos los heartbeats de un monitor (SIN LÍMITE DE 100).

**Parámetros:**
- `id` (path): ID del monitor
- `limit` (query): Opcional - número máximo de heartbeats a retornar
- `startDate` (query): Opcional - fecha de inicio (formato ISO 8601)
- `endDate` (query): Opcional - fecha de fin (formato ISO 8601)

**Ejemplo:**
```
GET /api/monitors/1/heartbeats?startDate=2026-04-01T00:00:00Z&endDate=2026-04-30T23:59:59Z
```

**Respuesta:**
```json
{
  "monitorId": 1,
  "total": 1500,
  "heartbeats": [
    {
      "id": 1,
      "monitor_id": 1,
      "status": 1,
      "ping": 45,
      "msg": "OK",
      "time": "2026-04-01T12:00:00.000Z",
      "important": 0
    }
  ]
}
```

### GET /api/monitors/:id/heartbeats/range
Obtiene heartbeats en un rango de fechas específico.

**Parámetros:**
- `id` (path): ID del monitor
- `startDate` (query, REQUERIDO): Fecha de inicio (formato ISO 8601)
- `endDate` (query, REQUERIDO): Fecha de fin (formato ISO 8601)

**Ejemplo:**
```
GET /api/monitors/1/heartbeats/range?startDate=2026-04-01T00:00:00Z&endDate=2026-04-30T23:59:59Z
```

**Respuesta:**
```json
{
  "monitorId": 1,
  "startDate": "2026-04-01T00:00:00Z",
  "endDate": "2026-04-30T23:59:59Z",
  "total": 1500,
  "heartbeats": [...]
}
```

### GET /api/stats
Obtiene estadísticas generales de la base de datos.

**Respuesta:**
```json
{
  "totalHeartbeats": 50000,
  "onlineHeartbeats": 48000,
  "offlineHeartbeats": 2000,
  "oldestHeartbeat": "2026-03-01T00:00:00Z",
  "newestHeartbeat": "2026-04-01T12:00:00Z",
  "totalMonitors": 7
}
```

## Configuración

### Variables de Entorno

- `PORT`: Puerto del servicio (default: 3003)
- `DB_PATH`: Ruta al archivo kuma.db (default: /app/data/kuma.db)
- `NODE_ENV`: Entorno (default: production)

## Ventajas vs API Público

1. **Sin límite de 100 heartbeats**: Acceso completo a todos los datos históricos
2. **Rangos de fechas**: Filtrado por fechas específicas
3. **Mayor rendimiento**: Consultas directas a SQLite sin límites de API
4. **Estadísticas completas**: Acceso a todos los datos agregados

## Uso en el Proyecto Principal

Actualizar el archivo `api/services/uptimeKumaService.ts` para usar:

```typescript
const BRIDGE_API_URL = 'http://localhost:3003';
```

En lugar del API público limitado de Uptime Kuma.
