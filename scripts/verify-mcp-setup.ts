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
      details: `Configured path: ${configuredPath}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({
      name: 'justice-companion path',
      status: 'fail',
      details: `Unable to read .mcp.json (${message})`,
    });
  }
}

const customServerDist = resolve(projectRoot, '../../MCPs/justice-companion/dist/index.js');
const hasCustomServerDist = existsSync(customServerDist);
results.push({
  name: 'justice-companion build artifact',
  status: hasCustomServerDist ? 'pass' : 'fail',
  details: hasCustomServerDist
    ? `Found dist/index.js at ${customServerDist}`
    : 'dist/index.js not found; run npm run build inside ../../MCPs/justice-companion',
});

const sqliteServerPath = resolve(projectRoot, 'node_modules/mcp-server-sqlite/dist/index.js');
const hasSqliteServer = existsSync(sqliteServerPath);
results.push({
  name: 'sqlite MCP',
  status: hasSqliteServer ? 'pass' : 'warn',
  details: hasSqliteServer
    ? 'mcp-server-sqlite package installed'
    : 'mcp-server-sqlite dist/index.js missing',
});

const context7Path = resolve(projectRoot, 'node_modules/@upstash/context7-mcp/dist/index.js');
const hasContext7 = existsSync(context7Path);
results.push({
  name: 'context7 MCP',
  status: hasContext7 ? 'pass' : 'warn',
  details: hasContext7
    ? 'context7 MCP package installed'
    : '@upstash/context7-mcp dist/index.js missing',
});

const playwrightPath = resolve(
  projectRoot,
  'node_modules/@executeautomation/playwright-mcp-server/dist/index.js'
);
const hasPlaywright = existsSync(playwrightPath);
results.push({
  name: 'playwright MCP',
  status: hasPlaywright ? 'pass' : 'warn',
  details: hasPlaywright
    ? 'playwright MCP package installed'
    : 'playwright MCP dist/index.js missing',
});

type EnvCheck = {
  name: string;
  value: string | undefined;
};

const envChecks: EnvCheck[] = [
  { name: 'GITHUB_TOKEN', value: readEnvVariable('GITHUB_TOKEN') },
  { name: 'CONTEXT7_API_KEY', value: readEnvVariable('CONTEXT7_API_KEY') },
];

for (const envCheck of envChecks) {
  const status: CheckStatus = envCheck.value ? 'pass' : 'warn';
  const detail = envCheck.value
    ? `present (length ${envCheck.value.length})`
    : 'not detected in current process environment';
  results.push({
    name: `${envCheck.name} environment variable`,
    status,
    details: detail,
  });
}

const dbPath = resolve(projectRoot, 'justice.db');
const hasDbSnapshot = existsSync(dbPath);
results.push({
  name: 'justice.db snapshot',
  status: hasDbSnapshot ? 'pass' : 'warn',
  details: hasDbSnapshot
    ? `Found at ${dbPath}`
    : 'justice.db not found (sqlite MCP may still work if pointed elsewhere)',
});

const hasFailure = results.some((item) => item.status === 'fail');
const hasWarning = results.some((item) => item.status === 'warn');

for (const item of results) {
  const icon = item.status === 'pass' ? '[PASS]' : item.status === 'fail' ? '[FAIL]' : '[WARN]';

  console.log(`${icon} ${item.name} :: ${item.details}`);
}

if (hasFailure) {
  process.exitCode = 1;
} else if (hasWarning) {
  process.exitCode = 0;
}
