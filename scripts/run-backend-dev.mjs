import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const rootDir = path.resolve(process.cwd());
const pythonEnvOverride =
  process.env.PYTHON_EXECUTABLE ||
  process.env.PYTHON ||
  process.env.PLAYWRIGHT_PYTHON;

const defaultCandidates =
  process.platform === "win32"
    ? [["py", "-3"], ["python"], ["python3"]]
    : [["python3"], ["python"], ["python3.11"]];

const pythonCandidates = pythonEnvOverride
  ? [[pythonEnvOverride]]
  : defaultCandidates;

const backendArgs = [
  "-m",
  "uvicorn",
  "backend.main:app",
  "--host",
  "0.0.0.0",
  "--port",
  process.env.BACKEND_PORT || "8000",
  "--reload",
  "--reload-dir",
  "backend",
];

function findPythonCommand() {
  for (const candidate of pythonCandidates) {
    const [cmd, ...cmdArgs] = candidate;
    const result = spawnSync(cmd, [...cmdArgs, "--version"], {
      stdio: "ignore",
    });

    if (!result.error && result.status === 0) {
      return candidate;
    }
  }
  return null;
}

const resolvedCommand = findPythonCommand();

if (!resolvedCommand) {
  console.error(
    "Unable to find a Python interpreter. Set PYTHON_EXECUTABLE or ensure python/python3/py is on your PATH."
  );
  process.exit(1);
}

const [pythonBinary, ...pythonArgs] = resolvedCommand;

let childProcess = null;

function startBackend() {
  const child = spawn(pythonBinary, [...pythonArgs, ...backendArgs], {
    cwd: rootDir,
    stdio: "inherit",
    env: {
      ...process.env,
      PYTHONPATH: rootDir,
      ENABLE_TEST_ROUTES: process.env.ENABLE_TEST_ROUTES ?? "true",
    },
  });

  childProcess = child;

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });

  child.on("error", (error) => {
    console.error("Failed to start backend:", error);
    process.exit(1);
  });
}

function handleSignal(signal) {
  if (childProcess) {
    childProcess.kill(signal);
  } else {
    process.exit(0);
  }
}

process.on("SIGINT", handleSignal);
process.on("SIGTERM", handleSignal);

startBackend();
