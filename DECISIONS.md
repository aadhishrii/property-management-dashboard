# Buena Property Dashboard — Architecture & Decisions

> Every significant decision made in building this project — what was built, why,
> what was deliberately left out, and what would come next.
> Every line of code has a reason behind it.

---

## Table of Contents

| # | Section |
|---|---------|
| 1 | [Problem statement](#1-problem-statement) |
| 2 | [Users and context](#2-users-and-context) |
| 3 | [Scope — in and out](#3-scope) |
| 4 | [User flow](#4-user-flow) |
| 5 | [Data model](#5-data-model) |
| 6 | [System architecture](#6-system-architecture) |
| 7 | [API design](#7-api-design) |
| 8 | [Frontend architecture](#8-frontend-architecture) |
| 9 | [60+ units efficiency](#9-the-60-units-efficiency-approach) |
| 10 | [AI pre-fill](#10-ai-pre-fill) |
| 11 | [Key decisions explained](#11-key-decisions) |
| 12 | [What I'd build with more time](#12-what-id-build-with-more-time) |

---

## 1. Problem Statement

Property managers today work from folders, binders, and disconnected spreadsheets.
Buena's goal is to turn a physical building into a structured digital object.
The property creation flow is the entry point — and if it's slow or error-prone,
nothing downstream works well.

> **The real constraint that shaped every decision:**
> A property manager should be able to digitise an entire building —
> including 60+ units — in one sitting, without it feeling like data entry hell.

---

## 2. Users and Context

| | |
|---|---|
| **Primary user** | Property manager at a German real estate company |
| **Context** | Laptop, weekday morning, onboarding a building they just took over |
| **Document in hand** | Teilungserklärung (declaration of division) — PDF or physical |
| **Mental model** | Thinks in buildings and units, not database tables |

**Key insight:** This is not a casual user. They use this flow repeatedly.
Keyboard-first navigation and bulk operations matter more than visual flair.
Every product decision flows from this.

---

## 3. Scope

### ✅ In scope

- Property dashboard with search, filter, stats bar
- Three-step creation wizard: General info → Buildings → Units
- AI extraction from Teilungserklärung PDF to pre-fill the wizard
- Inline editable table with Tab navigation and row cloning
- Bulk unit generator for 60+ unit properties
- Progressive persistence — each step saves before advancing
- Wizard cleanup on close — partial property deleted if user abandons
- WEG and MV support with type-coded property numbers (`BU-WEG-00001`)
- Co-ownership share validation (WEG legal requirement: shares must total 1000/1000)
- Duplicate property name warning with all matching property numbers listed
- Property detail page with buildings and units breakdown
- Delete property from dashboard with two-step confirmation
- 87 tests across frontend and backend (unitNumber utility, wizard reducer, units service)

### ❌ Out of scope

| Feature | Why excluded |
|---|---|
| Authentication | Would use NextAuth + JWT in production. Seeded staff for this submission. |
| Real file storage | Would use S3 + presigned URLs. PDF processed in-memory only. |
| Email notifications | Downstream of property creation, not in this spec. |
| Tenant / contract management | Out of scope for the creation flow. |
| Pagination | Would add at scale. Not needed for this submission. |

---

## 4. User Flow

<!-- IMAGE: user-flow diagram -->
![user-flow](https://github.com/user-attachments/assets/aed5252e-396c-453d-a8f7-41cd2a23a0a4)


**Key product decisions in the flow:**

- PDF upload is at the **top** of step 1 — not the bottom. Position communicates priority.
- **Progressive persistence** — each step saves immediately on Next. Closing after step 2 doesn't lose steps 1 or 2.
- **Wizard cleanup** — closing mid-flow calls `DELETE /properties/:id` to remove the partial record.
- **Back navigation** always preserves form values.

---

## 5. Data Model

<!-- IMAGE: ER diagram -->
<img width="919" height="550" alt="ER diagram" src="https://github.com/user-attachments/assets/eab64261-d5cd-420b-9ba6-28093a115fb0" />

### Data model decisions

**UUIDs over auto-increment**
Avoids exposing sequential IDs in URLs (`/properties/1` leaks portfolio size).
Used throughout via `@default(uuid())`.

**`propertyNumber` separate from `id`**
Format: `BU-WEG-00042` or `BU-MV-00018`.
Type-coded — a property manager reading a list immediately knows the management type.
WEG and MV have **independent sequences** — `BU-WEG-00001` and `BU-MV-00001` coexist.
Generated server-side using `findFirst` ordered by sequence — not `count()`.

> ⚠️ **Why not `count()`?**
> If properties have been deleted, `count()` could return a sequence number
> that already exists, causing a unique constraint violation.
> `findFirst` ordered by `propertyNumber DESC` always finds the actual highest number.

**`coOwnershipShare` as Float, not String**
WEG law requires all shares to sum to 1.0 (1000/1000).
A Float enables `Math.abs(sum - 1) < 0.001` validation.
A String makes arithmetic impossible.
The UI shows per-mille (43.2). The database stores fractions (0.0432).
Conversion happens at the API boundary.

**`Staff` as a separate entity**
Manager and accountant are not free-text fields on `Property`.
They reference a `Staff` table — one person managing 20 properties is one row, not 20.
Enables real dropdowns populated from actual staff records.

**`Building` as an intermediate entity**
Units belong to `Building`, not directly to `Property`.
Matches physical reality — a single WEG property in Berlin can span multiple buildings
at different street addresses. Each has its own Grundbuch entry.

**`onDelete: Cascade`**
Deleting a property automatically deletes its buildings and units.
Without this, FK constraints would prevent deletion and require manual cleanup.

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

## 6. System Architecture

<!-- IMAGE: full-stack architecture diagram -->
<img width="919" height="633" alt="System architecture" src="https://github.com/user-attachments/assets/3d2eca6b-2257-4497-bd52-1b8c78028f9c" />

### Tech stack decisions

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router) | File-based routing, server components, specified in brief |
| State (wizard) | React Context + useReducer | Self-contained wizard scope — no Redux boilerplate needed |
| Server state | TanStack React Query | Loading/error/cache in one line — no manual useState |
| HTTP client | Axios | Base URL set once, automatic JSON, better error handling than fetch |
| Styling | Tailwind CSS v4 | Utility-first, no context switching between files |
| Backend | NestJS | Module structure enforced, DI, controllers are intentionally thin |
| ORM | Prisma v5 | Single `schema.prisma` tells the whole data model story |
| Database | PostgreSQL | ACID transactions for delete-and-recreate pattern |
| Local DB | Homebrew PostgreSQL | Used locally — Docker had persistent auth issues with the Alpine image |
| PDF parsing | pdf-parse-fork | Switched from pdf-parse due to Node.js 22 subpath export incompatibility |
| AI | Anthropic Claude | Best instruction-following for structured JSON from legal documents |

**Why Prisma over TypeORM?**
TypeORM scatters schema across `@Entity` decorators on multiple files.
`schema.prisma` is one file — open it and the entire data model is in one scroll.
Type-safe queries mean `prisma.property.findUniqe()` fails at compile time, not at 3am.

---

## 7. API Design

All endpoints prefixed `/api/v1`.

| Method | Path | Step | What it does |
|---|---|---|---|
| `GET` | `/staff` | Step 1 load | Returns `{ managers[], accountants[] }` for dropdowns |
| `POST` | `/upload/teilungserklaerung` | Step 1 | PDF → AI extraction → `{ propertyName, buildings[], units[] }` |
| `POST` | `/properties` | Step 1 submit | Creates property, returns `{ id, propertyNumber, ... }` |
| `GET` | `/properties` | Dashboard | All properties with manager name, building count, unit count |
| `GET` | `/properties/:id` | Detail page | Full property tree — buildings + units |
| `PATCH` | `/properties/:id/buildings` | Step 2 | Atomically replaces all buildings, returns IDs |
| `PATCH` | `/properties/:id/units` | Step 3 | Atomically replaces all units, returns `{ units, shareWarning }` |
| `DELETE` | `/properties/:id` | Wizard close | Deletes partial property if user abandons mid-flow |

### Why `PATCH` not `POST` for buildings and units

`PATCH` means: *update this existing resource*.
`POST` means: *create a new independent resource*.

When step 2 submits buildings, we're updating the buildings belonging to a property
that already exists (created in step 1). `PATCH` is the correct HTTP verb.

### Why one `PATCH` not 60 individual `POST`s for units

60 individual POSTs = 60 round trips, 60 opportunities for partial failure.
If unit 43 fails, units 1-42 are saved but 43-60 are not. Inconsistent state.

One `PATCH` with an array runs one `createMany` inside a `$transaction`.
All 60 saved or none. The database is never half-saved.

### Why progressive persistence

Alternative: one giant POST at the end with all data.
Problem: network error on step 3 after 60 units typed = everything lost.

Progressive persistence: step 1 saves immediately on Next click.
By step 3, steps 1 and 2 are already in the database.
A failure at step 3 only loses step 3. The user re-enters units, not the whole flow.

### The `delete + createMany` pattern

When step 2 submits, we don't diff old and new building lists.
We delete all existing buildings and recreate from the submitted array, in a `$transaction`.

Why? The user may have added, removed, or reordered buildings in the form.
Tracking which records changed is complex and fragile.
Atomic replacement is simpler, correct, and rollback-safe.

```typescript
await prisma.$transaction(async (tx) => {
  await tx.unit.deleteMany({ where: { buildingId: { in: buildingIds } } })
  await tx.unit.createMany({ data: dto.units.map(u => ({ ...u })) })
})
```

If `createMany` throws, the `deleteMany` is rolled back. Property never loses its units.

### Co-ownership share validation

```typescript
const total = units.reduce((sum, u) => sum + u.coOwnershipShare, 0)
const shareWarning =
  units.length === 0
    ? null
    : Math.abs(total - 1) > 0.001
    ? `Shares total ${(total * 100).toFixed(2)}% — expected 100%`
    : null
```

> ⚠️ **Why `Math.abs(total - 1) > 0.001` not `total !== 1`?**
> `0.1 + 0.2 + 0.7 = 0.9999999999999999` in JavaScript.
> Strict equality would reject perfectly valid share data over a floating-point artefact.
> The tolerance handles this correctly.

This is a **warning, not a hard error.** A manager entering 60 units doesn't enter
shares in order — blocking submission mid-entry would break the flow.

---

## 8. Frontend Architecture

### Wizard state — Context + useReducer

```typescript
// WizardContext state shape
{
  step:           1 | 2 | 3
  propertyId:     string | null      // set after step 1 POSTs successfully
  savedBuildings: Building[]         // real DB records — used in step 3 dropdown
  generalInfo:    GeneralInfoData | null
  buildings:      BuildingFormData[]
  units:          UnitFormData[]
  aiPrefilled:    boolean
}

// Actions
NEXT_STEP · PREV_STEP
SET_PROPERTY_ID
SET_GENERAL_INFO
SET_BUILDINGS · SET_SAVED_BUILDINGS
SET_UNITS
PREFILL_FROM_AI    ← converts coOwnershipShare fraction → per-mille for display
RESET
```

**Why `useReducer` over multiple `useState` calls?**

Multiple `useState` scatters state and transition logic across three components.
`useReducer` centralises every possible state change in one function.
You can read the reducer and understand every transition the wizard can make.
The reducer is also a pure function — **testable without React**.

**Why Context over Redux?**

Redux is correct at application scale — global state, complex selectors, time-travel.
For a single wizard flow that mounts and unmounts, the boilerplate is unnecessary.
Context + useReducer gives the same unidirectional data flow with no setup cost.

### Component structure

```
DashboardPage
  ├── LoadingSkeleton
  ├── EmptyState
  ├── NoResults (when search/filter returns nothing)
  ├── PropertyList
  │     └── PropertyCard (one per property)
  └── WizardShell (modal, mounted on "Create" click)
        ├── Step1GeneralInfo
        │     ├── PDF upload + AI extraction
        │     ├── WEG/MV toggle
        │     ├── Property name
        │     ├── Manager dropdown
        │     ├── Accountant dropdown
        │     └── Duplicate warning dialog
        ├── Step2Buildings
        │     └── BuildingForm (one per building)
        └── Step3Units
              ├── Inline editable table
              ├── Clone row
              ├── Tab navigation
              └── Bulk unit generator
```

Each step component:
- Reads from `WizardContext` for initial values — Back navigation shows previous data
- Holds **local form state** during editing — no dispatch on every keystroke
- Dispatches to context only on submit
- Makes API call **before** dispatching `NEXT_STEP` — API failure keeps the step open

### Server state — React Query

```typescript
// Without React Query — 3 pieces of manual state per call
const [data, setData]       = useState()
const [loading, setLoading] = useState(false)
const [error, setError]     = useState()

// With React Query — one line
const { data, isLoading, refetch } = useQuery({
  queryKey: ['properties'],
  queryFn:  fetchProperties,
})
```

When the wizard completes, `refetch()` is called — the new property appears
in the dashboard list without a page reload.

### AI pre-fill UX decisions

- Pre-filled fields shown with a **purple tint** (`ai-prefilled` CSS class)
- Tint fades on focus — once you touch a field, it's yours
- Notice banner: *"AI pre-filled 2 buildings and 14 units — review before confirming"*
- **The AI is an assistant, not the source of truth.** All fields are editable.
- Extraction failure never blocks the wizard — user continues manually

---

## 9. The 60+ Units Efficiency Approach

Four complementary features, each solving a different part of the problem:

### 1. AI PDF extraction *(the highest-leverage feature)*
Upload the Teilungserklärung → 14 units pre-filled in ~3 seconds.
For the common case, zero manual entry.

### 2. Inline editable table with Tab navigation
All units rendered as rows. Each cell is a controlled input.
`Tab` moves to the next cell. At the last cell of the last row, `Tab` creates a new empty row.
**The user never needs to reach for the mouse.**

### 3. Row cloning with auto-increment
The clone button copies all field values and auto-increments the unit number.
`W-14` → `W-15`. `A.3` → `A.4`. `TG-09` → `TG-10`.

10-floor building, 6 units per floor:
fill one row → clone 59 times → adjust floors. Minutes, not an hour.

### 4. Bulk unit generator *(the gold feature for 60+ units)*
```
Prefix:         W-
Starting number: 101
Total units:    24
Units per floor: 6
Starting floor:  0
Building:        Haus A
Type:            Apartment
```
Click → generates 24 rows instantly with floors calculated automatically.

**Why not CSV import?**
CSV introduces significant edge cases: column mapping, German umlauts encoding,
malformed row validation, per-row error feedback. Done poorly it's a frustrating failure mode.
The inline table + bulk generator solves the real problem with a UI learned in 10 seconds.
It also composes naturally with AI pre-fill — AI populates the table, user edits inline.

**Why not modal-per-unit?**
60 open/fill/close cycles is the exact anti-pattern this feature exists to eliminate.

---

## 10. AI Pre-fill

### How it works

```
User uploads PDF
      │
      ▼
Multer receives buffer (in-memory, no disk write)
      │
      ▼
pdf-parse-fork extracts raw text
      │
      ▼
First 12,000 characters sent to Claude API
(claude-sonnet-4-20250514)
      │
      ▼
Structured prompt: return JSON only, no preamble
      │
      ├── SUCCESS → { propertyName, buildings[], units[] }
      │         → PREFILL_FROM_AI dispatch
      │         → coOwnershipShare: fraction × 1000 → per-mille for display
      │
      └── FAILURE → { propertyName: null, buildings: [], units: [] }
                  → user fills manually, wizard continues
```

### Prompt design decisions

- **JSON only, no preamble** — any extra text breaks `JSON.parse`
- **Explicit schema in prompt** — field names match what the frontend expects
- **`null` for missing fields** — "if not clearly stated, use null". AI doesn't guess.
- **German term mapping** — `Wohnung → APARTMENT`, `Stellplatz → PARKING`, `Gewerbe → OFFICE`
- **Per-mille to fraction in prompt** — `43.2/1000 = 0.0432` — normalises regardless of document format
- **12,000 character slice** — stays within token limits. Key data appears early in document.

### The coOwnershipShare conversion chain

```
Teilungserklärung:  "110.0/1000"
                          │
Claude extracts:          0.110  (fraction)
                          │
PREFILL_FROM_AI dispatch: 0.110 × 1000 = 110.0  (per-mille for table display)
                          │
User submits:             110.0 / 1000 = 0.110  (fraction for API)
                          │
Database stores:          0.110  (fraction)
                          │
Detail page shows:        0.110 × 1000 = 110.0 ‰
```

---

## 11. Key Decisions

**"Why Prisma over TypeORM?"**
`schema.prisma` = one file, entire data model in one scroll.
TypeORM scatters it across `@Entity` decorators on multiple class files.
Type-safe queries catch `findUniqe` at compile time, not 3am in production.

**"Why a monorepo?"**
Both apps share type conventions. Run with one command from root.
In a real team, shared packages (types, utils) live at the root.

**"Why `delete + createMany` instead of upserting?"**
Diffing an array of buildings to find what changed requires tracking identity
across form edits. Complexity not worth it.
Atomic replacement in a transaction is simpler, correct, and equally fast.

**"Why per-mille in the UI but fraction in the database?"**
The Teilungserklärung always expresses shares in per-mille (43.2/1000).
Matching the source document reduces cognitive load for the user.
Storing as fraction makes `sum === 1.0` validation straightforward.
Conversion is one line at the API boundary.

**"Why warn on share imbalance instead of hard-blocking?"**
Manager entering 60 units doesn't enter shares in order.
Hard-blocking prevents saving partially-entered data.
Warning lets them proceed, finish all units, then adjust.

**"Why `findFirst` not `count()` for property number generation?"**
If properties have been deleted, `count()` returns the wrong sequence number
and hits a unique constraint violation.
`findFirst` ordered by `propertyNumber DESC` always finds the actual highest.

**"Why not store the PDF?"**
Scope decision. Would use S3 + presigned URLs in production.
PDF is processed in-memory and discarded — we store the extracted structured data,
not the source document.

**"Why a soft warning for duplicate property names?"**
Two properties can legitimately share a name — a manager could manage "Residenz Berlin"
in Munich and Hamburg. Hard-blocking would be wrong domain behaviour.
We show a warning listing all existing property numbers with that name, and let
the user confirm or cancel. The `confirmDuplicate` flag in the DTO bypasses the check
when the user explicitly confirms.

**"Why test the reducer directly without React?"**
The wizard reducer is a pure function — state plus action equals new state.
No HTTP, no rendering, no mocking needed. This made it trivial to write 45 tests
covering every action including edge cases like null entrance for parking units
and the coOwnershipShare fraction-to-per-mille conversion on PREFILL_FROM_AI.
Testing it directly also confirmed the reducer was correctly separated from side effects.

**"Why switch from pdf-parse to pdf-parse-fork?"**
Node.js 22 introduced stricter subpath export validation.
`pdf-parse` uses an internal path (`./lib/pdf-parse.js`) that is no longer exported
in its `package.json`. `pdf-parse-fork` is a maintained fork that resolved this.

---

## 12. What I'd Build with More Time

| Feature | Why | Effort |
|---|---|---|
| **Edit property** | Update manager, accountant, name post-creation. `findOne` exists — needs PATCH + form. | Low |
| **CSV import for units** | Managers already have units in Excel. Complementary to bulk generator. | Medium |
| **Real authentication** | NextAuth + JWT. Per-property access control. | Medium |
| **Fuzzy duplicate detection** | Currently warns on exact name match. Fuzzy catches "Parkview Berlin" vs "Parkview Residences Berlin". | Low |
| **Property status** | Draft → Active → Archived. Filter dashboard. | Low |
| **Optimistic UI** | Show new property immediately, reconcile with server. Faster perceived performance. | Medium |
| **Audit log** | Who created/edited a property and when. WEG legal compliance. | Medium |
| **DB sequence for property numbers** | Current count-based generation has a theoretical race condition under concurrent creates. PostgreSQL sequence eliminates it. | Low |
| **S3 file storage** | Store Teilungserklärung against the property record. Presigned URLs for secure access. | Medium |
| **Co-ownership share calculator** | Distribute 1000 shares evenly, let user adjust. Reduces manual maths for WEG properties. | Low |


