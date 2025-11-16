# Notifications - Quick Start Guide

**For:** Developers integrating notification components
**Time:** 10 minutes

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Install Dependency

```bash
npm install date-fns
```

---

### Step 2: Import Components

```tsx
import { NotificationBadge, NotificationCenter } from '@/components/notifications';
```

---

### Step 3: Use in Your App

```tsx
import { useState } from 'react';
import { NotificationBadge, NotificationCenter } from '@/components/notifications';

export const MyComponent = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const sessionId = "your-session-id"; // From auth context/store

  return (
    <>
      {/* Badge in header */}
      <NotificationBadge
        onClick={() => setShowNotifications(true)}
        sessionId={sessionId}
      />

      {/* Notification center (modal/drawer) */}
      {showNotifications && (
        <div className="modal">
          <NotificationCenter
            sessionId={sessionId}
            onNotificationClick={(notification) => {
              console.log('Clicked:', notification);
              setShowNotifications(false);
            }}
          />
        </div>
      )}
    </>
  );
};
```

---

## 📦 What You Get

### NotificationBadge
- Unread count badge
- Auto-refresh every 30s
- Click to open center

### NotificationCenter
- Full notification list
- Filter by type/severity/unread
- Mark as read / Delete
- Pagination

### NotificationPreferences
- User settings form
- Notification type toggles
- Quiet hours config
- Sound/desktop toggles

---

## 🎨 Styling

All components use Tailwind CSS with dark mode support.

**Severity Colors:**
- 🔴 Urgent: Red
- 🟠 High: Orange
- 🔵 Medium: Blue
- ⚪ Low: Gray

---

## 🔌 Backend API

**Base URL:** `http://localhost:8000/notifications`

**Endpoints:**
- `GET /notifications` - List notifications
- `GET /notifications/unread/count` - Get unread count
- `PUT /notifications/{id}/read` - Mark as read
- `DELETE /notifications/{id}` - Delete notification
- `GET /notifications/preferences` - Get preferences
- `PUT /notifications/preferences` - Update preferences

**Full API docs:** http://localhost:8000/docs

---

## 📋 TypeScript Types

```typescript
import type { Notification, NotificationPreferences } from '@/components/notifications';

// Notification type
interface Notification {
  id: number;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  // ...more fields
}

// Preferences type
interface NotificationPreferences {
  deadlineRemindersEnabled: boolean;
  deadlineReminderDays: number;
  quietHoursEnabled: boolean;
  // ...more fields
}
```

---

## 🧪 Test Your Integration

1. **Start backend:**
   ```bash
   cd backend && python main.py
   ```

2. **Start frontend:**
   ```bash
   npm run dev
   ```

3. **Login and check:**
   - Badge shows unread count
   - Click badge opens center
   - Notifications display
   - Filters work
   - Mark as read works

---

## 🐛 Common Issues

### Badge shows 0

**Cause:** No unread notifications in database

**Solution:** Create test notification via backend:
```bash
curl -X POST http://localhost:8000/notifications/test \
  -H "Authorization: Bearer YOUR_SESSION_ID"
```

---

### "date-fns not found" error

**Cause:** Dependency not installed

**Solution:**
```bash
npm install date-fns
```

---

### CORS error

**Cause:** Backend CORS not configured

**Solution:** Check `backend/main.py` CORS middleware:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📚 Full Documentation

For detailed documentation, see:
- **Migration Guide:** `docs/NOTIFICATIONS-HTTP-MIGRATION.md` (22 pages)
- **Summary:** `docs/NOTIFICATIONS-MIGRATION-SUMMARY.md`

---

## 💡 Pro Tips

1. **Session ID:** Get from auth context/store, pass to all components
2. **Polling:** Adjust `pollingInterval` prop for faster/slower updates
3. **Navigation:** Use `onNotificationClick` to navigate to related entities
4. **Toast:** Show success/error toasts for better UX
5. **Modal:** Use your app's modal/drawer component for NotificationCenter

---

## ✅ Checklist

- [ ] Install `date-fns`
- [ ] Import components
- [ ] Add NotificationBadge to header
- [ ] Add NotificationCenter modal/drawer
- [ ] Pass sessionId to components
- [ ] Test with backend running
- [ ] Verify badge displays
- [ ] Verify center opens
- [ ] Verify filters work
- [ ] Verify mark as read works

---

**Done!** 🎉 Your notification system is ready to use.

For questions, see full docs or check component source code.
