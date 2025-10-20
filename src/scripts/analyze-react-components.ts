/**
 * React Component Analysis Tool
 *
 * Analyzes React components to identify optimization opportunities:
 * - Components without React.memo()
 * - Missing useCallback for event handlers
 * - Missing useMemo for expensive computations
 * - Components that should be code-split
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.ts';

interface ComponentAnalysis {
  file: string;
  componentName: string;
  hasMemo: boolean;
  hasUseCallback: boolean;
  hasUseMemo: boolean;
  hasInlineHandlers: boolean;
  linesOfCode: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

const HIGH_PRIORITY_PATTERNS = [
  'ListItem',
  'Card',
  'Button',
  'Message',
  'Post',
  'Note',
  'Fact',
];

const EXCLUDE_PATTERNS = [
  '.test.tsx',
  '.example.tsx',
  'test-utils.tsx',
];

/**
 * Recursively find all .tsx files
 */
function findTsxFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (!entry.includes('node_modules') && !entry.includes('dist')) {
        findTsxFiles(fullPath, files);
      }
    } else if (entry.endsWith('.tsx')) {
      // Exclude test files
      if (!EXCLUDE_PATTERNS.some(pattern => fullPath.includes(pattern))) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Analyze a single component file
 */
function analyzeComponent(filePath: string): ComponentAnalysis | null {
  const content = readFileSync(filePath, 'utf-8');
  const fileName = filePath.split(/[/\\]/).pop() || '';
  const componentName = fileName.replace('.tsx', '');

  // Skip non-component files
  if (!content.includes('export') || (!content.includes('function') && !content.includes('const'))) {
    return null;
  }

  // Check for React patterns
  const hasMemo = /React\.memo|memo\(/.test(content);
  const hasUseCallback = /useCallback/.test(content);
  const hasUseMemo = /useMemo/.test(content);

  // Check for inline handlers (potential useCallback candidates)
  const hasInlineHandlers = /onClick=\{.*=>|onChange=\{.*=>|onSubmit=\{.*=>/.test(content);

  // Count lines of code (exclude empty lines and comments)
  const linesOfCode = content.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
  }).length;

  // Determine priority
  let priority: 'high' | 'medium' | 'low' = 'low';
  let reason = '';

  if (HIGH_PRIORITY_PATTERNS.some(pattern => componentName.includes(pattern))) {
    priority = 'high';
    reason = 'List item or frequently re-rendered component';
  } else if (hasInlineHandlers && !hasUseCallback) {
    priority = 'medium';
    reason = 'Has inline handlers without useCallback';
  } else if (linesOfCode > 100) {
    priority = 'medium';
    reason = 'Large component (>100 LOC)';
  }

  // Special cases
  if (componentName.includes('View')) {
    priority = 'low';
    reason = 'Top-level view component (rarely re-renders)';
  }

  return {
    file: filePath.replace(/\\/g, '/'),
    componentName,
    hasMemo,
    hasUseCallback,
    hasUseMemo,
    hasInlineHandlers,
    linesOfCode,
    priority,
    reason,
  };
}

/**
 * Main analysis function
 */
function analyzeReactComponents(): void {
  logger.info('ReactAnalysis', 'Analyzing React components for optimization opportunities...\n');

  const srcDir = join(process.cwd(), 'src');
  const tsxFiles = findTsxFiles(srcDir);

  logger.info('ReactAnalysis', `Found ${tsxFiles.length} component files\n`);

  const analyses: ComponentAnalysis[] = [];

  for (const file of tsxFiles) {
    const analysis = analyzeComponent(file);
    if (analysis) {
      analyses.push(analysis);
    }
  }

  // Group by priority
  const highPriority = analyses.filter(a => a.priority === 'high');
  const mediumPriority = analyses.filter(a => a.priority === 'medium');
  const lowPriority = analyses.filter(a => a.priority === 'low');

  // Statistics
  const withoutMemo = analyses.filter(a => !a.hasMemo);
  const withoutUseCallback = analyses.filter(a => a.hasInlineHandlers && !a.hasUseCallback);

  logger.info('ReactAnalysis', 'SUMMARY\n');
  logger.info('ReactAnalysis', '='.repeat(80));
  logger.info('ReactAnalysis', `Total Components: ${analyses.length}`);
  logger.info('ReactAnalysis', `Without React.memo(): ${withoutMemo.length} (${Math.round((withoutMemo.length / analyses.length) * 100)}%)`);
  logger.info('ReactAnalysis', `With inline handlers, no useCallback: ${withoutUseCallback.length}`);
  logger.info('ReactAnalysis', '='.repeat(80));
  logger.info('ReactAnalysis', '');

  // High priority components
  logger.info('ReactAnalysis', `HIGH PRIORITY (${highPriority.length} components)\n`);
  logger.info('ReactAnalysis', 'These should be optimized first:\n');

  highPriority.forEach(a => {
    logger.info('ReactAnalysis', `  ${a.componentName}`);
    logger.info('ReactAnalysis', `     File: ${a.file.replace(srcDir, 'src')}`);
    logger.info('ReactAnalysis', `     Reason: ${a.reason}`);
    logger.info('ReactAnalysis', `     Memo: ${a.hasMemo ? 'Yes' : 'No'} | useCallback: ${a.hasUseCallback ? 'Yes' : 'No'} | LOC: ${a.linesOfCode}`);
    logger.info('ReactAnalysis', '');
  });

  // Medium priority components
  logger.info('ReactAnalysis', `MEDIUM PRIORITY (${mediumPriority.length} components)\n`);
  logger.info('ReactAnalysis', 'Should be optimized after high priority:\n');

  mediumPriority.slice(0, 10).forEach(a => {
    logger.info('ReactAnalysis', `  ${a.componentName}`);
    logger.info('ReactAnalysis', `     Reason: ${a.reason}`);
    logger.info('ReactAnalysis', `     Memo: ${a.hasMemo ? 'Yes' : 'No'} | useCallback: ${a.hasUseCallback ? 'Yes' : 'No'}`);
    logger.info('ReactAnalysis', '');
  });

  if (mediumPriority.length > 10) {
    logger.info('ReactAnalysis', `  ... and ${mediumPriority.length - 10} more\n`);
  }

  // Recommendations
  logger.info('ReactAnalysis', '='.repeat(80));
  logger.info('ReactAnalysis', 'RECOMMENDATIONS\n');
  logger.info('ReactAnalysis', `1. Add React.memo() to ${highPriority.filter(a => !a.hasMemo).length} high-priority components`);
  logger.info('ReactAnalysis', `2. Add useCallback to ${withoutUseCallback.filter(a => a.priority === 'high').length} high-priority event handlers`);
  logger.info('ReactAnalysis', `3. Review ${mediumPriority.length} medium-priority components for optimization`);
  logger.info('ReactAnalysis', '='.repeat(80));
  logger.info('ReactAnalysis', '');

  // Export detailed report
  logger.info('ReactAnalysis', 'Detailed report saved to: src/scripts/component-analysis-report.json');

  const report = {
    summary: {
      total: analyses.length,
      withoutMemo: withoutMemo.length,
      withoutUseCallback: withoutUseCallback.length,
      highPriority: highPriority.length,
      mediumPriority: mediumPriority.length,
      lowPriority: lowPriority.length,
    },
    components: {
      highPriority,
      mediumPriority,
      lowPriority,
    },
  };

  // Write report to file
  writeFileSync(
    join(process.cwd(), 'src/scripts/component-analysis-report.json'),
    JSON.stringify(report, null, 2)
  );
}

// Run analysis
if (require.main === module) {
  analyzeReactComponents();
}

export { analyzeReactComponents };
