# CodeQL Security Scanning Configuration

## Overview

This directory contains the CodeQL configuration for Justice Companion. CodeQL performs automated security analysis to detect vulnerabilities in the codebase.

## Configuration Files

### `codeql-config.yml`

Defines what gets scanned and what queries to run:

- **Paths Included**: `src/`, `electron/`
- **Paths Excluded**: Test files, node_modules, build artifacts
- **Queries**: `security-extended`, `security-and-quality`

## Workflow

The CodeQL workflow (`.github/workflows/codeql.yml`) runs:

1. **On every push** to main/develop branches
2. **On every pull request** to main/develop branches
3. **Weekly on Monday** at 6:00 AM UTC (scheduled scan)

## Languages Scanned

- ✅ JavaScript
- ✅ TypeScript
- ❌ Python (not present in project)

## Security Queries

### security-extended

- SQL injection
- Cross-site scripting (XSS)
- Path traversal
- Command injection
- Insecure randomness
- Weak cryptography

### security-and-quality

- Code quality issues
- Best practice violations
- Potential bugs
- Maintainability issues

## Viewing Results

CodeQL results appear in:

1. **GitHub Security Tab** → Code scanning alerts
2. **Pull Request Checks** → "CodeQL" check
3. **Actions Tab** → "CodeQL Security Scanning" workflow runs

## Local Testing

To test CodeQL locally (requires GitHub CLI):

```bash
# Install CodeQL CLI
gh extension install github/gh-codeql

# Run CodeQL analysis
gh codeql database create codeql-db --language=javascript-typescript
gh codeql database analyze codeql-db --format=sarif-latest --output=results.sarif
```

## Customization

To add custom queries:

1. Add query packs to `codeql-config.yml`:

   ```yaml
   queries:
     - uses: security-extended
     - uses: security-and-quality
     - uses: /path/to/custom/queries
   ```

2. Exclude additional paths:
   ```yaml
   paths-ignore:
     - '**/generated/**'
     - '**/vendor/**'
   ```

## Troubleshooting

### No code found errors

- Check that paths in `paths:` actually contain code
- Verify language detection is correct

### Out of memory errors

- Reduce scanned paths in `codeql-config.yml`
- Increase runner memory in workflow file

### Query timeout errors

- Remove time-intensive queries
- Split analysis into multiple jobs

## More Information

- [CodeQL Documentation](https://codeql.github.com/docs/)
- [CodeQL Query Reference](https://codeql.github.com/codeql-query-help/)
- [GitHub Code Scanning](https://docs.github.com/en/code-security/code-scanning)
