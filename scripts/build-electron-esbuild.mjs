/**
 * esbuild configuration for Electron main process
 * Replaces tsc for faster builds and native .ts extension support
 */

import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Ensure output directory exists
const outDir = join(rootDir, 'dist/electron');
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const buildConfig = {
  entryPoints: [
    join(rootDir, 'electron/main.ts'),
    join(rootDir, 'electron/preload.ts'),
  ],
  bundle: true, // Bundle to handle all dependencies
  platform: 'node',
  target: 'node20', // Match Node 20.18.0 LTS
  format: 'cjs', // CommonJS for Electron compatibility
  outdir: outDir,
  sourcemap: true,
  external: [
    // Electron and native modules
    'electron',
    'better-sqlite3-multiple-ciphers',

    // Node built-ins
    'dotenv',
    'fs',
    'path',
    'crypto',
    'os',
    'child_process',
    'url',
    'util',
    'events',
    'stream',
    'buffer',
    'http',
    'https',
    'net',
    'tls',
    'zlib',
    'assert',
    'querystring',

    // npm dependencies (will be resolved from node_modules at runtime)
    'winston',
    'zod',
    'uuid',
    'mammoth',
    'pdf-parse',
    'inversify',
    'lru-cache',
    'openai',
    '@anthropic-ai/sdk',
    '@huggingface/inference',
    '@ai-sdk/openai',
    '@ai-sdk/anthropic',
    'ai',
    'drizzle-orm',
    'docx',
    'pdfkit',
    'jspdf',
    'html2pdf.js',
    'file-saver',
    'dompurify',
    'fast-xml-parser',
    'html2canvas',
    'electron-updater',
  ],
  loader: {
    '.ts': 'ts',
    '.json': 'json',
  },
  logLevel: 'info',
  tsconfig: join(rootDir, 'tsconfig.electron.json'),
};

async function build() {
  console.log('🔨 Building Electron main process with esbuild...\n');

  try {
    const result = await esbuild.build(buildConfig);

    console.log('\n✅ Electron main process built successfully!');
    console.log(`📂 Output directory: ${outDir}`);

    if (result.errors.length > 0) {
      console.error('\n❌ Build completed with errors:');
      result.errors.forEach(error => console.error(error));
      process.exit(1);
    }

    if (result.warnings.length > 0) {
      console.warn('\n⚠️  Build warnings:');
      result.warnings.forEach(warning => console.warn(warning));
    }

  } catch (error) {
    console.error('\n❌ Build failed:');
    console.error(error);
    process.exit(1);
  }
}

build();
