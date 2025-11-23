# Rate Limiting Guide for Justice Companion

## Overview

Justice Companion includes **optional, user-controlled rate limiting** for authentication endpoints. Rate limiting is **DISABLED by default** to ensure smooth development, testing, and single-user deployments.

## Quick Decision Matrix

| Deployment Scenario      | Enable Rate Limiting? | Reasoning                                      |
| ------------------------ | --------------------- | ---------------------------------------------- |
| Local development        | NO                    | Interferes with testing, no security risk      |
| E2E testing              | NO                    | Causes test failures, blocks rapid test runs   |
| CI/CD pipelines          | NO                    | Causes build failures, unnecessary overhead    |
| Single-user desktop app  | NO                    | No multi-user access, no attack vector         |
| Private network (office) | OPTIONAL              | Low risk if network is trusted                 |
| Public cloud deployment  | **YES**               | Exposed to internet, high brute-force risk     |
| Shared hosting           | **YES**               | Multiple users, shared IP spaces               |
| Production SaaS          | **YES**               | Must protect against mass registration/attacks |

## Why Rate Limiting is Disabled by Default

### 1. **Development Experience**

- Developers frequently register/login during testing
- Rate limits would trigger constantly during development
- Creates frustration and slows development velocity

### 2. **Testing Requirements**

- E2E tests create multiple users rapidly
- Integration tests may repeat auth flows
- Rate limits cause test failures and flakiness

### 3. **Deployment Flexibility**

- Single-user desktop deployments don't need rate limiting
- Private network deployments may not face external threats
- Users can choose their own security posture

### 4. **Security by Design, Not Security by Annoyance**

- Rate limiting should be **opt-in** when it serves a real purpose
- Forced rate limiting without justification creates bad UX
- Users should understand **why** they're enabling it

## When to Enable Rate Limiting

### Scenario 1: Public Cloud Deployment (Railway, Heroku, AWS, etc.)

**Risk:** Your backend is exposed to the internet. Attackers can:

- Attempt brute-force password attacks (login endpoint)
- Create thousands of spam accounts (registration endpoint)
- Abuse password change functionality (password change endpoint)

**Recommendation:** **ENABLE rate limiting**

```env
ENABLE_RATE_LIMITING=true
RATE_LIMIT_REGISTER_MAX_REQUESTS=3
RATE_LIMIT_REGISTER_WINDOW_SECONDS=3600
RATE_LIMIT_LOGIN_MAX_REQUESTS=5
RATE_LIMIT_LOGIN_WINDOW_SECONDS=900
```

**Why these limits?**

- **Registration (3 per hour per IP):** Prevents mass spam account creation while allowing legitimate users to retry if they make typos
- **Login (5 per 15 min per user):** Prevents brute-force attacks while allowing legitimate users to recover from forgotten passwords
- **Password Change (5 per hour):** Prevents abuse while allowing users to correct mistakes

### Scenario 2: Shared Hosting Environment

**Risk:** Multiple applications share the same server/IP address. An attacker could:

- Target your application specifically
- Use your server resources for attacks
- Impact other users on the same host

**Recommendation:** **ENABLE rate limiting**

```env
ENABLE_RATE_LIMITING=true
# Use tighter limits for shared hosting
RATE_LIMIT_REGISTER_MAX_REQUESTS=2
RATE_LIMIT_REGISTER_WINDOW_SECONDS=3600
RATE_LIMIT_LOGIN_MAX_REQUESTS=3
RATE_LIMIT_LOGIN_WINDOW_SECONDS=900
```

### Scenario 3: Multi-User Production Instance

**Risk:** Multiple real users accessing the application. A malicious user could:

- Create bot accounts
- Brute-force other users' passwords
- Abuse registration to claim all usernames

**Recommendation:** **ENABLE rate limiting**

```env
ENABLE_RATE_LIMITING=true
RATE_LIMIT_REGISTER_MAX_REQUESTS=3
RATE_LIMIT_REGISTER_WINDOW_SECONDS=3600
RATE_LIMIT_LOGIN_MAX_REQUESTS=5
RATE_LIMIT_LOGIN_WINDOW_SECONDS=900
```

### Scenario 4: High-Value Data

**Risk:** Your Justice Companion instance contains sensitive legal case data. An attacker could:

- Attempt to gain unauthorized access
- Brute-force admin accounts
- Create accounts to probe for vulnerabilities

**Recommendation:** **ENABLE rate limiting** + additional security measures

```env
ENABLE_RATE_LIMITING=true
# Stricter limits for high-security deployments
RATE_LIMIT_REGISTER_MAX_REQUESTS=2
RATE_LIMIT_REGISTER_WINDOW_SECONDS=7200  # 2 hours
RATE_LIMIT_LOGIN_MAX_REQUESTS=3
RATE_LIMIT_LOGIN_WINDOW_SECONDS=1800  # 30 minutes
```

**Additional Recommendations:**

- Enable HTTPS (TLS) for all connections
- Use strong password requirements (already enforced)
- Enable audit logging (already implemented)
- Consider 2FA (future enhancement)
- Regularly review access logs

## When to Keep Rate Limiting Disabled

### Scenario 1: Local Development

**Why Disable:**

- You're the only user
- No external network access
- Frequent auth testing during development
- Rate limits would only slow you down

**Configuration:**

```env
ENABLE_RATE_LIMITING=false
```

### Scenario 2: E2E Testing / CI/CD

**Why Disable:**

- Automated tests create multiple users rapidly
- Tests may run auth flows repeatedly
- Rate limits cause test flakiness
- No real security risk in test environments

**Configuration:**

```env
ENABLE_RATE_LIMITING=false
```

### Scenario 3: Single-User Desktop Application

**Why Disable:**

- Only you use the application
- No network exposure (localhost only)
- No attack vector from external users
- Rate limiting provides no benefit

**Configuration:**

```env
ENABLE_RATE_LIMITING=false
```

### Scenario 4: Private Network Deployment (Trusted Office Network)

**Why Disable (or Optional):**

- Only trusted users on the network
- Firewall protects from external attacks
- Internal users may need to retry logins frequently
- Rate limiting may frustrate legitimate users

**Configuration:**

```env
# OPTIONAL: Enable with looser limits
ENABLE_RATE_LIMITING=false  # or true with higher limits
RATE_LIMIT_REGISTER_MAX_REQUESTS=10
RATE_LIMIT_REGISTER_WINDOW_SECONDS=3600
RATE_LIMIT_LOGIN_MAX_REQUESTS=10
RATE_LIMIT_LOGIN_WINDOW_SECONDS=900
```

## How Rate Limiting Works

### IP-Based Tracking (Registration)

Registration rate limiting tracks by **IP address** to prevent mass account creation from a single source.

```
Example:
- IP 192.168.1.100 attempts 3 registrations → ALLOWED
- IP 192.168.1.100 attempts 4th registration → BLOCKED (429 Too Many Requests)
- After 1 hour → Rate limit resets, IP can register again
```

### User-Based Tracking (Login)

Login rate limiting tracks by **user ID** to prevent brute-force attacks on specific accounts.

```
Example:
- User "john@example.com" fails login 5 times → BLOCKED (429 Too Many Requests)
- After 15 minutes → Rate limit resets, user can try again
```

### Rate Limit Response

When rate limited, the API returns:

```json
{
  "detail": {
    "message": "Too many registration attempts. Please try again later.",
    "rate_limit_info": {
      "retry_after_seconds": 2847
    }
  }
}
```

Status Code: `429 Too Many Requests`

## Configuration Reference

All rate limiting is configured via environment variables in `.env`:

```env
# Master toggle - enables/disables ALL rate limiting
ENABLE_RATE_LIMITING=false  # Default: false (disabled)

# Registration limits (IP-based)
RATE_LIMIT_REGISTER_MAX_REQUESTS=3  # Default: 3 attempts
RATE_LIMIT_REGISTER_WINDOW_SECONDS=3600  # Default: 1 hour

# Login limits (user-based)
RATE_LIMIT_LOGIN_MAX_REQUESTS=5  # Default: 5 attempts
RATE_LIMIT_LOGIN_WINDOW_SECONDS=900  # Default: 15 minutes

# Password change limits (user-based)
RATE_LIMIT_PASSWORD_MAX_REQUESTS=5  # Default: 5 attempts
RATE_LIMIT_PASSWORD_WINDOW_SECONDS=3600  # Default: 1 hour
```

## Security Best Practices

### 1. **Always Enable for Public Deployments**

If your backend is accessible from the public internet, **always enable rate limiting**. This is non-negotiable for security.

### 2. **Monitor Failed Attempts**

Enable audit logging (already implemented) to track:

- Failed login attempts
- Blocked registration attempts
- Rate limit triggers

Review logs regularly for suspicious patterns.

### 3. **Use HTTPS/TLS**

Rate limiting alone is not sufficient. Always use TLS encryption for:

- Protecting credentials in transit
- Preventing man-in-the-middle attacks
- Ensuring data integrity

### 4. **Strong Password Requirements**

Justice Companion enforces OWASP password requirements:

- Minimum 12 characters
- Mix of uppercase, lowercase, digits, special characters
- No common passwords

This complements rate limiting by making brute-force attacks exponentially harder.

### 5. **Regular Security Audits**

Periodically review:

- Access logs for unusual patterns
- Rate limit thresholds (adjust if too strict/loose)
- User account activity
- Failed authentication attempts

## Testing Rate Limits

To test rate limiting in a **non-production** environment:

1. **Enable rate limiting:**

   ```env
   ENABLE_RATE_LIMITING=true
   RATE_LIMIT_REGISTER_MAX_REQUESTS=2  # Low limit for testing
   ```

2. **Attempt multiple registrations:**

   ```bash
   # First attempt - SUCCESS
   curl -X POST http://localhost:8000/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"test1","email":"test1@example.com","password":"TestPassword123!"}'

   # Second attempt - SUCCESS
   curl -X POST http://localhost:8000/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"test2","email":"test2@example.com","password":"TestPassword123!"}'

   # Third attempt - BLOCKED (429 Too Many Requests)
   curl -X POST http://localhost:8000/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"test3","email":"test3@example.com","password":"TestPassword123!"}'
   ```

3. **Verify 429 response:**

   ```json
   {
     "detail": {
       "message": "Too many registration attempts. Please try again later.",
       "rate_limit_info": {
         "retry_after_seconds": 3600
       }
     }
   }
   ```

4. **Disable rate limiting for normal development:**
   ```env
   ENABLE_RATE_LIMITING=false
   ```

## Troubleshooting

### Problem: E2E Tests Failing with 429 Errors

**Cause:** Rate limiting is enabled during testing.

**Solution:** Disable rate limiting in test environment:

```env
ENABLE_RATE_LIMITING=false
```

### Problem: Legitimate Users Getting Rate Limited

**Cause:** Rate limits are too strict for your use case.

**Solution:** Increase limits in `.env`:

```env
RATE_LIMIT_REGISTER_MAX_REQUESTS=10  # Increase from 3 to 10
RATE_LIMIT_LOGIN_MAX_REQUESTS=10  # Increase from 5 to 10
```

### Problem: Rate Limits Not Working

**Cause:** `ENABLE_RATE_LIMITING` is set to `false`.

**Solution:** Enable rate limiting in `.env`:

```env
ENABLE_RATE_LIMITING=true
```

## Summary

- **Default:** Rate limiting is **DISABLED** for development/testing
- **Enable for:** Public clouds, shared hosting, multi-user production
- **Keep disabled for:** Local dev, E2E tests, single-user deployments
- **User controls:** All limits configurable via environment variables
- **Security:** Always use with HTTPS, strong passwords, audit logging

**The key principle:** Rate limiting should **help** your users when needed, not **annoy** them when unnecessary. Enable it when it serves a real security purpose, disable it when it doesn't.
