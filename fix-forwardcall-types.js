/**
 * Script to fix all forwardCall usages with proper generic types
 */

const fs = require('fs');
const path = require('path');

// Fix LoggingDecorator
const loggingPath = path.join(process.cwd(), 'src/repositories/decorators/LoggingDecorator.ts');
let loggingContent = fs.readFileSync(loggingPath, 'utf8');

// Fix findById calls
loggingContent = loggingContent.replace(
  'return await this.forwardCall("findById", id);',
  'return await this.forwardCall<any>("findById", id);'
);

loggingContent = loggingContent.replace(
  'const result = await this.forwardCall("findById", id);',
  'const result = await this.forwardCall<any>("findById", id);'
);

// Fix create calls
loggingContent = loggingContent.replace(
  'return await this.forwardCall("create", data);',
  'return await this.forwardCall<any>("create", data);'
);

loggingContent = loggingContent.replace(
  'const result = await this.forwardCall("create", data);',
  'const result = await this.forwardCall<any>("create", data);'
);

// Fix update calls
loggingContent = loggingContent.replace(
  'return await this.forwardCall("update", id, data);',
  'return await this.forwardCall<boolean>("update", id, data);'
);

loggingContent = loggingContent.replace(
  'const result = await this.forwardCall("update", id, data);',
  'const result = await this.forwardCall<boolean>("update", id, data);'
);

// Fix delete calls
loggingContent = loggingContent.replace(
  'return await this.forwardCall("delete", id);',
  'return await this.forwardCall<boolean>("delete", id);'
);

loggingContent = loggingContent.replace(
  'const result = await this.forwardCall("delete", id);',
  'const result = await this.forwardCall<boolean>("delete", id);'
);

fs.writeFileSync(loggingPath, loggingContent);
console.log('✓ Fixed LoggingDecorator.ts - All forwardCall usages');

// Fix ValidationDecorator
const validationPath = path.join(process.cwd(), 'src/repositories/decorators/ValidationDecorator.ts');
let validationContent = fs.readFileSync(validationPath, 'utf8');

// The previous fix had the wrong pattern - fix it correctly
validationContent = validationContent.replace(
  'await this.forwardCall<void>("bulkDelete", ids);',
  'await this.forwardCall<void>("bulkDelete", ids);\n    return;'
);

fs.writeFileSync(validationPath, validationContent);
console.log('✓ Fixed ValidationDecorator.ts - bulkDelete return');

// Fix PDFGenerator event typing issue
const pdfPath = path.join(process.cwd(), 'src/services/export/PDFGenerator.ts');
let pdfContent = fs.readFileSync(pdfPath, 'utf8');

// Find and fix the timeline events section
pdfContent = pdfContent.replace(
  /timelineEvents\.forEach\(\(event\) => {/g,
  'timelineEvents.forEach((event: any) => {'
);

// Find and fix the facts section
pdfContent = pdfContent.replace(
  /facts\.forEach\(\(fact\) => {/g,
  'facts.forEach((fact: any) => {'
);

fs.writeFileSync(pdfPath, pdfContent);
console.log('✓ Fixed PDFGenerator.ts - Event typing');

console.log('\n✨ All forwardCall type fixes applied!');
console.log('\nNext steps:');
console.log('1. Run: npm run type-check to verify fixes');