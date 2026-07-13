# Uni Bridge

A campus complaint-management platform. Students raise complaints, attach evidence, and track resolution end to end, while administrators triage and route issues and departments resolve what they own.

## Features

- **Students** — sign up, raise complaints with a category, priority, room/location and image, then track status (pending → assigned → in progress → resolved) and rate the resolution.
- **Admins** — dashboard with priority breakdown and department performance, full complaint triage (assign department, set priority/status, add notes), plus department and user management.
- **Departments** — a focused queue of only the complaints assigned to them, with the ability to post updates and close the loop.
- **Realtime** — in-app notifications and complaint threads update live via Supabase Realtime.
- Role-based routing and access control, SLA labels per priority, and email-based password reset.

## Tech stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (Radix primitives)
- [React Router](https://reactrouter.com/) and [TanStack Query](https://tanstack.com/query)
- [Supabase](https://supabase.com/) — auth, Postgres, Row Level Security, Edge Functions, Realtime
- [Vitest](https://vitest.dev/) + Testing Library

## Getting started

### Prerequisites

- Node.js 18+ (npm) — or [Bun](https://bun.sh/), a `bun.lock` is included.
- A Supabase project (URL + publishable/anon key).

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
#    Create a .env file in the project root:
```

```env
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-anon-key>"
VITE_SUPABASE_PROJECT_ID="<your-project-ref>"
```

```bash
# 3. Apply the database schema (requires the Supabase CLI + a linked project)
supabase db push

# 4. Start the dev server
npm run dev
```

The app runs at **http://localhost:8080**.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server (port 8080) |
| `npm run build` | Production build to `dist/` |
| `npm run build:dev` | Build in development mode |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run the test suite once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

## Project structure

```
src/
  components/      Shared UI + feature components (ui/ = shadcn primitives)
  hooks/           useAuth (session/role context), use-toast, use-mobile
  integrations/    Supabase client + generated database types
  lib/             Priority metadata, utils
  pages/           Route-level screens (student, admin, department, auth)
supabase/
  functions/       Edge functions (e.g. manage-department)
  migrations/       SQL schema + RLS policies
```

## License

Released under the [MIT License](LICENSE) © 2026 Rishik Reddy.
