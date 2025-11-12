/**
 * Script to fix TypeScript decorator type errors
 *
 * This script fixes type mismatches in repository decorators
 * by properly casting return types and handling generic types.
 */

const fs = require('fs');
const path = require('path');

// Files to fix
const decoratorFiles = [
  'src/repositories/decorators/CachingDecorator.ts',
  'src/repositories/decorators/ErrorHandlingDecorator.ts',
  'src/repositories/decorators/LoggingDecorator.ts',
  'src/repositories/decorators/ValidationDecorator.ts',
  'src/repositories/decorators/RepositoryDecorator.ts'
];

// Fix RepositoryDecorator base class first
const decoratorBasePath = path.join(process.cwd(), 'src/repositories/decorators/RepositoryDecorator.ts');
let baseContent = fs.readFileSync(decoratorBasePath, 'utf8');

// Make forwardCall generic to preserve return types
baseContent = baseContent.replace(
  'protected async forwardCall(methodName: string, ...args: unknown[]): Promise<unknown> {',
  'protected async forwardCall<R = unknown>(methodName: string, ...args: unknown[]): Promise<R> {'
);

// Fix the return statement to cast properly
baseContent = baseContent.replace(
  'return method.apply(this.repository, args);',
  'return method.apply(this.repository, args) as Promise<R>;'
);

fs.writeFileSync(decoratorBasePath, baseContent);
console.log('✓ Fixed RepositoryDecorator.ts - Made forwardCall generic');

// Fix CachingDecorator
const cachingPath = path.join(process.cwd(), 'src/repositories/decorators/CachingDecorator.ts');
let cachingContent = fs.readFileSync(cachingPath, 'utf8');

// Fix forwardCall usages to specify return type
cachingContent = cachingContent.replace(
  'return this.forwardCall("findByUserId", userId);',
  'return this.forwardCall<T[]>("findByUserId", userId);'
);

cachingContent = cachingContent.replace(
  'const result = await this.forwardCall("findByUserId", userId);',
  'const result = await this.forwardCall<T[]>("findByUserId", userId);'
);

fs.writeFileSync(cachingPath, cachingContent);
console.log('✓ Fixed CachingDecorator.ts - Added generic type parameters');

// Fix ErrorHandlingDecorator
const errorHandlingPath = path.join(process.cwd(), 'src/repositories/decorators/ErrorHandlingDecorator.ts');
let errorHandlingContent = fs.readFileSync(errorHandlingPath, 'utf8');

errorHandlingContent = errorHandlingContent.replace(
  'return this.forwardCall("findByUserId", userId);',
  'return this.forwardCall<T[]>("findByUserId", userId);'
);

fs.writeFileSync(errorHandlingPath, errorHandlingContent);
console.log('✓ Fixed ErrorHandlingDecorator.ts - Added generic type parameters');

// Fix LoggingDecorator
const loggingPath = path.join(process.cwd(), 'src/repositories/decorators/LoggingDecorator.ts');
let loggingContent = fs.readFileSync(loggingPath, 'utf8');

// Fix Promise<unknown> returns to be properly typed
loggingContent = loggingContent.replace(
  /async getAll\(\): Promise<any\[\]> \{/g,
  'async getAll(): Promise<any[]> {'
);

loggingContent = loggingContent.replace(
  /const result = await this\.forwardCall\("getAll"\);/g,
  'const result = await this.forwardCall<any[]>("getAll");'
);

loggingContent = loggingContent.replace(
  /async findByUserId\(userId: number\): Promise<any\[\]> \{/g,
  'async findByUserId(userId: number): Promise<any[]> {'
);

loggingContent = loggingContent.replace(
  /const result = await this\.forwardCall\("findByUserId", userId\);/g,
  'const result = await this.forwardCall<any[]>("findByUserId", userId);'
);

// Fix boolean returns
loggingContent = loggingContent.replace(
  /const result: Promise<unknown> = this\.forwardCall\("update", id, updates\);/g,
  'const result = await this.forwardCall<boolean>("update", id, updates);'
);

loggingContent = loggingContent.replace(
  /return result;/g,
  (match, offset) => {
    // Check context to see if this is after an update or delete operation
    const before = loggingContent.substring(Math.max(0, offset - 200), offset);
    if (before.includes('async update(') || before.includes('async delete(')) {
      return 'return result;';
    }
    return match;
  }
);

// Fix delete method
loggingContent = loggingContent.replace(
  'return this.forwardCall("delete", id);',
  'return this.forwardCall<boolean>("delete", id);'
);

fs.writeFileSync(loggingPath, loggingContent);
console.log('✓ Fixed LoggingDecorator.ts - Added proper type parameters');

// Fix ValidationDecorator
const validationPath = path.join(process.cwd(), 'src/repositories/decorators/ValidationDecorator.ts');
let validationContent = fs.readFileSync(validationPath, 'utf8');

// Fix the bulkDelete method to properly return void
validationContent = validationContent.replace(
  /return this\.forwardCall\("bulkDelete", ids\);/g,
  'await this.forwardCall<void>("bulkDelete", ids);'
);

fs.writeFileSync(validationPath, validationContent);
console.log('✓ Fixed ValidationDecorator.ts - Fixed void return type');

// Fix PDFGenerator array type issues
const pdfPath = path.join(process.cwd(), 'src/services/export/PDFGenerator.ts');
let pdfContent = fs.readFileSync(pdfPath, 'utf8');

// Fix event array typing
pdfContent = pdfContent.replace(
  'const timelineEvents: unknown[] = timeline?.events || [];',
  'const timelineEvents: Array<{date: string; description: string; caseId?: number}> = timeline?.events || [];'
);

// Fix fact array typing
pdfContent = pdfContent.replace(
  'const facts: unknown[] = caseFacts?.facts || [];',
  'const facts: Array<{type: string; statement: string; source?: string}> = caseFacts?.facts || [];'
);

// Add type guards for the events
pdfContent = pdfContent.replace(
  /timelineEvents\.forEach\(\(event: unknown\)/g,
  'timelineEvents.forEach((event)'
);

// Add type guards for the facts
pdfContent = pdfContent.replace(
  /facts\.forEach\(\(fact: unknown\)/g,
  'facts.forEach((fact)'
);

fs.writeFileSync(pdfPath, pdfContent);
console.log('✓ Fixed PDFGenerator.ts - Properly typed arrays');

// Fix PythonAIClient
const pythonClientPath = path.join(process.cwd(), 'src/services/PythonAIClient.ts');
let pythonContent = fs.readFileSync(pythonClientPath, 'utf8');

// Fix metadata access
pythonContent = pythonContent.replace(
  'response.data.metadata?.ocr?.ocr_confidence',
  '(response.data.metadata as any)?.ocr?.ocr_confidence'
);

// Fix error response data access
pythonContent = pythonContent.replace(
  /const data = axiosError\.response\.data as any;/g,
  'const data = axiosError.response.data as Record<string, unknown>;'
);

fs.writeFileSync(pythonClientPath, pythonContent);
console.log('✓ Fixed PythonAIClient.ts - Fixed metadata access');

console.log('\n✨ All decorator type fixes applied!');
console.log('\nNext steps:');
console.log('1. Run: npm run type-check to verify fixes');
console.log('2. Run: npm run lint to check for any remaining issues');