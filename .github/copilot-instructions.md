---
description: 'Project-wide AI assistant guidelines for the Unboxed collectibles marketplace'
---

# Unboxed — Copilot Instructions

## Project Context
Unboxed is a collectibles marketplace (Angular 19 + Express + Prisma + Supabase). See `/guidelines.md` for the full reference.

## Critical Rules

### Always Verify Changes
- After schema changes: run `npx prisma validate`
- After backend changes: confirm server compiles with `npx tsx index.ts`
- After frontend changes: confirm `ng build` or check TypeScript errors
- After UI changes: check the browser for rendering issues
- Report verification results to the user

### Before Editing
- Read the source file first — never assume current state
- Check `main/prisma/schema.prisma` before proposing data model changes
- Check existing patterns in `main/index.ts` before adding endpoints
- Check existing components before creating new ones

### Coding Standards
- Backend: all routes in `main/index.ts`, Prisma for DB, validate inputs, hash secrets with argon2, return `{ error: 'message' }` on failure
- Frontend: standalone components, Angular Signals, Tailwind CSS, `HttpClient` for API calls
- Follow existing patterns — consistency over novelty
- Minimal changes — don't refactor surrounding code unless asked

### Key Files
- **Schema**: `main/prisma/schema.prisma`
- **API routes**: `main/index.ts`
- **Frontend routes**: `unboxed-web-app/src/app/app.routes.ts`
- **Full guidelines**: `/guidelines.md`
