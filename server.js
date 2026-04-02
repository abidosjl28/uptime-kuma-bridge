console.log('============================================================');
console.log('🚀 UPTIME KUMA BRIDGE API');
console.log('============================================================');
console.log('');
console.log('STEP 1: Importing modules...');
console.log('');

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import Database from 'better-sqlite3';

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
let isReadOnly = true;

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
  console.error('  3. Volume name does not match');
  console.error('');
  console.error('Troubleshooting:');
  console.error('  - Check volume name matches exactly: "uptime-kuma-data"');
  console.error('  - Verify volume is mounted in read-only mode (:ro)');
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

app.get('/', (req, res) => {
  res.json({ 
    service: 'Uptime Kuma Bridge API',
    status: 'running',
    database: DB_PATH,
    mode: 'sqlite-readonly',
    uptimeKumaApi: UPTIME_KUMA_API,
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
  console.log('Mode: SQLite Read-Only (accessing Uptime Kuma database directly)');
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

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  if (db) {
    db.close();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  if (db) {
    db.close();
  }
  process.exit(0);
});
