#!/usr/bin/env node

/**
 * Full stack starter for Justice Companion
 * Handles Vite dev server and Electron app with proper port management
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
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

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

// Wait for a port to be in use (server started)
function waitForPort(port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > timeout) {
        reject(new Error(`Timeout waiting for port ${port}`));
        return;
      }

      const socket = net.createConnection({ port, host: 'localhost' }, () => {
        socket.end();
        resolve(true);
      });

      socket.on('error', () => {
        setTimeout(check, 500);
      });
    };

    check();
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
  return new Promise((resolve) => {
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
  console.log(`${colors.cyan}${colors.bright}╔═══════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}║    Justice Companion Full Stack      ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}╚═══════════════════════════════════════╝${colors.reset}\n`);

  // Check for port configuration
  const defaultPort = 5176;
  const portRange = [5173, 5180];

  // Step 1: Find available port for Vite
  console.log(`${colors.blue}[1/4]${colors.reset} Checking port availability...`);

  let requestedPort = defaultPort;
  let portAvailable = await isPortAvailable(defaultPort);

  if (!portAvailable) {
    console.log(`${colors.yellow}⚠${colors.reset} Port ${defaultPort} is in use`);
    console.log(`Searching for available port in range ${portRange[0]}-${portRange[1]}...`);

    const alternativePort = await findAvailablePort(portRange[0], portRange[1]);

    if (alternativePort) {
      requestedPort = alternativePort;
      console.log(`${colors.green}✓${colors.reset} Found available port: ${requestedPort}`);
    } else {
      console.log(`${colors.yellow}⚠${colors.reset} No available ports, attempting to free port ${defaultPort}...`);

      const killed = await killPortProcess(defaultPort);
      if (killed) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (await isPortAvailable(defaultPort)) {
          requestedPort = defaultPort;
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
    console.log(`${colors.green}✓${colors.reset} Port ${requestedPort} is available`);
  }

  // Set environment variables
  process.env.NODE_ENV = 'development';

  // Step 2: Start Vite dev server
  console.log(`\n${colors.blue}[2/4]${colors.reset} Starting Vite dev server...`);

  // Start Vite without specifying port - let it find its own
  const vite = spawn('npx', ['vite', '--host'], {
    stdio: 'pipe',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });

  let viteReady = false;
  let actualVitePort = null;

  vite.stdout.on('data', (data) => {
    const output = data.toString();

    // Parse Vite output to find the actual port it's using
    if (!actualVitePort) {
      // Strip ANSI color codes from output first
      const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');

      // Try different regex patterns to match Vite's output
      const patterns = [
        /Local:\s+http:\/\/localhost:(\d+)/,     // Matches "Local:   http://localhost:5178/"
        /http:\/\/localhost:(\d+)/,              // Matches "http://localhost:5178/"
        /localhost:(\d+)/,                       // Matches "localhost:5178"
        /:(\d{4,5})\//,                         // Matches port number followed by /
        /Local[^:]*:\s*[^:]+:(\d+)/            // More flexible pattern for Local line
      ];

      for (const pattern of patterns) {
        const portMatch = cleanOutput.match(pattern);
        if (portMatch) {
          actualVitePort = parseInt(portMatch[1], 10);
          viteReady = true;
          console.log(`${colors.green}✓${colors.reset} Vite dev server is ready on port ${actualVitePort}`);

          // Update environment variable with actual port
          process.env.VITE_DEV_SERVER_PORT = actualVitePort.toString();
          break;
        }
      }
    }

    if (!viteReady && output.includes('ready in')) {
      viteReady = true;
    }

    // Print Vite output with prefix
    const lines = output.trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${colors.cyan}[Vite]${colors.reset} ${line}`);
      }
    });
  });

  vite.stderr.on('data', (data) => {
    console.error(`${colors.red}[Vite Error]${colors.reset}`, data.toString());
  });

  vite.on('error', (error) => {
    console.error(`${colors.red}Failed to start Vite:${colors.reset}`, error);
    process.exit(1);
  });

  // Step 3: Wait for Vite to be ready and get the actual port
  console.log(`\n${colors.blue}[3/4]${colors.reset} Waiting for Vite to be ready...`);

  // Wait for Vite to output its port
  let attempts = 0;
  while (!actualVitePort && attempts < 60) {
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
  }

  if (!actualVitePort) {
    console.error(`${colors.red}✗${colors.reset} Could not determine Vite port`);
    vite.kill('SIGTERM');
    process.exit(1);
  }

  try {
    await waitForPort(actualVitePort, 30000);
    console.log(`${colors.green}✓${colors.reset} Vite is accepting connections on port ${actualVitePort}`);
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Vite failed to start:`, error.message);
    vite.kill('SIGTERM');
    process.exit(1);
  }

  // Wait a bit more for Vite to fully initialize
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 4: Start Electron with the actual Vite port
  console.log(`\n${colors.blue}[4/4]${colors.reset} Starting Electron app with port ${actualVitePort}...`);

  const electron = spawn('npx', ['electron', '.'], {
    stdio: 'pipe',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      VITE_DEV_SERVER_PORT: actualVitePort.toString()
    }
  });

  electron.stdout.on('data', (data) => {
    const output = data.toString();
    const lines = output.trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${colors.magenta}[Electron]${colors.reset} ${line}`);
      }
    });
  });

  electron.stderr.on('data', (data) => {
    const output = data.toString();
    // Filter out common Electron warnings that aren't critical
    if (!output.includes('Passthrough is not supported') &&
        !output.includes('Extension server error') &&
        !output.includes('DevTools listening')) {
      console.error(`${colors.red}[Electron Error]${colors.reset}`, output);
    }
  });

  electron.on('error', (error) => {
    console.error(`${colors.red}Failed to start Electron:${colors.reset}`, error);
    vite.kill('SIGTERM');
    process.exit(1);
  });

  electron.on('exit', (code) => {
    console.log(`\n${colors.yellow}Electron exited with code ${code}${colors.reset}`);
    vite.kill('SIGTERM');
    process.exit(code);
  });

  // Success message
  console.log(`\n${colors.green}${colors.bright}════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}${colors.bright}✓ Full stack is running!${colors.reset}`);
  console.log(`${colors.green}${colors.bright}════════════════════════════════════════${colors.reset}`);
  console.log(`\n${colors.cyan}Vite:${colors.reset} http://localhost:${actualVitePort}`);
  console.log(`${colors.magenta}Electron:${colors.reset} Desktop application window`);
  console.log(`\n${colors.yellow}Press Ctrl+C to stop all services${colors.reset}\n`);

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log(`\n${colors.yellow}Shutting down...${colors.reset}`);

    electron.kill('SIGTERM');
    vite.kill('SIGTERM');

    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });

  // Handle process termination
  process.on('SIGTERM', () => {
    electron.kill('SIGTERM');
    vite.kill('SIGTERM');
    process.exit(0);
  });
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});