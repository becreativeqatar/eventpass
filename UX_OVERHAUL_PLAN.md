# EventPass UX Overhaul — SaaS-Ready Redesign

## Context
EventPass is an event accreditation management system that may become a SaaS product. The current UX is MVP-quality: generic grayscale look, horizontal nav that disappears on mobile, confusing forms, inconsistent loading/error states, and no dark mode. This plan transforms it into a modern, professional SaaS dashboard (Linear/Vercel-inspired) with a scalable design system.

---

## Phase 1: Foundation — Design System & Layout Shell
**Status:** COMPLETED
**Impact: Transforms every admin page at once**

### 1.1 Install missing shadcn components
```
npx shadcn@latest add sidebar sheet dropdown-menu avatar separator scroll-area breadcrumb popover
```

### 1.2 Brand color palette
**Modify:** `src/app/globals.css`
- Change `--primary` from grayscale to indigo-blue (`oklch(0.55 0.2 260)`)
- Add `--success` (green) and `--warning` (amber) semantic tokens
- Update dark mode variants to match

### 1.3 Dark mode support
**Create:** `src/components/theme-provider.tsx` — class-based theme provider with localStorage persistence
**Create:** `src/components/theme-toggle.tsx` — Sun/Moon toggle button
**Modify:** `src/app/layout.tsx` — wrap in ThemeProvider, add flash-prevention script

### 1.4 Sidebar navigation (replaces horizontal nav)
**Create:** `src/components/app-sidebar.tsx`
- Uses shadcn Sidebar with collapsible desktop + sheet on mobile
- Grouped nav: Overview | Accreditation | Monitoring | System
- Icons for every item (lucide-react)
- Role-based filtering (VALIDATOR sees only Dashboard + Scanner)
- Active state uses `pathname.startsWith()` instead of exact match
- Pending approvals count badge

### 1.5 Breadcrumbs
**Create:** `src/components/app-breadcrumb.tsx`
- Dynamic breadcrumb from URL segments
- Human-readable labels mapping

### 1.6 User dropdown
**Create:** `src/components/user-nav.tsx`
- Avatar (initials-based), name, role badge
- Theme toggle, Sign Out

### 1.7 Admin layout rewrite
**Modify:** `src/app/admin/layout.tsx` — complete rewrite
- SidebarProvider + AppSidebar + SidebarInset
- Header with SidebarTrigger + Breadcrumb
- Full-width content (remove max-w-7xl constraint)
- Remove hardcoded `bg-gray-50`, use `bg-background`

---

## Phase 2: Page-Level UX Improvements
**Status:** COMPLETED

### 2.1 Dashboard redesign
**Modify:** `src/app/admin/page.tsx`
- Stat cards with icons and color-coded icon backgrounds
- Quick actions grouped: Primary (Create Project, Review Approvals) + Secondary
- Recent activity list (5 latest accreditations)

### 2.2 Responsive data table
**Create:** `src/components/data-table.tsx`
- Desktop: standard table | Mobile: card-based rows
- Column visibility toggles, pagination, 44px touch targets

### 2.3 Apply data table across all list pages
- projects, approvals, users, scans, reports, accreditation-list-table

### 2.4 Consistent empty states
- Use semantic tokens for dark mode, add CTA buttons everywhere

### 2.5 Consistent loading skeletons
**Create:** `src/components/page-skeleton.tsx`
- Replace "Loading..." text with skeletons across all admin pages

---

## Phase 3: Forms & Workflows
**Status:** COMPLETED

### 3.1 Accreditation form wizard
- 4-step stepper: Personal Info → Identification → Access Control → Review
- Per-step validation, scroll mode for edit

### 3.2 Project form improvements
- Calendar date pickers, date range validation, preset access groups

### 3.3 Login page polish
- Remove dev credentials from UI, fix @test.local refs, brand the page

### 3.4 Photo upload enhancement
- Drag-and-drop, larger preview, hover overlay actions

---

## Phase 4: Polish & Accessibility
**Status:** COMPLETED

### 4.1 Centralize toast notifications (sonner)
### 4.2 Badge accessibility — add icons alongside color
### 4.3 Replace native confirm() with AlertDialog
### 4.4 Micro-animations and hover transitions
### 4.5 Keyboard navigation and aria-labels

---

## Verification Checklist (after each phase)
- [ ] `npm run dev` — no build errors
- [ ] Test all 4 role logins
- [ ] Mobile viewport (375px) in devtools
- [ ] Dark mode toggle works
- [ ] Navigate all admin pages
- [ ] Test forms: create project, create accreditation, approve/reject
- [ ] QR scanner on mobile viewport
