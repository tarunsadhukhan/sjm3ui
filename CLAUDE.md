# VoWERP3 Frontend - Developer Guide for Claude

## Project Overview

VoWERP3 UI is a **multi-tenant ERP frontend** built with **Next.js 15**, **TypeScript**, and **React 19**. It provides a modern, type-safe interface for complex ERP operations including procurement, inventory, sales, and jute/yarn management.

**Tech Stack:** Next.js 15 (App Router) | TypeScript (strict) | React 19 | Tailwind CSS 4.1 + MUI 7.3 | Zod 4.2 | React Hook Form 7.69 | Vitest + Storybook | pnpm

**Current Repo:** `vowerp3ui` | **Backend:** `vowerp3be` (FastAPI/Python)

---

## Three-Dashboard Architecture (MOST IMPORTANT)

The app has **three completely separate dashboards** for three user personas. Each has its own layout, sidebar, menus, API endpoints, and permission model. **Identify which dashboard you're working in before writing any code.**

### Dashboard 1: VOW Admin (Control Desk) -- `/dashboardctrldesk`

| Aspect | Details |
|--------|---------|
| **Route prefix** | `/dashboardctrldesk/` |
| **Layout** | `src/app/dashboardctrldesk/layout.tsx` |
| **Sidebar** | `SidebarConsole` -> `sidebarConsole.tsx` |
| **Menu hook** | `use-org-ctrldesk.tsx` -> fetches from `MENU_CTRLDESK` |
| **Login endpoint** | `SUPERADMINLOGINCONSOLE` -> `/authRoutes/loginconsole` |
| **API prefix** | `/ctrldskAdmin/` |
| **Backend DB** | `vowconsole3` (no org filter) |
| **Subdomain** | `admin` (hardcoded detection) |
| **Pages** | orgSetup, roleManagementAdmin, userManagementAdmin, menuManagement, orgModuleMap |

### Dashboard 2: Tenant Admin -- `/dashboardadmin`

| Aspect | Details |
|--------|---------|
| **Route prefix** | `/dashboardadmin/` |
| **Layout** | `src/app/dashboardadmin/layout.tsx` |
| **Sidebar** | `SidebarConsole` -> `sidebarCompanyConsole.tsx` |
| **Menu hook** | `use-org-console_menu.tsx` -> fetches from `GET_TENANT_ADMIN_MENU_ROLE` |
| **Login endpoint** | `USERLOGINCONSOLE` -> `/authRoutes/login` |
| **API prefix** | `/companyAdmin/` |
| **Backend DB** | `vowconsole3` (scoped by `con_org_id`) |
| **Subdomain** | Tenant subdomain (e.g., `dev3`, `sls`) |
| **Pages** | companyManagement, branchManagement, deptManagement, roleManagement, userManagement, approvalHierarchy |

### Dashboard 3: Tenant Portal -- `/dashboardportal`

| Aspect | Details |
|--------|---------|
| **Route prefix** | `/dashboardportal/` |
| **Layout** | `src/app/dashboardportal/layout.tsx` |
| **Sidebar** | `Sidebar` -> `sidebar.tsx` + `SidebarProvider` + `PortalPermissionBoundary` |
| **Menu hook** | `SidebarContext` (context-based, with localStorage caching) |
| **Login endpoint** | `USERLOGINCONSOLE` -> `/authRoutes/login` |
| **API prefix** | `/admin/PortalData/` (admin) + business routes (`/itemMaster/`, `/procurementIndent/`, etc.) |
| **Backend DB** | Tenant-specific DB (e.g., `dev3`, `sls`) |
| **Permission model** | Action-level: view(1), print(2), create(3), edit(4) via `portal_permission_token` |
| **State management** | `SidebarProvider` context (companies, branches, menus, permissions) |
| **Pages** | masters/, procurement/, inventory/, jutePurchase/, juteProduction/ |

### Permission Differences

| Dashboard | Permission Model | Middleware Check |
|-----------|-----------------|-----------------|
| Control Desk | Role-based (via menu structure) | Access token only |
| Tenant Admin | Role-based (via menu structure) | Access token only |
| Portal | **Action-level** (view/print/create/edit per menu) | Access token + `portal_permission_token` + per-route permission check |

Portal permission check is in `src/middleware.ts`.

### Choosing Where to Add New Pages

| If the page is for... | Put it under... | API prefix |
|----------------------|----------------|------------|
| Managing organizations, system menus | `dashboardctrldesk/` | `/ctrldskAdmin/` |
| Managing companies, branches, departments, tenant users | `dashboardadmin/` | `/companyAdmin/` |
| Managing portal users, roles, menus, approvals | `dashboardportal/` (uses `/admin/PortalData/`) | `/admin/PortalData/` |
| Business operations (procurement, masters, inventory) | `dashboardportal/{module}/` | `/{moduleName}/` |

### Key Frontend Files by Dashboard

| Control Desk | Tenant Admin | Portal |
|-------------|-------------|--------|
| `src/app/dashboardctrldesk/layout.tsx` | `src/app/dashboardadmin/layout.tsx` | `src/app/dashboardportal/layout.tsx` |
| `src/components/dashboard/sidebarConsole.tsx` | `src/components/dashboard/sidebarCompanyConsole.tsx` | `src/components/dashboard/sidebar.tsx` |
| `src/hooks/use-org-ctrldesk.tsx` | `src/hooks/use-org-console_menu.tsx` | `src/components/dashboard/sidebarContext.tsx` |
| -- | -- | `src/utils/portalPermissions.ts` |

> For login flow details and auth flows, see `docs/claude/api-patterns.md`.

---

## Critical Rules (MANDATORY)

### TypeScript
- **NEVER use `any`** -- use `unknown` with type guards
- Always define interfaces for component props
- Use type inference where possible
- Path alias `@/*` maps to `./src/*`
- Avoid circular dependencies -- use single type definition files per module
- Strict mode is enabled (`strict`, `noImplicitAny`, `strictNullChecks`)

### Zod Validation
- **Zod is REQUIRED for ALL forms and API inputs**
- Define schema -> infer type with `z.infer<>` -> use with `zodResolver` in React Hook Form
- Single source of truth for types and validation

### Component Organization
- **Shared components:** `src/components/ui/` or `src/components/{feature}/` -- require JSDoc, prop interfaces
- **Page-specific components:** `_components/` subfolder within page directory
- **Smart (container) components:** `page.tsx` handles state, data, logic
- **Dumb (presentational) components:** `_components/*.tsx` renders from props only

### Styling (Three Layers)
- **Tailwind CSS** for layout and spacing
- **MUI components** for complex interactions (DataGrid, Autocomplete, Dialog)
- **Theme tokens** (`src/styles/tokens.ts`) for colors -- **NEVER hardcode colors**
- Theme files: `tokens.ts`, `theme.ts`, `AppThemeProvider.tsx`, `tailwind.config.ts`

> For code examples of all the above, see `docs/claude/code-examples.md`.

---

## Backend Integration Essentials

### Status IDs (MUST match backend exactly)

| ID | Status | ID | Status |
|----|--------|----|--------|
| 21 | Draft | 3 | Approved |
| 1 | Open | 4 | Rejected |
| 20 | Pending Approval | 5 | Closed |
| | | 6 | Cancelled |

### API Response Format
```typescript
{ "data": [...], "master": [...] } // master is optional
```

### Cookies
- `access_token` -- JWT auth token (all dashboards)
- `portal_permission_token` -- permission data (Portal only)
- `subdomain` -- tenant identifier

### API Client
- Use `fetchWithCookie` from `src/utils/apiClient2.ts` (never call APIs directly in components)
- Routes defined in `src/utils/api.ts` (three route objects by dashboard)
- Service layer in `src/utils/{feature}Service.ts`

> For full API patterns, service layer examples, and auth flows, see `docs/claude/api-patterns.md`.

---

## Transaction Pages (Approval Workflows)

For documents like Indent, PO, GRN, Invoice -- follow the standardized architecture:

- **Folder structure:** `{transaction}/page.tsx` + `create{Transaction}/page.tsx` with `_components/`, `hooks/`, `types/`, `utils/`
- **Types:** ALL in one file per module (prevent circular deps)
- **Constants:** Status IDs, frozen empty arrays (`Object.freeze()`)
- **Factories:** `createBlankLine()`, `buildDefaultFormValues()`
- **Hooks:** Form state, line items (with cascade resets), select options (memoized), schemas, approval
- **Key patterns:** Deferred loading (`useDeferredOptionCache`), cascade resets, trailing blank rows, mode-aware rendering
- **Approval bar:** `src/components/ui/transaction/ApprovalActionsBar.tsx`

> For complete patterns, hook examples, and step-by-step guide, see `docs/claude/transaction-patterns.md`.

---

## Best Practices

### DO
1. Validate with Zod -- all forms and API inputs
2. Strict TypeScript -- no `any`, use proper types
3. Memoize expensive computations -- `useMemo`, `useCallback`
4. Pure presentational components -- based on props only
5. Comment complex logic
6. Mode-aware rendering -- check `mode !== "view"` before enabling edits
7. Immutable defaults -- `Object.freeze()` on empty arrays/objects
8. Separate concerns -- types, constants, factories in own files
9. Test critical paths
10. Remove `console.log` before commit

### DON'T
1. Never hardcode colors -- use theme tokens
2. Never use `any` types -- use `unknown` with type guards
3. Never call APIs directly in components -- use service functions
4. Never create circular dependencies -- single type definition files
5. Never commit `console.log`
6. Never use browser globals in server components
7. Never skip Zod validation
8. Never mutate frozen objects
9. Never hardcode status IDs -- use constants
10. Never skip tests for complex logic

### Naming Conventions
- **Components:** `PascalCase.tsx` (e.g., `ApprovalActionsBar.tsx`)
- **Hooks:** `camelCase.ts` with `use` prefix (e.g., `useIndentFormState.ts`)
- **Utilities/Services:** `camelCase.ts` (e.g., `indentService.ts`)
- **Files:** `.tsx` for JSX, `.ts` for logic

### React Hook Declaration Order
Block-scoped `useMemo`/`useCallback` are NOT hoisted. Always declare dependencies before dependents.

> For pitfall examples with code, see `docs/claude/code-examples.md`.

---

## Development Commands

```bash
pnpm dev               # Dev server (port 3000) with Turbopack
pnpm build             # Production build
pnpm lint              # Lint code
pnpm test              # Run tests
npx tsc --noEmit       # TypeScript check
pnpm storybook         # Storybook (port 6006)
```

> For testing examples and Storybook usage, see `docs/claude/testing-guide.md`.

---

## Reference Files

| File | Content |
|------|---------|
| `docs/claude/transaction-patterns.md` | Transaction page architecture, hooks, approval workflow, MuiForm schema, step-by-step guide |
| `docs/claude/code-examples.md` | TypeScript, Zod, component, styling examples + common pitfalls with code |
| `docs/claude/api-patterns.md` | API client, service layer, auth flows, route definitions |
| `docs/claude/testing-guide.md` | Vitest setup, test examples, Storybook, JSDoc standards |
| `AGENTS_GUIDE.md` | Comprehensive developer guide (26KB) |
| `instructions.md` | IDE agent instructions (13KB) |

## Common Examples in Codebase
- **List Pages:** `src/app/dashboardportal/masters/items/page.tsx`
- **Transaction Pages:** `src/app/dashboardportal/procurement/indent/createIndent/`
- **Shared Components:** `src/components/ui/`

---

## Version Info
- Next.js: 15 | React: 19 | TypeScript: 5.x (strict) | Node: 18+ | pnpm

**Last Updated:** 2026-02-20
