console.log('============================================================');
console.log('🚀 UPTIME KUMA BRIDGE API - FILESYSTEM DIAGNOSTIC');
console.log('============================================================');
console.log('');
console.log('STEP 1: Importing modules...');
console.log('');

import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import { readdirSync, existsSync, statSync } from 'fs';

console.log('✅ All modules imported successfully');
console.log('');
console.log('STEP 2: Checking filesystem...');
console.log('============================================================');

const app = express();
const PORT = process.env.PORT || 3003;
const DB_PATH = process.env.DB_PATH || '/app/data/kuma.db';

console.log('Target database path:', DB_PATH);
console.log('');

// Check /app directory
console.log('Checking /app directory:');
try {
  const appContents = readdirSync('/app', { withFileTypes: true });
  console.log('  /app exists: ✅');
  console.log('  Contents:');
  appContents.forEach(item => {
    const type = item.isDirectory() ? '[DIR]' : '[FILE]';
    try {
      const stats = statSync(`/app/${item.name}`);
      console.log(`    ${type} ${item.name} (size: ${stats.size} bytes)`);
    } catch (err) {
      console.log(`    ${type} ${item.name} (error reading stats)`);
    }
  });
} catch (error) {
  console.log('  /app exists: ❌');
  console.log('  Error:', error.message);
}

console.log('');

// Check /app/data directory
console.log('Checking /app/data directory:');
if (existsSync('/app/data')) {
  console.log('  /app/data exists: ✅');
  try {
    const dataContents = readdirSync('/app/data', { withFileTypes: true });
    console.log('  Contents:');
    if (dataContents.length === 0) {
      console.log('    (empty directory)');
    } else {
      dataContents.forEach(item => {
        const type = item.isDirectory() ? '[DIR]' : '[FILE]';
        try {
          const stats = statSync(`/app/data/${item.name}`);
          console.log(`    ${type} ${item.name} (size: ${stats.size} bytes)`);
        } catch (err) {
          console.log(`    ${type} ${item.name} (error reading stats)`);
        }
      });
    }
  } catch (error) {
    console.log('  Error reading contents:', error.message);
  }
} else {
  console.log('  /app/data exists: ❌');
}

console.log('');

// Check if database file exists
console.log('Checking database file:');
if (existsSync(DB_PATH)) {
  console.log(`  ${DB_PATH} exists: ✅`);
  try {
    const stats = statSync(DB_PATH);
    console.log(`  Size: ${stats.size} bytes`);
    console.log(`  Last modified: ${stats.mtime}`);
  } catch (err) {
    console.log('  Error reading stats:', err.message);
  }
} else {
  console.log(`  ${DB_PATH} exists: ❌`);
}

console.log('');
console.log('============================================================');
console.log('STEP 3: Starting Express app (without database)...');
console.log('============================================================');

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  const filesystemInfo = {
    appExists: existsSync('/app'),
    dataDirExists: existsSync('/app/data'),
    databaseExists: existsSync(DB_PATH),
    dbPath: DB_PATH,
    port: PORT,
    nodeVersion: process.version,
    platform: process.platform
  };

  try {
    const appContents = existsSync('/app') ? readdirSync('/app') : [];
    const dataContents = existsSync('/app/data') ? readdirSync('/app/data') : [];
    
    filesystemInfo.appContents = appContents;
    filesystemInfo.dataContents = dataContents;
  } catch (error) {
    filesystemInfo.error = error.message;
  }

  res.json({ 
    service: 'Uptime Kuma Bridge API - Filesystem Diagnostic',
    status: 'running',
    message: 'Checking filesystem to diagnose volume mounting issue',
    filesystem: filesystemInfo
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Uptime Kuma Bridge API is running (filesystem diagnostic mode)' 
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('============================================================');
  console.log('✅ SERVER STARTED SUCCESSFULLY');
  console.log('============================================================');
  console.log('');
  console.log('Listening on: http://0.0.0.0:' + PORT);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /         - Filesystem diagnostic information');
  console.log('  GET  /health   - Health check');
  console.log('');
  console.log('NOTE: This is a diagnostic version.');
  console.log('Access http://localhost:' + PORT + '/ to see filesystem info.');
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
