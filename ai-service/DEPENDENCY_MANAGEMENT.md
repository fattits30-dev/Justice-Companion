# AI Service Dependency Management

This document outlines the dependency management strategy for the Justice Companion AI Service.

## Requirements Files Overview

### `requirements.txt` - Main Dependencies
- Flexible versioning with upper bounds for security
- Used for general development and CI/CD
- Allows patch and minor updates automatically

### `requirements-dev.txt` - Development Dependencies
- Includes all runtime dependencies plus development tools
- Use for local development: `pip install -r requirements-dev.txt`

### `requirements-prod.txt` - Production Dependencies
- Pinned exact versions for reproducible deployments
- Generated using `pip-compile` from `requirements.in`

### `requirements.in` - Dependency Template
- Input file for `pip-compile`
- Contains version constraints for production builds

## Installation Commands

```bash
# Development environment
pip install -r requirements-dev.txt

# Production environment
pip install -r requirements-prod.txt

# Generate production requirements
pip-compile --output-file=requirements-prod.txt requirements.in
```

## Security Considerations

### Active Security Monitoring
- Regular Snyk scans to identify vulnerabilities
- Dependencies monitored for CVEs and security advisories
- Critical dependencies (Hugging Face, AI libraries) prioritized

### Current Security Notes
- **python-multipart**: Resource allocation vulnerabilities - monitoring for fixes
- **starlette**: ReDoS and resource allocation issues - FastAPI dependency
- **torch**: Temporarily removed due to unresolved security advisories

### Dependency Updates
- Weekly automated security scans
- Monthly dependency updates with compatibility testing
- Major version updates require security review

## Best Practices

1. **Never pin exact versions in `requirements.txt`** - prevents security updates
2. **Always use upper bounds** - prevents breaking changes from major updates
3. **Keep dependencies minimal** - each dependency increases security surface
4. **Regular audits** - remove unused dependencies quarterly
5. **Test updates** - always test dependency updates in staging

## Security Tools Integration

Development environments include:
- `pip-audit`: Automated security vulnerability scanning
- `safety`: Additional security checking
- `bandit`: Static security analysis for code
- `pre-commit`: Automated quality checks

Run security scans with:
```bash
pip-audit
safety check
bandit -r .
```

## Emergency Security Updates

If a critical vulnerability is found:
1. Freeze deployment until fix is available
2. Update vulnerable dependencies immediately
3. Test thoroughly in staging environment
4. Deploy with monitoring
5. Communicate with stakeholders

## Monitoring

- Automated alerts for new security advisories
- Dependency health tracking
- Version drift monitoring across environments
