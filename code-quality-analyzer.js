const fs = require('fs');
const path = require('path');

// Complexity analysis utilities
class CodeQualityAnalyzer {
  constructor() {
    this.results = {
      complexity: [],
      longFunctions: [],
      longParameterLists: [],
      anyTypeUsage: [],
      godClasses: [],
      duplicatePatterns: [],
      magicNumbers: [],
      codeSmells: []
    };
  }

  analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.relative(process.cwd(), filePath);

      // Skip test files for some metrics
      const isTestFile = fileName.includes('.test.') || fileName.includes('.spec.');

      // Analyze cyclomatic complexity (simplified)
      this.analyzeCyclomaticComplexity(content, fileName);

      // Check function lengths
      this.analyzeFunctionLengths(content, fileName);

      // Check parameter lists
      this.analyzeParameterLists(content, fileName);

      // Check for 'any' type usage
      if (!isTestFile) {
        this.analyzeAnyTypes(content, fileName);
      }

      // Check class sizes (god classes)
      this.analyzeClassSizes(content, fileName);

      // Check for magic numbers/strings
      this.analyzeMagicValues(content, fileName);

      // General code smells
      this.analyzeCodeSmells(content, fileName);

    } catch (error) {
      // Skip files that can't be read
    }
  }

  analyzeCyclomaticComplexity(content, fileName) {
    const complexityIndicators = [
      /\bif\s*\(/g,
      /\belse\s+if\s*\(/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\bdo\s*\{/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /\?\s*:/g, // ternary operators
      /&&/g,
      /\|\|/g
    ];

    // Extract functions/methods
    const functionRegex = /(?:function\s+(\w+)|(\w+)\s*:\s*(?:async\s+)?(?:\([^)]*\)|\w+)\s*=>|(\w+)\s*\([^)]*\)\s*\{)/g;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1] || match[2] || match[3] || 'anonymous';
      const startIndex = match.index;

      // Find the function body (simplified - looks for balanced braces)
      let braceCount = 0;
      let inFunction = false;
      let endIndex = startIndex;

      for (let i = startIndex; i < content.length && i < startIndex + 2000; i++) {
        if (content[i] === '{') {
          braceCount++;
          inFunction = true;
        } else if (content[i] === '}') {
          braceCount--;
          if (inFunction && braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }

      if (endIndex > startIndex) {
        const functionBody = content.substring(startIndex, endIndex + 1);
        let complexity = 1; // Base complexity

        complexityIndicators.forEach(pattern => {
          const matches = functionBody.match(pattern);
          if (matches) {
            complexity += matches.length;
          }
        });

        if (complexity > 10) {
          this.results.complexity.push({
            file: fileName,
            function: functionName,
            complexity: complexity,
            severity: complexity > 20 ? 'high' : 'medium'
          });
        }
      }
    }
  }

  analyzeFunctionLengths(content, fileName) {
    const lines = content.split('\n');
    const functionStarts = [];

    lines.forEach((line, index) => {
      if (line.match(/(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=.*=>|\w+\s*\([^)]*\)\s*\{)/)) {
        functionStarts.push(index);
      }
    });

    functionStarts.forEach(startLine => {
      let braceCount = 0;
      let functionLength = 0;
      let inFunction = false;

      for (let i = startLine; i < lines.length && i < startLine + 200; i++) {
        const line = lines[i];

        if (line.includes('{')) {
          braceCount += (line.match(/\{/g) || []).length;
          inFunction = true;
        }
        if (line.includes('}')) {
          braceCount -= (line.match(/\}/g) || []).length;
        }

        functionLength++;

        if (inFunction && braceCount === 0) {
          if (functionLength > 50) {
            const functionName = lines[startLine].match(/(?:function\s+(\w+)|(\w+)\s*[:=])/)?.[1] || 'anonymous';
            this.results.longFunctions.push({
              file: fileName,
              function: functionName,
              lines: functionLength,
              startLine: startLine + 1,
              severity: functionLength > 100 ? 'high' : 'medium'
            });
          }
          break;
        }
      }
    });
  }

  analyzeParameterLists(content, fileName) {
    const paramRegex = /(?:function\s+\w+|\w+\s*[:=]\s*(?:async\s+)?)\s*\(([^)]*)\)/g;
    let match;

    while ((match = paramRegex.exec(content)) !== null) {
      const params = match[1];
      if (params) {
        const paramCount = params.split(',').filter(p => p.trim()).length;
        if (paramCount > 3) {
          const functionName = content.substring(Math.max(0, match.index - 30), match.index + 30)
            .match(/(\w+)\s*[:=()]/)?.[ 1] || 'anonymous';

          this.results.longParameterLists.push({
            file: fileName,
            function: functionName,
            paramCount: paramCount,
            severity: paramCount > 5 ? 'high' : 'medium'
          });
        }
      }
    }
  }

  analyzeAnyTypes(content, fileName) {
    const anyRegex = /:\s*any(?:\s|;|,|\)|>)/g;
    const matches = content.match(anyRegex);

    if (matches && matches.length > 0) {
      this.results.anyTypeUsage.push({
        file: fileName,
        count: matches.length,
        severity: matches.length > 5 ? 'high' : matches.length > 2 ? 'medium' : 'low'
      });
    }
  }

  analyzeClassSizes(content, fileName) {
    const classRegex = /class\s+(\w+)/g;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const startIndex = match.index;

      // Count methods and properties
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
      const methodCount = (classBody.match(/(?:public|private|protected)?\s*(?:async\s+)?\w+\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{/g) || []).length;
      const propertyCount = (classBody.match(/(?:public|private|protected)?\s*\w+\s*[:=]/g) || []).length;

      if (methodCount > 10 || propertyCount > 15) {
        this.results.godClasses.push({
          file: fileName,
          className: className,
          methodCount: methodCount,
          propertyCount: propertyCount,
          severity: (methodCount > 20 || propertyCount > 30) ? 'high' : 'medium'
        });
      }
    }
  }

  analyzeMagicValues(content, fileName) {
    // Skip imports and requires
    const cleanContent = content.replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
                                .replace(/require\s*\(['"].*?['"]\)/g, '');

    // Look for magic numbers (not 0, 1, -1)
    const magicNumberRegex = /(?<![a-zA-Z0-9_])(-?\d+(?:\.\d+)?)/g;
    let match;
    const magicNumbers = [];

    while ((match = magicNumberRegex.exec(cleanContent)) !== null) {
      const num = parseFloat(match[1]);
      if (![0, 1, -1, 2, 10, 100, 1000].includes(num) && !match[0].includes('.')) {
        magicNumbers.push(num);
      }
    }

    // Look for hardcoded strings (potential magic strings)
    const magicStringRegex = /['"]([^'"]{5,50})['"]/g;
    const magicStrings = [];

    while ((match = magicStringRegex.exec(cleanContent)) !== null) {
      const str = match[1];
      // Filter out common non-magic strings
      if (!str.match(/^(https?:|\/\/|\.\/|test|describe|it|should|expect|error|warning|info|debug)/i)) {
        magicStrings.push(str);
      }
    }

    if (magicNumbers.length > 3 || magicStrings.length > 5) {
      this.results.magicNumbers.push({
        file: fileName,
        numbers: [...new Set(magicNumbers)].slice(0, 5),
        strings: [...new Set(magicStrings)].slice(0, 5),
        severity: (magicNumbers.length > 10 || magicStrings.length > 15) ? 'high' : 'medium'
      });
    }
  }

  analyzeCodeSmells(content, fileName) {
    const smells = [];

    // Check for console.log statements (should use logger)
    if (content.match(/console\.(log|error|warn|info)/g)) {
      smells.push({
        type: 'console-usage',
        description: 'Direct console usage instead of logger utility'
      });
    }

    // Check for nested ternary operators
    if (content.match(/\?.*\?.*:/g)) {
      smells.push({
        type: 'nested-ternary',
        description: 'Nested ternary operators reduce readability'
      });
    }

    // Check for TODO/FIXME comments
    const todoMatches = content.match(/\/\/\s*(TODO|FIXME|HACK|XXX)/gi);
    if (todoMatches) {
      smells.push({
        type: 'todo-comments',
        description: `Found ${todoMatches.length} TODO/FIXME comments`
      });
    }

    // Check for commented out code
    const commentedCode = content.match(/\/\/.*(?:function|const|let|var|if|for|while|class)/g);
    if (commentedCode && commentedCode.length > 2) {
      smells.push({
        type: 'commented-code',
        description: 'Commented out code should be removed'
      });
    }

    // Check for duplicate imports
    const imports = content.match(/import\s+.*?from\s+['"](.+?)['"]/g) || [];
    const importSources = imports.map(imp => imp.match(/from\s+['"](.+?)['"]/)?.[1]);
    const duplicates = importSources.filter((item, index) => importSources.indexOf(item) !== index);
    if (duplicates.length > 0) {
      smells.push({
        type: 'duplicate-imports',
        description: 'Duplicate import statements'
      });
    }

    if (smells.length > 0) {
      this.results.codeSmells.push({
        file: fileName,
        smells: smells,
        count: smells.length
      });
    }
  }

  generateReport() {
    console.log('\n=== CODE QUALITY ANALYSIS REPORT ===\n');

    // Complexity Summary
    console.log('## CYCLOMATIC COMPLEXITY\n');
    console.log(`Total complex functions: ${this.results.complexity.length}`);
    const highComplexity = this.results.complexity.filter(c => c.severity === 'high');
    console.log(`High complexity (>20): ${highComplexity.length}`);
    console.log(`Medium complexity (10-20): ${this.results.complexity.length - highComplexity.length}`);

    if (this.results.complexity.length > 0) {
      console.log('\nTop 10 Most Complex Functions:');
      this.results.complexity
        .sort((a, b) => b.complexity - a.complexity)
        .slice(0, 10)
        .forEach((item, index) => {
          console.log(`${index + 1}. ${item.file} - ${item.function}() [Complexity: ${item.complexity}]`);
        });
    }

    // Long Functions
    console.log('\n## FUNCTION LENGTH ANALYSIS\n');
    console.log(`Functions exceeding 50 lines: ${this.results.longFunctions.length}`);
    if (this.results.longFunctions.length > 0) {
      console.log('\nTop 10 Longest Functions:');
      this.results.longFunctions
        .sort((a, b) => b.lines - a.lines)
        .slice(0, 10)
        .forEach((item, index) => {
          console.log(`${index + 1}. ${item.file}:${item.startLine} - ${item.function}() [${item.lines} lines]`);
        });
    }

    // Parameter Lists
    console.log('\n## PARAMETER LIST ANALYSIS\n');
    console.log(`Functions with >3 parameters: ${this.results.longParameterLists.length}`);
    if (this.results.longParameterLists.length > 0) {
      console.log('\nFunctions with Most Parameters:');
      this.results.longParameterLists
        .sort((a, b) => b.paramCount - a.paramCount)
        .slice(0, 10)
        .forEach((item, index) => {
          console.log(`${index + 1}. ${item.file} - ${item.function}() [${item.paramCount} params]`);
        });
    }

    // TypeScript 'any' Usage
    console.log('\n## TYPESCRIPT ANY TYPE USAGE\n');
    const totalAny = this.results.anyTypeUsage.reduce((sum, item) => sum + item.count, 0);
    console.log(`Total 'any' type occurrences: ${totalAny}`);
    console.log(`Files with 'any' types: ${this.results.anyTypeUsage.length}`);
    if (this.results.anyTypeUsage.length > 0) {
      console.log('\nFiles with Most any Types:');
      this.results.anyTypeUsage
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .forEach((item, index) => {
          console.log(`${index + 1}. ${item.file} [${item.count} occurrences]`);
        });
    }

    // God Classes
    console.log('\n## GOD CLASSES ANALYSIS\n');
    console.log(`Potential god classes: ${this.results.godClasses.length}`);
    if (this.results.godClasses.length > 0) {
      console.log('\nLargest Classes:');
      this.results.godClasses
        .sort((a, b) => (b.methodCount + b.propertyCount) - (a.methodCount + a.propertyCount))
        .slice(0, 10)
        .forEach((item, index) => {
          console.log(`${index + 1}. ${item.file} - ${item.className} [${item.methodCount} methods, ${item.propertyCount} properties]`);
        });
    }

    // Magic Values
    console.log('\n## MAGIC VALUES ANALYSIS\n');
    console.log(`Files with magic numbers/strings: ${this.results.magicNumbers.length}`);
    if (this.results.magicNumbers.length > 0) {
      console.log('\nFiles with Most Magic Values:');
      this.results.magicNumbers
        .slice(0, 5)
        .forEach((item, index) => {
          console.log(`${index + 1}. ${item.file}`);
          if (item.numbers.length > 0) {
            console.log(`   Numbers: ${item.numbers.join(', ')}`);
          }
          if (item.strings.length > 0) {
            console.log(`   Strings: ${item.strings.map(s => `"${s}"`).join(', ')}`);
          }
        });
    }

    // Code Smells
    console.log('\n## CODE SMELLS\n');
    const smellCounts = {};
    this.results.codeSmells.forEach(item => {
      item.smells.forEach(smell => {
        smellCounts[smell.type] = (smellCounts[smell.type] || 0) + 1;
      });
    });

    console.log(`Files with code smells: ${this.results.codeSmells.length}`);
    if (Object.keys(smellCounts).length > 0) {
      console.log('\nCode Smell Distribution:');
      Object.entries(smellCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          console.log(`- ${type}: ${count} files`);
        });
    }

    // Overall Quality Score
    console.log('\n## QUALITY METRICS SUMMARY\n');
    const qualityScore = this.calculateQualityScore();
    console.log(`Overall Quality Score: ${qualityScore.overall}/100`);
    console.log(`- Complexity Score: ${qualityScore.complexity}/20`);
    console.log(`- Clean Code Score: ${qualityScore.cleanCode}/20`);
    console.log(`- Type Safety Score: ${qualityScore.typeSafety}/20`);
    console.log(`- Maintainability Score: ${qualityScore.maintainability}/20`);
    console.log(`- Best Practices Score: ${qualityScore.bestPractices}/20`);

    // Technical Debt Estimate
    console.log('\n## TECHNICAL DEBT ESTIMATE\n');
    const debtDays = this.estimateTechnicalDebt();
    console.log(`Estimated Technical Debt: ${debtDays} developer-days`);
    console.log(`- High priority issues: ${Math.round(debtDays * 0.4)} days`);
    console.log(`- Medium priority issues: ${Math.round(debtDays * 0.4)} days`);
    console.log(`- Low priority issues: ${Math.round(debtDays * 0.2)} days`);
  }

  calculateQualityScore() {
    const scores = {
      complexity: 20,
      cleanCode: 20,
      typeSafety: 20,
      maintainability: 20,
      bestPractices: 20
    };

    // Deduct points for issues
    scores.complexity -= Math.min(15, this.results.complexity.filter(c => c.severity === 'high').length * 2);
    scores.cleanCode -= Math.min(15, this.results.longFunctions.length * 0.5 + this.results.longParameterLists.length * 0.5);
    scores.typeSafety -= Math.min(18, this.results.anyTypeUsage.reduce((sum, item) => sum + item.count, 0) * 0.2);
    scores.maintainability -= Math.min(15, this.results.godClasses.length * 2 + this.results.magicNumbers.length * 0.5);
    scores.bestPractices -= Math.min(15, this.results.codeSmells.length * 0.3);

    // Round scores
    Object.keys(scores).forEach(key => {
      scores[key] = Math.max(0, Math.round(scores[key]));
    });

    scores.overall = Object.values(scores).reduce((sum, score) => sum + score, 0);

    return scores;
  }

  estimateTechnicalDebt() {
    let days = 0;

    // High complexity functions: 0.5 days each
    days += this.results.complexity.filter(c => c.severity === 'high').length * 0.5;

    // Long functions: 0.25 days each
    days += this.results.longFunctions.filter(f => f.severity === 'high').length * 0.25;

    // God classes: 1 day each
    days += this.results.godClasses.filter(c => c.severity === 'high').length * 1;

    // Any types: 0.1 days per 10 occurrences
    const totalAny = this.results.anyTypeUsage.reduce((sum, item) => sum + item.count, 0);
    days += (totalAny / 10) * 0.1;

    // Magic values: 0.2 days per file
    days += this.results.magicNumbers.length * 0.2;

    // Code smells: 0.1 days per file
    days += this.results.codeSmells.length * 0.1;

    return Math.round(days);
  }
}

// Main execution
async function analyzeCodebase() {
  const analyzer = new CodeQualityAnalyzer();
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

  console.log(`Analyzing ${files.length} TypeScript files...\n`);

  // Analyze each file
  files.forEach(file => {
    analyzer.analyzeFile(file);
  });

  // Generate report
  analyzer.generateReport();
}

analyzeCodebase();