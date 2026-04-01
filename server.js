console.log('============================================================');
console.log('🚀 UPTIME KUMA BRIDGE API - DIAGNOSTIC VERSION');
console.log('============================================================');
console.log('');
console.log('STEP 1: Importing modules...');
console.log('');

import express from 'express';
import cors from 'cors';

console.log('✅ Express and CORS imported successfully');
console.log('');
console.log('STEP 2: Creating Express app...');
console.log('');

const app = express();
const PORT = process.env.PORT || 3003;

console.log('✅ Express app created');
console.log('');
console.log('STEP 3: Configuring middleware...');
console.log('');

app.use(cors());
app.use(express.json());

console.log('✅ Middleware configured');
console.log('');
console.log('Configuration:');
console.log(`  Port: ${PORT}`);
console.log(`  Node Version: ${process.version}`);
console.log(`  Platform: ${process.platform}`);
console.log(`  Architecture: ${process.arch}`);
console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('');
console.log('STEP 4: Defining routes...');
console.log('');

app.get('/', (req, res) => {
  res.json({ 
    service: 'Uptime Kuma Bridge API - Diagnostic Version',
    status: 'running',
    message: 'This version does not connect to the database',
    nodeVersion: process.version,
    platform: process.platform,
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Uptime Kuma Bridge API is running (diagnostic mode - no database)' 
  });
});

console.log('✅ Routes defined');
console.log('');
console.log('STEP 5: Starting server...');
console.log('');

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('============================================================');
  console.log('✅ SERVER STARTED SUCCESSFULLY');
  console.log('============================================================');
  console.log('');
  console.log('Listening on: http://0.0.0.0:' + PORT);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /         - Service information');
  console.log('  GET  /health   - Health check');
  console.log('');
  console.log('NOTE: This is a diagnostic version without database.');
  console.log('If you see this message, the basic Express setup works.');
  console.log('The issue is likely with better-sqlite3 module.');
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
