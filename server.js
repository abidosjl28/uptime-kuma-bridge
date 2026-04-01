import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3003;
const DB_PATH = process.env.DB_PATH || '/app/data/kuma.db';

app.use(cors());
app.use(express.json());

console.log('='.repeat(60));
console.log('🚀 UPTIME KUMA BRIDGE API');
console.log('='.repeat(60));
console.log('');
console.log('Configuration:');
console.log(`  Port: ${PORT}`);
console.log(`  Database: ${DB_PATH}`);
console.log(`  Node Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('');
console.log('Starting database connection...');
console.log('='.repeat(60));

let db;

try {
  db = new Database(DB_PATH, { readonly: true });
  console.log('✅ Connected to database');
  
  const testResult = db.prepare('SELECT COUNT(*) as count FROM monitor').get();
  console.log(`✅ Database verified - ${testResult.count} monitors found`);
  
} catch (error) {
  console.error('');
  console.error('❌ FATAL ERROR: Database connection failed');
  console.error('='.repeat(60));
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
  console.error('='.repeat(60));
  process.exit(1);
}

console.log('✅ API ready, listening...');
console.log('='.repeat(60));

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

const server = app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('✅ SERVER STARTED SUCCESSFULLY');
  console.log(`Listening on: http://0.0.0.0:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /                           - Service information');
  console.log('  GET  /health                     - Health check');
  console.log('  GET  /api/monitors                - List all monitors');
  console.log('  GET  /api/monitors/:id            - Get monitor details');
  console.log('  GET  /api/monitors/:id/heartbeats    - Get monitor heartbeats');
  console.log('  GET  /api/monitors/:id/heartbeats/range - Get heartbeats in date range');
  console.log('  GET  /api/stats                   - Get statistics');
  console.log('='.repeat(60));
  console.log('');
});

server.on('error', (error) => {
  console.error('');
  console.error('❌ FATAL: Server failed to start');
  console.error('='.repeat(60));
  console.error('Error:', error.message);
  if (error.code === 'EADDRINUSE') {
    console.error('Port', PORT, 'is already in use');
  }
  process.exit(1);
});
