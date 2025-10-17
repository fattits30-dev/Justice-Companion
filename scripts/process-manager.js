/**
 * Justice Companion Process Manager
 *
 * A diagnostic and process management utility for monitoring and controlling
 * Justice Companion Electron application processes.
 *
 * Usage:
 *   node scripts/process-manager.js [command]
 *
 * Commands:
 *   monitor   - Live monitoring of all processes (default)
 *   list      - List all processes once
 *   kill      - Gracefully terminate all processes
 *   force     - Force kill all processes
 *   status    - Quick status check
 */

const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Configuration
const APP_NAME = 'Justice Companion';
const PROCESS_NAMES = ['electron.exe', 'node.exe'];
const GRACE_PERIOD_MS = 5000; // 5 seconds for graceful shutdown

/**
 * Clear the console screen
 */
function clearScreen() {
  process.stdout.write('\x1Bc');
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes) {
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

/**
 * Format process status with color
 */
function formatStatus(status) {
  if (status === 'Running') return `${colors.green}${status}${colors.reset}`;
  if (status === 'Not Responding') return `${colors.red}${status}${colors.reset}`;
  return `${colors.yellow}${status}${colors.reset}`;
}

/**
 * Get all Justice Companion related processes
 */
async function getProcesses() {
  try {
    const processes = [];

    // Get Electron processes
    for (const processName of PROCESS_NAMES) {
      try {
        const cmd = `tasklist /FI "IMAGENAME eq ${processName}" /FO CSV /NH`;
        const { stdout } = await execAsync(cmd, { windowsHide: true });

        const lines = stdout.trim().split('\n').filter(line => line.trim());

        for (const line of lines) {
          // Parse CSV output: "name","pid","session","session#","mem"
          const match = line.match(/"([^"]+)","([^"]+)","([^"]+)","([^"]+)","([^"]+)"/);
          if (match) {
            const [, name, pid, session, sessionNum, mem] = match;

            // Get detailed info using wmic
            try {
              const detailCmd = `wmic process where "ProcessId=${pid}" get CommandLine,WorkingSetSize /FORMAT:CSV`;
              const { stdout: detailOut } = await execAsync(detailCmd, { windowsHide: true });

              const detailLines = detailOut.trim().split('\n').filter(l => l.trim() && !l.startsWith('Node,'));
              const isJusticeCompanion = detailLines.some(l =>
                l.toLowerCase().includes('justice') ||
                l.toLowerCase().includes('companion') ||
                l.includes('electron\\main.ts') ||
                l.includes('electron\\main.js')
              );

              if (isJusticeCompanion || name === 'electron.exe') {
                // Parse memory size
                const memMatch = detailLines[0]?.match(/,(\d+)$/);
                const workingSetSize = memMatch ? parseInt(memMatch[1]) : null;

                processes.push({
                  name,
                  pid: parseInt(pid),
                  session,
                  memory: workingSetSize || parseInt(mem.replace(/[^\d]/g, '')) * 1024,
                  status: 'Running',
                  commandLine: detailLines[0]?.split(',')[1] || 'N/A'
                });
              }
            } catch (err) {
              // If wmic fails, still add basic info
              if (name === 'electron.exe') {
                processes.push({
                  name,
                  pid: parseInt(pid),
                  session,
                  memory: parseInt(mem.replace(/[^\d]/g, '')) * 1024,
                  status: 'Running',
                  commandLine: 'N/A'
                });
              }
            }
          }
        }
      } catch (err) {
        // Process type not found, continue
      }
    }

    return processes;
  } catch (error) {
    console.error(`${colors.red}Error getting processes:${colors.reset}`, error.message);
    return [];
  }
}

/**
 * Display process list in table format
 */
function displayProcesses(processes) {
  if (processes.length === 0) {
    console.log(`${colors.yellow}No Justice Companion processes found.${colors.reset}`);
    return;
  }

  console.log(`${colors.bright}${colors.cyan}═════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}  ${APP_NAME} - Active Processes${colors.reset}`);
  console.log(`${colors.cyan}═════════════════════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.bright}  PID      Memory      Status          Type${colors.reset}`);
  console.log(`${colors.cyan}  ─────────────────────────────────────────────────────────────────${colors.reset}`);

  // Group by type
  const mainProcesses = processes.filter(p =>
    p.commandLine.includes('electron\\main') ||
    p.commandLine.includes('--type=gpu-process') === false
  );
  const rendererProcesses = processes.filter(p =>
    p.commandLine.includes('--type=renderer')
  );
  const gpuProcesses = processes.filter(p =>
    p.commandLine.includes('--type=gpu-process')
  );
  const utilityProcesses = processes.filter(p =>
    p.commandLine.includes('--type=utility') ||
    p.commandLine.includes('--type=zygote')
  );

  // Display main processes
  if (mainProcesses.length > 0) {
    mainProcesses.forEach(p => {
      console.log(`  ${colors.white}${p.pid.toString().padEnd(8)}${colors.reset} ${formatBytes(p.memory).padEnd(11)} ${formatStatus(p.status).padEnd(25)} ${colors.magenta}Main Process${colors.reset}`);
    });
  }

  // Display renderer processes
  if (rendererProcesses.length > 0) {
    rendererProcesses.forEach(p => {
      console.log(`  ${colors.white}${p.pid.toString().padEnd(8)}${colors.reset} ${formatBytes(p.memory).padEnd(11)} ${formatStatus(p.status).padEnd(25)} ${colors.blue}Renderer${colors.reset}`);
    });
  }

  // Display GPU processes
  if (gpuProcesses.length > 0) {
    gpuProcesses.forEach(p => {
      console.log(`  ${colors.white}${p.pid.toString().padEnd(8)}${colors.reset} ${formatBytes(p.memory).padEnd(11)} ${formatStatus(p.status).padEnd(25)} ${colors.green}GPU Process${colors.reset}`);
    });
  }

  // Display utility processes
  if (utilityProcesses.length > 0) {
    utilityProcesses.forEach(p => {
      console.log(`  ${colors.white}${p.pid.toString().padEnd(8)}${colors.reset} ${formatBytes(p.memory).padEnd(11)} ${formatStatus(p.status).padEnd(25)} ${colors.cyan}Utility${colors.reset}`);
    });
  }

  console.log(`${colors.cyan}  ─────────────────────────────────────────────────────────────────${colors.reset}`);

  // Summary
  const totalMemory = processes.reduce((sum, p) => sum + p.memory, 0);
  console.log(`\n  ${colors.bright}Total Processes:${colors.reset} ${colors.yellow}${processes.length}${colors.reset}`);
  console.log(`  ${colors.bright}Total Memory:${colors.reset}    ${colors.yellow}${formatBytes(totalMemory)}${colors.reset}`);
  console.log(`  ${colors.bright}Main:${colors.reset}            ${mainProcesses.length}`);
  console.log(`  ${colors.bright}Renderer:${colors.reset}        ${rendererProcesses.length}`);
  console.log(`  ${colors.bright}GPU:${colors.reset}             ${gpuProcesses.length}`);
  console.log(`  ${colors.bright}Utility:${colors.reset}         ${utilityProcesses.length}`);

  console.log(`${colors.cyan}\n═════════════════════════════════════════════════════════════════════${colors.reset}\n`);
}

/**
 * Kill a process by PID (graceful attempt)
 */
async function killProcess(pid, graceful = true) {
  try {
    if (graceful) {
      // Try graceful shutdown first (SIGTERM equivalent on Windows)
      await execAsync(`taskkill /PID ${pid}`, { windowsHide: true });
    } else {
      // Force kill
      await execAsync(`taskkill /F /PID ${pid}`, { windowsHide: true });
    }
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Kill all Justice Companion processes
 */
async function killAllProcesses(force = false) {
  const processes = await getProcesses();

  if (processes.length === 0) {
    console.log(`${colors.yellow}No processes to kill.${colors.reset}`);
    return;
  }

  console.log(`${colors.yellow}${force ? 'Force killing' : 'Gracefully terminating'} ${processes.length} process(es)...${colors.reset}\n`);

  const results = await Promise.all(
    processes.map(async (p) => {
      const success = await killProcess(p.pid, !force);
      return { pid: p.pid, success };
    })
  );

  // Display results
  results.forEach(({ pid, success }) => {
    if (success) {
      console.log(`  ${colors.green}✓${colors.reset} Killed process ${pid}`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} Failed to kill process ${pid}`);
    }
  });

  // If graceful, wait and check for survivors
  if (!force) {
    console.log(`\n${colors.cyan}Waiting ${GRACE_PERIOD_MS / 1000}s for processes to exit...${colors.reset}`);
    await new Promise(resolve => setTimeout(resolve, GRACE_PERIOD_MS));

    const survivors = await getProcesses();
    if (survivors.length > 0) {
      console.log(`\n${colors.yellow}${survivors.length} process(es) still running. Use 'force' to kill them.${colors.reset}`);
      displayProcesses(survivors);
    } else {
      console.log(`\n${colors.green}All processes terminated successfully.${colors.reset}`);
    }
  }
}

/**
 * Monitor processes in real-time
 */
async function monitorProcesses() {
  console.log(`${colors.bright}${colors.cyan}Starting live process monitor...${colors.reset}`);
  console.log(`${colors.yellow}Press Ctrl+C to stop monitoring${colors.reset}\n`);

  let iteration = 0;

  const monitor = async () => {
    clearScreen();

    console.log(`${colors.cyan}Justice Companion Process Monitor${colors.reset}`);
    console.log(`${colors.cyan}Last Update: ${new Date().toLocaleTimeString()}${colors.reset}`);
    console.log(`${colors.cyan}Refresh: Every 2 seconds${colors.reset}\n`);

    const processes = await getProcesses();
    displayProcesses(processes);

    console.log(`${colors.yellow}Commands: Ctrl+C to exit${colors.reset}`);

    iteration++;
  };

  // Initial display
  await monitor();

  // Set up interval
  const intervalId = setInterval(monitor, 2000);

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    clearInterval(intervalId);
    console.log(`\n\n${colors.green}Monitor stopped.${colors.reset}`);
    process.exit(0);
  });
}

/**
 * Quick status check
 */
async function statusCheck() {
  const processes = await getProcesses();

  if (processes.length === 0) {
    console.log(`${colors.yellow}Status: Not Running${colors.reset}`);
    console.log('No Justice Companion processes detected.\n');
    return;
  }

  const totalMemory = processes.reduce((sum, p) => sum + p.memory, 0);

  console.log(`${colors.green}Status: Running${colors.reset}`);
  console.log(`Processes: ${processes.length}`);
  console.log(`Memory: ${formatBytes(totalMemory)}`);
  console.log(`PIDs: ${processes.map(p => p.pid).join(', ')}\n`);
}

/**
 * Interactive kill with confirmation
 */
async function interactiveKill() {
  const processes = await getProcesses();

  if (processes.length === 0) {
    console.log(`${colors.yellow}No processes to kill.${colors.reset}`);
    return;
  }

  console.log(`${colors.yellow}Found ${processes.length} Justice Companion process(es)${colors.reset}\n`);
  displayProcesses(processes);

  // Prompt for confirmation
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`\n${colors.red}Kill all processes? (yes/no): ${colors.reset}`, async (answer) => {
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      await killAllProcesses(false);

      // Check if force kill needed
      const survivors = await getProcesses();
      if (survivors.length > 0) {
        rl.question(`\n${colors.red}Force kill remaining processes? (yes/no): ${colors.reset}`, async (forceAnswer) => {
          if (forceAnswer.toLowerCase() === 'yes' || forceAnswer.toLowerCase() === 'y') {
            await killAllProcesses(true);
          }
          rl.close();
        });
      } else {
        rl.close();
      }
    } else {
      console.log(`${colors.yellow}Kill cancelled.${colors.reset}`);
      rl.close();
    }
  });
}

/**
 * Display help
 */
function displayHelp() {
  console.log(`${colors.bright}${colors.cyan}Justice Companion Process Manager${colors.reset}\n`);
  console.log(`${colors.bright}Usage:${colors.reset}`);
  console.log(`  node scripts/process-manager.js [command]\n`);
  console.log(`${colors.bright}Commands:${colors.reset}`);
  console.log(`  ${colors.green}monitor${colors.reset}   Live monitoring of all processes (refreshes every 2s)`);
  console.log(`  ${colors.green}list${colors.reset}      List all processes once`);
  console.log(`  ${colors.green}status${colors.reset}    Quick status check`);
  console.log(`  ${colors.green}kill${colors.reset}      Gracefully terminate all processes (with confirmation)`);
  console.log(`  ${colors.green}force${colors.reset}     Force kill all processes (with confirmation)`);
  console.log(`  ${colors.green}help${colors.reset}      Display this help message\n`);
  console.log(`${colors.bright}Examples:${colors.reset}`);
  console.log(`  node scripts/process-manager.js monitor`);
  console.log(`  node scripts/process-manager.js kill`);
  console.log(`  pnpm process:monitor\n`);
}

/**
 * Main function
 */
async function main() {
  const command = process.argv[2] || 'monitor';

  switch (command.toLowerCase()) {
    case 'monitor':
    case 'm':
      await monitorProcesses();
      break;

    case 'list':
    case 'ls':
      const processes = await getProcesses();
      displayProcesses(processes);
      break;

    case 'status':
    case 's':
      await statusCheck();
      break;

    case 'kill':
    case 'k':
      await interactiveKill();
      break;

    case 'force':
    case 'f':
      const forceps = await getProcesses();
      if (forceps.length === 0) {
        console.log(`${colors.yellow}No processes to kill.${colors.reset}`);
      } else {
        console.log(`${colors.red}Force killing all processes...${colors.reset}\n`);
        await killAllProcesses(true);
      }
      break;

    case 'help':
    case 'h':
    case '--help':
    case '-h':
      displayHelp();
      break;

    default:
      console.log(`${colors.red}Unknown command: ${command}${colors.reset}\n`);
      displayHelp();
      process.exit(1);
  }
}

// Run main function
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = { getProcesses, killAllProcesses, displayProcesses };
