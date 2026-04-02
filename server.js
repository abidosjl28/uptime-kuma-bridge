console.log('============================================================');
console.log('🚀 UPTIME KUMA BRIDGE API');
console.log('============================================================');
console.log('');
console.log('STEP 1: Importing modules...');
console.log('');

import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

// Simple fetch implementation (Node 22+ has native fetch)
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error.message);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
      } else {
        throw error;
      }
    }
  }
}

console.log('✅ All modules imported successfully');
console.log('');
console.log('STEP 2: Creating Express app...');
console.log('');

const app = express();
const PORT = process.env.PORT || 3003;
const DB_PATH = process.env.DB_PATH || '/app/data/kuma.db';
const UPTIME_KUMA_API = process.env.UPTIME_KUMA_API || 'https://uptime.davisa.store/api';
const UPTIME_KUMA_USERNAME = process.env.UPTIME_KUMA_USERNAME || '';
const UPTIME_KUMA_PASSWORD = process.env.UPTIME_KUMA_PASSWORD || '';

console.log('✅ Express app created');
console.log('');
console.log('Configuration:');
console.log(`  Port: ${PORT}`);
console.log(`  Database: ${DB_PATH}`);
console.log(`  Uptime Kuma API: ${UPTIME_KUMA_API}`);
console.log(`  Node Version: ${process.version}`);
console.log(`  Platform: ${process.platform}`);
console.log(`  Architecture: ${process.arch}`);
console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('');
console.log('STEP 3: Connecting to database...');
console.log('============================================================');

let db;
let isReadOnly = true; // Por defecto readonly

try {
  db = new Database(DB_PATH, { readonly: isReadOnly });
  console.log('✅ Connected to database');
  
  const testResult = db.prepare('SELECT COUNT(*) as count FROM monitor').get();
  console.log(`✅ Database verified - ${testResult.count} monitors found`);
  
} catch (error) {
  console.error('');
  console.error('============================================================');
  console.error('❌ FATAL ERROR: Database connection failed');
  console.error('============================================================');
  console.error('Error message:', error.message);
  console.error('');
  console.error('This usually means:');
  console.error('  1. The volume "uptime-kuma-data" is not mounted at /app/data');
  console.error('  2. The database file does not exist');
  console.error('  3. Incorrect volume name in Coolify configuration');
  console.error('');
  console.error('Troubleshooting:');
  console.error('  - Check volume name matches exactly: "uptime-kuma-data"');
  console.error('  - Verify "Read Only" is checked in Coolify');
  console.error('  - Ensure Uptime Kuma is running');
  console.error('============================================================');
  process.exit(1);
}

console.log('✅ API ready, listening...');
console.log('============================================================');

// Configure multer for file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

app.use(cors());
app.use(express.json());

// Endpoint para actualizar la base de datos dinámicamente
app.post('/api/update-db', upload.single('db'), (req, res) => {
  try {
    console.log('📥 Database update request received');
    
    // Verificar si se envió el archivo
    if (!req.file) {
      return res.status(400).json({ error: 'No database file provided' });
    }
    
    const dbFile = req.file;
    console.log(`📄 Database file received: ${dbFile.originalname}, size: ${dbFile.size} bytes`);
    
    const oldDbPath = `${DB_PATH}.old`;
    const newDbPath = DB_PATH;
    
    // Hacer backup del archivo actual si existe
    if (fs.existsSync(newDbPath)) {
      console.log('💾 Creating backup of current database...');
      fs.renameSync(newDbPath, oldDbPath);
    }
    
    // Escribir el nuevo archivo desde memoria
    fs.writeFileSync(newDbPath, dbFile.buffer);
    console.log('✅ Database updated successfully');
    
    // Reconectar a la nueva base de datos
    db.close();
    db = new Database(newDbPath, { readonly: true });
    
    const testResult = db.prepare('SELECT COUNT(*) as count FROM monitor').get();
    console.log(`✅ New database verified - ${testResult.count} monitors found`);
    
    res.json({ 
      success: true,
      message: 'Database updated successfully',
      monitorsCount: testResult.count,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error updating database:', error.message);
    res.status(500).json({ 
      error: 'Failed to update database',
      message: error.message 
    });
  }
});

// Endpoint para sincronizar automáticamente con Uptime Kuma
app.post('/api/sync', async (req, res) => {
  try {
    console.log('🔄 Sync request received');
    
    // Verificar credenciales
    if (!UPTIME_KUMA_USERNAME || !UPTIME_KUMA_PASSWORD) {
      return res.status(400).json({ 
        error: 'Missing Uptime Kuma credentials',
        message: 'UPTIME_KUMA_USERNAME and UPTIME_KUMA_PASSWORD environment variables are required' 
      });
    }
    
    // Paso 1: Login a Uptime Kuma para obtener token
    console.log('🔐 Logging in to Uptime Kuma...');
    const loginResponse = await fetchWithRetry(`${UPTIME_KUMA_API}/login/access-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: UPTIME_KUMA_USERNAME,
        password: UPTIME_KUMA_PASSWORD,
      }).toString(),
    });
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('❌ Login failed:', errorText);
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Failed to authenticate with Uptime Kuma' 
      });
    }
    
    const loginData = await loginResponse.json();
    const accessToken = loginData.access_token;
    console.log('✅ Login successful, access token obtained');
    
    // Paso 2: Obtener monitores desde Uptime Kuma
    console.log('📊 Fetching monitors from Uptime Kuma...');
    const monitorsResponse = await fetchWithRetry(`${UPTIME_KUMA_API}/monitors`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });
    
    if (!monitorsResponse.ok) {
      const errorText = await monitorsResponse.text();
      console.error('❌ Failed to fetch monitors:', errorText);
      return res.status(500).json({ 
        error: 'Failed to fetch monitors',
        message: errorText 
      });
    }
    
    const monitorsData = await monitorsResponse.json();
    const monitors = monitorsData.monitors || [];
    console.log(`✅ Fetched ${monitors.length} monitors from Uptime Kuma`);
    
    // Paso 3: Obtener heartbeats para cada monitor
    console.log('💓 Fetching heartbeats from Uptime Kuma...');
    
    // Abrir la base de datos en modo write si es readonly
    const wasReadOnly = isReadOnly;
    if (isReadOnly) {
      db.close();
      db = new Database(DB_PATH, { readonly: false });
      isReadOnly = false;
      console.log('🔓 Switched to write mode for sync');
    }
    
    for (const monitor of monitors) {
      try {
        // Obtener heartbeats (limit 100 cada vez)
        const heartbeatsResponse = await fetchWithRetry(
          `${UPTIME_KUMA_API}/monitors/${monitor.id}/heartbeats?limit=100`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json',
            },
          }
        );
        
        if (heartbeatsResponse.ok) {
          const heartbeatsData = await heartbeatsResponse.json();
          const heartbeats = heartbeatsData.heartbeats || [];
          
          // Insertar o actualizar heartbeats en la base de datos local
          if (heartbeats.length > 0) {
            const insertStmt = db.prepare(`
              INSERT OR REPLACE INTO heartbeat (id, monitor_id, status, ping, msg, time, important)
              VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            let insertedCount = 0;
            for (const heartbeat of heartbeats) {
              insertStmt.run(
                heartbeat.id,
                heartbeat.monitor_id,
                heartbeat.status,
                heartbeat.ping || null,
                heartbeat.msg || '',
                new Date(heartbeat.time).toISOString()
              );
              insertedCount++;
            }
            
            console.log(`  ✅ Synced ${insertedCount} heartbeats for monitor "${monitor.name}"`);
          }
        }
        
        // Esperar un poco para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`  ⚠️  Error syncing monitor "${monitor.name}":`, error.message);
      }
    }
    
    console.log('✅ Sync completed');
    
    res.json({
      success: true,
      message: 'Database synchronized with Uptime Kuma',
      syncedMonitors: monitors.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error syncing database:', error.message);
    res.status(500).json({ 
      error: 'Failed to sync database',
      message: error.message 
    });
  }
});

app.get('/', (req, res) => {
  res.json({ 
    service: 'Uptime Kuma Bridge API',
    status: 'running',
    database: DB_PATH,
    endpoints: {
      health: '/health',
      monitors: '/api/monitors',
      monitorDetail: '/api/monitors/:id',
      heartbeats: '/api/monitors/:id/heartbeats',
      heartbeatRange: '/api/monitors/:id/heartbeats/range',
      stats: '/api/stats'
    }
  });
});

app.get('/health', (req, res) => {
  try {
    const testResult = db.prepare('SELECT COUNT(*) as count FROM monitor').get();
    res.json({ 
      status: 'ok', 
      message: 'Uptime Kuma Bridge API is running',
      database: DB_PATH,
      monitorsCount: testResult.count 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
});

app.get('/api/monitors', (req, res) => {
  try {
    const monitors = db.prepare(`
      SELECT 
        id, 
        name, 
        type, 
        url, 
        hostname, 
        port, 
        interval, 
        maxretries, 
        upsideDown,
        active,
        weight,
        notificationIDList,
        retryInterval
      FROM monitor
      ORDER BY id
    `).all();
    
    res.json({ monitors });
  } catch (error) {
    console.error('❌ Error fetching monitors:', error.message);
    res.status(500).json({ error: 'Failed to fetch monitors', message: error.message });
  }
});

app.get('/api/monitors/:id', (req, res) => {
  try {
    const monitorId = parseInt(req.params.id);
    
    const monitor = db.prepare(`
      SELECT 
        id, 
        name, 
        type, 
        url, 
        hostname, 
        port, 
        interval, 
        maxretries, 
        upsideDown,
        active,
        weight,
        notificationIDList,
        retryInterval,
        created_date,
        docker_host,
        docker_container
      FROM monitor
      WHERE id = ?
    `).get(monitorId);
    
    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    
    res.json({ monitor });
  } catch (error) {
    console.error('❌ Error fetching monitor:', error.message);
    res.status(500).json({ error: 'Failed to fetch monitor', message: error.message });
  }
});

app.get('/api/monitors/:id/heartbeats', (req, res) => {
  try {
    const monitorId = parseInt(req.params.id);
    const { limit, startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        id, 
        monitor_id, 
        status, 
        ping, 
        msg, 
        time,
        important
      FROM heartbeat
      WHERE monitor_id = ?
    `;
    
    const params = [monitorId];
    
    if (startDate) {
      query += ' AND time >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND time <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY time DESC';
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }
    
    const heartbeats = db.prepare(query).all(...params);
    
    res.json({ 
      monitorId,
      total: heartbeats.length,
      heartbeats 
    });
  } catch (error) {
    console.error('❌ Error fetching heartbeats:', error.message);
    res.status(500).json({ error: 'Failed to fetch heartbeats', message: error.message });
  }
});

app.get('/api/monitors/:id/heartbeats/range', (req, res) => {
  try {
    const monitorId = parseInt(req.params.id);
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    
    const heartbeats = db.prepare(`
      SELECT 
        id, 
        monitor_id, 
        status, 
        ping, 
        msg, 
        time,
        important
      FROM heartbeat
      WHERE monitor_id = ? 
        AND time >= ? 
        AND time <= ?
      ORDER BY time ASC
    `).all(monitorId, startDate, endDate);
    
    res.json({ 
      monitorId,
      startDate,
      endDate,
      total: heartbeats.length,
      heartbeats 
    });
  } catch (error) {
    console.error('❌ Error fetching heartbeat range:', error.message);
    res.status(500).json({ error: 'Failed to fetch heartbeat range', message: error.message });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as totalHeartbeats,
        COUNT(CASE WHEN status = 1 THEN 1 END) as onlineHeartbeats,
        COUNT(CASE WHEN status = 0 THEN 1 END) as offlineHeartbeats,
        MIN(time) as oldestHeartbeat,
        MAX(time) as newestHeartbeat
      FROM heartbeat
    `).get();
    
    const monitorsCount = db.prepare('SELECT COUNT(*) as count FROM monitor').get();
    
    res.json({ 
      ...stats,
      totalMonitors: monitorsCount.count 
    });
  } catch (error) {
    console.error('❌ Error fetching stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch stats', message: error.message });
  }
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
  console.log('Database: ' + DB_PATH);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /                           - Service information');
  console.log('  GET  /health                     - Health check');
  console.log('  GET  /api/monitors                - List all monitors');
  console.log('  GET  /api/monitors/:id            - Get monitor details');
  console.log('  GET  /api/monitors/:id/heartbeats    - Get monitor heartbeats');
  console.log('  GET  /api/monitors/:id/heartbeats/range - Get heartbeats in date range');
  console.log('  GET  /api/stats                   - Get statistics');
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
