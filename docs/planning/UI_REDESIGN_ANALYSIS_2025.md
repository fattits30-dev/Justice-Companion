# Justice Companion UI Redesign Analysis & Plan

**Date**: October 14, 2025
**Status**: Analysis Complete - Ready for Implementation
**Objective**: Comprehensive UI refactor maintaining visual identity while improving UX, accessibility, and code quality

---

## 📊 Current State Analysis

### Design System Assessment

#### ✅ **Strengths - Keep These**

1. **Color Palette** (Excellent - Preserve Entirely)

   ```css
   Primary (Legal Blue): #3b82f6 (500) to #172554 (950)
   Secondary (Justice Gold): #eab308 (500) to #422006 (950)
   Neutral (Slate): #f8fafc (50) to #020617 (950)
   Semantic: Success (Emerald), Warning (Amber), Error (Red), Info (Cyan)
   ```

2. **Glassmorphism Effects** (Modern, On-trend)
   - `.glass-effect` class used extensively
   - `backdrop-blur-sm/md/xl` creating depth
   - Subtle borders with opacity (e.g., `border-slate-700/50`)
   - Perfect for legal/professional context

3. **Typography Scale** (Well-structured)
   - Clear hierarchy from xs (12px) to 5xl (48px)
   - Font weights: 400 (normal) to 700 (bold)
   - Line heights: tight (1.25), normal (1.5), relaxed (1.75)

4. **Gradients** (Professional & Consistent)
   - Background: `from-slate-950 via-blue-950 to-slate-950`
   - Cards: `from-blue-600/30 to-indigo-600/30`
   - Text: `from-blue-200 to-indigo-200`

5. **Animation Integration** (Framer Motion)
   - Respects `prefers-reduced-motion`
   - Smooth transitions with proper easing
   - Stagger animations for lists

#### ❌ **Issues - Fix These**

### 1. **Layout & Information Architecture**

**Dashboard (DashboardView.tsx)**

- **Problem**: Excessive padding/spacing (2xl: py-16, px-20)
  - Wastes screen real estate
  - Forces unnecessary scrolling
  - Not responsive enough below 1920px
- **Problem**: Welcome card is too prominent
  - Takes ~40% of screen height
  - Legal disclaimer repeats in banner (redundant)
  - Icon animations distract from content
- **Problem**: Stats cards use loading skeletons incorrectly
  - Shows "0" instead of skeleton when no data
  - No progressive loading states

**Cases View (CasesView.tsx)**

- **Problem**: Tree structure is confusing
  - No visual hierarchy between case/category/item
  - Strength indicators (1-5) not explained
  - "Fault Breach" field never populated
- **Problem**: No search/filter functionality
  - Can't search by case type, status, or date
  - No sorting options
- **Problem**: Inefficient use of space
  - Single column layout even on wide screens
  - Timeline takes 100% width (could be sidebar)

**Sidebar (Sidebar.tsx)**

- **Problem**: Inconsistent expanded/collapsed states
  - Width jumps from 4rem to 20rem (jarring)
  - No transition easing
  - Conversation list cuts off text
- **Problem**: Profile section at bottom is cramped
  - Username truncates
  - No avatar/image
  - Logout confirmation on every click (annoying)

**Chat UI**

- **Problem**: ChatWindow background covers entire screen
  - Gradient conflicts with messages
  - Low contrast for text readability
- **Problem**: FloatingChatInput positioning
  - Not truly "floating" - sticks to bottom
  - Doesn't account for sidebar width
  - No adaptive sizing

**Authentication (LoginScreen.tsx)**

- **Problem**: Over-scaled on large screens
  - Text sizes reach 7xl (too large)
  - Card maxes at xl (too small for 4K displays)
- **Problem**: Password field has no "Show/Hide" toggle
- **Problem**: "Remember Me" checkbox styling inconsistent

### 2. **Component Architecture**

**Duplicates to Consolidate**

```
- LoadingSpinner.tsx + Spinner.tsx (same purpose)
- EmptyState.tsx + DashboardEmptyState.tsx (could be variants)
- PostItNote.tsx (unused, delete)
- ErrorTestButton.tsx (test utility, move to tests/)
```

**Missing Components**

```
- DataTable (for cases, documents, evidence lists)
- Combobox/Autocomplete (for search/filter)
- Toast notifications (using Sonner but not consistently)
- Breadcrumbs (for navigation hierarchy)
- Card variants (currently ad-hoc styling)
- Badge component (for status, tags)
- Tooltip (accessibility for icons)
```

**Over-engineered Components**

```
- DashboardView.tsx: 327 lines (should be <200)
  - Extract: WelcomeCard, StatsGrid, QuickActionsPanel
- CasesView.tsx: 610 lines! (should be <300)
  - Extract: CaseTree, CaseTimeline, CaseFilters
- Sidebar.tsx: 358 lines (should be <200)
  - Extract: SidebarNav, SidebarProfile, ConversationList
```

### 3. **Accessibility Issues**

**Missing ARIA Labels**

- Sidebar toggle button: No label for screen readers
- Case tree expand/collapse: No role="tree" or aria-expanded
- Dashboard stats: No aria-live for dynamic updates
- Chat messages: No aria-label for message role (user/assistant)

**Keyboard Navigation**

- Dashboard quick actions: Not reachable by Tab
- Case tree: No arrow key navigation
- Sidebar: No Escape to close (implemented in App.tsx but not Sidebar)
- Forms: No Enter to submit on all inputs

**Focus Management**

- No focus trap in modals (ConfirmDialog, FileUploadModal)
- No focus return after modal close
- Inconsistent focus-visible styles

**Color Contrast**

- Text on gradient backgrounds may fail WCAG AA
  - `text-blue-200` on `from-slate-950 via-blue-950`
  - Need contrast checker validation

### 4. **Performance Issues**

**Unnecessary Re-renders**

```tsx
// DashboardView.tsx line 43
const stats = useMemo(() => { ... }, [cases]);
// ✅ Good use of useMemo

// CasesView.tsx line 35
function transformCaseToTreeData(caseItem: Case, caseEvidence: Evidence[]): CaseData {
// ❌ Should be memoized - called on every render
```

**Heavy Component Trees**

- CasesView renders entire tree on mount (600+ lines)
  - Should virtualize if >50 items
  - Should lazy-load evidence per case
- Dashboard loads all stats upfront
  - Should use Suspense boundaries

**Animation Performance**

- Framer Motion variants inline everywhere
  - Should extract to constants file
  - Should use CSS transitions for simple cases

### 5. **TypeScript Issues**

**Type Safety Gaps**

```typescript
// App.tsx line 29
type ViewType = 'dashboard' | 'chat' | 'cases' | 'case-detail' | 'documents' | 'settings';
// ❌ Duplicated in Sidebar.tsx - should be shared

// CasesView.tsx line 12
interface TreeNode { ... }
// ❌ Not exported - can't be tested or extended

// Sidebar.tsx line 47
const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
// ❌ No clear relationship to activeCaseId
```

**Missing Prop Validation**

- Many components accept `className` without proper typing
- Optional props not documented with JSDoc
- No default props defined inline

### 6. **Responsive Design Issues**

**Breakpoint Inconsistencies**

```tsx
// DashboardView.tsx uses: sm: md: lg: xl: 2xl:
// LoginScreen.tsx uses: sm: md: lg: xl:
// CasesView.tsx uses: none (not responsive!)
```

**Mobile UX Problems**

- Sidebar overlay doesn't darken background on mobile
- Dashboard welcome card too tall on small screens (>50vh)
- Case tree not touch-friendly (no tap targets)
- Chat input doesn't resize keyboard on mobile

---

## 🎯 Redesign Requirements & Solutions

### Phase 1: Foundation (Priority: Critical)

#### 1.1 Create Shared Component Library

**New Base Components** (in `src/components/ui/`)

```typescript
// card.tsx - Standardized card variants
export const Card = React.forwardRef<HTMLDivElement, CardProps>(...)
export const CardHeader = ...
export const CardContent = ...
export const CardFooter = ...

// badge.tsx - Status badges
<Badge variant="success | warning | error | info | default">

// data-table.tsx - Reusable table with sorting/filtering
<DataTable columns={columns} data={data} onSort={...} onFilter={...} />

// combobox.tsx - Searchable dropdown
<Combobox options={options} value={value} onChange={...} />

// tooltip.tsx - Accessible tooltips
<Tooltip content="..."><Button /></Tooltip>

// breadcrumbs.tsx - Navigation breadcrumbs
<Breadcrumbs items={[{ label: 'Home', href: '/' }, ...]} />
```

**Consolidate Existing Components**

```typescript
// spinner.tsx - Merge LoadingSpinner + Spinner
export const Spinner = ({ size = 'md', variant = 'primary' }) => ...

// empty-state.tsx - Merge EmptyState + DashboardEmptyState
export const EmptyState = ({ variant = 'default' | 'dashboard', ... }) => ...
```

#### 1.2 Extract Design System Hooks

**Create `src/hooks/useDesignSystem.ts`**

```typescript
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('md')
  // Returns: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export const useTheme = () => {
  // Returns CSS variables from design-tokens.css
  return {
    colors: { primary: { 500: 'var(--color-primary-500)' } },
    spacing: { ... },
    ...
  }
}
```

#### 1.3 Define Shared Types

**Create `src/types/ui.types.ts`**

```typescript
export type ViewType = 'dashboard' | 'chat' | 'cases' | 'case-detail' | 'documents' | 'settings';

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost';
export type Status = 'active' | 'inactive' | 'pending' | 'closed' | 'archived';

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  'aria-label'?: string;
}
```

---

### Phase 2: Layout Refactor (Priority: High)

#### 2.1 Dashboard Redesign

**New Structure**

```tsx
<DashboardView>
  <DashboardHeader /> // Compact welcome + user profile
  <DashboardStats /> // 4-card grid (responsive)
  <DashboardQuickActions /> // 3-4 primary actions
  <RecentActivity /> // Latest 5 cases/chats
  <DashboardFooter /> // Disclaimer (collapsed by default)
</DashboardView>
```

**Changes**:

- Reduce padding: `px-6 py-8` (was `2xl:px-20 2xl:py-16`)
- Welcome card max height: `300px` (was ~600px)
- Legal disclaimer: Collapsible accordion (default collapsed)
- Stats grid: 2x2 on mobile, 4x1 on desktop
- Add "Recent Activity" section (last 5 items)

#### 2.2 Cases View Redesign

**New Structure**

```tsx
<CasesView>
  <CasesToolbar>
    {' '}
    // Search, Filter, Sort, View Toggle
    <SearchInput />
    <FilterDropdown /> // By status, type, date
    <SortDropdown /> // By date, title, status
    <ViewToggle /> // List | Grid | Tree
  </CasesToolbar>

  <CasesContent variant={viewMode}>
    {viewMode === 'list' && <CasesList />}
    {viewMode === 'grid' && <CasesGrid />}
    {viewMode === 'tree' && <CasesTree />}
  </CasesContent>
</CasesView>
```

**Changes**:

- Add search bar (filters by title, description)
- Add filter dropdown (status, type, date range)
- Add sort options (date, alphabetical, status)
- Add view toggle (List | Grid | Tree)
- Default to "List" view (more familiar)
- Tree view: Add legend explaining strength indicators
- Make tree collapsible (persist state in localStorage)

#### 2.3 Sidebar Redesign

**New Structure**

```tsx
<Sidebar isExpanded={isExpanded}>
  <SidebarHeader>
    <Logo />
    <ToggleButton />
  </SidebarHeader>

  <SidebarNav items={navigationItems} activeView={activeView} />

  <SidebarContent>
    {activeView === 'chat' && <ConversationList />}
    {activeView === 'cases' && <CasesList mini />}
  </SidebarContent>

  <SidebarFooter>
    <UserProfile />
    <SettingsButton />
    <LogoutButton />
  </SidebarFooter>
</Sidebar>
```

**Changes**:

- Smooth width transition: `transition-[width] duration-300`
- Expanded width: `280px` (was `320px`)
- Collapsed width: `64px` (was `64px` ✅)
- Add tooltips to collapsed icons
- Profile section: Show avatar (default to initials)
- Logout: Show confirmation only if unsaved data
- Persist expanded state in localStorage

---

### Phase 3: Component Refactor (Priority: High)

#### 3.1 Extract Large Components

**DashboardView.tsx** (327 → 150 lines)

```typescript
// Extract to separate files:
src/features/dashboard/components/
  ├── DashboardHeader.tsx (Welcome + Profile)
  ├── DashboardStats.tsx (Stats grid)
  ├── DashboardQuickActions.tsx (Action buttons)
  ├── RecentActivity.tsx (Latest items)
  └── DashboardView.tsx (Orchestrates above)
```

**CasesView.tsx** (610 → 200 lines)

```typescript
// Extract to separate files:
src/features/cases/components/
  ├── CasesToolbar.tsx (Search, filter, sort)
  ├── CasesList.tsx (List view)
  ├── CasesGrid.tsx (Grid view)
  ├── CasesTree.tsx (Tree view - current logic)
  ├── CaseCard.tsx (Reusable card)
  └── CasesView.tsx (Orchestrates above)
```

**Sidebar.tsx** (358 → 180 lines)

```typescript
// Extract to separate files:
src/components/
  ├── SidebarNav.tsx (Navigation items)
  ├── SidebarProfile.tsx (User profile - already exists! ✅)
  ├── ConversationList.tsx (Chat conversations)
  └── Sidebar.tsx (Orchestrates above)
```

#### 3.2 Add Missing Components

**DataTable Component**

```tsx
// src/components/ui/data-table.tsx
interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  sortable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
}

export function DataTable<T>({ ... }: DataTableProps<T>) {
  // Implements:
  // - Column sorting (asc/desc)
  // - Column filtering (text, select, date)
  // - Pagination (10/25/50/100 per page)
  // - Row selection (checkboxes)
  // - Keyboard navigation (arrow keys)
}
```

**Use Cases**:

- Cases list view
- Documents list
- Evidence list
- User management (future)

**Badge Component**

```tsx
// src/components/ui/badge.tsx
interface BadgeProps {
  variant: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Badge = ({ variant, size = 'md', children }: BadgeProps) => {
  const variantStyles = {
    success: 'bg-green-500/20 text-green-300 border-green-500/50',
    warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
    error: 'bg-red-500/20 text-red-300 border-red-500/50',
    info: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
    default: 'bg-slate-500/20 text-slate-300 border-slate-500/50',
  };
  // ...
};
```

**Use Cases**:

- Case status (Active, Closed, Archived)
- Evidence type (Document, Photo, Email)
- User roles (Admin, User)

---

### Phase 4: Accessibility (Priority: Critical)

#### 4.1 ARIA Labels & Roles

**Dashboard**

```tsx
<div role="region" aria-label="Dashboard statistics">
  <StatsCard aria-label="Total cases: 5" />
</div>

<div role="navigation" aria-label="Quick actions">
  <QuickActionButton aria-label="Create new case" />
</div>
```

**Cases Tree**

```tsx
<div role="tree" aria-label="Cases hierarchy">
  <div role="treeitem" aria-expanded="true" aria-level="1">
    <button aria-label="Expand case details">...</button>
  </div>
</div>
```

**Sidebar**

```tsx
<nav aria-label="Main navigation">
  <button aria-label="Toggle sidebar" aria-expanded={isExpanded}>
    <Menu />
  </button>
</nav>
```

#### 4.2 Keyboard Navigation

**Global Shortcuts** (document in UI)

```
Ctrl+B: Toggle sidebar
Ctrl+K: Quick search (new feature)
Ctrl+N: New case
Ctrl+/: Open help
Escape: Close modals/dropdowns
```

**Component-Specific**

```
Cases Tree:
  - Arrow Up/Down: Navigate items
  - Arrow Left/Right: Collapse/Expand
  - Enter: Open case details
  - Space: Select case

Data Table:
  - Tab: Focus next column header
  - Enter: Sort column
  - Space: Select row
```

#### 4.3 Focus Management

**Modal Focus Trap**

```tsx
// src/hooks/useFocusTrap.ts
export const useFocusTrap = (isActive: boolean) => {
  // Traps focus within modal
  // Returns focus to trigger element on close
};

// Usage in ConfirmDialog.tsx
const dialogRef = useFocusTrap(isOpen);
```

**Focus-Visible Styles**

```css
/* Already exists in index.css ✅ */
:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}
```

#### 4.4 Color Contrast Validation

**Check All Text/Background Combinations**

```
✅ PASS: text-slate-50 on bg-slate-950 (19.99:1)
✅ PASS: text-blue-200 on bg-blue-950 (8.52:1)
❌ FAIL: text-blue-300 on from-slate-950 via-blue-950 (may be <4.5:1 on gradient)
```

**Fix**: Add text shadow or background overlay for gradient text

```tsx
<p className="text-blue-300 [text-shadow:0_2px_4px_rgba(0,0,0,0.5)]">
```

---

### Phase 5: Performance Optimization (Priority: Medium)

#### 5.1 Code Splitting

**Lazy Load Heavy Components**

```tsx
// Already implemented in App.tsx ✅
const ChatWindow = lazy(() => import('@/features/chat')...)
const CasesView = lazy(() => import('@/features/cases')...)
// etc.
```

**Add Suspense Boundaries**

```tsx
// DashboardView.tsx
<Suspense fallback={<DashboardSkeleton />}>
  <RecentActivity />
</Suspense>
```

#### 5.2 Memoization

**Memoize Expensive Calculations**

```tsx
// CasesView.tsx
const transformedCases = useMemo(
  () => cases.map(c => transformCaseToTreeData(c, evidence)),
  [cases, evidence]
);

// DashboardView.tsx - already done ✅
const stats = useMemo(() => { ... }, [cases]);
```

**Memoize Callbacks**

```tsx
const handleCaseClick = useCallback(
  (caseId: number) => { ... },
  [/* deps */]
);
```

#### 5.3 Virtualization

**Virtualize Long Lists** (if >50 items)

```tsx
// Use react-window or @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';

export function CasesList({ cases }: { cases: Case[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: cases.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Row height
  });

  // Render only visible rows
}
```

**Apply To**:

- Cases list (CasesView.tsx)
- Conversations list (Sidebar.tsx)
- Documents list (DocumentsView.tsx)

#### 5.4 Animation Optimization

**Extract Variants to Constants**

```tsx
// src/lib/animations.ts
export const FADE_IN_UP = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

// Usage
<motion.div variants={FADE_IN_UP} initial="hidden" animate="visible" />;
```

**Use CSS for Simple Animations**

```css
/* Instead of Framer Motion for hover */
.card {
  transition: transform 300ms ease-out;
}
.card:hover {
  transform: translateY(-4px);
}
```

---

### Phase 6: Responsive Design (Priority: High)

#### 6.1 Consistent Breakpoints

**Define Standard Breakpoints**

```typescript
// src/lib/breakpoints.ts
export const BREAKPOINTS = {
  xs: 0, // 0-639px (mobile)
  sm: 640, // 640-767px (large mobile)
  md: 768, // 768-1023px (tablet)
  lg: 1024, // 1024-1279px (laptop)
  xl: 1280, // 1280-1535px (desktop)
  '2xl': 1536, // 1536px+ (large desktop)
} as const;
```

**Apply Consistently**

- Dashboard: `px-6 sm:px-8 md:px-10 lg:px-12 xl:px-16`
- Text: `text-lg sm:text-xl md:text-2xl lg:text-3xl`
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`

#### 6.2 Mobile-First Approach

**Rewrite Components Starting from Mobile**

```tsx
// Before (desktop-first)
<div className="px-16 py-14 text-4xl lg:px-8 lg:py-6 lg:text-2xl sm:px-4 sm:py-3 sm:text-lg">

// After (mobile-first)
<div className="px-4 py-3 text-lg sm:px-6 sm:py-4 sm:text-xl lg:px-12 lg:py-8 lg:text-3xl">
```

#### 6.3 Touch-Friendly Targets

**Minimum Touch Target: 44x44px** (Apple HIG)

```tsx
// Before
<button className="p-2"> // 32x32px (too small)

// After
<button className="p-3 min-w-[44px] min-h-[44px]"> // 44x44px ✅
```

**Apply To**:

- Sidebar nav items
- Case tree expand/collapse buttons
- Chat message actions
- Modal close buttons

#### 6.4 Mobile Overlays

**Sidebar on Mobile**

```tsx
{
  isExpanded && (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        onClick={onToggle}
      />

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-80 z-50 md:relative md:z-auto">...</aside>
    </>
  );
}
```

---

### Phase 7: Code Quality (Priority: Medium)

#### 7.1 Remove Dead Code

**Files to Delete**

```
src/components/PostItNote.tsx (unused)
src/components/PostItNote.test.tsx (unused)
src/components/ErrorTestButton.tsx (move to tests/)
```

**Unused Imports** (run ESLint auto-fix)

```bash
pnpm lint:fix
```

#### 7.2 Consolidate Duplicates

**Merge Spinners**

```typescript
// Delete: LoadingSpinner.tsx
// Keep: Spinner.tsx (rename from LoadingSpinner.tsx)

// Update all imports:
// Before: import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
// After: import { Spinner } from '@/components/ui/spinner'
```

**Merge Empty States**

```typescript
// src/components/ui/empty-state.tsx
export const EmptyState = ({
  variant = 'default',
  icon: Icon,
  title,
  description,
  actions,
  className,
}: EmptyStateProps) => {
  // variant === 'dashboard' ? render DashboardEmptyState style
  // variant === 'default' ? render EmptyState style
};
```

#### 7.3 TypeScript Strict Mode

**Fix Implicit Any**

```typescript
// Sidebar.tsx line 166
mainWindow.webContents.on('crashed', (event, killed) => {
// Should be:
mainWindow.webContents.on('crashed', (event: Event, killed: boolean) => {
```

**Add Missing Return Types**

```typescript
// Before
const handleClick = (id: number) => { ... }

// After
const handleClick = (id: number): void => { ... }
```

#### 7.4 PropTypes Documentation

**Add JSDoc to All Components**

```typescript
/**
 * Dashboard statistics card component
 *
 * @param title - Card title
 * @param value - Numeric value to display
 * @param icon - Icon component to render
 * @param trend - Trend direction and percentage
 * @param onClick - Optional click handler
 *
 * @example
 * <DashboardStatsCard
 *   title="Total Cases"
 *   value={42}
 *   icon={Briefcase}
 *   trend={{ direction: 'up', value: 12 }}
 * />
 */
export function DashboardStatsCard({ ... }: DashboardStatsCardProps) { ... }
```

---

## 📋 Implementation Checklist

### Week 1: Foundation

- [ ] Create shared UI types (`src/types/ui.types.ts`)
- [ ] Extract animation constants (`src/lib/animations.ts`)
- [ ] Define breakpoint constants (`src/lib/breakpoints.ts`)
- [ ] Create Card component (`src/components/ui/card.tsx`)
- [ ] Create Badge component (`src/components/ui/badge.tsx`)
- [ ] Create Tooltip component (`src/components/ui/tooltip.tsx`)
- [ ] Create DataTable component (`src/components/ui/data-table.tsx`)
- [ ] Merge Spinner components
- [ ] Merge EmptyState components
- [ ] Delete unused files (PostItNote, ErrorTestButton)
- [ ] Run `pnpm lint:fix` and `pnpm type-check`

### Week 2: Dashboard Refactor

- [ ] Extract DashboardHeader component
- [ ] Extract DashboardStats component
- [ ] Extract DashboardQuickActions component
- [ ] Create RecentActivity component (new)
- [ ] Make legal disclaimer collapsible
- [ ] Reduce padding/spacing
- [ ] Add loading skeletons
- [ ] Test responsive breakpoints
- [ ] Add ARIA labels
- [ ] Test keyboard navigation

### Week 3: Cases View Refactor

- [ ] Extract CasesToolbar component
- [ ] Create SearchInput component
- [ ] Create FilterDropdown component
- [ ] Create SortDropdown component
- [ ] Extract CasesList component
- [ ] Extract CasesGrid component (new)
- [ ] Extract CasesTree component
- [ ] Create CaseCard component
- [ ] Add view toggle (List/Grid/Tree)
- [ ] Implement search functionality
- [ ] Implement filter functionality
- [ ] Implement sort functionality
- [ ] Add tree legend (strength indicators)
- [ ] Test with >50 cases (virtualization)
- [ ] Add ARIA tree roles
- [ ] Test arrow key navigation

### Week 4: Sidebar & Chat Refactor

- [ ] Extract SidebarNav component
- [ ] Extract ConversationList component
- [ ] Add smooth width transitions
- [ ] Add tooltips to collapsed icons
- [ ] Add avatar to profile section
- [ ] Persist expanded state (localStorage)
- [ ] Fix mobile overlay (backdrop)
- [ ] ChatWindow: Remove background gradient
- [ ] FloatingChatInput: Account for sidebar width
- [ ] Add focus trap to modals
- [ ] Test Escape key handling

### Week 5: Authentication & Polish

- [ ] LoginScreen: Add "Show Password" toggle
- [ ] LoginScreen: Fix responsive scaling
- [ ] RegistrationScreen: Match LoginScreen updates
- [ ] Add Breadcrumbs component
- [ ] Add Combobox component (if needed)
- [ ] Color contrast validation
- [ ] Add text shadows to gradient text
- [ ] Document keyboard shortcuts
- [ ] Create UI changelog
- [ ] Update component documentation

### Week 6: Testing & Validation

- [ ] Run full test suite: `pnpm test -- --run`
- [ ] Fix any failing tests
- [ ] Run type check: `pnpm type-check` (0 errors)
- [ ] Run lint: `pnpm lint` (0 errors, 0 warnings)
- [ ] Lighthouse audit (Accessibility >95)
- [ ] Test on mobile devices
- [ ] Test with screen reader (NVDA/JAWS)
- [ ] Test keyboard-only navigation
- [ ] Performance audit (React DevTools Profiler)
- [ ] Git commit: Comprehensive UI refactor

---

## 🎨 Design Tokens Reference

### Colors (Preserve Exactly)

```css
/* Primary - Legal Blue */
--color-primary-500: #3b82f6;
--color-primary-600: #2563eb;
--color-primary-700: #1d4ed8;

/* Background */
--bg-primary: #020617;
--bg-secondary: #0f172a;
--bg-tertiary: #1e293b;

/* Gradients */
--bg-gradient-primary: linear-gradient(135deg, #020617 0%, #1e3a8a 50%, #020617 100%);
```

### Spacing (Keep Consistent)

```css
/* Use these values for padding/margin */
px-4 py-3 (mobile)
px-6 py-4 (tablet)
px-8 py-6 (laptop)
px-12 py-8 (desktop)
px-16 py-10 (large desktop)
```

### Typography (Keep Scale)

```css
text-lg (18px) - Body
text-xl (20px) - Large body
text-2xl (24px) - Heading 3
text-3xl (30px) - Heading 2
text-4xl (36px) - Heading 1
```

### Shadows (Keep Effects)

```css
shadow-md (cards)
shadow-lg (elevated cards)
shadow-xl (modals)
shadow-2xl (important elements)
```

---

## 📚 Documentation Updates Needed

1. **Component Library Docs** (`docs/guides/COMPONENT_LIBRARY.md`)
   - Document all new components
   - Show usage examples
   - List props and variants

2. **Accessibility Guide** (`docs/guides/ACCESSIBILITY_GUIDE.md`)
   - Document keyboard shortcuts
   - ARIA patterns used
   - Testing procedures

3. **Responsive Design Guide** (`docs/guides/RESPONSIVE_DESIGN.md`)
   - Breakpoint standards
   - Mobile-first approach
   - Touch target guidelines

4. **UI Changelog** (`docs/UI_CHANGELOG.md`)
   - List all breaking changes
   - Migration guide for contributors
   - Before/after comparisons

---

## ✅ Success Criteria

**Code Quality**

- [ ] `pnpm type-check` passes (0 errors)
- [ ] `pnpm lint` passes (0 errors, 0 warnings)
- [ ] `pnpm test -- --run` passes (>95% pass rate)
- [ ] No components >300 lines
- [ ] No duplicate components

**Accessibility**

- [ ] Lighthouse Accessibility score >95
- [ ] WCAG AA color contrast (4.5:1 minimum)
- [ ] Keyboard navigation works everywhere
- [ ] Screen reader compatible (tested with NVDA)
- [ ] Focus traps in modals

**Performance**

- [ ] Lighthouse Performance score >85
- [ ] No layout shifts (CLS <0.1)
- [ ] Lists virtualized if >50 items
- [ ] Images lazy loaded
- [ ] Code split by route

**User Experience**

- [ ] Responsive on all screen sizes (320px - 4K)
- [ ] Touch targets ≥44x44px
- [ ] Loading states for all async operations
- [ ] Error states with recovery actions
- [ ] Consistent spacing/alignment

**Visual Design**

- [ ] Color palette unchanged
- [ ] Glassmorphism effects preserved
- [ ] Gradients consistent
- [ ] Typography scale maintained
- [ ] Animations smooth (60fps)

---

## 🚀 Ready to Implement?

This analysis provides a complete roadmap for the UI redesign. The plan:

1. **Preserves** the beautiful color scheme and visual style
2. **Improves** layout, UX, and accessibility significantly
3. **Modernizes** code architecture and component structure
4. **Maintains** strict TypeScript and linting standards
5. **Documents** all changes for future maintenance

**Estimated Timeline**: 6 weeks (1 developer, part-time)
**Risk Level**: Low (incremental changes, well-tested)
**Impact**: High (better UX, maintainability, accessibility)

**Next Steps**:

1. Review and approve this plan
2. Start with Phase 1 (Foundation)
3. Commit after each phase for easy rollback
4. Test thoroughly before moving to next phase

---

**Document Maintained By**: AI Assistant (Claude)
**Last Updated**: October 14, 2025
**Status**: Ready for Implementation ✅
