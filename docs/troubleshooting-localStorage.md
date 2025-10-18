# Troubleshooting Guide: localStorage Issues

**Justice Companion Settings Module | Common Issues & Solutions**

---

## Overview

This guide covers common issues related to localStorage usage in the Justice Companion application, specifically within the settings module. All settings are persisted using the `useLocalStorage` hook, which stores data in the browser's localStorage API.

**Key Facts:**
- **Storage Location:** Browser localStorage (per-origin, persistent)
- **Size Limit:** 5-10MB (browser-dependent)
- **Scope:** Per-domain (not cross-browser or cross-device)
- **Security:** Plain text (not encrypted - use SecureStorageService for sensitive data)

---

## Common Issues

### Issue 1: Settings Not Persisting After Page Reload

**Symptom:**
- Changes made in settings UI reset to defaults after page reload
- localStorage appears empty in DevTools
- Console shows no errors

**Possible Causes:**

#### Cause 1.1: Private Browsing Mode / Incognito Mode

**Explanation:** Many browsers disable or restrict localStorage in private browsing mode.

**Solution:**
1. Exit private browsing mode
2. Open application in normal browser window
3. Re-apply settings

**Detection:**
```javascript
// Check if localStorage is available
if (typeof window.localStorage === 'undefined') {
  console.warn('localStorage is not available (private browsing?)');
}
```

**Workaround:** Use in-memory fallback (already implemented in `useLocalStorage` hook)

---

#### Cause 1.2: Browser Storage Disabled

**Explanation:** User or admin may have disabled browser storage in settings.

**Solution (Chrome):**
1. Open Chrome Settings → Privacy and Security → Site Settings → Cookies
2. Ensure "Allow sites to save and read cookie data" is enabled
3. Check "Blocked" list - ensure your domain is not blocked

**Solution (Firefox):**
1. Open Firefox Settings → Privacy & Security
2. Under "Cookies and Site Data", ensure "Delete cookies and site data when Firefox is closed" is unchecked
3. Click "Manage Exceptions" - ensure your domain is not blocked

**Solution (Edge):**
1. Open Edge Settings → Cookies and site permissions → Cookies and site data
2. Ensure "Allow sites to save and read cookie data" is on

---

#### Cause 1.3: localStorage Quota Exceeded (Storage Full)

**Explanation:** localStorage has a 5-10MB limit (browser-dependent). When full, `setItem` fails silently.

**Detection:**
```javascript
// Check localStorage size (approximate)
let totalSize = 0;
for (let key in localStorage) {
  if (localStorage.hasOwnProperty(key)) {
    totalSize += localStorage[key].length + key.length;
  }
}
console.log(`localStorage size: ${(totalSize / 1024).toFixed(2)} KB`);
```

**Solution:**
1. Open DevTools → Application → Storage → Local Storage
2. Identify large or unused keys
3. Delete old/unused data:
   ```javascript
   // Clear all localStorage (WARNING: Deletes all settings)
   localStorage.clear();

   // Or remove specific keys
   localStorage.removeItem('oldKey');
   ```

**Prevention:**
- Avoid storing large objects (use IndexedDB for >1MB data)
- Implement data cleanup (remove old keys)
- Monitor storage usage

---

#### Cause 1.4: Cross-Domain Issues

**Explanation:** localStorage is scoped per-origin (protocol + domain + port). Different subdomains or protocols have separate storage.

**Example:**
- `http://localhost:3000` ≠ `https://localhost:3000` (different protocol)
- `app.example.com` ≠ `api.example.com` (different subdomain)

**Solution:**
- Ensure you're accessing the same origin
- Use consistent protocol (always HTTPS in production)

---

### Issue 2: "QuotaExceededError" in Console

**Symptom:**
```
DOMException: Failed to execute 'setItem' on 'Storage':
Setting the value of 'myKey' exceeded the quota.
```

**Cause:** localStorage is full (5-10MB limit)

**Solutions:**

#### Solution 2.1: Clear Unused Data
```javascript
// Clear all localStorage
localStorage.clear();

// Or clear specific app keys (safer)
const appKeys = Object.keys(localStorage).filter(key =>
  key.startsWith('justice-')
);
appKeys.forEach(key => localStorage.removeItem(key));
```

#### Solution 2.2: Reduce Data Size
```javascript
// ❌ BAD: Storing large objects
const [data, setData] = useLocalStorage('data', {
  cases: [...], // 1000+ items
  evidence: [...] // Large arrays
});

// ✅ GOOD: Store only IDs or summaries
const [recentCaseIds, setRecentCaseIds] = useLocalStorage('recentCases', [1, 2, 3]);
```

#### Solution 2.3: Use IndexedDB for Large Data

For data >1MB, use IndexedDB instead of localStorage:

```javascript
// Future enhancement: IndexedDB wrapper
import { openDB } from 'idb';

const db = await openDB('justice-companion', 1, {
  upgrade(db) {
    db.createObjectStore('cases');
  }
});

await db.put('cases', largeObject, 'key');
const data = await db.get('cases', 'key');
```

---

### Issue 3: Invalid JSON in localStorage

**Symptom:**
- Settings load as defaults despite localStorage having data
- Console shows: `SyntaxError: Unexpected token in JSON`

**Cause:** Corrupted or manually edited localStorage data

**Detection:**
```javascript
// Check if JSON is valid
const raw = localStorage.getItem('setting');
try {
  JSON.parse(raw);
  console.log('Valid JSON');
} catch (e) {
  console.error('Invalid JSON:', raw);
}
```

**Solution:**
1. Open DevTools → Application → Local Storage
2. Find corrupted key
3. Delete key (forces re-initialization with default)
4. Or manually fix JSON syntax

**Prevention:**
- Never manually edit localStorage in DevTools
- Always use `useLocalStorage` hook (automatic JSON handling)

---

### Issue 4: Settings Different Across Browsers

**Symptom:**
- Settings save in Chrome but not Firefox
- Different default values in different browsers

**Cause:** localStorage is browser-specific (not synced)

**Explanation:**
- Each browser has separate localStorage storage
- Clearing cache in one browser doesn't affect others
- No built-in sync mechanism

**Workarounds:**
1. **Manual Export/Import:**
   ```javascript
   // Export settings
   const exportSettings = () => {
     const settings = {};
     for (let key in localStorage) {
       if (key.startsWith('justice-')) {
         settings[key] = localStorage[key];
       }
     }
     return JSON.stringify(settings, null, 2);
   };

   // Import settings
   const importSettings = (jsonString) => {
     const settings = JSON.parse(jsonString);
     for (let key in settings) {
       localStorage.setItem(key, settings[key]);
     }
   };
   ```

2. **Cloud Sync (Future Enhancement):**
   - Store settings in database
   - Sync across devices via user account

---

### Issue 5: Settings Reset After Browser Update

**Symptom:**
- All settings reset to defaults after Chrome/Firefox update
- localStorage appears empty

**Cause:** Browser update cleared storage (rare, but possible)

**Solution:**
1. Re-apply settings manually
2. Check browser changelog for storage changes
3. Restore from backup (if available)

**Prevention:**
- Implement periodic localStorage backup to file
- Store critical settings in database (not just localStorage)

---

### Issue 6: Sensitive Data Exposed in localStorage

**Symptom:**
- API keys visible in DevTools → Application → Local Storage
- Security audit flags plain-text credentials

**Cause:** Using `useLocalStorage` for sensitive data (incorrect usage)

**Solution:**

#### ❌ BAD: Storing API key in localStorage
```tsx
const [apiKey, setApiKey] = useLocalStorage('apiKey', '');
```

#### ✅ GOOD: Using SecureStorageService
```tsx
import { secureStorage } from '@/services/SecureStorageService';

// Initialize on mount
useEffect(() => {
  const loadApiKey = async () => {
    await secureStorage.init();
    const savedKey = await secureStorage.getApiKey('openai_api_key');
    if (savedKey) {
      setApiKey(maskApiKey(savedKey));
    }
  };
  loadApiKey();
}, []);

// Save API key
const saveApiKey = async (key: string) => {
  await secureStorage.setApiKey('openai_api_key', key);
};
```

**Decision Matrix:**

| Data Type | Storage Method | Encryption |
|-----------|---------------|-----------|
| UI preferences (theme, font) | localStorage | None (not needed) |
| Notification settings | localStorage | None (not needed) |
| API keys, passwords | SecureStorageService | OS-native (DPAPI/Keychain) |
| User profile data | Database | AES-256-GCM |
| Case data, evidence | Database | AES-256-GCM |

---

### Issue 7: localStorage Not Syncing Across Tabs

**Symptom:**
- Change setting in Tab A
- Tab B doesn't reflect the change until reload

**Cause:** `useLocalStorage` hook doesn't listen for `storage` events

**Current Behavior:**
- localStorage updates are tab-specific
- No automatic cross-tab synchronization

**Workaround:**
1. **Manual Page Reload:** Reload other tabs to see changes
2. **Storage Event Listener (Future Enhancement):**
   ```typescript
   // Future: Add to useLocalStorage hook
   useEffect(() => {
     const handleStorageChange = (e: StorageEvent) => {
       if (e.key === key && e.newValue !== null) {
         setStoredValue(JSON.parse(e.newValue));
       }
     };

     window.addEventListener('storage', handleStorageChange);
     return () => window.removeEventListener('storage', handleStorageChange);
   }, [key]);
   ```

**Note:** This is a known limitation and will be addressed in a future update.

---

### Issue 8: Performance Issues with Large Settings Objects

**Symptom:**
- UI freezes when changing settings
- Slow localStorage read/write operations

**Cause:** Storing large objects (>100KB) in localStorage

**Solution:**

#### Bad Practice:
```tsx
// ❌ Storing 1000+ items in single key
const [allCases, setAllCases] = useLocalStorage('cases', [
  /* 1000+ case objects */
]);
```

#### Good Practice:
```tsx
// ✅ Store only IDs or summaries
const [recentCaseIds, setRecentCaseIds] = useLocalStorage('recentCases', [1, 2, 3]);

// ✅ Use pagination or lazy loading
const [page1Cases, setPage1Cases] = useLocalStorage('cases-page-1', []);
```

**Performance Tips:**
1. Keep localStorage values <50KB per key
2. Use debouncing for frequent updates
3. Store only essential data (not full objects)
4. Use IndexedDB for large datasets

---

### Issue 9: Browser Developer Tools Show Old Values

**Symptom:**
- Settings updated in UI
- DevTools shows old localStorage value

**Cause:** DevTools cache (UI not auto-refreshed)

**Solution:**
1. Right-click on localStorage → Refresh
2. Or close and reopen DevTools

**Note:** This is a DevTools UI issue, not an application bug.

---

### Issue 10: Tests Failing Due to localStorage Pollution

**Symptom:**
- Tests pass individually but fail when run together
- "localStorage already contains value" errors

**Cause:** Tests not cleaning up localStorage between runs

**Solution:**

#### Bad Test (No Cleanup):
```tsx
it('should save setting', () => {
  const { result } = renderHook(() => useLocalStorage('key', 'default'));
  act(() => result.current[1]('value'));
  expect(localStorage.getItem('key')).toBe('"value"');
  // ❌ No cleanup - pollutes next test
});
```

#### Good Test (With Cleanup):
```tsx
describe('MyComponent', () => {
  beforeEach(() => {
    // ✅ Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should save setting', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'));
    act(() => result.current[1]('value'));
    expect(localStorage.getItem('key')).toBe('"value"');
  });
});
```

---

## Debugging Tools

### DevTools Inspection

**Chrome/Edge:**
1. Press F12 → Application tab
2. Expand "Local Storage" in sidebar
3. Click on your domain
4. View/edit/delete keys

**Firefox:**
1. Press F12 → Storage tab
2. Expand "Local Storage"
3. Click on your domain
4. View/edit/delete keys

### Console Commands

```javascript
// List all localStorage keys
Object.keys(localStorage).forEach(key => {
  console.log(key, localStorage.getItem(key));
});

// Check storage size
let totalSize = 0;
for (let key in localStorage) {
  if (localStorage.hasOwnProperty(key)) {
    const size = localStorage[key].length + key.length;
    totalSize += size;
    console.log(`${key}: ${(size / 1024).toFixed(2)} KB`);
  }
}
console.log(`Total: ${(totalSize / 1024).toFixed(2)} KB`);

// Test localStorage availability
try {
  localStorage.setItem('test', 'value');
  localStorage.removeItem('test');
  console.log('localStorage is available');
} catch (e) {
  console.error('localStorage is unavailable:', e);
}

// Export all settings
const exportSettings = () => {
  const settings = {};
  Object.keys(localStorage).forEach(key => {
    settings[key] = localStorage.getItem(key);
  });
  console.log(JSON.stringify(settings, null, 2));
};
exportSettings();
```

---

## Best Practices

### DO:
✅ Use `useLocalStorage` hook for UI preferences
✅ Clear localStorage in `beforeEach()` during testing
✅ Handle errors gracefully (fallback to defaults)
✅ Keep values small (<50KB per key)
✅ Use descriptive key names (e.g., `darkMode`, not `dm`)
✅ Document all localStorage keys in README

### DON'T:
❌ Store sensitive data (API keys, passwords) in localStorage
❌ Store large objects (>100KB) without compression
❌ Manually edit localStorage in DevTools (can corrupt JSON)
❌ Assume localStorage is always available (private browsing)
❌ Rely on localStorage for critical data (use database)
❌ Store user-specific data without clearing on logout

---

## Emergency Reset Procedures

### Reset All Settings (User-Facing)

**Location:** Settings → Data & Privacy → Clear All Data

**What it does:**
1. Deletes all cases, conversations, and evidence
2. Clears specific localStorage keys (`recentSearches`, `draftMessages`)
3. Keeps user preferences (theme, notifications)
4. Reloads application

### Developer Reset (Console)

```javascript
// Clear ALL localStorage (nuclear option)
localStorage.clear();
window.location.reload();

// Clear only app-specific keys (safer)
Object.keys(localStorage)
  .filter(key => key.startsWith('justice-'))
  .forEach(key => localStorage.removeItem(key));
window.location.reload();
```

---

## Reporting Issues

If none of these solutions work, report the issue with:

1. **Browser Info:**
   - Browser name and version
   - Operating system
   - Private browsing mode? (Yes/No)

2. **Error Details:**
   - Console error messages (F12 → Console)
   - localStorage state (DevTools → Application → Local Storage)
   - Steps to reproduce

3. **localStorage Size:**
   ```javascript
   // Run in console and include output
   let total = 0;
   for (let k in localStorage) total += localStorage[k].length;
   console.log(`Size: ${(total / 1024).toFixed(2)} KB`);
   ```

4. **Example localStorage Keys:**
   ```javascript
   console.log(Object.keys(localStorage));
   ```

---

## Frequently Asked Questions

**Q: Why isn't my setting syncing across browsers?**
**A:** localStorage is browser-specific. Use the Export/Import feature to transfer settings.

**Q: Can I increase the localStorage size limit?**
**A:** No, it's browser-enforced (5-10MB). Use IndexedDB for larger data.

**Q: Is localStorage data encrypted?**
**A:** No. Use `SecureStorageService` for sensitive data (API keys, passwords).

**Q: What happens if localStorage is disabled?**
**A:** `useLocalStorage` hook falls back to in-memory state (resets on page reload).

**Q: Can malicious scripts access my localStorage?**
**A:** Yes, if XSS vulnerability exists. Never store sensitive data in localStorage.

**Q: How do I backup my settings?**
**A:** Settings → Data & Privacy → Export My Data (GDPR)

---

## Related Documentation

- **Settings Module README:** [src/features/settings/README.md](../src/features/settings/README.md)
- **useLocalStorage Hook:** [src/hooks/useLocalStorage.ts](../src/hooks/useLocalStorage.ts)
- **Migration Guide:** [docs/migration-guide-useLocalStorage.md](./migration-guide-useLocalStorage.md)
- **Security Documentation:** [SECURITY.md](../SECURITY.md)
- **SecureStorageService:** [src/services/SecureStorageService.ts](../src/services/SecureStorageService.ts)

---

**Last Updated:** 2025-10-18
**Version:** 1.0.0
**Maintainer:** Justice Companion Development Team
