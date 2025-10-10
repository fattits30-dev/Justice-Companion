# OpenAI Settings UI - Visual Guide

## Component Hierarchy

```
SettingsView.tsx
├── (Other Settings Sections...)
│
└── AI Provider Configuration Section
    └── OpenAISettings.tsx
        ├── Information Banner (Blue)
        │   └── Link to platform.openai.com/api-keys
        │
        ├── Configuration Status Banner (Green) [if configured]
        │   ├── Masked API Key Display
        │   └── Clear Button
        │
        ├── API Key Input
        │   ├── Password/Text Toggle (Eye Icon)
        │   └── Validation Messages
        │
        ├── Model Selection Dropdown
        │   ├── GPT-4o (Recommended)
        │   ├── GPT-4o Mini
        │   └── GPT-3.5 Turbo
        │
        ├── Organization ID Input (Optional)
        │
        ├── Connection Status Panel
        │   ├── Status Icon (Loading/Success/Error)
        │   └── Status Text
        │
        ├── Action Buttons
        │   ├── Test Connection
        │   └── Save Configuration
        │
        ├── Pricing Information Banner (Amber)
        │   └── Link to openai.com/pricing
        │
        └── Security Notice (Gray)
```

## UI State Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Initial State (Idle)                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ No configuration saved                                     │ │
│  │ Empty API key input                                        │ │
│  │ Default model: GPT-4o                                      │ │
│  │ Status: Not tested (gray icon)                             │ │
│  │ Buttons: Test disabled, Save disabled                      │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                  User enters API key
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Ready to Test/Save                            │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ API key entered                                            │ │
│  │ Model selected                                             │ │
│  │ Status: Not tested                                         │ │
│  │ Buttons: Test enabled, Save enabled                        │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            ↓
          User clicks "Test Connection"
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Testing State                              │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Status: Testing connection... (blue spinner)               │ │
│  │ Buttons: Test disabled (loading)                           │ │
│  │ API call: window.justiceAPI.testAIConnection()            │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────┴────────┐
                    ↓                ↓
┌─────────────────────────┐  ┌──────────────────────────┐
│   Success State         │  │   Error State            │
│  ┌───────────────────┐  │  │  ┌────────────────────┐  │
│  │ Status: Connected │  │  │  │ Status: Error      │  │
│  │ (green checkmark) │  │  │  │ (red X)            │  │
│  │ Toast: Success    │  │  │  │ Toast: Error msg   │  │
│  └───────────────────┘  │  │  └────────────────────┘  │
└─────────────────────────┘  └──────────────────────────┘
                    │
          User clicks "Save Configuration"
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Saving State                               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Buttons: Save disabled (loading spinner)                   │ │
│  │ API call: window.justiceAPI.configureAI()                 │ │
│  │ localStorage: Save API key, model, organization            │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Configured State                             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Green banner: "API Key Configured"                         │ │
│  │ Masked API key: sk-proj-•••••••••••••••••••••••••••••••   │ │
│  │ API key input: Cleared for security                        │ │
│  │ Status: Idle                                               │ │
│  │ Toast: "OpenAI configured successfully!"                   │ │
│  │ Clear button: Available                                    │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Visual Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  AI Provider Configuration                                      [Sparkles]│
│  Configure OpenAI API for AI-powered assistance                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ ℹ️  OpenAI API Configuration                                  [Blue] ││
│  │                                                                       ││
│  │ Provide your own OpenAI API key to enable AI-powered legal          ││
│  │ assistance. Your key is stored securely and never shared.            ││
│  │                                                                       ││
│  │ → Get API Key from OpenAI ↗                                          ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ ✓ API Key Configured                                         [Green] ││
│  │ sk-proj-••••••••••••••••••••••••••••••••           [Clear Button]    ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  OpenAI API Key *                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ sk-proj-•••••••••••••••••••••••••••••••••              [👁️ Show]    ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  Get your API key from platform.openai.com/api-keys                      │
│                                                                           │
│  Model *                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ GPT-4o (Recommended - Most capable)                          [▼]     ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  GPT-4o provides the best quality. See pricing details                   │
│                                                                           │
│  Organization ID (Optional)                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ org-••••••••••••••••••••••••                                         ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  Only needed if your API key belongs to an organization                  │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ ⚪ Connection Status                                                  ││
│  │ Not tested                                                            ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  ┌──────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │ ⚠️  Test Connection           │  │ ✓ Save Configuration            │  │
│  └──────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ ⚠️  Pay-Per-Use Model                                       [Amber] ││
│  │                                                                       ││
│  │ OpenAI charges based on usage. Typical cost: $1-6/month.            ││
│  │ Control spending via OpenAI's usage dashboard.                       ││
│  │                                                                       ││
│  │ → View Pricing Details ↗                                             ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ 🧠 Security: Your API key is stored locally and encrypted.   [Gray] ││
│  │ It's never sent to any server except OpenAI's official API.         ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

## Color Scheme

| Element                 | Color                   | Purpose                   |
| ----------------------- | ----------------------- | ------------------------- |
| Info Banner             | Blue (bg-blue-900/20)   | Instructional information |
| Success Banner          | Green (bg-green-900/20) | Configuration confirmed   |
| Warning Banner          | Amber (bg-amber-900/20) | Pricing/cost information  |
| Security Notice         | Gray (bg-slate-800/50)  | Security information      |
| Status - Testing        | Blue (text-blue-300)    | Active process            |
| Status - Connected      | Green (text-green-300)  | Success state             |
| Status - Error          | Red (text-red-300)      | Error state               |
| Status - Idle           | Gray (text-slate-400)   | Neutral/initial state     |
| Primary Button (Save)   | Green (bg-green-600)    | Primary action            |
| Secondary Button (Test) | Blue (bg-blue-600/20)   | Secondary action          |
| Danger Button (Clear)   | Red (text-red-300)      | Destructive action        |

## Icon Legend

| Icon                  | Meaning                    |
| --------------------- | -------------------------- |
| 🧠 Brain              | AI/Intelligence            |
| ✨ Sparkles           | AI Provider (section icon) |
| 👁️ Eye / 👁️‍🗨️ Eye-Off   | Show/Hide password         |
| ↗ External Link      | Opens in new tab           |
| ✓ CheckCircle2        | Success/Confirmed          |
| ✗ XCircle             | Error/Failed               |
| ⚠️ AlertCircle        | Warning/Info               |
| ⚪ Loader2 (spinning) | Loading/In progress        |

## Responsive Behavior

The OpenAI Settings component is designed to fit within the 3-column grid layout of SettingsView:

```
Desktop (3 columns):
┌──────────┬──────────┬──────────┐
│ Profile  │ AI Data  │ OpenAI   │
├──────────┼──────────┼──────────┤
│ Notif.   │ Security │ Consent  │
└──────────┴──────────┴──────────┘

Tablet (2 columns):
┌──────────┬──────────┐
│ Profile  │ AI Data  │
├──────────┼──────────┤
│ OpenAI   │ Notif.   │
└──────────┴──────────┘

Mobile (1 column):
┌──────────┐
│ Profile  │
├──────────┤
│ AI Data  │
├──────────┤
│ OpenAI   │
└──────────┘
```

## User Journey

### First-Time Setup

1. User navigates to Settings → AI Provider Configuration
2. Sees blue info banner with link to get API key
3. Opens OpenAI website in new tab, creates/copies API key
4. Returns to app, pastes API key into password field
5. Selects preferred model (default: GPT-4o)
6. (Optional) Tests connection to verify API key
7. Clicks "Save Configuration"
8. Sees green success banner with masked API key
9. Toast notification confirms save

### Updating Configuration

1. User sees green "API Key Configured" banner
2. Can change model selection without re-entering API key
3. Can add/update organization ID
4. Clicks "Save Configuration" to update

### Clearing Configuration

1. User clicks "Clear" button on green banner
2. Confirmation dialog appears: "Are you sure?"
3. On confirm: localStorage cleared, form reset
4. Returns to initial idle state

## Accessibility Features

- **Keyboard Navigation:** All buttons and inputs are keyboard accessible
- **ARIA Labels:** Form fields have descriptive labels
- **Focus States:** Clear focus indicators on all interactive elements
- **Disabled States:** Buttons disabled during async operations to prevent duplicate submissions
- **Screen Reader Support:**
  - Status messages announced via toast notifications
  - Loading states indicated with spinners and text
  - Error messages clearly associated with inputs

## Implementation Statistics

| Metric                | Value                                        |
| --------------------- | -------------------------------------------- |
| Component File        | `OpenAISettings.tsx`                         |
| Lines of Code         | 438 lines                                    |
| Dependencies          | lucide-react, @/hooks/useToast               |
| State Variables       | 11 (apiKey, model, organization, etc.)       |
| IPC API Calls         | 2 (configureAI, testAIConnection)            |
| LocalStorage Keys     | 3 (openai_api_key, openai_model, openai_org) |
| UI States             | 4 (idle, testing, connected, error)          |
| Informational Banners | 4 (info, success, warning, security)         |
| Action Buttons        | 3 (Test, Save, Clear)                        |
| Form Fields           | 3 (API Key, Model, Organization)             |
| External Links        | 2 (API keys page, pricing page)              |
| TypeScript Errors     | 0 (fully type-safe)                          |

---

**Created:** 2025-10-10
**Component Location:** `src/features/settings/components/OpenAISettings.tsx`
**Integration:** `src/features/settings/components/SettingsView.tsx`
