# Buena — Property Management Dashboard

A full-stack property creation and management tool built as a case study for Buena's Product Engineer role. The focus was on code quality, deliberate architectural decisions, and a creation flow fast enough to handle 60+ unit properties efficiently.

**Live demo:** https://property-management-dashboard-web.vercel.app  
**Backend API:** https://property-management-dashboard-arel.onrender.com/api/v1  
**Video walkthrough:** https://www.loom.com/share/609f060b016e452ca0acb51b13e71785  
**Detailed reasoning for decisions:** [`DECISIONS.md`](./DECISIONS.md)

> **Note:** Backend is on Render's free tier and may take 30–50 seconds to respond on first load after inactivity. If the dashboard appears empty, wait a moment and refresh.

---

## What it does

Property managers at Buena deal with a core problem: onboarding a new property means entering a lot of structured data — buildings, units, co-ownership shares — that already exists in a legal document called a Teilungserklärung (declaration of division). This tool makes that process fast.

The key insight was building around the PDF, not just alongside it. When a user uploads a Teilungserklärung, Claude reads it and pre-fills the entire form — 2 buildings and 14 units in one click instead of 14 manual rows. The user then reviews, adjusts, and confirms. That's the product decision that drives the whole architecture.

---

## Features

### Core flow
- Three-step wizard: General info → Buildings → Units
- Progressive persistence — step 1 saves immediately so no data is lost if the browser closes
- Wizard cleanup on close — if a user abandons mid-flow, the partial property is deleted automatically
- Duplicate property name detection with soft warning (not a hard block — two properties can legitimately share a name)

### AI extraction from Teilungserklärung PDF
- Upload a PDF on step 1 to pre-fill property name, buildings, and all units
- Handles German legal document formatting including `Miteigentumsanteile` (co-ownership shares)
- Pre-filled fields are highlighted in purple and remain fully editable
- Falls back gracefully — if extraction fails, the user fills in manually

### Unit table (step 3)
- Inline editable table with Tab key navigation between cells
- Tab on the last cell of the last row creates a new row automatically
- Clone row button duplicates a row and auto-increments the unit number (W-14 → W-15)
- **Bulk unit generator** — generate 60 units in seconds by specifying prefix, count, floor pattern, building, and type
- Co-ownership share live total in per-mille with green/yellow indicator
- Share validation with floating-point tolerance (0.1 + 0.2 + 0.7 = 1.0 even in JavaScript)

### Dashboard
- Search by property name or property number
- Filter by WEG / MV / All
- Stats bar showing total properties, WEG count, MV count, total units
- Property detail page with full buildings and units breakdown
- Delete property with two-step inline confirmation

### Property numbers
- Auto-generated, type-coded: `BU-WEG-00001` / `BU-MV-00001`
- Independent sequences per type — WEG and MV don't share a counter
- Uses `findFirst` ordered by sequence (not `count`) so deletions don't cause collisions
- Marked `@unique` in the schema — the database enforces uniqueness

---

## Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Backend | NestJS + TypeScript | Modular, decorator-based, excellent DI — scales well as the codebase grows |
| ORM | Prisma v5 | Type-safe queries, great migration tooling, clean schema DSL |
| Database | PostgreSQL | WEG law requires precise decimal arithmetic — not a document store problem |
| AI | Anthropic Claude API (claude-sonnet-4) | Best-in-class at structured extraction from German legal documents |
| Frontend | Next.js 15 + TypeScript | App Router, server components where appropriate, easy deployment |
| State | React Context + useReducer | Wizard state is a good fit for a reducer — actions are explicit and testable |
| Data fetching | TanStack React Query | Caching, background refetch, loading/error states without boilerplate |
| Styling | Tailwind CSS v4 | Utility-first, consistent design tokens, no runtime cost |

---

## Architecture decisions

The full reasoning behind every major decision is in [`DECISIONS.md`](./DECISIONS.md). Key ones:

**Progressive persistence over draft state**  
Step 1 saves to the database immediately and returns a `propertyId`. Steps 2 and 3 use that ID. This means a network failure at step 2 doesn't lose the property name and manager assignment. The tradeoff is we need cleanup logic on wizard close — handled by `deleteProperty` in `WizardShell`.

**PATCH not POST for buildings and units**  
`PATCH /properties/:id/buildings` replaces the entire building set atomically inside a `$transaction`. This means the client always sends the full desired state, and the server never has to reconcile partial updates. Simpler semantics, no orphan records.

**Soft warning not hard block for co-ownership shares**  
WEG law requires shares to total exactly 1000/1000. But a property manager entering 60 units mid-flow will have an incorrect total until the last unit is entered. Blocking submission would make the form unusable. We warn, save, and let the manager fix it later.

**AI as a pre-fill accelerator, not a replacement for human review**  
The AI extracts structured data and marks fields as pre-filled. The user must still assign each unit to a building (the AI knows "Haus A" but not the database UUID), review all values, and explicitly submit. AI is fast data entry, not autonomous data entry.

**Property names are not unique identifiers**  
Two managers could legitimately manage properties named "Residenz Berlin" in different cities. The `propertyNumber` (`BU-WEG-00001`) is the unique identifier, enforced at the database level with `@unique`. We show a soft warning if the same name already exists, with all matching property numbers listed.

---

## Data model

```
Staff (id, name, role: MANAGER|ACCOUNTANT)
  ↓
Property (id, propertyNumber, name, type: WEG|MV, managerId, accountantId)
  ↓
Building (id, propertyId, street, houseNumber, postalCode, city)
  ↓
Unit (id, buildingId, unitNumber, unitType, floor, entrance, sizeSqm, coOwnershipShare, ...)
```

Co-ownership shares are stored as fractions (0.11) and displayed as per-mille (110‰). The conversion happens in the wizard reducer on AI pre-fill and in the submit handler before sending to the API.

---

## Tests

87 tests across frontend and backend, focused on the logic with the most business risk.

### Running tests

```bash
# Frontend — 66 tests
cd apps/web
npm test

# Backend — 21 tests
cd apps/api
npm test
```

**Expected output:**
- Frontend: 2 test suites, 66 tests passing
- Backend: 1 test suite, 21 tests passing

**What's tested and why:**

`unitNumber.test.ts` (21 tests) — `incrementUnitNumber` is a pure utility used in the clone-row feature. It handles German patterns like `TG-05 → TG-6`, edge cases like `W-999 → W-1000`, and real patterns from the test PDF.

`WizardContext.test.ts` (45 tests) — The wizard reducer is the backbone of the three-step flow. Every action is tested in isolation including the `PREFILL_FROM_AI` conversion from fractions to per-mille, null field handling for parking/garden units, and state preservation across step transitions.

`units.service.spec.ts` (21 tests) — Co-ownership share validation is the most domain-specific logic in the system. Tests cover the floating-point tolerance case (`0.1 + 0.2 + 0.7` accepted as 100%), the empty units edge case (no warning when no units submitted), building ownership validation, and transaction ordering (delete before create).

Two tests caught real bugs during development: the empty units false warning and a wrong assumption about the Parkview PDF shares totalling 1000 (they total 900 — the service correctly warns).

---

## Local setup

**Prerequisites:** Node.js 18+, PostgreSQL

```bash
# Clone
git clone https://github.com/aadhishrii/property-management-dashboard
cd property-management-dashboard

# Install all dependencies
npm install

# Set up API environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your DATABASE_URL and ANTHROPIC_API_KEY

# Set up web environment
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1" > apps/web/.env.local

# Push schema and seed staff
cd apps/api
npx prisma db push
npm run db:seed

# Run both apps
cd ../..
npm run dev
```

Frontend: `http://localhost:3000`  
Backend: `http://localhost:3001`

---

## Project structure

```
property-management-dashboard/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── properties/     # Property CRUD + duplicate warning
│   │   │   ├── buildings/      # Atomic building replacement
│   │   │   ├── units/          # Unit upsert + share validation
│   │   │   ├── staff/          # Manager and accountant lookup
│   │   │   ├── upload/         # PDF parsing + Claude extraction
│   │   │   └── common/         # Exception filter
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── seed.ts
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── app/            # Pages (dashboard + property detail)
│           ├── components/
│           │   ├── dashboard/  # PropertyCard, PropertyList, EmptyState
│           │   └── wizard/     # WizardShell, Step1, Step2, Step3
│           ├── context/        # WizardContext (useReducer)
│           └── lib/            # API client, unitNumber utility
├── DECISIONS.md                # Full architecture decisions
└── render.yaml                 # Deployment config
```

---

## What I'd build next

**Edit property** — update manager, accountant, or name after creation. The `findOne` endpoint already exists; just needs a PATCH endpoint and form UI.

**CSV import for units** — property managers already have unit data in Excel. A CSV upload that maps columns and populates the unit table would cover the 60+ unit case from a completely different angle than the bulk generator.

**Duplicate detection improvement** — currently warns on exact name match. Fuzzy matching (e.g. "Parkview Berlin" vs "Parkview Residences Berlin") would catch more accidental duplicates without blocking legitimate ones.

**Property status** — Draft, Active, Archived. Filter the dashboard by status. Useful for properties being onboarded vs actively managed.

**Database sequences for property numbers** — the current count-based generation has a theoretical race condition under concurrent creates. A PostgreSQL sequence would eliminate it entirely.

---

## Deployment

- **Backend:** Render (free tier) — auto-deploys on push to `main`
- **Frontend:** Vercel (hobby) — auto-deploys on push to `main`
- **Database:** Render PostgreSQL

The monorepo structure uses `render.yaml` for backend config and Vercel's root directory setting for the frontend. Both services deploy independently.

Note: Render's free tier spins down after inactivity — the first request after a period of inactivity may take 30-50 seconds to respond.
