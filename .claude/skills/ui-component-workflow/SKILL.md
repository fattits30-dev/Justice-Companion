---
name: ui-component-workflow
description: "Generate production-ready React components with TypeScript, TailwindCSS, Framer Motion animations, and Radix UI. Includes accessibility compliance (WCAG 2.1 AA), responsive design, and dark mode support. Use when creating new UI features or refactoring components."
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "mcp__context7__*"]
---

# UI Component Workflow Skill

## Purpose
Streamline creation of accessible, animated, responsive React components following Justice Companion design system.

## When Claude Uses This
- Creating new feature UIs
- Building form components
- Adding animations
- Implementing dialogs/modals
- Refactoring legacy components
- Accessibility improvements

## Component Architecture

### Directory Structure
```
src/
├── components/
│   ├── ui/              # Reusable primitives (Button, Input, etc.)
│   └── features/        # Feature-specific components
└── features/
    └── {feature}/
        ├── components/  # Feature components
        ├── hooks/       # Custom hooks
        └── {Feature}.tsx # Main feature component
```

### Tech Stack
- **React 18.3** - Concurrent rendering, Suspense
- **TypeScript 5.9.3** - Type safety
- **TailwindCSS 3.4** - Utility-first styling
- **Framer Motion 11.15** - Animations
- **Radix UI** - Accessible primitives
- **Lucide React** - Icons

## Component Template

### Basic Component
```typescript
// src/components/ui/Card.tsx
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
}

export const Card = ({
  children,
  variant = 'default',
  className,
  ...props
}: CardProps) => {
  const variants = {
    default: 'bg-card text-card-foreground',
    elevated: 'bg-card text-card-foreground shadow-lg',
    outlined: 'border-2 border-border bg-background',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'rounded-lg p-6',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};
```

### Form Component with Validation
```typescript
// src/components/features/cases/CreateCaseForm.tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

const caseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  caseNumber: z.string().regex(/^[A-Z0-9-]+$/, 'Invalid case number format'),
});

type CaseFormData = z.infer<typeof caseSchema>;

export const CreateCaseForm = ({ onSubmit }: { onSubmit: (data: CaseFormData) => void }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CaseFormData>({
    resolver: zodResolver(caseSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="title">Case Title</Label>
        <Input
          id="title"
          {...register('title')}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
        />
        {errors.title && (
          <p id="title-error" className="text-sm text-destructive mt-1">
            {errors.title.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Case'}
      </Button>
    </form>
  );
};
```

## Design System

### Colors (Tailwind Config)
```javascript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        primary: 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        secondary: 'hsl(var(--secondary))',
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        destructive: 'hsl(var(--destructive))',
        'destructive-foreground': 'hsl(var(--destructive-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--accent))',
        'accent-foreground': 'hsl(var(--accent-foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
    },
  },
};
```

### Animation Presets
```typescript
// src/lib/animations.ts
import { Variants } from 'framer-motion';

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export const slideInFromRight: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
};
```

## Radix UI Integration

### Dialog Example
```typescript
// src/components/ui/Dialog.tsx
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;

const DialogContent = ({ children, className, ...props }: DialogPrimitive.DialogContentProps) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
    <DialogPrimitive.Content
      className={cn(
        'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
        'w-full max-w-lg rounded-lg bg-card p-6 shadow-lg',
        'focus:outline-none',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
);

export { Dialog, DialogTrigger, DialogContent };
```

## Accessibility Checklist

### WCAG 2.1 AA Compliance
- [ ] **Keyboard Navigation**: All interactive elements accessible via Tab/Arrow keys
- [ ] **Focus Indicators**: Visible focus rings (use `focus-visible:ring-2`)
- [ ] **ARIA Labels**: Proper `aria-label`, `aria-describedby` on inputs
- [ ] **Color Contrast**: Minimum 4.5:1 for text, 3:1 for large text
- [ ] **Screen Reader Support**: Test with NVDA (Windows) or VoiceOver (Mac)
- [ ] **Semantic HTML**: Use `<button>`, `<nav>`, `<main>`, etc.
- [ ] **Alt Text**: All images have descriptive `alt` attributes
- [ ] **Form Labels**: Every input has associated `<Label>`

### Accessibility Testing
```bash
# Install axe DevTools extension
# Run automated tests
pnpm test:e2e -- --grep "accessibility"

# Manual keyboard testing
# Tab through entire UI
# Shift+Tab to go backwards
# Enter/Space to activate
# Escape to close modals
```

## Responsive Design

### Breakpoints (Tailwind)
```
sm:  640px  (small tablets)
md:  768px  (tablets)
lg:  1024px (laptops)
xl:  1280px (desktops)
2xl: 1536px (large desktops)
```

### Responsive Component Example
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {cases.map(case => (
    <CaseCard key={case.id} {...case} />
  ))}
</div>
```

## Dark Mode Support

### Theme Toggle
```typescript
// src/components/ThemeToggle.tsx
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg hover:bg-accent"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};
```

### CSS Variables
```css
/* src/index.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
  }
}
```

## Component Generation Workflow

### Step 1: Plan Component
- Define props interface
- Identify Radix UI primitives needed
- Choose animation variants
- Plan accessibility features

### Step 2: Create Component File
```bash
# Create feature component
touch "src/features/{feature}/components/{Component}.tsx"

# Create test file
touch "src/features/{feature}/components/{Component}.test.tsx"
```

### Step 3: Implement Component
- Use TypeScript for type safety
- Apply Tailwind classes with `cn()` utility
- Add Framer Motion animations
- Ensure accessibility attributes

### Step 4: Add Tests
```typescript
// Component.test.tsx
import { render, screen } from '@testing-library/react';
import { Component } from './Component';

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('is keyboard accessible', () => {
    render(<Component />);
    const button = screen.getByRole('button');
    button.focus();
    expect(button).toHaveFocus();
  });
});
```

### Step 5: Integrate
- Import into feature module
- Test in isolation
- Test with dark mode
- Test responsiveness
- Run accessibility audit

## Useful Commands

```bash
# Get latest React docs
mcp__context7__get-library-docs react

# Get Framer Motion examples
mcp__context7__get-library-docs framer-motion

# Get Radix UI component docs
mcp__context7__get-library-docs @radix-ui/react-dialog
```

## References
- React Best Practices: https://react.dev/learn
- TailwindCSS: https://tailwindcss.com/docs
- Framer Motion: https://www.framer.com/motion/
- Radix UI: https://www.radix-ui.com/
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
- React Hook Form: https://react-hook-form.com/
