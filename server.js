import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3003;

const DB_PATH = process.env.DB_PATH || '/app/data/kuma.db';

app.use(cors());
app.use(express.json());

let db;

try {
  db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  console.log('✓ Connected to Uptime Kuma database:', DB_PATH);
  
  db.pragma('journal_mode = WAL');
} catch (error) {
  console.error('✗ Failed to connect to database:', error.message);
  process.exit(1);
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Uptime Kuma Bridge API is running' });
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
    console.error('Error fetching monitors:', error);
    res.status(500).json({ error: 'Failed to fetch monitors' });
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
    console.error('Error fetching monitor:', error);
    res.status(500).json({ error: 'Failed to fetch monitor' });
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
    console.error('Error fetching heartbeats:', error);
    res.status(500).json({ error: 'Failed to fetch heartbeats' });
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
    console.error('Error fetching heartbeat range:', error);
    res.status(500).json({ error: 'Failed to fetch heartbeat range' });
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
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✓ Uptime Kuma Bridge API running on port ${PORT}`);
  console.log(`✓ Database path: ${DB_PATH}`);
  console.log(`✓ Endpoints available:`);
  console.log(`  - GET /health`);
  console.log(`  - GET /api/monitors`);
  console.log(`  - GET /api/monitors/:id`);
  console.log(`  - GET /api/monitors/:id/heartbeats`);
  console.log(`  - GET /api/monitors/:id/heartbeats/range`);
  console.log(`  - GET /api/stats`);
});
