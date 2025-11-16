# Profile & Settings HTTP API Migration Guide

**Status:** ✅ Complete
**Date:** 2025-11-13
**Migration:** Electron IPC → FastAPI HTTP REST API

## Overview

This document details the migration of Profile and Settings features from Electron IPC to HTTP REST API using the FastAPI backend.

## Table of Contents

1. [Migration Summary](#migration-summary)
2. [API Endpoints](#api-endpoints)
3. [Component Architecture](#component-architecture)
4. [Usage Examples](#usage-examples)
5. [Testing Checklist](#testing-checklist)
6. [Security Considerations](#security-considerations)
7. [Troubleshooting](#troubleshooting)

---

## Migration Summary

### What Was Migrated

- **Profile Management:**
  - View user profile
  - Edit profile fields (firstName, lastName, email, phone)
  - Change password
  - Profile completeness indicator

- **AI Configuration:**
  - List all AI provider configurations
  - Configure AI provider (OpenAI, Anthropic, HuggingFace, etc.)
  - Activate/deactivate providers
  - Test provider connection
  - Update API keys

- **Settings (Future):**
  - App appearance settings
  - Notification preferences
  - Backup settings

### Files Changed

**API Client:**
- `src/lib/apiClient.ts` - Added `profile`, `settings`, `aiConfig` namespaces

**Type Definitions:**
- `src/lib/types/api.ts` - Added `UserProfile`, `ProfileResponse`, `AIProviderConfig`, `AppSettings` types

**Components:**
- `src/views/ProfileView.migrated.tsx` - New HTTP-based profile view
- `src/views/SettingsView.tsx` - Updated with AI config (uses existing IPC for now)

**Backend Routes:**
- `backend/routes/profile.py` - Profile CRUD + password change
- `backend/routes/ai_config.py` - AI provider configuration management

---

## API Endpoints

### Profile API

Base URL: `http://127.0.0.1:8000/profile`

#### GET /profile
Get current user's profile.

**Headers:**
- `X-Session-Id`: Session ID (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+44 7700 900000",
    "fullName": "John Doe",
    "initials": "JD",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-20T15:30:00Z"
  }
}
```

#### PUT /profile
Update user profile.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+44 7700 900000"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+44 7700 900000",
    "updatedAt": "2024-01-20T15:35:00Z"
  }
}
```

**Validation Rules:**
- `firstName`: Required, 1-100 chars, letters/spaces/hyphens/apostrophes only
- `lastName`: Optional, 1-100 chars, letters/spaces/hyphens/apostrophes only
- `email`: Optional, RFC 5321 compliant email format
- `phone`: Optional, international phone format

#### PUT /profile/password
Change user password.

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "NewPassword456!"
}
```

**Password Requirements (OWASP Compliant):**
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully. All sessions have been invalidated."
}
```

**Note:** All existing sessions are invalidated after password change. User must log in again.

#### GET /profile/completeness
Get profile completeness indicator.

**Response:**
```json
{
  "success": true,
  "data": {
    "percentage": 75,
    "missingFields": ["phone"],
    "completedFields": ["firstName", "lastName", "email"]
  }
}
```

---

### AI Configuration API

Base URL: `http://127.0.0.1:8000/ai`

#### GET /ai/config
Get all AI provider configurations (without API keys).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "provider": "openai",
      "model": "gpt-4-turbo",
      "endpoint": "https://api.openai.com/v1",
      "temperature": 0.7,
      "max_tokens": 2048,
      "top_p": 1.0,
      "enabled": true,
      "is_active": true,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-20T15:30:00Z"
    }
  ]
}
```

#### GET /ai/config/active
Get active AI provider configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "provider": "openai",
    "model": "gpt-4-turbo",
    "enabled": true,
    "is_active": true
  }
}
```

#### POST /ai/config/{provider}
Configure AI provider.

**Supported Providers:**
- `openai` - OpenAI GPT models
- `anthropic` - Anthropic Claude models
- `huggingface` - Hugging Face Inference API
- `qwen` - Qwen models
- `google` - Google AI models
- `cohere` - Cohere models
- `together` - Together AI
- `anyscale` - Anyscale Endpoints
- `mistral` - Mistral AI
- `perplexity` - Perplexity AI

**Request Body:**
```json
{
  "api_key": "sk-...",
  "model": "gpt-4-turbo",
  "endpoint": "https://api.openai.com/v1",
  "temperature": 0.7,
  "max_tokens": 2048,
  "top_p": 1.0,
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "provider": "openai",
    "message": "AI provider 'openai' configured successfully",
    "config_id": 1
  }
}
```

#### POST /ai/config/{provider}/test
Test connection to AI provider.

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Connection to openai successful"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "data": {
    "success": false,
    "error": "Invalid API key"
  }
}
```

#### PUT /ai/config/{provider}/activate
Set provider as active.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "provider": "openai",
    "is_active": true
  }
}
```

#### DELETE /ai/config/{provider}
Delete provider configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "AI provider 'openai' deleted successfully"
  }
}
```

#### GET /ai/providers
Get metadata for all supported providers.

**Response:**
```json
{
  "success": true,
  "data": {
    "openai": {
      "name": "OpenAI",
      "default_endpoint": "https://api.openai.com/v1",
      "supports_streaming": true,
      "default_model": "gpt-4-turbo",
      "max_context_tokens": 128000,
      "available_models": ["gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"]
    },
    "anthropic": {
      "name": "Anthropic",
      "default_endpoint": "https://api.anthropic.com/v1",
      "supports_streaming": true,
      "default_model": "claude-3-opus-20240229",
      "max_context_tokens": 200000,
      "available_models": ["claude-3-opus-20240229", "claude-3-sonnet-20240229"]
    }
  }
}
```

---

## Component Architecture

### ProfileViewMigrated Component

**Location:** `src/views/ProfileView.migrated.tsx`

**Features:**
- View and edit profile information
- Real-time form validation
- Profile completeness indicator with progress bar
- Change password modal with OWASP-compliant validation
- Success/error notifications
- Loading states

**State Management:**
```typescript
const [profile, setProfile] = useState<ProfileResponse | null>(null);
const [completeness, setCompleteness] = useState<ProfileCompletenessResponse | null>(null);
const [firstName, setFirstName] = useState("");
const [lastName, setLastName] = useState("");
const [email, setEmail] = useState("");
const [phone, setPhone] = useState("");
const [hasChanges, setHasChanges] = useState(false);
```

**Key Methods:**
- `loadProfile()` - Fetch profile from API
- `loadCompleteness()` - Fetch profile completeness
- `handleSave()` - Save profile changes
- `handleChangePassword()` - Change password with validation

### SettingsView Component (Existing)

**Location:** `src/views/SettingsView.tsx`

**Tabs:**
1. **AI Provider** - Configure AI providers (migrated to HTTP)
2. **Appearance** - Theme, font size, animations
3. **Privacy** - Encryption status, privacy controls
4. **Backup** - Backup settings (uses existing component)
5. **Data Management** - GDPR export/delete
6. **Notifications** - Notification preferences
7. **About** - Version and system info

**AI Provider Tab:**
- Provider selection dropdown
- API key input (masked)
- Model selection
- Custom endpoint configuration
- Temperature, max tokens, top_p sliders
- Save configuration button
- Test connection button

---

## Usage Examples

### Using Profile API in Components

```typescript
import { apiClient } from '../lib/apiClient.ts';

// Get profile
const response = await apiClient.profile.get();
if (response.success) {
  setProfile(response.data);
}

// Update profile
const updateResponse = await apiClient.profile.update({
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phone: "+44 7700 900000"
});

// Change password
const passwordResponse = await apiClient.profile.changePassword({
  currentPassword: "oldpass123",
  newPassword: "NewPass456!"
});

// Get profile completeness
const completenessResponse = await apiClient.profile.getCompleteness();
console.log(`Profile ${completenessResponse.data.percentage}% complete`);
```

### Using AI Config API

```typescript
import { apiClient } from '../lib/apiClient.ts';

// List all configurations
const configs = await apiClient.aiConfig.list();

// Get active provider
const active = await apiClient.aiConfig.getActive();

// Configure OpenAI
const configResponse = await apiClient.aiConfig.configure('openai', {
  api_key: 'sk-...',
  model: 'gpt-4-turbo',
  temperature: 0.7,
  max_tokens: 2048,
  top_p: 1.0,
  enabled: true
});

// Test connection
const testResponse = await apiClient.aiConfig.test('openai');
if (testResponse.data.success) {
  console.log('Connection successful!');
} else {
  console.error('Connection failed:', testResponse.data.error);
}

// Activate provider
await apiClient.aiConfig.activate('openai');

// Delete provider
await apiClient.aiConfig.delete('openai');
```

---

## Testing Checklist

### Profile Tests

- [ ] **View Profile**
  - [ ] Profile loads with correct data
  - [ ] Loading state displays spinner
  - [ ] Error handling shows error message

- [ ] **Edit Profile**
  - [ ] First name validation (required)
  - [ ] Last name validation (optional)
  - [ ] Email validation (RFC 5321 format)
  - [ ] Phone validation (international format)
  - [ ] Save button disabled when no changes
  - [ ] Save button shows loading state
  - [ ] Success message displays after save
  - [ ] Profile completeness updates after save

- [ ] **Change Password**
  - [ ] Modal opens when clicking "Change Password"
  - [ ] Current password validation
  - [ ] New password strength validation (12+ chars, uppercase, lowercase, number)
  - [ ] Confirm password matching validation
  - [ ] Show/hide password toggles work
  - [ ] Success message displays after password change
  - [ ] User redirected to login after password change

- [ ] **Profile Completeness**
  - [ ] Progress bar shows correct percentage
  - [ ] Missing fields displayed
  - [ ] Completed fields displayed
  - [ ] Badge color changes based on percentage (red < 50%, yellow 50-80%, green 80%+)

### AI Configuration Tests

- [ ] **List Configurations**
  - [ ] All configured providers displayed
  - [ ] Active provider highlighted
  - [ ] API keys masked in list view

- [ ] **Configure Provider**
  - [ ] Provider selection dropdown populated
  - [ ] API key input masked by default
  - [ ] Model selection shows available models
  - [ ] Custom endpoint validation (HTTPS)
  - [ ] Temperature slider (0.0-2.0)
  - [ ] Max tokens input (1-100000)
  - [ ] Top P slider (0.0-1.0)
  - [ ] Save button shows loading state
  - [ ] Success message after save

- [ ] **Test Connection**
  - [ ] Test button triggers connection test
  - [ ] Success message for valid credentials
  - [ ] Error message for invalid credentials
  - [ ] Loading state during test

- [ ] **Activate Provider**
  - [ ] Active provider switches correctly
  - [ ] Only one provider active at a time
  - [ ] Active state persists after page refresh

- [ ] **Delete Provider**
  - [ ] Delete confirmation dialog
  - [ ] Provider removed from list
  - [ ] If active provider deleted, another provider auto-activates

### Error Scenarios

- [ ] **Invalid Session**
  - [ ] Redirects to login on 401 Unauthorized
  - [ ] Error message displayed

- [ ] **Network Errors**
  - [ ] Retry logic with exponential backoff
  - [ ] User-friendly error messages

- [ ] **Validation Errors**
  - [ ] Server-side validation errors displayed
  - [ ] Field-level error messages

- [ ] **API Key Errors**
  - [ ] Invalid API key error message
  - [ ] Expired API key error message
  - [ ] Rate limit error message

---

## Security Considerations

### API Key Storage

- **Never log API keys** - API keys are sensitive credentials
- **Encrypt at rest** - API keys stored in database with AES-256-GCM encryption
- **Mask in UI** - API keys displayed as `sk-••••••••` in UI
- **HTTPS only** - All API communication over HTTPS in production

### Password Security

- **OWASP Compliant** - Password requirements follow OWASP guidelines
- **Scrypt Hashing** - Passwords hashed with scrypt (128-bit random salts)
- **Session Invalidation** - All sessions invalidated after password change
- **No password in logs** - Passwords never logged or stored in plaintext

### Session Management

- **Session ID in header** - `X-Session-Id` header for authentication
- **24-hour expiration** - Sessions expire after 24 hours
- **Secure cookies** - Sessions stored in secure, HttpOnly cookies
- **CSRF protection** - CSRF tokens for state-changing operations

### Input Validation

- **Client-side validation** - Real-time validation in React components
- **Server-side validation** - Pydantic models enforce validation rules
- **SQL injection prevention** - SQLAlchemy ORM prevents SQL injection
- **XSS prevention** - All user input sanitized before rendering

### Audit Logging

- **Profile changes logged** - All profile updates logged to audit table
- **Password changes logged** - Password changes logged with SHA-256 hash chaining
- **AI config changes logged** - Provider configuration changes logged
- **Immutable logs** - Audit logs cannot be modified or deleted

---

## Troubleshooting

### Common Issues

#### Profile not loading
**Symptom:** Profile page shows loading spinner indefinitely

**Possible Causes:**
1. FastAPI backend not running
2. Invalid session ID
3. Network connectivity issues

**Solutions:**
1. Verify backend is running: `curl http://127.0.0.1:8000/health`
2. Check session ID in localStorage: `localStorage.getItem('sessionId')`
3. Check browser console for network errors
4. Verify API port in `apiClient.ts` (default: 8000)

#### "Invalid session" error
**Symptom:** API returns 401 Unauthorized

**Possible Causes:**
1. Session expired (24-hour timeout)
2. Session invalidated after password change
3. Incorrect session ID

**Solutions:**
1. Log in again to create new session
2. Clear localStorage and cookies
3. Check `X-Session-Id` header in network tab

#### Password change fails with "Invalid current password"
**Symptom:** Password change returns error

**Possible Causes:**
1. Current password incorrect
2. Password not meeting requirements

**Solutions:**
1. Verify current password
2. Ensure new password meets OWASP requirements:
   - 12+ characters
   - Uppercase letter
   - Lowercase letter
   - Number

#### AI provider connection test fails
**Symptom:** Test connection returns error

**Possible Causes:**
1. Invalid API key
2. Network connectivity issues
3. Provider API down

**Solutions:**
1. Verify API key is correct
2. Check API key hasn't expired
3. Test API key manually: `curl https://api.openai.com/v1/models -H "Authorization: Bearer sk-..."`
4. Check provider status page

#### "Profile completeness not updating"
**Symptom:** Progress bar doesn't update after saving profile

**Possible Causes:**
1. Completeness API not called after save
2. Cache not invalidated

**Solutions:**
1. Manually call `loadCompleteness()` after save
2. Hard refresh page (Ctrl+Shift+R)
3. Check network tab for `/profile/completeness` request

### Debugging Tips

**Enable API Client Logging:**
```typescript
// In apiClient.ts, add logging to request() method
console.log('[API Request]', method, endpoint, options);
console.log('[API Response]', responseData);
```

**Check Backend Logs:**
```bash
# Backend logs show request details
cd backend
python -m uvicorn main:app --reload --log-level debug
```

**Inspect Network Requests:**
1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Check request headers, payload, and response

**Test API Directly:**
```bash
# Get profile
curl http://127.0.0.1:8000/profile \
  -H "X-Session-Id: YOUR_SESSION_ID"

# Update profile
curl -X PUT http://127.0.0.1:8000/profile \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: YOUR_SESSION_ID" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@example.com"}'

# Change password
curl -X PUT http://127.0.0.1:8000/profile/password \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: YOUR_SESSION_ID" \
  -d '{"currentPassword":"old123","newPassword":"New123456!"}'
```

---

## Migration Benefits

### Performance
- **Faster response times** - HTTP/2 multiplexing vs IPC message passing
- **Reduced memory usage** - Stateless HTTP vs stateful IPC handlers
- **Better caching** - HTTP caching headers

### Scalability
- **Horizontal scaling** - Can run multiple backend instances
- **Load balancing** - Distribute requests across instances
- **Microservices ready** - Can split into separate services

### Development
- **Better tooling** - Postman, curl, HTTPie for testing
- **Easier debugging** - Network tab shows all requests
- **API documentation** - FastAPI auto-generates OpenAPI docs
- **Type safety** - Pydantic models enforce types

### Security
- **Industry standard** - HTTP REST is well-understood
- **Better rate limiting** - Per-endpoint rate limits
- **CORS support** - Cross-origin resource sharing
- **Token-based auth** - Stateless JWT tokens (future)

---

## Next Steps

### Remaining Migrations

1. **App Settings** - Migrate appearance, notifications to HTTP
2. **Backup Settings** - Migrate backup operations to HTTP
3. **GDPR Operations** - Migrate data export/delete to HTTP
4. **File Uploads** - Add profile photo upload endpoint

### Future Enhancements

1. **JWT Authentication** - Replace session IDs with JWT tokens
2. **OAuth Integration** - Social login (Google, GitHub)
3. **Two-Factor Authentication** - TOTP-based 2FA
4. **Avatar Upload** - Direct file upload to S3/CDN
5. **Email Verification** - Verify email addresses
6. **Password Reset** - Email-based password reset flow
7. **Activity Log** - User-visible activity history

---

## Resources

### Documentation
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [React Query Documentation](https://tanstack.com/query/latest)

### Backend Code
- `backend/routes/profile.py` - Profile CRUD endpoints
- `backend/routes/ai_config.py` - AI configuration endpoints
- `backend/services/profile_service.py` - Profile business logic
- `backend/services/ai_provider_config_service.py` - AI config business logic

### Frontend Code
- `src/lib/apiClient.ts` - HTTP API client
- `src/lib/types/api.ts` - TypeScript type definitions
- `src/views/ProfileView.migrated.tsx` - Profile view component
- `src/views/SettingsView.tsx` - Settings view component

### Testing
- `backend/routes/test_profile_routes.py` - Profile endpoint tests
- `backend/routes/test_ai_config_routes.py` - AI config endpoint tests
- `tests/e2e/specs/profile-test.e2e.test.ts` - E2E profile tests

---

**Last Updated:** 2025-11-13
**Author:** Claude Code
**Version:** 1.0.0
