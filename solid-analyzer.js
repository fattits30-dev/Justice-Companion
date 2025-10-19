const fs = require('fs');
const path = require('path');

class SOLIDAnalyzer {
  constructor() {
    this.violations = {
      singleResponsibility: [],
      openClosed: [],
      liskovSubstitution: [],
      interfaceSegregation: [],
      dependencyInversion: []
    };
  }

  analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.relative(process.cwd(), filePath);

      // Skip test files
      if (fileName.includes('.test.') || fileName.includes('.spec.')) {
        return;
      }

      this.checkSingleResponsibility(content, fileName);
      this.checkOpenClosed(content, fileName);
      this.checkLiskovSubstitution(content, fileName);
      this.checkInterfaceSegregation(content, fileName);
      this.checkDependencyInversion(content, fileName);

    } catch (error) {
      // Skip files that can't be read
    }
  }

  checkSingleResponsibility(content, fileName) {
    // Check for classes doing multiple things
    const classRegex = /class\s+(\w+)/g;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const startIndex = match.index;

      // Find the class body
      let braceCount = 0;
      let inClass = false;
      let endIndex = startIndex;

      for (let i = startIndex; i < content.length; i++) {
        if (content[i] === '{') {
          braceCount++;
          inClass = true;
        } else if (content[i] === '}') {
          braceCount--;
          if (inClass && braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }

      const classBody = content.substring(startIndex, endIndex);

      // Count responsibilities
      const responsibilities = [];

      // Database operations
      if (classBody.match(/\.(query|execute|insert|update|delete|select)\(/)) {
        responsibilities.push('Database operations');
      }

      // HTTP/Network operations
      if (classBody.match(/(fetch|axios|http|request)\(/)) {
        responsibilities.push('HTTP/Network operations');
      }

      // File I/O
      if (classBody.match(/(readFile|writeFile|createReadStream|createWriteStream)/)) {
        responsibilities.push('File I/O operations');
      }

      // Validation
      if (classBody.match(/(validate|validator|zod\.)/)) {
        responsibilities.push('Validation logic');
      }

      // Encryption/Security
      if (classBody.match(/(encrypt|decrypt|hash|crypto|scrypt)/)) {
        responsibilities.push('Security/Encryption');
      }

      // Logging
      if (classBody.match(/(logger\.|console\.log)/)) {
        responsibilities.push('Logging');
      }

      // UI/Rendering
      if (classBody.match(/(render|jsx|setState|useState)/)) {
        responsibilities.push('UI rendering');
      }

      // Business Logic
      if (classBody.match(/(calculate|process|transform|analyze)/)) {
        responsibilities.push('Business logic');
      }

      // Caching
      if (classBody.match(/(cache|Cache|memo)/)) {
        responsibilities.push('Caching');
      }

      // Event Handling
      if (classBody.match(/(addEventListener|emit|on\(|off\()/)) {
        responsibilities.push('Event handling');
      }

      if (responsibilities.length > 2) {
        this.violations.singleResponsibility.push({
          file: fileName,
          class: className,
          responsibilities: responsibilities,
          count: responsibilities.length,
          severity: responsibilities.length > 4 ? 'high' : 'medium'
        });
      }
    }
  }

  checkOpenClosed(content, fileName) {
    // Check for switch statements handling types (should use polymorphism)
    const switchTypeRegex = /switch\s*\([^)]*type[^)]*\)[\s\S]*?case\s+['"]?\w+['"]?:/g;
    const matches = content.match(switchTypeRegex);

    if (matches && matches.length > 0) {
      this.violations.openClosed.push({
        file: fileName,
        issue: 'Switch statement on type property',
        description: 'Consider using polymorphism or strategy pattern',
        occurrences: matches.length
      });
    }

    // Check for instanceof chains (violation of OCP)
    const instanceofChains = content.match(/if.*instanceof.*else\s+if.*instanceof/g);
    if (instanceofChains && instanceofChains.length > 0) {
      this.violations.openClosed.push({
        file: fileName,
        issue: 'Instanceof chains',
        description: 'Use polymorphism instead of type checking',
        occurrences: instanceofChains.length
      });
    }

    // Check for string-based conditionals for behavior
    const stringConditionals = content.match(/if\s*\([^)]*===\s*['"][\w]+['"]/g);
    if (stringConditionals && stringConditionals.length > 5) {
      this.violations.openClosed.push({
        file: fileName,
        issue: 'Multiple string-based conditionals',
        description: 'Consider using a strategy pattern or map',
        occurrences: stringConditionals.length
      });
    }
  }

  checkLiskovSubstitution(content, fileName) {
    // Check for method overriding that changes behavior
    const extendsRegex = /class\s+(\w+)\s+extends\s+(\w+)/g;
    let match;

    while ((match = extendsRegex.exec(content)) !== null) {
      const childClass = match[1];
      const parentClass = match[2];

      // Check if child class throws exceptions not thrown by parent
      const throwsInOverride = content.match(new RegExp(
        `class\\s+${childClass}[\\s\\S]*?\\w+\\s*\\([^)]*\\)\\s*\\{[^}]*throw`, 'g'
      ));

      if (throwsInOverride) {
        this.violations.liskovSubstitution.push({
          file: fileName,
          class: childClass,
          parent: parentClass,
          issue: 'Overridden methods throw new exceptions',
          description: 'Child classes should not throw exceptions not declared by parent'
        });
      }

      // Check for empty method overrides (breaking parent contract)
      const emptyOverrides = content.match(new RegExp(
        `${childClass}[\\s\\S]*?\\w+\\s*\\([^)]*\\)\\s*\\{\\s*\\}`, 'g'
      ));

      if (emptyOverrides) {
        this.violations.liskovSubstitution.push({
          file: fileName,
          class: childClass,
          parent: parentClass,
          issue: 'Empty method overrides',
          description: 'Empty overrides may break parent class contract'
        });
      }
    }
  }

  checkInterfaceSegregation(content, fileName) {
    // Check for large interfaces (more than 5 methods)
    const interfaceRegex = /interface\s+(\w+)\s*\{([^}]*)\}/g;
    let match;

    while ((match = interfaceRegex.exec(content)) !== null) {
      const interfaceName = match[1];
      const interfaceBody = match[2];

      // Count methods in interface
      const methodCount = (interfaceBody.match(/\w+\s*\([^)]*\)\s*:/g) || []).length;
      const propertyCount = (interfaceBody.match(/\w+\s*\??\s*:/g) || []).length - methodCount;

      if (methodCount > 5) {
        this.violations.interfaceSegregation.push({
          file: fileName,
          interface: interfaceName,
          methodCount: methodCount,
          propertyCount: propertyCount,
          severity: methodCount > 10 ? 'high' : 'medium',
          description: 'Large interface - consider splitting into smaller, focused interfaces'
        });
      }

      // Check for optional methods (sign of ISP violation)
      const optionalMethods = interfaceBody.match(/\w+\?\s*\([^)]*\)\s*:/g);
      if (optionalMethods && optionalMethods.length > 2) {
        this.violations.interfaceSegregation.push({
          file: fileName,
          interface: interfaceName,
          issue: 'Multiple optional methods',
          count: optionalMethods.length,
          description: 'Optional methods suggest interface is too broad'
        });
      }
    }

    // Check for classes implementing multiple large interfaces
    const implementsRegex = /class\s+(\w+).*implements\s+([^{]+)/g;
    while ((match = implementsRegex.exec(content)) !== null) {
      const className = match[1];
      const interfaces = match[2].split(',').map(i => i.trim());

      if (interfaces.length > 3) {
        this.violations.interfaceSegregation.push({
          file: fileName,
          class: className,
          interfaces: interfaces,
          count: interfaces.length,
          description: 'Class implements too many interfaces'
        });
      }
    }
  }

  checkDependencyInversion(content, fileName) {
    // Check for direct instantiation instead of dependency injection
    const newInstanceRegex = /new\s+\w+Service\(/g;
    const directInstantiations = content.match(newInstanceRegex);

    if (directInstantiations && directInstantiations.length > 2) {
      this.violations.dependencyInversion.push({
        file: fileName,
        issue: 'Direct service instantiation',
        occurrences: directInstantiations.length,
        description: 'Services should be injected, not instantiated directly'
      });
    }

    // Check for concrete type parameters instead of interfaces
    const concreteParams = content.match(/constructor\([^)]*:\s*\w+Service[^,)]*\)/g);
    if (concreteParams) {
      this.violations.dependencyInversion.push({
        file: fileName,
        issue: 'Concrete type dependencies',
        description: 'Constructor parameters should use interfaces, not concrete types',
        occurrences: concreteParams.length
      });
    }

    // Check for static method dependencies
    const staticCalls = content.match(/\w+Service\.\w+\(/g);
    if (staticCalls && staticCalls.length > 5) {
      this.violations.dependencyInversion.push({
        file: fileName,
        issue: 'Static method dependencies',
        description: 'Static methods create tight coupling',
        occurrences: staticCalls.length
      });
    }

    // Check for hardcoded dependencies
    const requireStatements = content.match(/require\(['"]\.\.\/['"]\)/g);
    const importStatements = content.match(/import.*from\s+['"]\.\.\/services/g);
    const totalHardcoded = (requireStatements?.length || 0) + (importStatements?.length || 0);

    if (totalHardcoded > 5) {
      this.violations.dependencyInversion.push({
        file: fileName,
        issue: 'Hardcoded service imports',
        description: 'Consider using dependency injection container',
        occurrences: totalHardcoded
      });
    }
  }

  generateReport() {
    console.log('\n=== SOLID PRINCIPLES ANALYSIS ===\n');

    // Single Responsibility Principle
    console.log('## SINGLE RESPONSIBILITY PRINCIPLE VIOLATIONS\n');
    console.log(`Classes violating SRP: ${this.violations.singleResponsibility.length}`);

    if (this.violations.singleResponsibility.length > 0) {
      console.log('\nTop SRP Violations:');
      this.violations.singleResponsibility
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .forEach((violation, index) => {
          console.log(`\n${index + 1}. ${violation.file} - ${violation.class}`);
          console.log(`   Responsibilities (${violation.count}):`);
          violation.responsibilities.forEach(r => console.log(`   - ${r}`));
        });
    }

    // Open/Closed Principle
    console.log('\n## OPEN/CLOSED PRINCIPLE VIOLATIONS\n');
    console.log(`Files violating OCP: ${this.violations.openClosed.length}`);

    if (this.violations.openClosed.length > 0) {
      console.log('\nOCP Violations:');
      this.violations.openClosed.slice(0, 10).forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.file}`);
        console.log(`   Issue: ${violation.issue}`);
        console.log(`   ${violation.description} (${violation.occurrences} occurrences)`);
      });
    }

    // Liskov Substitution Principle
    console.log('\n## LISKOV SUBSTITUTION PRINCIPLE VIOLATIONS\n');
    console.log(`Inheritance violations: ${this.violations.liskovSubstitution.length}`);

    if (this.violations.liskovSubstitution.length > 0) {
      console.log('\nLSP Violations:');
      this.violations.liskovSubstitution.slice(0, 10).forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.file}`);
        console.log(`   Class: ${violation.class} extends ${violation.parent}`);
        console.log(`   Issue: ${violation.issue}`);
      });
    }

    // Interface Segregation Principle
    console.log('\n## INTERFACE SEGREGATION PRINCIPLE VIOLATIONS\n');
    console.log(`Interface violations: ${this.violations.interfaceSegregation.length}`);

    if (this.violations.interfaceSegregation.length > 0) {
      console.log('\nISP Violations:');
      this.violations.interfaceSegregation.slice(0, 10).forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.file}`);
        if (violation.interface) {
          console.log(`   Interface: ${violation.interface} (${violation.methodCount} methods)`);
        } else if (violation.class) {
          console.log(`   Class: ${violation.class} implements ${violation.count} interfaces`);
        }
        console.log(`   ${violation.description}`);
      });
    }

    // Dependency Inversion Principle
    console.log('\n## DEPENDENCY INVERSION PRINCIPLE VIOLATIONS\n');
    console.log(`Dependency violations: ${this.violations.dependencyInversion.length}`);

    if (this.violations.dependencyInversion.length > 0) {
      console.log('\nDIP Violations:');
      this.violations.dependencyInversion.slice(0, 10).forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.file}`);
        console.log(`   Issue: ${violation.issue}`);
        console.log(`   ${violation.description} (${violation.occurrences} occurrences)`);
      });
    }

    // Summary
    console.log('\n## SOLID COMPLIANCE SUMMARY\n');
    const totalViolations =
      this.violations.singleResponsibility.length +
      this.violations.openClosed.length +
      this.violations.liskovSubstitution.length +
      this.violations.interfaceSegregation.length +
      this.violations.dependencyInversion.length;

    console.log(`Total SOLID violations: ${totalViolations}`);
    console.log(`- SRP violations: ${this.violations.singleResponsibility.length}`);
    console.log(`- OCP violations: ${this.violations.openClosed.length}`);
    console.log(`- LSP violations: ${this.violations.liskovSubstitution.length}`);
    console.log(`- ISP violations: ${this.violations.interfaceSegregation.length}`);
    console.log(`- DIP violations: ${this.violations.dependencyInversion.length}`);
  }
}

// Main execution
async function analyzeSOLID() {
  const analyzer = new SOLIDAnalyzer();
  const srcDir = path.join(process.cwd(), 'src');
  const electronDir = path.join(process.cwd(), 'electron');

  // Get all TypeScript files
  const getAllFiles = (dir, fileList = []) => {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
          if (!['node_modules', 'dist', 'release', '.git'].includes(file)) {
            getAllFiles(filePath, fileList);
          }
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          fileList.push(filePath);
        }
      });
    } catch (error) {
      // Skip directories that can't be read
    }
    return fileList;
  };

  const files = [...getAllFiles(srcDir), ...getAllFiles(electronDir)];

  console.log(`Analyzing ${files.length} files for SOLID principles...\n`);

  // Analyze each file
  files.forEach(file => {
    analyzer.analyzeFile(file);
  });

  // Generate report
  analyzer.generateReport();
}

analyzeSOLID();