# TAL-250: Navigation & Information Architecture Spec

## Executive Summary

Transform Tally from a collection of disconnected pages into a cohesive, task-oriented experience that feels natural for accountants, sole traders, and businesses.

---

## Current Problems

1. **No Global Navigation** - Users get lost, can't easily return to dashboard
2. **No Context** - Pages don't show where you are in the app
3. **Overwhelming UI** - Too many options visible at once
4. **Non-linear Workflows** - Users don't know the next step
5. **One-size-fits-all** - Same UI for different user types

---

## Design Principles

1. **Task-Oriented** - Every screen should answer "What am I trying to do?"
2. **Progressive Disclosure** - Show only what's needed for the current task
3. **Clear Hierarchy** - Always know where you are and how to go back
4. **Guided Workflows** - Complex tasks should feel like step-by-step processes
5. **Focus Mode** - Ability to hide everything except current task

---

## Information Architecture

### Level 0: App Shell (Always Visible)
```
┌─────────────────────────────────────────────────────┐
│ [≡] Tally          [Search]     [Year: 2025-26] [⚙]│
├─────────────────────────────────────────────────────┤
│                                                     │
│  Sidebar (collapsible)     Main Content Area        │
│  ┌──────────────┐         ┌───────────────────────┐ │
│  │ 🏠 Dashboard │         │                       │ │
│  │              │         │  Breadcrumb Trail     │ │
│  │ 📥 CAPTURE   │         │  Dashboard > Receipts │ │
│  │   Receipts   │         │                       │ │
│  │   Invoices   │         │  [Page Content]       │ │
│  │   Bank Sync  │         │                       │ │
│  │              │         │                       │ │
│  │ 📂 ORGANIZE  │         │                       │ │
│  │   Categories │         │                       │ │
│  │   Review     │         │                       │ │
│  │              │         │                       │ │
│  │ 📊 REPORT    │         │                       │ │
│  │   BAS        │         │                       │ │
│  │   Tax Return │         │                       │ │
│  │   Workpapers │         │                       │ │
│  │              │         │                       │ │
│  │ 📤 EXPORT    │         │                       │ │
│  │   Accountant │         │                       │ │
│  │   Download   │         │                       │ │
│  └──────────────┘         └───────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Level 1: Sections (4 Main Areas)

| Section | Purpose | Key Pages |
|---------|---------|-----------|
| **Capture** | Get data into Tally | Receipts, Invoices, Bank Sync, Camera |
| **Organize** | Categorize and review | Categories, Review Queue, Suggestions |
| **Report** | Generate outputs | BAS, Tax Return, Workpapers, Analytics |
| **Export** | Share with others | Accountant Portal, CSV, PDF |

### Level 2: Pages (Within Sections)

### Level 3: Detail Views (Modals/Sheets)

---

## Navigation Components

### 1. AppShell.tsx
The persistent wrapper around all pages.

```tsx
<AppShell>
  <AppShell.Header>
    <Logo />
    <GlobalSearch />
    <TaxYearSelector />
    <UserMenu />
  </AppShell.Header>
  
  <AppShell.Sidebar>
    <NavSection title="Capture">
      <NavItem icon={Receipt} href="/receipts">Receipts</NavItem>
      <NavItem icon={FileText} href="/invoices">Invoices</NavItem>
      <NavItem icon={Building} href="/bank-sync">Bank Sync</NavItem>
    </NavSection>
    {/* ... more sections */}
  </AppShell.Sidebar>
  
  <AppShell.Main>
    <Breadcrumbs />
    <Outlet /> {/* Page content */}
  </AppShell.Main>
</AppShell>
```

### 2. Breadcrumbs.tsx
Context-aware navigation trail.

```tsx
// Auto-generated from route structure
Dashboard > Receipts > Edit Receipt #123
Dashboard > Report > BAS > Q2 2025

// With back button
[← Back] Dashboard > Receipts > Edit Receipt #123
```

### 3. PageHeader.tsx
Consistent header for every page.

```tsx
<PageHeader
  title="Receipts"
  description="Manage your expense receipts"
  backTo="/dashboard"
  actions={[
    <Button>Add Receipt</Button>,
    <Button>Import</Button>
  ]}
/>
```

---

## Focus Modes

When activated, hide sidebar and show only task-relevant UI.

### BAS Mode
```
┌─────────────────────────────────────────────────────┐
│ [✕ Exit BAS Mode]     BAS Statement - Q2 2025      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Progress: Step 2 of 5  [=====>----------] 40%     │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │  Step 2: Review GST on Purchases            │   │
│  │                                             │   │
│  │  [Table of purchases with GST]              │   │
│  │                                             │   │
│  │  Total GST on Purchases: $4,521.00          │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [← Previous: Sales]     [Next: Adjustments →]     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Tax Return Mode
Similar focused experience for annual tax return preparation.

### Receipt Capture Mode
Full-screen camera/upload experience.

---

## Linear Workflows

### BAS Workflow (5 Steps)
1. **Select Period** - Choose quarter
2. **Review Sales** - GST collected
3. **Review Purchases** - GST paid
4. **Adjustments** - Corrections, bad debts
5. **Generate & Lodge** - PDF + ATO submission

### Tax Return Workflow (7 Steps)
1. **Personal Details** - Verify info
2. **Income** - Salary, dividends, interest
3. **Deductions** - Review all D1-D15
4. **Offsets** - Health insurance, etc.
5. **Medicare** - Levy and surcharge
6. **Review** - Summary check
7. **Submit** - Generate return

### Receipt Processing Workflow (3 Steps)
1. **Capture** - Photo or upload
2. **Extract** - OCR and verify
3. **Categorize** - Assign deduction category

---

## Role-Based Views

### Sole Trader View
- Simplified navigation
- Focus on: Receipts, Income, BAS, Tax Return
- Hide: Multi-entity features, complex workpapers

### Business View
- Full navigation
- All features visible
- Multi-user support

### Accountant View
- Client list as home
- Batch operations
- Professional workpapers
- Audit trail emphasis

---

## Route Structure (Proposed)

```
/                           → Redirect to /dashboard
/dashboard                  → Main dashboard

/capture
  /capture/receipts         → Receipt list
  /capture/receipts/new     → Add receipt
  /capture/receipts/:id     → Edit receipt
  /capture/invoices         → Invoice list
  /capture/bank-sync        → Bank connection

/organize
  /organize/categories      → Category management
  /organize/review          → Review queue
  /organize/suggestions     → AI suggestions

/report
  /report/bas               → BAS list
  /report/bas/:period       → BAS workflow (focus mode)
  /report/tax-return        → Tax return list
  /report/tax-return/:year  → Tax return workflow (focus mode)
  /report/workpapers        → Workpaper list
  /report/analytics         → Charts and insights

/export
  /export/accountant        → Accountant portal
  /export/download          → CSV/PDF exports

/settings                   → App settings
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] Create AppShell component
- [ ] Create Breadcrumbs component
- [ ] Create PageHeader component
- [ ] Update __root.tsx to use AppShell

### Phase 2: Navigation (Week 1-2)
- [ ] Create sidebar navigation
- [ ] Implement route grouping
- [ ] Add back buttons to all pages
- [ ] Add breadcrumb generation

### Phase 3: Focus Modes (Week 2)
- [ ] Create FocusMode wrapper component
- [ ] Implement BAS Mode
- [ ] Implement Tax Return Mode
- [ ] Implement Receipt Capture Mode

### Phase 4: Workflows (Week 2-3)
- [ ] Create Stepper component
- [ ] Implement BAS workflow
- [ ] Implement Tax Return workflow
- [ ] Add progress persistence

### Phase 5: Polish (Week 3)
- [ ] Role-based view switching
- [ ] Keyboard navigation
- [ ] Mobile responsive sidebar
- [ ] Animation and transitions

---

## Success Metrics

1. **Navigation Clarity** - User can always return to dashboard in 1 click
2. **Task Completion** - BAS workflow completion rate > 90%
3. **Time on Task** - Reduce BAS preparation time by 40%
4. **User Satisfaction** - NPS > 50 for navigation experience

---

## Files to Create/Modify

### New Components
- `src/components/layout/AppShell.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Breadcrumbs.tsx`
- `src/components/layout/PageHeader.tsx`
- `src/components/layout/FocusMode.tsx`
- `src/components/workflow/Stepper.tsx`
- `src/components/workflow/WorkflowPage.tsx`

### Modified Files
- `src/routes/__root.tsx` - Wrap with AppShell
- `src/routes/dashboard.tsx` - Update layout
- All route files - Add PageHeader

---

*Spec created: 2026-02-05*
*Author: Compass 🧭*
*Status: Ready for implementation*
