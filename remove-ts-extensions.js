const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all TypeScript and TSX files that need fixing
const files = [
  ...glob.sync('src/**/*.{ts,tsx}', { absolute: true }),
  ...glob.sync('electron/**/*.{ts,tsx}', { absolute: true })
];

let totalFixed = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Remove .ts extensions from imports
  content = content.replace(/from\s+(['"])([^'"]+)\.ts(['"])/g, "from $1$2$3");

  // Remove .tsx extensions from imports
  content = content.replace(/from\s+(['"])([^'"]+)\.tsx(['"])/g, "from $1$2$3");

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`✅ Fixed: ${path.relative(process.cwd(), file)}`);
    totalFixed++;
  }
});

console.log(`\n🎉 Removed .ts/.tsx extensions from ${totalFixed} files`);