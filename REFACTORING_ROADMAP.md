# SettingsView.tsx Refactoring Roadmap

## Quick Reference

**Current Status:** Phase 1 Complete ✅
**Components Extracted:** 1/5 (ProfileSettings)
**Test Coverage:** 23/23 tests passing (100%)
**Lines Refactored:** ~500 lines extracted and tested

---

## Roadmap Overview

### Phase 1: ProfileSettings ✅ COMPLETE
**Status:** 100% Complete
**Time Spent:** ~2 hours
**Tests:** 13 component + 10 utility = 23 total

**Deliverables:**
- ✅ ProfileSettings.tsx (437 lines)
- ✅ ProfileSettings.test.tsx (13 tests)
- ✅ passwordValidation.ts utility (59 lines)
- ✅ passwordValidation.test.ts (10 tests)
- ✅ Code review completed
- ✅ JSDoc documentation added
- ✅ 100% test coverage

---

### Phase 2: ConsentSettings 🔄 NEXT
**Estimated Time:** 1.5 hours
**Estimated Tests:** 8-10
**Priority:** High (GDPR compliance critical)

**Components to Extract:**
1. Consent list display
2. Grant consent functionality
3. Revoke consent functionality
4. Required vs optional consent logic

**State Variables (8):**
```typescript
const [consents, setConsents] = useState<Consent[]>([]);
const [isLoadingConsents, setIsLoadingConsents] = useState(false);
const [isGrantingConsent, setIsGrantingConsent] = useState(false);
const [isRevokingConsent, setIsRevokingConsent] = useState(false);
const [selectedConsentType, setSelectedConsentType] = useState<ConsentType | null>(null);
const [showConsentDialog, setShowConsentDialog] = useState(false);
// + related dialog states
```

**API Calls:**
- `window.justiceAPI.getAllConsents()`
- `window.justiceAPI.grantConsent(type, userId)`
- `window.justiceAPI.revokeConsent(id)`

**TDD Checklist:**
- [ ] RED: Write failing tests for ConsentSettings
- [ ] Verify tests fail (component doesn't exist)
- [ ] GREEN: Extract ConsentSettings component
- [ ] Fix tests until all pass
- [ ] REFACTOR: Extract consent utility if needed
- [ ] Add JSDoc documentation
- [ ] Run code review

**Test Scenarios:**
1. Load and display consents
2. Handle loading errors
3. Grant new consent
4. Revoke existing consent
5. Prevent revoking required consents
6. Display consent status (granted/not granted)
7. Handle consent grant error
8. Handle consent revoke error

**Files to Create:**
```
src/features/settings/components/
  ├── ConsentSettings.tsx          (~150 lines)
  └── ConsentSettings.test.tsx     (~200 lines, 8-10 tests)
```

---

### Phase 3: NotificationSettings 📅 PLANNED
**Estimated Time:** 1 hour
**Estimated Tests:** 6-8
**Priority:** Medium

**Components to Extract:**
1. Chat notifications toggle
2. Case updates toggle
3. Document analysis toggle
4. localStorage persistence logic

**State Variables (3):**
```typescript
const [chatNotifications, setChatNotifications] = useState(true);
const [caseUpdates, setCaseUpdates] = useState(true);
const [documentAnalysisNotif, setDocumentAnalysisNotif] = useState(false);
```

**localStorage Keys:**
- `chatNotifications`
- `caseUpdates`
- `documentAnalysisNotif`

**TDD Checklist:**
- [ ] RED: Write failing tests
- [ ] GREEN: Extract component
- [ ] REFACTOR: Extract localStorage utility
- [ ] Add JSDoc documentation
- [ ] Code review

**Test Scenarios:**
1. Load notification settings from localStorage
2. Toggle chat notifications on/off
3. Toggle case updates on/off
4. Toggle document analysis on/off
5. Persist changes to localStorage
6. Handle missing localStorage (defaults)

**Files to Create:**
```
src/features/settings/components/
  ├── NotificationSettings.tsx      (~100 lines)
  └── NotificationSettings.test.tsx (~150 lines, 6-8 tests)

src/utils/
  ├── localStorageSettings.ts       (~50 lines, optional)
  └── localStorageSettings.test.ts  (~100 lines, optional)
```

---

### Phase 4: DataPrivacySettings 📅 PLANNED
**Estimated Time:** 1.5 hours
**Estimated Tests:** 8-10
**Priority:** High (GDPR compliance)

**Components to Extract:**
1. Data encryption toggle
2. RAG toggle
3. Export user data
4. Delete all data (with confirmation)
5. Backup management

**State Variables (2 + dialog states):**
```typescript
const [encryptData, setEncryptData] = useState(true);
const [ragEnabled, setRagEnabled] = useState(true);
const [showDeleteDialog, setShowDeleteDialog] = useState(false);
const [showExportDialog, setShowExportDialog] = useState(false);
```

**API Calls:**
- `window.justiceAPI.exportAllData()`
- `window.justiceAPI.deleteAllUserData(userId)`
- `window.justiceAPI.createBackup()`

**TDD Checklist:**
- [ ] RED: Write failing tests
- [ ] GREEN: Extract component
- [ ] REFACTOR: Clean up and optimize
- [ ] Add JSDoc documentation
- [ ] Code review

**Test Scenarios:**
1. Toggle encryption on/off
2. Toggle RAG on/off
3. Export user data successfully
4. Handle export error
5. Delete all data with confirmation
6. Cancel data deletion
7. Handle delete error
8. Persist settings to localStorage

**Files to Create:**
```
src/features/settings/components/
  ├── DataPrivacySettings.tsx      (~120 lines)
  └── DataPrivacySettings.test.tsx (~180 lines, 8-10 tests)
```

---

### Phase 5: AppearanceSettings 📅 PLANNED
**Estimated Time:** 1.5 hours
**Estimated Tests:** 10-12
**Priority:** Medium

**Components to Extract:**
1. Dark mode toggle
2. Font size selector
3. Microphone selector
4. Speech language selector
5. localStorage persistence

**State Variables (7):**
```typescript
const [darkMode, setDarkMode] = useState(true);
const [fontSize, setFontSize] = useState('medium');
const [selectedMicrophone, setSelectedMicrophone] = useState('default');
const [speechLanguage, setSpeechLanguage] = useState('en-GB');
const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([]);
const [isLoadingMicrophones, setIsLoadingMicrophones] = useState(false);
// + accessibility settings
```

**Browser APIs:**
- `navigator.mediaDevices.enumerateDevices()` (microphone list)
- `localStorage` for persistence

**TDD Checklist:**
- [ ] RED: Write failing tests
- [ ] GREEN: Extract component
- [ ] REFACTOR: Extract device enumeration utility
- [ ] Add JSDoc documentation
- [ ] Code review

**Test Scenarios:**
1. Load appearance settings from localStorage
2. Toggle dark mode
3. Change font size (small, medium, large)
4. Load available microphones
5. Select microphone
6. Change speech language
7. Persist all settings
8. Handle missing localStorage defaults
9. Handle microphone enumeration error
10. Apply settings to DOM/CSS variables

**Files to Create:**
```
src/features/settings/components/
  ├── AppearanceSettings.tsx      (~150 lines)
  └── AppearanceSettings.test.tsx (~200 lines, 10-12 tests)

src/utils/
  ├── mediaDevices.ts             (~30 lines, optional)
  └── mediaDevices.test.ts        (~80 lines, optional)
```

---

### Phase 6: Integration 🎯 FINAL
**Estimated Time:** 2 hours
**Estimated Tests:** 5-8 integration tests
**Priority:** High (Complete refactoring)

**Integration Tasks:**
1. Remove duplicate state from SettingsView.tsx
2. Remove duplicate functions from SettingsView.tsx
3. Import all extracted components
4. Replace inline sections with component calls
5. Update Tabs structure
6. Clean up unused imports
7. Run full test suite
8. Verify no regressions

**Expected Outcome:**
```typescript
// Before: 1,212 lines
// After: ~300 lines (75% reduction)

export function SettingsView(): JSX.Element {
  const toast = useToast();

  return (
    <div className="flex-1 overflow-y-auto">
      <Tabs defaultValue="profile">
        <Tabs.List>
          <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
          <Tabs.Trigger value="consent">Consent</Tabs.Trigger>
          <Tabs.Trigger value="notifications">Notifications</Tabs.Trigger>
          <Tabs.Trigger value="privacy">Privacy</Tabs.Trigger>
          <Tabs.Trigger value="appearance">Appearance</Tabs.Trigger>
          <Tabs.Trigger value="ai">AI Settings</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="profile">
          <ProfileSettings toast={toast} />
        </Tabs.Content>

        <Tabs.Content value="consent">
          <ConsentSettings toast={toast} />
        </Tabs.Content>

        <Tabs.Content value="notifications">
          <NotificationSettings toast={toast} />
        </Tabs.Content>

        <Tabs.Content value="privacy">
          <DataPrivacySettings toast={toast} />
        </Tabs.Content>

        <Tabs.Content value="appearance">
          <AppearanceSettings toast={toast} />
        </Tabs.Content>

        <Tabs.Content value="ai">
          <OpenAISettings toast={toast} />
        </Tabs.Content>
      </Tabs>
    </div>
  );
}
```

**Integration Tests:**
1. Tab navigation works correctly
2. All components receive toast prop
3. Settings persist across tab switches
4. No state conflicts between components
5. All previous functionality works
6. Error handling works across components
7. Loading states work correctly
8. Accessibility preserved

**Files to Modify:**
```
src/features/settings/components/
  └── SettingsView.tsx  (1,212 → ~300 lines)
```

**Files to Create:**
```
src/features/settings/components/
  └── SettingsView.test.tsx  (~150 lines, 5-8 tests)
```

---

## Timeline Estimate

| Phase | Component | Estimated Time | Tests | Priority |
|-------|-----------|----------------|-------|----------|
| 1 ✅ | ProfileSettings | 2 hours | 23 | ✅ Complete |
| 2 🔄 | ConsentSettings | 1.5 hours | 8-10 | High |
| 3 📅 | NotificationSettings | 1 hour | 6-8 | Medium |
| 4 📅 | DataPrivacySettings | 1.5 hours | 8-10 | High |
| 5 📅 | AppearanceSettings | 1.5 hours | 10-12 | Medium |
| 6 🎯 | Integration | 2 hours | 5-8 | High |
| **Total** | **6 phases** | **~10 hours** | **~65-75 tests** | - |

---

## Success Criteria

### Per Component
- ✅ 100% test coverage
- ✅ All tests passing
- ✅ JSDoc documentation on all public APIs
- ✅ Code review completed
- ✅ No ESLint warnings
- ✅ No TypeScript errors

### Overall Project
- ✅ SettingsView.tsx reduced from 1,212 to ~300 lines (75% reduction)
- ✅ 5 new focused, testable components
- ✅ 65-75 comprehensive tests (all passing)
- ✅ Improved maintainability and code quality
- ✅ No functionality regressions
- ✅ Full GDPR compliance maintained

---

## Commands for Next Phase (ConsentSettings)

```bash
# Step 1: RED - Write failing tests
touch src/features/settings/components/ConsentSettings.test.tsx
# Write comprehensive tests covering all scenarios

# Step 2: Verify tests fail
pnpm test src/features/settings/components/ConsentSettings.test.tsx --run
# Expected: All tests fail (component doesn't exist)

# Step 3: GREEN - Extract component
touch src/features/settings/components/ConsentSettings.tsx
# Extract ConsentSettings from SettingsView.tsx

# Step 4: Fix tests until passing
pnpm test src/features/settings/components/ConsentSettings.test.tsx --run
# Iterate until all tests pass

# Step 5: REFACTOR - Clean up
pnpm lint:fix src/features/settings/components/ConsentSettings.tsx
# Extract utilities if needed, add JSDoc

# Step 6: Code review
# Use code-reviewer agent for quality check
```

---

## Related Documents

- [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) - Detailed summary of Phase 1
- [CLAUDE.md](./CLAUDE.md) - Project guidelines
- [package.json](./package.json) - Scripts and dependencies

---

**Last Updated:** 2025-10-18
**Next Review:** After Phase 2 completion
**Status:** Phase 1 Complete ✅ | Ready for Phase 2
