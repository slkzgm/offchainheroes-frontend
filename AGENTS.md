# Frontend Agent Guide

This repository hosts the Offchain Heroes control panel built with Next.js (App Router). The goal of this guide is to keep every contributor aligned on structure, tooling, and quality standards.

---

## Project structure & naming

- `src/app/`
  - `layout.tsx` – global providers (`ThemeProvider`, `AbstractProvider`, `QueryProvider`).
  - `page.tsx` – home dashboard (authentication + bot overview).
- `src/components/`
  - `dashboard/` – feature-driven widgets (e.g., `BotDashboard`).
  - `providers/` – wrappers for global context/providers.
  - `ui/` – shadcn/ui primitives generated via `pnpm dlx shadcn add …`.
- `src/hooks/` – custom React hooks (client-only utilities).
- `src/lib/` – shared helpers (`api.ts` for HTTP calls, `utils.ts` for UI helpers).

### shadcn / Tailwind conventions

- Add primitives with `pnpm dlx shadcn@latest add <component>` – never hand-copy from docs.
- Avoid bespoke CSS while Tailwind + shadcn cover the use-case.
- Reuse headless primitives to keep interactions consistent.

### Design principles

- Replace emojis with icons (Lucide/shadcn) to maintain a premium tone.
- Spacing matters: each block should breathe without wasting space – tweak padding/margins consciously.
- Overall aesthetic: “Swiss spa” — sleek, minimalist, premium; something a professional would happily pay thousands per month for (aim for a “Steve Jobs would smile” experience).
- Stick to a cohesive palette (base zinc theme). Introduce accent colors only when they communicate meaning.
- Responsive excellence: every component must remain elegant on both desktop and mobile.

### API & React Query

- `src/lib/api.ts` contains all REST calls (`/auth`, `/bot`, `/user`). Do not call `fetch` elsewhere.
- Always consume data through React Query hooks (QueryProvider already configured in `layout.tsx`).
- `useAuthTokens` keeps localStorage and in-memory listeners in sync; use it instead of duplicating token logic.

### State management

- No Redux/Zustand. React Query + localized state is enough for now.
- Toasts must go through `sonner`.

---

## Handy commands

```bash
pnpm install                   # install dependencies
pnpm dev                       # run Dev Server (http://localhost:3000)
pnpm lint                      # lint via next lint
pnpm build && pnpm start       # production build + serve
```

- Use `pnpm` consistently (shared workspace with the backend).
- Run `pnpm lint` before proposing a PR.

---

## Best practices

1. Keep `app/page.tsx` thin – push feature logic into dedicated components.
2. Separate data fetching from rendering (custom hooks + stateless UI components).
3. Stay strongly typed. Import the response interfaces from `src/lib/api.ts`; avoid `any`.
4. Accessibility first: rely on shadcn primitives (`Button`, `Label`, etc.).
5. Token handling exclusively through `saveTokens`, `clearTokens`, and `useAuthTokens`.
6. Styling: Tailwind utility classes + `cn` helper from `lib/utils.ts`.
7. Testing is not set up yet; document any new testing approach before adding it.
8. Update `README.md` and this guide whenever flows or conventions change.

---

## Pre-commit checklist

- `pnpm lint`
- Shadcn components follow project conventions (no inline styles).
- TypeScript passes without warnings.
- All HTTP interactions go through `api.ts`.
- Documentation updated when behaviour changes.

---

## Adding shadcn components

```bash
pnpm dlx shadcn@latest add <component>
```

The command updates `components.json`, writes the required files under `src/components/ui`, and adjusts Tailwind/CSS tokens if needed. Inspect the diff before committing.

---

## Points of contact

- Backend contract: see `backend/docs/frontend-api-guide.md`.
- Auth: Abstract wallet flow is already wired via `AbstractProvider`.
- Scheduling / bot data: consumed through `/bot/config`, `/bot/state`, `/bot/logs`.

Keep this document concise but authoritative. If you find yourself answering the same question twice, add the answer here.
