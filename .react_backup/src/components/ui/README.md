# UI Component Library

Modern, accessible, and delightful design system for Justice Companion. Built with React, TypeScript, Tailwind CSS, and Framer Motion.

## Philosophy

- **Depth through layers** - Use shadows, blur, and elevation to create visual hierarchy
- **Subtle animations** - Smooth, purposeful, never distracting
- **Consistent spacing** - Use design tokens, no magic numbers
- **Accessible** - WCAG 2.1 AA compliance (contrast ratios, focus states)
- **Dark-first** - Optimized for dark theme with optional light mode support
- **Performance** - Minimize re-renders, use CSS transforms for animations

## Design Tokens

### Colors

```typescript
// Primary - Blue
primary-50 to primary-950

// Secondary - Purple/Indigo
secondary-50 to secondary-950

// Success - Green
success-50 to success-950

// Warning - Amber
warning-50 to warning-950

// Danger - Red
danger-50 to danger-950

// Neutral - Warm Gray
neutral-50 to neutral-950
```

### Spacing

4px base unit system:

- `0.5` = 2px
- `1` = 4px
- `2` = 8px
- `3` = 12px
- `4` = 16px
- `6` = 24px
- `8` = 32px
- etc.

### Shadows

```css
/* Standard elevation */
shadow-sm, shadow, shadow-md, shadow-lg, shadow-xl, shadow-2xl

/* Colored shadows for depth */
shadow-primary, shadow-primary-lg
shadow-secondary, shadow-secondary-lg
shadow-success, shadow-warning, shadow-danger

/* Glassmorphism */
shadow-glass, shadow-glass-lg
```

### Border Radius

```css
rounded-sm (4px)
rounded (6px)
rounded-md (8px)
rounded-lg (12px)
rounded-xl (16px)
rounded-2xl (20px)
rounded-3xl (24px)
rounded-full (9999px)
```

### Animations

```css
animate-shimmer    /* Loading skeleton shimmer */
animate-shine      /* Card hover shine effect */
animate-fade-in    /* Fade in entrance */
animate-slide-up   /* Slide up entrance */
animate-scale-in   /* Scale in entrance */
animate-glow       /* Pulsing glow effect */
```

---

## Components

### Button

Modern button with variants, sizes, loading states, and ripple effect.

#### Props

```typescript
interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}
```

#### Examples

```tsx
import { Button } from '@/components/ui';
import { Plus, Trash2 } from 'lucide-react';

// Primary button
<Button variant="primary" size="md">
  Create Case
</Button>

// With icon
<Button variant="primary" icon={<Plus />} iconPosition="left">
  New Case
</Button>

// Loading state
<Button variant="primary" loading>
  Saving...
</Button>

// Danger variant
<Button variant="danger" icon={<Trash2 />}>
  Delete
</Button>

// Ghost variant
<Button variant="ghost">
  Cancel
</Button>

// Full width
<Button variant="primary" fullWidth>
  Continue
</Button>
```

#### Features

- Gradient backgrounds with hover effects
- Ripple animation on click
- Framer Motion press animations
- Loading spinner
- Icon support (left or right)
- Focus ring for accessibility
- Disabled state

---

### Badge

Status badge with variants, icons, and glow effects.

#### Props

```typescript
interface BadgeProps {
  variant?:
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "neutral"
    | "primary"
    | "secondary";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  dot?: boolean;
  glow?: boolean;
  pulse?: boolean;
}
```

#### Examples

```tsx
import { Badge } from '@/components/ui';
import { CheckCircle, AlertTriangle } from 'lucide-react';

// Success badge with dot
<Badge variant="success" dot pulse>
  Active
</Badge>

// Warning with icon
<Badge variant="warning" icon={<AlertTriangle />}>
  Pending
</Badge>

// Danger with glow
<Badge variant="danger" glow>
  Critical
</Badge>

// Info badge
<Badge variant="info">
  New
</Badge>

// Neutral
<Badge variant="neutral">
  Closed
</Badge>
```

#### Features

- Color-coded variants
- Animated dot indicator
- Icon support
- Pulse animation
- Glow effect for emphasis
- Backdrop blur

---

### Card

Glassmorphism card with hover effects and customizable header/footer.

#### Props

```typescript
interface CardProps {
  variant?: "default" | "glass" | "elevated";
  hoverable?: boolean;
  gradientBorder?: boolean;
  shine?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
}
```

#### Examples

```tsx
import { Card, CardHeader, CardFooter, Button } from '@/components/ui';

// Glass card with gradient border
<Card variant="glass" gradientBorder shine>
  <CardHeader
    title="Case Details"
    description="View and edit case information"
  />
  <p>Card content goes here</p>
  <CardFooter>
    <Button variant="primary">Save</Button>
    <Button variant="ghost">Cancel</Button>
  </CardFooter>
</Card>

// Using header and footer as props
<Card
  variant="glass"
  header={<CardHeader title="Statistics" />}
  footer={<CardFooter>Updated 2 hours ago</CardFooter>}
>
  <div className="space-y-4">
    {/* Content */}
  </div>
</Card>

// Elevated card
<Card variant="elevated" hoverable>
  <h3>Card Title</h3>
  <p>Card content</p>
</Card>
```

#### Features

- Glassmorphism effect (backdrop blur)
- Hover elevation animation
- Gradient border option
- Shine effect on hover
- Customizable header/footer
- Framer Motion animations

---

### Toast

Toast notifications with custom styling and actions.

#### API

```typescript
// Success toast
showSuccess(message: string, options?: CustomToastOptions)

// Error toast
showError(message: string, options?: CustomToastOptions)

// Warning toast
showWarning(message: string, options?: CustomToastOptions)

// Info toast
showInfo(message: string, options?: CustomToastOptions)

// Promise toast (for async operations)
showPromise<T>(promise: Promise<T>, messages: {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((error: unknown) => string);
})

// Dismiss all toasts
dismissAll()
```

#### Examples

```tsx
import {
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showPromise,
} from "@/components/ui";

// Success
showSuccess("Case created successfully!");

// Error with action
showError("Failed to delete case", {
  action: {
    label: "Retry",
    onClick: () => retryDelete(),
  },
});

// Warning
showWarning("You have unsaved changes");

// Info with custom title
showInfo("New update available", {
  title: "Update Available",
});

// Promise (async operation)
showPromise(saveCase(), {
  loading: "Saving case...",
  success: "Case saved successfully!",
  error: "Failed to save case",
});
```

#### Features

- Color-coded variants (success, error, warning, info)
- Custom icons
- Action button support
- Auto-dismiss with configurable duration
- Slide-in animation
- Backdrop blur
- Colored shadows

---

### Skeleton

Loading skeleton with shimmer animation.

#### Props

```typescript
interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  count?: number;
  animation?: "pulse" | "shimmer" | "none";
}
```

#### Examples

```tsx
import {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonList
} from '@/components/ui';

// Basic skeleton
<Skeleton variant="rectangular" width="100%" height="200px" />

// Circular (avatar)
<Skeleton variant="circular" width="48px" height="48px" />

// Text lines
<SkeletonText lines={3} lastLineWidth="60%" />

// Avatar preset
<SkeletonAvatar size="lg" />

// Card preset
<SkeletonCard showAvatar lines={3} />

// List preset
<SkeletonList items={5} showAvatar />
```

#### Presets

- **SkeletonText** - Multiple text lines with customizable last line width
- **SkeletonAvatar** - Circular avatar skeleton (sm, md, lg, xl)
- **SkeletonCard** - Full card skeleton with avatar and text
- **SkeletonList** - List of items with avatars

#### Features

- Shimmer animation
- Multiple variants
- Preset components for common patterns
- Customizable dimensions
- Multiple count support

---

### CommandPalette

Cmd+K command palette with search, keyboard navigation, and grouping.

#### Props

```typescript
interface CommandPaletteProps {
  items: CommandItem[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  emptyMessage?: string;
  recentItems?: CommandItem[];
}

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  keywords?: string[];
  group?: string;
  onSelect: () => void;
}
```

#### Examples

```tsx
import { CommandPalette, useCommandPalette } from "@/components/ui";
import { Plus, Briefcase, FileText, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

function MyComponent() {
  const navigate = useNavigate();
  const { open, setOpen } = useCommandPalette();

  const items: CommandItem[] = [
    {
      id: "new-case",
      label: "Create New Case",
      description: "Start a new legal case",
      icon: <Plus />,
      group: "Actions",
      shortcut: "Ctrl+N",
      keywords: ["create", "new", "add"],
      onSelect: () => navigate("/cases/new"),
    },
    {
      id: "view-cases",
      label: "View Cases",
      description: "Browse all cases",
      icon: <Briefcase />,
      group: "Navigation",
      onSelect: () => navigate("/cases"),
    },
    {
      id: "documents",
      label: "Documents",
      description: "Manage documents",
      icon: <FileText />,
      group: "Navigation",
      onSelect: () => navigate("/documents"),
    },
    {
      id: "settings",
      label: "Settings",
      description: "App settings",
      icon: <Settings />,
      group: "Navigation",
      onSelect: () => navigate("/settings"),
    },
  ];

  return (
    <>
      <button onClick={() => setOpen(true)}>Open Command Palette</button>
      <CommandPalette
        items={items}
        open={open}
        onOpenChange={setOpen}
        placeholder="Search or type a command..."
      />
    </>
  );
}
```

#### Features

- Cmd+K / Ctrl+K keyboard shortcut
- Fuzzy search
- Keyboard navigation (arrow keys, enter, escape)
- Item grouping
- Recent items section
- Icons and shortcuts
- Glassmorphism modal
- Backdrop blur
- Framer Motion animations

---

## Usage Guidelines

### Importing

```tsx
// Named imports (recommended)
import { Button, Badge, Card } from "@/components/ui";

// Individual imports
import { Button } from "@/components/ui/Button";
```

### Accessibility

All components follow WCAG 2.1 AA guidelines:

- **Keyboard navigation** - All interactive elements are keyboard accessible
- **Focus indicators** - Clear focus rings on all focusable elements
- **Color contrast** - All text meets 4.5:1 contrast ratio minimum
- **ARIA labels** - Proper semantic HTML and ARIA attributes
- **Screen reader support** - Components work with screen readers

### Performance

- **Memoization** - Use `React.memo` for expensive components
- **Lazy loading** - Import heavy components with `React.lazy`
- **Animation optimization** - Use CSS transforms instead of layout properties
- **Avoid layout thrashing** - Batch DOM updates

### Best Practices

1. **Consistent spacing** - Use Tailwind spacing scale (`space-y-4`, `gap-6`, etc.)
2. **Design tokens** - Use color tokens (`text-primary-500`, `bg-success-100`)
3. **Responsive design** - Use responsive utilities (`sm:`, `md:`, `lg:`)
4. **Component composition** - Build complex UIs from simple components
5. **TypeScript** - Always use TypeScript for type safety

---

## Examples

### Login Form

```tsx
import { Button, Card, CardHeader } from "@/components/ui";
import { showError, showSuccess } from "@/components/ui";

function LoginForm() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login();
      showSuccess("Login successful!");
    } catch (error) {
      showError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="glass" className="max-w-md mx-auto">
      <CardHeader title="Welcome Back" description="Sign in to your account" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="email" placeholder="Email" className="..." />
        <input type="password" placeholder="Password" className="..." />
        <Button variant="primary" fullWidth loading={loading}>
          Sign In
        </Button>
      </form>
    </Card>
  );
}
```

### Dashboard Stats

```tsx
import { Card, CardHeader, Badge } from "@/components/ui";
import { TrendingUp, TrendingDown } from "lucide-react";

function StatsCard({ title, value, change, trend }) {
  return (
    <Card variant="glass" hoverable>
      <CardHeader title={title} />
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-white">{value}</span>
        <Badge
          variant={trend === "up" ? "success" : "danger"}
          icon={trend === "up" ? <TrendingUp /> : <TrendingDown />}
          size="sm"
        >
          {change}%
        </Badge>
      </div>
    </Card>
  );
}
```

### Loading State

```tsx
import { SkeletonCard } from "@/components/ui";

function CasesList() {
  const { data, isLoading } = useCases();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-6">
        <SkeletonCard showAvatar lines={3} />
        <SkeletonCard showAvatar lines={3} />
        <SkeletonCard showAvatar lines={3} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      {data.map((caseItem) => (
        <CaseCard key={caseItem.id} caseItem={caseItem} />
      ))}
    </div>
  );
}
```

---

## Migration Guide

### From Old Buttons

```tsx
// Before
<button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
  Click me
</button>

// After
<Button variant="primary">
  Click me
</Button>
```

### From Inline Styles

```tsx
// Before
<div
  style={{
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(12px)',
    borderRadius: '12px',
    padding: '24px'
  }}
>
  Content
</div>

// After
<Card variant="glass">
  Content
</Card>
```

### From alert()

```tsx
// Before
alert("Case deleted successfully");

// After
import { showSuccess } from "@/components/ui";
showSuccess("Case deleted successfully");
```

---

## Contributing

When adding new components:

1. Follow existing patterns and naming conventions
2. Use TypeScript with proper types
3. Add JSDoc comments
4. Include usage examples in file
5. Update this README
6. Ensure WCAG 2.1 AA compliance
7. Add Framer Motion animations where appropriate
8. Use design tokens from tailwind.config.ts

---

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Lucide Icons](https://lucide.dev/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Hot Toast](https://react-hot-toast.com/)
- [cmdk](https://cmdk.paco.me/)

---

Built with love for Justice Companion.
