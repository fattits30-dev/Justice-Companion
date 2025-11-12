#!/usr/bin/env node

/**
 * Development server starter with port management
 * Ensures port availability before starting Vite
 */

const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const fs = require('fs');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Load port configuration
function loadPortConfig() {
  try {
    const configPath = path.join(__dirname, '..', 'config', 'ports.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const devConfig = config.development?.services?.find(
        s => s.service === 'vite-dev-server'
      );
      return devConfig || null;
    }
  } catch (error) {
    console.warn('Could not load port configuration:', error);
  }
  return null;
}

// Check if a port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port, '127.0.0.1');
  });
}

// Find an available port in range
async function findAvailablePort(startPort, endPort) {
  for (let port = startPort; port <= endPort; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  return null;
}

// Kill process using a specific port (Windows)
function killPortProcess(port) {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');

    // First, find the PID
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      if (error) {
        resolve(false);
        return;
      }

      const lines = stdout.trim().split('\n');
      let pid = null;

      for (const line of lines) {
        const match = line.match(/LISTENING\s+(\d+)/);
        if (match) {
          pid = match[1];
          break;
        }
      }

      if (!pid) {
        resolve(false);
        return;
      }

      // Kill the process
      exec(`taskkill /F /PID ${pid}`, (error) => {
        if (error) {
          console.error(`Failed to kill process ${pid}:`, error);
          resolve(false);
        } else {
          console.log(`${colors.green}✓${colors.reset} Killed process ${pid} using port ${port}`);
          resolve(true);
        }
      });
    });
  });
}

// Main function
async function main() {
  console.log(`${colors.cyan}${colors.bright}Justice Companion Dev Server${colors.reset}`);
  console.log(`${colors.cyan}════════════════════════════${colors.reset}\n`);

  const portConfig = loadPortConfig();
  const defaultPort = portConfig?.defaultPort || 5176;
  const portRange = portConfig?.range || [5173, 5180];

  // Check if default port is available
  console.log(`Checking port ${defaultPort}...`);

  let port = defaultPort;
  let portAvailable = await isPortAvailable(defaultPort);

  if (!portAvailable) {
    console.log(`${colors.yellow}⚠${colors.reset} Port ${defaultPort} is in use`);

    // Ask user what to do
    console.log('\nOptions:');
    console.log('1. Kill the process using port', defaultPort);
    console.log('2. Find an alternative port');
    console.log('3. Exit');

    // For now, we'll automatically try to find an alternative
    console.log(`\nSearching for available port in range ${portRange[0]}-${portRange[1]}...`);

    const alternativePort = await findAvailablePort(portRange[0], portRange[1]);

    if (alternativePort) {
      port = alternativePort;
      console.log(`${colors.green}✓${colors.reset} Found available port: ${port}`);
    } else {
      console.error(`${colors.red}✗${colors.reset} No available ports in range ${portRange[0]}-${portRange[1]}`);

      // Try to kill the process on the default port
      console.log(`\nAttempting to free port ${defaultPort}...`);
      const killed = await killPortProcess(defaultPort);

      if (killed) {
        // Wait a moment for the port to be freed
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (await isPortAvailable(defaultPort)) {
          port = defaultPort;
          console.log(`${colors.green}✓${colors.reset} Port ${defaultPort} is now available`);
        } else {
          console.error(`${colors.red}✗${colors.reset} Failed to free port ${defaultPort}`);
          process.exit(1);
        }
      } else {
        console.error(`${colors.red}✗${colors.reset} Could not free port ${defaultPort}`);
        process.exit(1);
      }
    }
  } else {
    console.log(`${colors.green}✓${colors.reset} Port ${port} is available`);
  }

  // Set environment variable
  process.env.VITE_DEV_SERVER_PORT = port.toString();

  // Start Vite
  console.log(`\n${colors.bright}Starting Vite dev server on port ${port}...${colors.reset}\n`);

  const vite = spawn('pnpm', ['vite', '--port', port.toString()], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      VITE_DEV_SERVER_PORT: port.toString()
    }
  });

  vite.on('error', (error) => {
    console.error(`${colors.red}Failed to start Vite:${colors.reset}`, error);
    process.exit(1);
  });

  vite.on('exit', (code) => {
    if (code !== 0) {
      console.error(`${colors.red}Vite exited with code ${code}${colors.reset}`);
    }
    process.exit(code);
  });

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log(`\n${colors.yellow}Stopping dev server...${colors.reset}`);
    vite.kill('SIGTERM');
    process.exit(0);
  });
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Error:${colors.reset}`, error);
  process.exit(1);
});