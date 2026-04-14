# Buena Property Dashboard — Architecture & Decisions

> This document explains every significant decision made in building this project —
> what was built, why, what was deliberately left out, and what would come next.
> It exists so that every line of code has a reason behind it.

---

## Table of contents

1. [Problem statement](#1-problem-statement)
2. [Users and context](#2-users-and-context)
3. [Scope — in and out](#3-scope)
4. [User flow](#4-user-flow)
5. [Data model](#5-data-model)
6. [System architecture](#6-system-architecture)
7. [API design](#7-api-design)
8. [Frontend architecture](#8-frontend-architecture)
9. [The 60+ units efficiency approach](#9-the-60-units-efficiency-approach)
10. [AI pre-fill](#10-ai-pre-fill)
11. [Key decisions explained](#11-key-decisions-explained)
12. [What I'd build with more time](#12-what-id-build-with-more-time)

---

## 1. Problem statement

Property managers today work from folders, binders, and disconnected spreadsheets.
Buena's goal is to turn a physical building into a structured digital object.
The property creation flow is the entry point to that — and if it's slow or
error-prone, nothing downstream works well.

The real problem this flow solves:

> A property manager should be able to digitise an entire building —
> including 60+ units — in one sitting, without it feeling like data entry hell.

That single constraint shaped every product and engineering decision in this document.

---

## 2. Users and context

**Primary user:** A property manager at a German real estate company.

**Context:** Laptop, weekday morning, onboarding a new building they just took over.
They have the Teilungserklärung (declaration of division) in front of them —
either as a PDF or a physical document.

**Mental model:** They think in buildings and units, not database tables.
The UI must match that mental model exactly.

**Key insight:** This is not a casual user. They will use this flow repeatedly.
That means keyboard-first navigation and bulk operations matter far more than visual flair.
Every product decision flows from this.

---

## 3. Scope

### In scope

- Property dashboard with a list of all properties
- Three-step property creation wizard (general info → buildings → units)
- AI extraction from uploaded Teilungserklärung PDF to pre-fill the wizard
- Inline editable table with row cloning for fast unit entry
- Progressive persistence — each step saves to the backend before advancing
- WEG and MV property type support with type-coded property numbers
- Co-ownership share validation (WEG legal requirement)

### Out of scope

| Feature | Reason excluded |
|---|---|
| Authentication | Would use NextAuth + JWT in production. Mocked with a seeded user for this submission to keep scope tight. |
| Real file storage | Would use S3 + presigned URLs. PDF is processed in-memory for AI extraction only — the file itself is not persisted. |
| Unit tests | Would add Jest + React Testing Library. Services are structured to be easily testable — pure functions, injected dependencies. |
| Email notifications | Downstream of property creation, not in this spec. |
| Tenant / contract management | Out of scope for the creation flow. |
| Pagination | Would add at scale — not needed for this submission. |

---

## 4. User flow

![user-flow](https://github.com/user-attachments/assets/aed5252e-396c-453d-a8f7-41cd2a23a0a4)


The complete user journey:

1. User lands on the **dashboard** — sees a list of all properties or the empty state
2. Clicks **"Create new property"** — wizard modal opens
3. **Step 1 — General info:**
   - Selects WEG or MV management type
   - Optionally uploads the Teilungserklärung PDF
   - If PDF uploaded → AI extraction runs → buildings and units pre-filled
   - Fills property name, manager, accountant
   - Clicks Next → `POST /api/v1/properties` → `propertyId` returned and stored in wizard context
4. **Step 2 — Buildings:**
   - Reviews pre-filled building addresses (or fills manually)
   - Can add multiple buildings
   - Clicks Next → `PATCH /api/v1/properties/:id/buildings` → real building IDs returned
5. **Step 3 — Units:**
   - Inline table, pre-filled if AI ran
   - Assigns each unit to a building via dropdown
   - Uses Tab key or clone button for fast bulk entry
   - Co-ownership share total shown live
   - Clicks "Create property" → `PATCH /api/v1/properties/:id/units`
6. Wizard closes → dashboard refreshes → new property appears at top of list

**Key product decisions in the flow:**

- The PDF upload sits at the top of step 1, not the bottom — because it can
  pre-fill everything that follows. Position communicates priority.
- Progressive persistence means each step saves immediately on Next.
  If the user closes the tab after step 2, their property and buildings are
  already saved — they haven't lost work.
- Back navigation preserves all form values — navigating back never loses data.

---

## 5. Data model

<img width="919" height="550" alt="Screenshot 2026-04-14 at 11 30 23 AM" src="https://github.com/user-attachments/assets/eab64261-d5cd-420b-9ba6-28093a115fb0" />

### Entities

```
Staff ─── manages/accounts for ──→ Property
                                      │
                                   contains
                                      │
                                   Building
                                      │
                                   contains
                                      │
                                    Unit
```

### Key decisions

**UUIDs over auto-increment IDs**

Safer for distributed systems. Avoids exposing sequential identifiers in URLs
(`/properties/1`, `/properties/2` leaks how many properties exist).
Used throughout via Prisma's `@default(uuid())`.

**`propertyNumber` as a separate field from `id`**

The spec calls for a "unique number" distinct from the database primary key.
Format: `BU-WEG-00042` or `BU-MV-00018`.

Type-coded so a property manager reading a list immediately knows the management
type from the number alone — no need to open the record.
WEG and MV have independent sequences — `BU-WEG-00001` and `BU-MV-00001` can both exist.
Generated server-side in `PropertiesService`, never by the client.

**`coOwnershipShare` as Float**

In WEG law, the sum of all co-ownership shares across all units in a property
must equal 1.0 (or 1000/1000 depending on the document).
Stored as a decimal fraction (e.g. `43.2/1000 = 0.0432`) so the service layer
can sum and validate them mathematically.
A string field would make this validation impossible.

The UI displays values in per-mille (0–1000) which is how the Teilungserklärung
expresses them — the conversion happens at the API boundary.

**`Staff` as a separate entity**

Manager and accountant are not free-text fields on `Property`.
They reference a `Staff` table.

Two reasons:
1. Enables a real dropdown in the UI from actual staff records
2. Avoids duplication — one person managing 20 properties is one row, not 20

**`Building` as an intermediate entity**

Units belong to `Building`, not directly to `Property`.
This matches physical reality — each building in a German Grundbuch has its own
street address, and a single WEG property can span multiple buildings.

**`onDelete: Cascade`**

Deleting a property automatically deletes its buildings and units.
Without this, foreign key constraints would prevent deletion and require
manual cleanup logic.

**`UnitType` and `PropertyType` as enums**

Prevents silent bad data. `APPARTMENT` (typo) or `FREEHOLD` (unsupported type)
are rejected at the database level, not just in frontend validation.

### Full Prisma schema

```prisma
enum PropertyType { WEG MV }
enum UnitType     { APARTMENT OFFICE GARDEN PARKING }
enum StaffRole    { MANAGER ACCOUNTANT }

model Staff {
  id        String    @id @default(uuid())
  name      String
  email     String    @unique
  role      StaffRole
  createdAt DateTime  @default(now())

  managedProperties   Property[] @relation("PropertyManager")
  accountedProperties Property[] @relation("PropertyAccountant")
}

model Property {
  id             String       @id @default(uuid())
  propertyNumber String       @unique
  name           String
  type           PropertyType
  managerId      String
  accountantId   String
  manager        Staff        @relation("PropertyManager",   fields: [managerId],    references: [id])
  accountant     Staff        @relation("PropertyAccountant", fields: [accountantId], references: [id])
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  buildings      Building[]
}

model Building {
  id          String   @id @default(uuid())
  propertyId  String
  property    Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  street      String
  houseNumber String
  postalCode  String
  city        String
  createdAt   DateTime @default(now())
  units       Unit[]
}

model Unit {
  id               String   @id @default(uuid())
  buildingId       String
  building         Building @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  unitNumber       String
  unitType         UnitType
  floor            Int
  entrance         String?
  sizeSqm          Float
  coOwnershipShare Float
  constructionYear Int?
  rooms            Int?
  createdAt        DateTime @default(now())
}
```

---

## 6. System architecture

<img width="919" height="633" alt="Screenshot 2026-04-14 at 11 28 02 AM" src="https://github.com/user-attachments/assets/3d2eca6b-2257-4497-bd52-1b8c78028f9c" />


### Layer overview

```
Browser (Next.js)
       │
       │  HTTP/REST
       ▼
lib/api.ts  ──────────────────────────── single axios instance, all calls centralised
       │
       │  HTTP to localhost:3001
       ▼
NestJS API
  ├── PropertiesModule   (controller → service → Prisma)
  ├── BuildingsModule    (controller → service → Prisma)
  ├── UnitsModule        (controller → service → Prisma)
  ├── StaffModule        (controller → service → Prisma)
  └── UploadModule       (controller → service → pdf-parse → Claude API)
       │
       │  Prisma ORM
       ▼
PostgreSQL  (Docker container, port 5432)
```

### Tech stack

| Layer | Technology | Why |
|---|---|---|
| Frontend framework | Next.js 14 (App Router) | Specified in brief. Server components, file-based routing. |
| Frontend language | TypeScript | Type safety catches errors at compile time. |
| Frontend state | React Context + useReducer | Right tool for wizard scope — no Redux boilerplate needed. |
| Server state | TanStack React Query | Handles loading/error/cache for all API calls without manual useState. |
| HTTP client | Axios | Cleaner than raw fetch — base URL set once, automatic JSON, better error handling. |
| Styling | Tailwind CSS | Utility-first, no context switching between files. |
| Backend framework | NestJS | Specified in brief. Enforces module structure, DI, makes code navigable. |
| Backend language | TypeScript | Same language both sides — shared type thinking. |
| ORM | Prisma | Schema file is single source of truth. Type-safe queries. Migrations built in. |
| Database | PostgreSQL | Robust relational DB. ACID transactions for the delete-and-recreate pattern. |
| Local DB | Docker | No local PostgreSQL install needed. Reproducible across machines. |
| PDF parsing | pdf-parse | Lightweight, no external service needed, handles most German PDF encodings. |
| AI extraction | Anthropic SDK (Claude) | Best-in-class instruction following for structured JSON extraction from complex documents. |

**Why Prisma over TypeORM?**

TypeORM scatters the schema across decorators on entity classes — you need to open
multiple files to understand the data model.
Prisma's `schema.prisma` is a single file that tells the entire data model story
in under 80 lines. In a code review or interview, that matters.
Type-safe queries also mean a typo like `prisma.property.findUniqe()` fails at
compile time, not at 3am in production.

**Why NestJS module structure?**

Each feature (properties, buildings, units, staff, upload) is self-contained:
its own DTO, service, controller, and module file. Adding a new feature means
adding a new folder — existing code is untouched.
Controllers are intentionally thin — no business logic.
Services are pure business logic — testable without an HTTP server.

---

## 7. API design

All endpoints are prefixed `/api/v1`.

| Method | Path | Step | Description |
|---|---|---|---|
| `GET` | `/staff` | Step 1 load | Returns `{ managers, accountants }` for dropdowns |
| `POST` | `/upload/teilungserklaerung` | Step 1 | PDF upload → AI extraction → returns `{ propertyName, buildings, units }` |
| `POST` | `/properties` | Step 1 submit | Creates property, returns `{ id, propertyNumber, ... }` |
| `GET` | `/properties` | Dashboard | Lists all properties with manager name and building count |
| `GET` | `/properties/:id` | (future) | Full property with buildings and units tree |
| `PATCH` | `/properties/:id/buildings` | Step 2 submit | Replaces all buildings, returns saved records with IDs |
| `PATCH` | `/properties/:id/units` | Step 3 submit | Bulk replaces all units, returns `{ units, shareWarning }` |

### Why `PATCH` for buildings and units

`PATCH` means partial update of an existing resource — which is exactly what's
happening. We're updating the buildings/units that belong to a property that
already exists (created in step 1).

`POST` would imply creating a brand new independent resource.
`PUT` would imply replacing the entire property resource.
`PATCH` is the correct HTTP verb here.

### Why PATCH not individual POSTs for units

60 units submitted as 60 individual POST requests means 60 round trips,
60 opportunities for partial failure, and no atomicity — if unit 43 fails,
units 1-42 are saved but 43-60 are not.

One PATCH with an array runs one `createMany` in a transaction.
Either all 60 are saved or none are. The database is never in a half-saved state.

### Why progressive persistence (save at each step)

The alternative is sending all data in one final POST at the end.
The problem: if a network error occurs on step 3 after the user has entered
60 units, all that work is lost.

Progressive persistence saves step 1 immediately when the user clicks Next.
By step 3, steps 1 and 2 are already in the database.
A network failure on step 3 only loses step 3 data — and the user can re-enter
just the units, not start over.

### The `delete + createMany` pattern for buildings and units

When the user submits step 2, we don't diff the old and new building lists.
We delete all existing buildings for this property and recreate them from
the submitted array, wrapped in a `$transaction`.

Why? In a wizard, the user may have added, removed, or reordered buildings
before hitting submit. Tracking which records changed is complex and fragile.
Atomic replacement is simpler and correct — either all buildings are saved or none.
The `$transaction` ensures if `createMany` fails, the `deleteMany` is rolled back.

### Co-ownership share validation

After saving units, the service sums all `coOwnershipShare` values for the property.
If they don't total 1.0, a `shareWarning` string is returned alongside the saved units.

We use `Math.abs(sum - 1) > 0.001` not `sum !== 1` because floating point arithmetic
means `0.1 + 0.2 = 0.30000000000000004` in JavaScript — strict equality would reject
valid data over a rounding artefact. The tolerance handles this.

This is a warning, not a hard error. The user may be mid-entry and intending
to adjust shares. We don't block them — we inform them.

---

## 8. Frontend architecture

> **Diagram: UI flow**
> Screenshot of the UI flow diagram goes here.
> It shows every screen in the wizard, every branch (AI success/fail, API success/fail),
> and the back navigation paths.

### Wizard state — Context + useReducer

```
WizardContext (wraps the entire wizard)
  │
  ├── step: 1 | 2 | 3
  ├── propertyId: string | null      ← set after step 1 POSTs
  ├── savedBuildings: Building[]     ← real DB records from step 2, used in step 3 dropdown
  ├── generalInfo: GeneralInfoData
  ├── buildings: BuildingFormData[]
  ├── units: UnitFormData[]
  └── aiPrefilled: boolean
```

**Why Context + useReducer over multiple useState calls?**

Multiple `useState` would scatter state and transition logic across three components.
`useReducer` centralises every possible state change in one function.
You can read the reducer and understand every transition the wizard can make.

Example — when step 1 saves successfully:
```
dispatch({ type: 'SET_PROPERTY_ID', propertyId: response.id })
dispatch({ type: 'SET_GENERAL_INFO', data: { name, type, managerId, accountantId } })
dispatch({ type: 'NEXT_STEP' })
```

Three actions, three explicit transitions. Compare this to three scattered `setState`
calls with implicit dependencies — much harder to reason about or debug.

**Why Context over Redux?**

Redux is the right call at application scale — global state, complex selectors,
time-travel debugging. For a single wizard flow that is mounted and unmounted,
the boilerplate is unnecessary overhead. Context + useReducer gives the same
unidirectional data flow with no setup cost.

### Component structure

```
DashboardPage
  ├── PropertyList → PropertyCard (one per property)
  ├── EmptyState (shown when no properties)
  └── WizardShell (modal, mounted on "Create new property" click)
        ├── Step1GeneralInfo
        ├── Step2Buildings
        └── Step3Units
```

Each step component:
- Reads from WizardContext for initial values (so Back navigation shows previous data)
- Holds local form state during editing (avoids dispatching on every keystroke)
- Dispatches to context only on submit
- Makes its API call before dispatching NEXT_STEP — if the API call fails, the step stays open

### Server state — React Query

React Query manages all data fetching. Without it, every API call would require
three pieces of manual state: `const [data, setData] = useState()`,
`const [loading, setLoading] = useState(false)`, `const [error, setError] = useState()`.

With React Query:
```typescript
const { data: properties, isLoading, refetch } = useQuery({
  queryKey: ['properties'],
  queryFn:  fetchProperties,
})
```

One line. Loading, error, and cache handled automatically.
When the wizard completes, `refetch()` is called on the dashboard query —
the new property appears in the list without a page reload.

### AI pre-fill UX decisions

Pre-filled fields are highlighted with a subtle purple tint (`ai-prefilled` CSS class).
This tells the user "this was filled by AI, review it" without being intrusive.
The tint fades on focus — once you've touched a field, it's yours.

A notice banner appears above the form when AI data is loaded:
*"AI pre-filled 3 buildings and 47 units from your PDF. Review and edit before confirming."*

**The AI is an assistant, not the source of truth.** All pre-filled fields
are editable. The user always has final say. This is the right product philosophy
for data that has legal significance.

If extraction fails for any reason, the user continues manually —
extraction failure never blocks the wizard flow.

---

## 9. The 60+ units efficiency approach

**Choice: inline editable table + row cloning**

The inline table renders all units as rows. Each cell is a controlled input.
Pressing Tab moves to the next cell. At the last cell of the last row,
Tab creates a new empty row automatically — the user never needs to reach for the mouse.

**Row cloning** — the duplicate button copies all field values from a row and
auto-increments the unit number. `W-14` becomes `W-15`. `A.3` becomes `A.4`.
A 10-floor building with 6 units per floor: fill one row, clone it 59 times,
adjust floor numbers. Minutes, not an hour.

**Why not CSV import?**

CSV import solves the same bulk-entry problem but introduces significant edge cases:
column mapping, character encoding issues (German umlauts), validation of malformed rows,
per-row error feedback, and mapping the user's column names to our field names.
Done well it's very powerful. Done poorly it's a source of frustrating errors.

The inline table solves the real problem — fast bulk entry — with a UI the user
learns in 10 seconds. It also composes naturally with AI pre-fill:
the AI populates the table, the user edits inline.
That combination is more powerful than CSV import for the Teilungserklärung use case.

**Why not a modal-per-unit approach?**

Opening a modal for each of 60 units means 60 open/fill/close cycles.
That's the exact anti-pattern this feature exists to eliminate.

---

## 10. AI pre-fill

### How it works

1. User uploads PDF in step 1
2. Frontend POSTs to `POST /upload/teilungserklaerung` (multipart/form-data)
3. Backend receives the file buffer via Multer (in-memory, no disk write)
4. `pdf-parse` extracts raw text from the buffer
5. Text is sent to the Claude API (`claude-sonnet-4-20250514`) with a structured prompt
6. Prompt instructs Claude to return only valid JSON matching a specific schema —
   no explanation, no markdown, no preamble
7. Response is parsed and returned as `{ propertyName, buildings, units }`
8. Frontend dispatches `PREFILL_FROM_AI` — wizard state is populated
9. All pre-filled fields are editable — user reviews before confirming

### Prompt design decisions

- **JSON only, no preamble** — makes parsing reliable. Any extra text breaks `JSON.parse`.
- **Explicit schema in the prompt** — reduces hallucination and ensures field names match
  what the frontend expects.
- **Conservative extraction** — "if a field is not clearly stated, use null" prevents
  invented data. The user fills gaps, the AI doesn't guess.
- **Per-mille to fraction conversion in prompt** — `43.2/1000 = 0.0432` — normalises
  the share format regardless of how the document expresses it.
- **German term mapping** — `Wohnung/Apartment → APARTMENT`, `Stellplatz → PARKING` etc.
  The Teilungserklärung is a German legal document.
- **12,000 character slice** — stays well within token limits. The key structured data
  (unit list, addresses) appears early in the document.

### Failure handling

If extraction fails for any reason (invalid PDF, API error, malformed JSON),
the service returns `{ propertyName: null, buildings: [], units: [] }` —
it never throws. The frontend shows a notice and the user continues manually.
Extraction failure is a degraded experience, not a broken one.

---

## 11. Key decisions explained

These are the decisions most likely to come up in an interview.

**"Why did you use Prisma instead of TypeORM?"**

Prisma's `schema.prisma` is a single file that describes the entire data model.
TypeORM scatters it across `@Entity` decorators on multiple class files.
In a code review, `schema.prisma` tells the whole story in one scroll.
Type-safe queries also catch field-name typos at compile time — `findUniqe` fails
before it ever runs.

**"Why a monorepo?"**

Both apps share type conventions (e.g. `PropertyType`) and can be run with one command.
In a real team, shared packages (types, utils) live at the root.
For this submission it also makes setup simple — one `git clone`, two `npm install`s.

**"Why Docker for PostgreSQL?"**

No local installation required. Any developer can `docker compose up -d` and have
an identical database running in seconds. Eliminates "works on my machine" for database setup.

**"Why `delete + createMany` instead of upserting individual records?"**

Diffing an array of buildings to find what changed (added, removed, edited)
requires tracking identity across form edits. The complexity isn't worth it.
Atomic replacement in a transaction is simpler, correct, and equally fast
for the data volumes involved in this domain.

**"Why per-mille in the UI but fraction in the database?"**

The Teilungserklärung always expresses co-ownership in per-mille (e.g. 43.2/1000).
Showing it that way in the UI matches the user's mental model and the source document.
Storing it as a fraction (0.0432) makes validation (`sum === 1.0`) and arithmetic straightforward.
The conversion is at the API boundary — a single division on submit.

**"Why warn on co-ownership share imbalance instead of hard-blocking?"**

A property manager entering 60 units may not enter shares in order.
Hard-blocking would prevent saving partially-entered data.
A warning lets them proceed, finish entering all units, then adjust shares.
The data is still saved correctly — the warning is informational.

---

## 12. What I'd build with more time

**Real authentication**
NextAuth with email/password or SSO. JWT tokens on the API.
Per-property access control — a manager only sees their own properties.

**S3 file storage**
Store the uploaded Teilungserklärung against the property record.
Presigned URLs for secure access. The PDF is currently processed and discarded.

**Optimistic UI**
Show the new property in the dashboard list immediately when the wizard closes,
then reconcile with the server response. Faster perceived performance.

**Unit and integration tests**
Jest for service layer logic. React Testing Library for the wizard flow.
The architecture supports this — services are pure classes with injected dependencies,
easy to instantiate in tests without starting the HTTP server.

**Audit log**
Who created and last edited a property, and when.
Essential for WEG legal compliance where decisions must be traceable.

**Pagination and search**
The dashboard needs pagination or virtualisation at scale.
Search by property name or number for portfolios with hundreds of properties.

**Co-ownership share calculator**
A helper in the unit table that distributes 1000 shares evenly across all units,
then lets the user adjust individual values with the total updating live.
Significantly reduces the manual maths for WEG properties.

**Real-time collaboration**
Multiple staff members editing the same property simultaneously.
WebSockets or Server-Sent Events. Relevant for large onboarding sessions.


