const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all TypeScript and TSX files
const files = [
  ...glob.sync('src/**/*.{ts,tsx}', { absolute: true }),
  ...glob.sync('electron/**/*.{ts,tsx}', { absolute: true })
];

let totalFixed = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Fix double extensions .tsx.ts -> .tsx
  content = content.replace(/from\s+['"]([^'"]+)\.tsx\.ts['"]/g, "from '$1.tsx'");

  // Fix double extensions .ts.ts -> .ts
  content = content.replace(/from\s+['"]([^'"]+)\.ts\.ts['"]/g, "from '$1.ts'");

  // Fix cases where .tsx was added to .tsx files
  content = content.replace(/from\s+['"]([^'"]+)\.tsx\.tsx['"]/g, "from '$1.tsx'");

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`✅ Fixed: ${path.relative(process.cwd(), file)}`);
    totalFixed++;
  }
});

console.log(`\n🎉 Fixed ${totalFixed} files with double extensions`);