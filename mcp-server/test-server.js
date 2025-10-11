/**
 * Quick test to verify MCP server starts correctly
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPath = path.join(__dirname, 'dist', 'index.js');

console.log('Starting MCP server...');
console.log('Server path:', serverPath);
console.log('');

const child = spawn('node', [serverPath], {
  env: {
    ...process.env,
    JC_DATABASE_PATH: 'C:\\Users\\sava6\\AppData\\Roaming\\justice-companion\\justice-companion.db',
  },
  stdio: ['pipe', 'pipe', 'pipe'],
});

// Capture stderr (where MCP logs go)
child.stderr.on('data', (data) => {
  console.log('[SERVER]', data.toString().trim());
});

// Capture stdout
child.stdout.on('data', (data) => {
  console.log('[STDOUT]', data.toString().trim());
});

child.on('error', (error) => {
  console.error('[ERROR]', error);
});

// Send a test request (list tools)
setTimeout(() => {
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {},
  };

  console.log('\nSending test request:', JSON.stringify(request));
  child.stdin.write(JSON.stringify(request) + '\n');

  // Wait for response
  setTimeout(() => {
    console.log('\nShutting down...');
    child.kill();
    process.exit(0);
  }, 2000);
}, 1000);
