import chokidar from 'chokidar';
import type { FSWatcher } from 'chokidar';
import { spawn } from 'child_process';
import path from 'path';
import { performance } from 'perf_hooks';

type Step = {
  name: string;
  command: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

const WATCH_PATHS = [
  'src',
  'electron',
  'automation/src',
  'scripts',
  'package.json',
  'vite.config.ts',
  'vitest.config.ts',
  'tsconfig.json',
  'eslint.config.js'
];

const IGNORED_GLOBS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.cache/**',
  '**/dist/**',
  '**/dist-electron/**',
  '**/release/**',
  '**/coverage/**',
  '**/*.log',
  '**/*.tmp',
  '**/*.tsbuildinfo'
];

const PIPELINE_STEPS: Step[] = [
  {
    name: 'Type Check',
    command: 'npm',
    args: ['run', 'type-check']
  },
  {
    name: 'Lint',
    command: 'npm',
    args: ['run', 'lint']
  },
  {
    name: 'Unit Tests',
    command: 'npm',
    args: ['test', '--', '--run']
  }
];

const DEBOUNCE_MS = 750;

let pendingTrigger: string | null = null;
let running = false;
let debounceTimer: NodeJS.Timeout | null = null;
let watcher: FSWatcher | null = null;

const log = (message: string) => {
  const stamp = new Date().toISOString();
  console.log(`[SimpleOrchestrator ${stamp}] ${message}`);
};

const runStep = (step: Step) =>
  new Promise<void>((resolve, reject) => {
    log(`→ ${step.name}…`);
    const started = performance.now();
    const child = spawn(step.command, step.args, {
      cwd: step.cwd ?? process.cwd(),
      env: { ...process.env, ...step.env },
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    child.on('error', reject);

    child.on('exit', code => {
      const durationMs = performance.now() - started;
      if (code === 0) {
        log(`✓ ${step.name} (${durationMs.toFixed(0)}ms)`);
        resolve();
      } else {
        reject(new Error(`${step.name} failed with exit code ${code}`));
      }
    });
  });

const runPipeline = async (trigger: string) => {
  if (running) {
    pendingTrigger = trigger;
    return;
  }

  running = true;
  const started = performance.now();
  log(`Pipeline triggered by ${trigger}`);

  try {
    for (const step of PIPELINE_STEPS) {
      await runStep(step);
    }
    const durationMs = performance.now() - started;
    log(`Pipeline complete (${durationMs.toFixed(0)}ms)`);
  } catch (error) {
    log(
      error instanceof Error
        ? `✗ ${error.message}`
        : '✗ Pipeline failed with unknown error'
    );
  } finally {
    running = false;
    if (pendingTrigger) {
      const nextTrigger = pendingTrigger;
      pendingTrigger = null;
      queueRun(nextTrigger);
    }
  }
};

const queueRun = (trigger: string) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    runPipeline(trigger);
  }, DEBOUNCE_MS);
};

const startWatcher = () => {
  if (watcher) {
    return;
  }

  watcher = chokidar.watch(WATCH_PATHS, {
    ignored: IGNORED_GLOBS,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 250,
      pollInterval: 50
    }
  });

  watcher.on('all', (event: string, filePath: string) => {
    const relative = path.relative(process.cwd(), filePath);
    log(`Detected ${event} in ${relative}`);
    queueRun(`${event}:${relative}`);
  });

  watcher.on('error', (error: unknown) => {
    const msg = error instanceof Error ? error.message : String(error);
    log(`Watcher error: ${msg}`);
  });

  log(`Watching paths: ${WATCH_PATHS.join(', ')}`);
};

const stopWatcher = async () => {
  if (!watcher) {
    return;
  }
  await watcher.close();
  watcher = null;
};

const handleShutdown = async () => {
  log('Received shutdown signal, cleaning up…');
  await stopWatcher();
  process.exit(0);
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

const args = process.argv.slice(2);
const runOnce = args.includes('--once');
const noInitialRun = args.includes('--no-initial');

const main = async () => {
  if (!noInitialRun) {
    await runPipeline('startup');
  }

  if (runOnce) {
    await stopWatcher();
    return;
  }

  startWatcher();
};

main().catch(error => {
  log(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
