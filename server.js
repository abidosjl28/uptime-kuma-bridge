console.log('============================================================');
console.log('🚀 UPTIME KUMA BRIDGE API');
console.log('============================================================');
console.log('');
console.log('STEP 1: Importing modules...');
console.log('');

import express from 'express';
import cors from 'cors';
import multer from 'multer';

console.log('✅ All modules imported successfully');
console.log('');
console.log('STEP 2: Creating Express app...');
console.log('');

const app = express();
const PORT = process.env.PORT || 3003;
const UPTIME_KUMA_URL = process.env.UPTIME_KUMA_API?.replace('/api', '') || 'https://uptime.davisa.store';
const UPTIME_KUMA_USERNAME = process.env.UPTIME_KUMA_USERNAME || '';
const UPTIME_KUMA_PASSWORD = process.env.UPTIME_KUMA_PASSWORD || '';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos de caché

console.log('✅ Express app created');
console.log('');
console.log('Configuration:');
console.log(`  Port: ${PORT}`);
console.log(`  Uptime Kuma URL: ${UPTIME_KUMA_URL}`);
console.log(`  Node Version: ${process.version}`);
console.log(`  Platform: ${process.platform}`);
console.log(`  Architecture: ${process.arch}`);
console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('');

// Caché en memoria
const cache = {
  metrics: {
    data: null,
    timestamp: 0
  },
  monitors: {
    data: null,
    timestamp: 0
  }
};

// Helper para hacer requests con autenticación
async function fetchWithAuth(url) {
  const headers = {
    'Authorization': 'Basic ' + Buffer.from(`${UPTIME_KUMA_USERNAME}:${UPTIME_KUMA_PASSWORD}`).toString('base64')
  };

  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response;
}

// Parser de métricas de Prometheus/Uptime Kuma
function parseMetrics(metricsText) {
  const lines = metricsText.split('\n');
  const monitors = [];
  const heartbeats = [];
  
  for (const line of lines) {
    // Uptime Kuma metrics format
    if (line.startsWith('monitor_status{')) {
      const match = line.match(/monitor_status\{name="([^"]+)"\} (\d+)/);
      if (match) {
        monitors.push({
          id: monitors.length + 1,
          name: match[1],
          status: parseInt(match[2])
        });
      }
    }
    
    // Parse heartbeat data from metrics
    if (line.startsWith('monitor_up{')) {
      const match = line.match(/monitor_up\{name="([^"]+)"\} (\d+)/);
      if (match) {
        heartbeats.push({
          monitor_name: match[1],
          status: 1,
          time: new Date().toISOString()
        });
      }
    }
    
    if (line.startsWith('monitor_down{')) {
      const match = line.match(/monitor_down\{name="([^"]+)"\} (\d+)/);
      if (match) {
        heartbeats.push({
          monitor_name: match[1],
          status: 0,
          time: new Date().toISOString()
        });
      }
    }
  }
  
  return { monitors, heartbeats };
}

// Obtener métricas desde Uptime Kuma
async function fetchMetrics() {
  const now = Date.now();
  
  if (cache.metrics.data && (now - cache.metrics.timestamp) < CACHE_TTL) {
    console.log('📦 Using cached metrics');
    return cache.metrics.data;
  }

  try {
    console.log('📊 Fetching metrics from Uptime Kuma...');
    const response = await fetchWithAuth(`${UPTIME_KUMA_URL}/metrics`);
    const metricsText = await response.text();
    
    const parsed = parseMetrics(metricsText);
    
    // Transformar a formato de monitores
    const monitors = parsed.monitors.map(m => ({
      id: m.id,
      name: m.name,
      status: m.status,
      type: 'http',
      active: 1,
      interval: 60
    }));
    
    const heartbeatsByMonitor = {};
    parsed.heartbeats.forEach(h => {
      if (!heartbeatsByMonitor[h.monitor_name]) {
        heartbeatsByMonitor[h.monitor_name] = [];
      }
      heartbeatsByMonitor[h.monitor_name].push(h);
    });
    
    cache.monitors.data = monitors;
    cache.monitors.timestamp = now;
    cache.metrics.data = { monitors, heartbeats: heartbeatsByMonitor };
    cache.metrics.timestamp = now;
    
    console.log(`✅ Parsed ${monitors.length} monitors from metrics`);
    return cache.metrics.data;
  } catch (error) {
    console.error('❌ Error fetching metrics:', error.message);
    throw error;
  }
}

// Middleware for auth check
function checkAuth(req, res, next) {
  if (!UPTIME_KUMA_USERNAME || !UPTIME_KUMA_PASSWORD) {
    return res.status(500).json({ 
      error: 'Server not configured',
      message: 'UPTIME_KUMA_USERNAME and UPTIME_KUMA_PASSWORD environment variables are required' 
    });
  }
  next();
}

app.use(cors());
app.use(express.json());

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

app.get('/', (req, res) => {
  res.json({ 
    service: 'Uptime Kuma Bridge API',
    status: 'running',
    mode: 'metrics-api',
    uptimeKumaUrl: UPTIME_KUMA_URL,
    endpoints: {
      health: '/health',
      monitors: '/api/monitors',
      monitorDetail: '/api/monitors/:id',
      heartbeats: '/api/monitors/:id/heartbeats',
      stats: '/api/stats',
      clearCache: '/api/cache/clear'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Uptime Kuma Bridge API is running',
    mode: 'metrics-api',
    uptimeKumaUrl: UPTIME_KUMA_URL,
    cache: {
      monitors: cache.monitors.data ? 'loaded' : 'empty',
      metrics: cache.metrics.data ? 'loaded' : 'empty'
    }
  });
});

app.get('/api/monitors', checkAuth, async (req, res) => {
  try {
    const data = await fetchMetrics();
    res.json({ monitors: data.monitors });
  } catch (error) {
    console.error('❌ Error fetching monitors:', error.message);
    res.status(500).json({ error: 'Failed to fetch monitors', message: error.message });
  }
});

app.get('/api/monitors/:id', checkAuth, async (req, res) => {
  try {
    const data = await fetchMetrics();
    const monitorId = parseInt(req.params.id);
    const monitor = data.monitors.find(m => m.id === monitorId);
    
    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    
    res.json({ monitor });
  } catch (error) {
    console.error('❌ Error fetching monitor:', error.message);
    res.status(500).json({ error: 'Failed to fetch monitor', message: error.message });
  }
});

app.get('/api/monitors/:id/heartbeats', checkAuth, async (req, res) => {
  try {
    const data = await fetchMetrics();
    const monitorId = parseInt(req.params.id);
    const monitor = data.monitors.find(m => m.id === monitorId);
    
    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    
    const heartbeats = data.heartbeats[monitor.name] || [];
    const { limit } = req.query;
    
    let result = heartbeats;
    if (limit) {
      result = heartbeats.slice(0, parseInt(limit));
    }
    
    res.json({ 
      monitorId,
      monitorName: monitor.name,
      total: result.length,
      heartbeats: result 
    });
  } catch (error) {
    console.error('❌ Error fetching heartbeats:', error.message);
    res.status(500).json({ error: 'Failed to fetch heartbeats', message: error.message });
  }
});

app.get('/api/stats', checkAuth, async (req, res) => {
  try {
    const data = await fetchMetrics();
    
    const totalMonitors = data.monitors.length;
    const onlineMonitors = data.monitors.filter(m => m.status === 1).length;
    const offlineMonitors = totalMonitors - onlineMonitors;
    
    const totalHeartbeats = Object.values(data.heartbeats).flat().length;
    
    res.json({ 
      totalMonitors,
      onlineMonitors,
      offlineMonitors,
      totalHeartbeats,
      uptimeKumaUrl: UPTIME_KUMA_URL
    });
  } catch (error) {
    console.error('❌ Error fetching stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch stats', message: error.message });
  }
});

app.post('/api/cache/clear', (req, res) => {
  cache.monitors.data = null;
  cache.monitors.timestamp = 0;
  cache.metrics.data = null;
  cache.metrics.timestamp = 0;
  console.log('🧹 Cache cleared');
  res.json({ success: true, message: 'Cache cleared' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error', message: error.message });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('============================================================');
  console.log('✅ SERVER STARTED SUCCESSFULLY');
  console.log('============================================================');
  console.log('');
  console.log('Listening on: http://0.0.0.0:' + PORT);
  console.log('Uptime Kuma URL: ' + UPTIME_KUMA_URL);
  console.log('Mode: Metrics API (no database or external volume required)');
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /                           - Service information');
  console.log('  GET  /health                     - Health check');
  console.log('  GET  /api/monitors                - List all monitors');
  console.log('  GET  /api/monitors/:id            - Get monitor details');
  console.log('  GET  /api/monitors/:id/heartbeats    - Get monitor heartbeats');
  console.log('  GET  /api/stats                   - Get statistics');
  console.log('  POST /api/cache/clear            - Clear cache');
  console.log('============================================================');
  console.log('');
});

server.on('error', (error) => {
  console.error('');
  console.error('============================================================');
  console.error('❌ FATAL: Server failed to start');
  console.error('============================================================');
  console.error('Error:', error.message);
  if (error.code === 'EADDRINUSE') {
    console.error('Port', PORT, 'is already in use');
  }
  console.error('============================================================');
  console.error('');
  process.exit(1);
});
