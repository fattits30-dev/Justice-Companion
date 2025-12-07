# Justice Companion - Deployment Guide

This guide covers deploying Justice Companion PWA to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Encryption Key Setup](#encryption-key-setup)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Deployment Options](#deployment-options)
- [Security Hardening](#security-hardening)
- [Monitoring](#monitoring)
- [Backup & Recovery](#backup--recovery)

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+ (recommended for production) or SQLite (development)
- Tesseract OCR
- Reverse proxy (nginx, Caddy, or cloud load balancer)
- SSL/TLS certificate (Let's Encrypt recommended)

## Encryption Key Setup

### ⚠️ CRITICAL: Understanding Encryption Keys

Justice Companion encrypts sensitive user data (PII, case notes, evidence metadata) with a 256-bit encryption key. **This is the most critical configuration step.**

**Key Facts:**

- Data encrypted with one key **CANNOT** be decrypted with another
- Losing the key = **PERMANENT DATA LOSS** for all users
- Backend **refuses to start** without `ENCRYPTION_KEY_BASE64`
- Key rotation requires re-encrypting all existing data

### Step 1: Generate Encryption Key

**Recommended method (Python):**

```bash
python -c 'import os, base64; print(base64.b64encode(os.urandom(32)).decode())'
```

**Output example:**
```
8kN2jH9fR3mP7qW5tY8uA1zX6cV4bN0mK3lJ7hG9fD5=
```

**Alternative methods:**

```bash
# Linux/macOS
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Step 2: Store Key Securely

**Production: Use Secrets Manager**

Choose one:

1. **AWS Secrets Manager** (recommended for AWS deployments)
   ```bash
   aws secretsmanager create-secret \
     --name justice-companion/encryption-key \
     --secret-string "YOUR_GENERATED_KEY"
   ```

2. **Azure Key Vault** (recommended for Azure deployments)
   ```bash
   az keyvault secret set \
     --vault-name your-vault-name \
     --name encryption-key \
     --value "YOUR_GENERATED_KEY"
   ```

3. **Google Secret Manager** (recommended for GCP deployments)
   ```bash
   echo -n "YOUR_GENERATED_KEY" | gcloud secrets create encryption-key --data-file=-
   ```

4. **1Password** / **Bitwarden** (for small deployments)
   - Store key in secure note
   - Use 1Password CLI for automated retrieval:
     ```bash
     op read "op://Private/Justice Companion/encryption_key"
     ```

**Development: Use .env File**

```bash
# Copy example file
cp .env.example .env

# Add your generated key
echo "ENCRYPTION_KEY_BASE64=YOUR_GENERATED_KEY" >> .env
```

⚠️ **NEVER commit .env to version control!**

### Step 3: Set Environment Variable

**For systemd service:**

```ini
# /etc/systemd/system/justice-companion.service
[Service]
Environment="ENCRYPTION_KEY_BASE64=YOUR_KEY_HERE"
# Or load from file
EnvironmentFile=/etc/justice-companion/secrets.env
```

**For Docker:**

```bash
docker run -e ENCRYPTION_KEY_BASE64="YOUR_KEY_HERE" justice-companion
```

**For Kubernetes:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: justice-companion-secrets
type: Opaque
stringData:
  encryption-key: YOUR_GENERATED_KEY
---
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: backend
        env:
        - name: ENCRYPTION_KEY_BASE64
          valueFrom:
            secretKeyRef:
              name: justice-companion-secrets
              key: encryption-key
```

### Step 4: Verify Backend Starts

```bash
# Should start successfully
python -m backend.main

# Should see:
# "EncryptionService initialized with persistent key"

# Without key, should fail immediately:
# RuntimeError: ENCRYPTION_KEY_BASE64 environment variable is required...
```

### Key Rotation Plan

**When to rotate:**

- Every 90 days (recommended)
- On suspected compromise
- When employee leaves with key access

**Rotation process:**

1. Generate new key
2. Re-encrypt all data with new key (requires downtime)
3. Update secrets manager
4. Restart backend
5. Archive old key securely (for emergency recovery)

**⚠️ Key rotation is a complex operation requiring custom migration script.**

## Environment Configuration

### Required Variables

```bash
# Encryption (REQUIRED)
ENCRYPTION_KEY_BASE64=your_generated_key_here

# Database (PostgreSQL recommended for production)
DATABASE_URL=postgresql://user:pass@localhost:5432/justice_companion

# Server
PORT=8000
HOST=0.0.0.0  # Required for cloud deployments

# CORS (frontend origin)
ALLOWED_ORIGINS=https://your-pwa-domain.com
```

### Optional Variables

```bash
# AI Mode
AI_MODE=sdk  # Options: stub, sdk, service

# Security
SESSION_SECRET=your_session_secret_here
JWT_SECRET=your_jwt_secret_here

# Feature Flags
ENABLE_TEST_ROUTES=false  # MUST be false in production

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project

# Performance
SLOW_REQUEST_THRESHOLD_MS=1000
ENABLE_METRICS=true
```

## Database Setup

### PostgreSQL (Production)

```bash
# Create database
createdb justice_companion

# Set connection string
export DATABASE_URL="postgresql://user:pass@localhost:5432/justice_companion"

# Run migrations
alembic upgrade head
```

### SQLite (Development)

```bash
# Auto-created on first run
export DATABASE_URL="sqlite:///./justice_companion.db"
```

## Deployment Options

### Option 1: Traditional Server (systemd)

1. **Install dependencies:**
   ```bash
   sudo apt update
   sudo apt install python3.10 python3-pip nodejs npm tesseract-ocr
   ```

2. **Clone and setup:**
   ```bash
   git clone https://github.com/your-repo/justice-companion.git
   cd justice-companion
   npm install
   pip install -r backend/requirements.txt
   ```

3. **Build frontend:**
   ```bash
   npm run build
   ```

4. **Create systemd service:**
   ```ini
   # /etc/systemd/system/justice-companion.service
   [Unit]
   Description=Justice Companion Backend
   After=network.target postgresql.service

   [Service]
   Type=simple
   User=justice
   WorkingDirectory=/opt/justice-companion
   EnvironmentFile=/etc/justice-companion/secrets.env
   ExecStart=/usr/bin/python3 -m backend.main
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

5. **Enable and start:**
   ```bash
   sudo systemctl enable justice-companion
   sudo systemctl start justice-companion
   ```

### Option 2: Docker

1. **Build image:**
   ```bash
   docker build -t justice-companion .
   ```

2. **Run container:**
   ```bash
   docker run -d \
     -p 8000:8000 \
     -e ENCRYPTION_KEY_BASE64="YOUR_KEY" \
     -e DATABASE_URL="postgresql://..." \
     -v /data/justice-companion:/data \
     --name justice-companion \
     justice-companion
   ```

### Option 3: Cloud Platforms

#### Heroku

```bash
heroku create your-app-name
heroku addons:create heroku-postgresql:mini
heroku config:set ENCRYPTION_KEY_BASE64="YOUR_KEY"
git push heroku main
```

#### AWS (Elastic Beanstalk)

```bash
eb init justice-companion
eb create production
eb setenv ENCRYPTION_KEY_BASE64="YOUR_KEY"
eb deploy
```

#### Google Cloud (Cloud Run)

```bash
gcloud run deploy justice-companion \
  --source . \
  --set-secrets ENCRYPTION_KEY_BASE64=encryption-key:latest
```

## Security Hardening

### 1. Reverse Proxy (nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Backend proxy
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend (PWA)
    location / {
        root /var/www/justice-companion;
        try_files $uri $uri/ /index.html;
    }
}
```

### 2. Firewall Rules

```bash
# Allow only HTTPS and SSH
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 443/tcp
ufw enable
```

### 3. Database Security

```sql
-- Create restricted user
CREATE USER justice_app WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE justice_companion TO justice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO justice_app;
```

## Monitoring

### Application Metrics

```bash
# Access metrics endpoint
curl http://localhost:8000/metrics
```

**Key metrics to monitor:**

- `http_requests_total` - Request count
- `http_request_duration_ms` - Response time
- `http_error_rate` - Error percentage
- `process_memory_mb` - Memory usage
- `db_queries_total` - Database load

### Logging

**Structured JSON logs** are written to stdout:

```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "level": "info",
  "message": "Request completed",
  "correlation_id": "abc-123-def",
  "method": "GET",
  "path": "/cases",
  "status_code": 200,
  "duration_ms": 45.23
}
```

**Send to centralized logging:**

```bash
# Using Loki
journalctl -u justice-companion -f -o json | promtail -config.file=/etc/promtail/config.yml

# Using ELK
journalctl -u justice-companion -f -o json | filebeat -e
```

### Health Checks

```bash
# Basic health
curl http://localhost:8000/health

# Response:
# {"status": "healthy", "service": "Justice Companion Backend", "version": "1.0.0"}
```

## Backup & Recovery

### Database Backups

**PostgreSQL:**

```bash
# Daily backup script
pg_dump justice_companion | gzip > backup-$(date +%Y%m%d).sql.gz

# Restore
gunzip < backup-20250115.sql.gz | psql justice_companion
```

**Automated backup (cron):**

```cron
0 2 * * * /usr/local/bin/backup-justice-companion.sh
```

### Encryption Key Backup

⚠️ **CRITICAL: Backup encryption key separately from database**

**Best practices:**

1. **Primary backup**: Secrets manager (AWS/Azure/GCP)
2. **Secondary backup**: Encrypted USB drive in physical safe
3. **Tertiary backup**: Paper copy in safety deposit box

**⚠️ DO NOT:**
- Store key in database
- Email key to anyone
- Store key in application code
- Store key in version control

### Disaster Recovery Plan

1. **Restore database** from latest backup
2. **Retrieve encryption key** from secrets manager
3. **Deploy application** with restored key
4. **Verify** data can be decrypted
5. **Test** critical user workflows

**Recovery Time Objective (RTO):** < 1 hour
**Recovery Point Objective (RPO):** < 24 hours (daily backups)

## Troubleshooting

### Backend won't start

```bash
# Check encryption key
echo $ENCRYPTION_KEY_BASE64

# Should output your key, NOT be empty
# If empty:
python -c 'import os, base64; print(base64.b64encode(os.urandom(32)).decode())'
```

### Existing data can't be decrypted

**Cause:** Encryption key changed or lost

**Solution:**

1. Restore key from backup
2. If key truly lost: data is permanently inaccessible
3. Start fresh with new key (user data will be lost)

### Performance issues

```bash
# Check slow queries
grep "slow_request" /var/log/justice-companion.log

# Check database performance
psql -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Check system resources
htop
```

## Production Checklist

Before going live:

- [ ] Encryption key generated and stored in secrets manager
- [ ] Database backups configured (automated daily)
- [ ] SSL/TLS certificate installed (HTTPS)
- [ ] Firewall rules configured
- [ ] Monitoring/alerting set up
- [ ] Health check endpoint verified
- [ ] Load testing completed
- [ ] Disaster recovery plan documented
- [ ] Team knows how to restore from backup
- [ ] `ENABLE_TEST_ROUTES=false` in production
- [ ] `.env` file NOT committed to version control
- [ ] Encryption key backup stored in 3 locations

## Support

For deployment issues:

- GitHub Issues: https://github.com/your-repo/justice-companion/issues
- Documentation: https://your-docs-site.com
- Security concerns: security@your-domain.com

---

**Last Updated:** 2025-01-15
**Version:** 1.0.0
