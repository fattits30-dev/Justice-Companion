import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type CheckStatus = 'pass' | 'fail' | 'warn';

interface CheckResult {
  name: string;
  status: CheckStatus;
  details: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const results: CheckResult[] = [];

function readEnvVariable(name: string): string | undefined {
  const direct = process.env[name];
  if (direct && direct.length > 0) {
    return direct;
  }

  try {
    const value = execSync(
      `powershell -NoLogo -NoProfile -Command "[Environment]::GetEnvironmentVariable('${name}','User')"`,
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    ).trim();
    return value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

const nodeVersion = process.versions.node;
const nodeMajor = Number.parseInt(nodeVersion.split('.')[0] ?? '0', 10);
results.push({
  name: 'Node.js version',
  status: nodeMajor >= 22 ? 'pass' : 'fail',
  details: `Detected v${nodeVersion} (requires v22.x)`,
});

let pnpmVersion = 'unknown';
try {
  pnpmVersion = execSync('pnpm --version', {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const pnpmMajor = Number.parseInt(pnpmVersion.split('.')[0] ?? '0', 10);
  results.push({
    name: 'pnpm version',
    status: pnpmMajor >= 10 ? 'pass' : 'fail',
    details: `Detected v${pnpmVersion} (requires v10.x)`,
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  results.push({
    name: 'pnpm availability',
    status: 'fail',
    details: `Unable to read pnpm version (${message})`,
  });
}

const mcpConfigPath = resolve(projectRoot, '.mcp.json');
if (!existsSync(mcpConfigPath)) {
  results.push({
    name: '.mcp.json',
    status: 'fail',
    details: 'Configuration file not found at project root',
  });
} else {
  try {
    const mcpConfig = JSON.parse(readFileSync(mcpConfigPath, 'utf8')) as {
      mcpServers?: Record<string, { args?: string[] }>;
    };
    const justiceArgs = mcpConfig.mcpServers?.['justice-companion']?.args ?? [];
    const expectedPath = '../../MCPs/justice-companion/dist/index.js';
    const configuredPath = justiceArgs[0] ?? 'missing';
    results.push({
      name: 'justice-companion path',
      status: configuredPath === expectedPath ? 'pass' : 'fail',
      details: `Expected ${expectedPath}, got ${configuredPath}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({
      name: '.mcp.json parsing',
      status: 'fail',
      details: `Failed to parse .mcp.json (${message})`,
    });
  }
}

const outputLines: string[] = [];
for (const result of results) {
  const statusSymbol = result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '⚠';
  outputLines.push(`${statusSymbol} ${result.name}: ${result.details}`);
}

console.log(outputLines.join('\n'));

const allPassed = results.every(r => r.status !== 'fail');
process.exit(allPassed ? 0 : 1);