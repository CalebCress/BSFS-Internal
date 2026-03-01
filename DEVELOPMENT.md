# BSFS Internal — Development Tracker

## Tech Stack
- **Frontend**: React + TypeScript (Vite), shadcn/ui, Tailwind CSS
- **Backend/DB**: Convex (database, backend functions, file storage)
- **Auth**: Convex Auth (Email/Password + Google OAuth)
- **Routing**: React Router v7

## Phase 1: Scaffold & Layout
- [x] Create project from Convex template (react-vite-convexauth-shadcn)
- [x] Install dependencies (react-router-dom, lucide-react, shadcn components)
- [x] Configure auth providers (Password + Google OAuth)
- [x] Define database schema (7 app tables + auth tables)
- [x] Set up routing with all pages
- [x] Build RootLayout with shadcn sidebar + auth guard
- [x] Build AuthLayout for login page
- [x] Build PublicLayout for public application form
- [x] Build login page (email/password + Google OAuth)
- [x] Build profiles system (auto-create on first login)
- [x] Create stub pages for all routes
- [ ] Deploy to Convex and verify auth works end-to-end

## Phase 1.5: Restructure + Applicants Page
- [x] Restructure routes: all app-related pages under `/applications/*`
- [x] Add collapsible Applications group in sidebar (Overview, Forms, Applicants, Interviews, Reviews)
- [x] Add Alumni Network section (`/alumni`) — stub
- [x] Add Resources section (`/resources`) — stub
- [x] Backend: `convex/applicants.ts` (list, getById, updateStage, getStats)
- [x] ApplicantsPage: kanban board view (5 columns, cards, stage change dropdown)
- [x] ApplicantsPage: table view with sortable columns
- [x] ApplicantsPage: view toggle (kanban ↔ table)
- [x] ApplicantsPage: search by name/email + stage filter
- [x] ApplicantDetailPage: Convex query integration, stage badge, back navigation
- [x] Reusable components: StageBadge, ApplicantStageSelect, ApplicantCard
- [ ] Drag-and-drop stage transitions (future enhancement)

## Phase 2: Application Forms + Submission
- [x] Schema: add `semester` to applicationForms, make `fields` optional, add `phone` to applicants
- [x] Backend: `convex/applicationForms.ts` (create, list, getActive, activate, deactivate)
- [x] Backend: `convex/applications.ts` (submit + generateUploadUrl — public, no auth)
- [x] UI: FormsPage — create rounds (season + year), open/close toggle, applicant counts, copy link
- [x] UI: PublicApplicationPage — full form with personal info, CV upload, two paragraph questions
- [x] Zod validation + react-hook-form integration
- [x] CV upload via Convex file storage (PDF/Word, max 5MB)
- [x] Closed state + success state on `/apply`
- [x] Duplicate email detection per round
- [ ] End-to-end test: create round → open → submit at `/apply` → verify in applicants pipeline

## Phase 3: Reviews
- [x] Backend: `convex/reviews.ts` (CRUD + aggregation)
- [x] UI: ReviewForm component (1-5 scores + comments)
- [x] UI: ReviewsPage (queue of unreviewed applicants)
- [x] Integrate reviews into ApplicantDetailPage
- [x] Aggregate score display on applicant cards

## Phase 4: Interview Scheduling + Role Rename
- [x] Role rename: `admin/board_member/member` → `board_member/committee_member` (schema, profiles, constants, hook)
- [x] Migration mutation: `migrateRoles` in profiles.ts (call once after deploy)
- [x] Backend: `convex/interviewSlots.ts` (batchCreate, list, update, remove)
- [x] Backend: `convex/interviewSignups.ts` (signup, cancel, listMySignups)
- [x] UI: InterviewsPage with Schedule + My Signups tabs
- [x] UI: BatchCreateDialog — batch slot creation (date, time range, duration, type, auto-assign)
- [x] UI: SlotCard — slot display with sign up/cancel, capacity, type badges
- [x] Auto-assign applicants to slots round-robin on batch create
- [x] Board member controls: reassign applicant dropdown, delete slot
- [x] "My Signups" tab with cancel functionality

## Phase 4.5: Calendar
- [x] Schema: `events` table + `icalToken` on profiles
- [x] Backend: `convex/events.ts` (create, createRecurring, list, update, remove, removeSeries)
- [x] Backend: `convex/calendar.ts` (internal queries for iCal HTTP action)
- [x] Backend: `convex/profiles.ts` generateIcalToken mutation
- [x] Backend: `convex/http.ts` iCal feed endpoint (GET /api/calendar?token=...)
- [x] UI: CalendarPage with month grid, event chips, day detail section
- [x] UI: EventDialog for create/edit events (with recurring support)
- [x] Calendar subscription URL with copy-to-clipboard (uses VITE_CONVEX_SITE_URL)

## Phase 4.6: Applicants & Reviews Refinements
- [x] Remove kanban board view, keep table-only on ApplicantsPage
- [x] Add review type dropdown on ApplicantDetailPage (defaults to current stage)
- [x] Restrict telephone/AC reviews to members signed up for that applicant's interview
- [x] Sort applicants table by average score (nulls sort last)
- [x] ReviewsPage: filter by matching stage + interview signup for tel/AC

## Phase 4.7: Stocks Section
- [x] Schema: `stocks` + `stockTheses` tables with indexes
- [x] Constants: STOCK_SECTORS, STOCK_RATINGS, SENTIMENT
- [x] Backend: `convex/stocks.ts` (create, list with aggregates, getById with enriched theses, remove)
- [x] Backend: `convex/stockTheses.ts` (submit upsert, listMyTheses, remove)
- [x] UI: StocksPage — sortable table with search + sector filter, add stock dialog
- [x] UI: StockDetailPage — summary stats, all theses list, write/edit thesis dialog
- [x] UI: MyThesesPage — user's theses with stock info, click to navigate
- [x] Components: RatingBadge, AddStockDialog, ThesisDialog
- [x] Sidebar: Stocks collapsible group (All Stocks, My Theses)
- [x] Routes: /stocks, /stocks/my-theses, /stocks/:id

## Phase 5: Alumni Network
- [ ] Database schema for alumni
- [ ] Backend CRUD functions
- [ ] UI: Alumni directory + profiles

## Phase 6: Resources
- [ ] Database schema for resources
- [ ] Backend CRUD functions
- [ ] UI: Resource library with categories

## Phase 7: Dashboard + Polish
- [ ] Dashboard stats (applicants per stage, upcoming interviews, pending reviews)
- [ ] Role-based access control enforcement
- [ ] Loading, empty, and error states
- [ ] Responsive mobile design
- [ ] Toast notifications for actions
- [ ] Pagination for large lists

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User roles + display names (extends auth users) |
| `applicationForms` | Application rounds per semester (open/close management) |
| `applicants` | External applicants with pipeline stage |
| `applications` | Form submission responses + CV reference |
| `interviewSlots` | Timeslots for interview days |
| `interviewSignups` | Users signed up for slots |
| `reviews` | Scores and comments on applicants |
| `events` | Calendar events (single + recurring series) |
| `stocks` | Stock tickers with sector info |
| `stockTheses` | User investment theses + ratings per stock |

## Routes

| Route | Auth | Purpose |
|-------|------|---------|
| `/login` | No | Sign in / sign up |
| `/apply` | No | Public application form |
| `/` | Yes | Dashboard |
| `/applications` | Yes | Applications overview |
| `/applications/forms` | Yes | Manage application forms |
| `/applications/applicants` | Yes | Applicant pipeline (kanban + table) |
| `/applications/applicants/:id` | Yes | Applicant detail |
| `/applications/interviews` | Yes | Interview scheduling |
| `/applications/reviews` | Yes | Review queue |
| `/calendar` | Yes | Calendar with event management |
| `/stocks` | Yes | All stocks with community ratings |
| `/stocks/my-theses` | Yes | Current user's investment theses |
| `/stocks/:id` | Yes | Stock detail with all theses |
| `/alumni` | Yes | Alumni network |
| `/resources` | Yes | Shared resources |

## Sidebar Navigation

```
Dashboard              /
Applications           (collapsible)
  ├─ Overview          /applications
  ├─ Forms             /applications/forms
  ├─ Applicants        /applications/applicants
  ├─ Interviews        /applications/interviews
  └─ Reviews           /applications/reviews
Calendar               /calendar
Stocks                 (collapsible)
  ├─ All Stocks        /stocks
  └─ My Theses         /stocks/my-theses
Alumni Network         /alumni
Resources              /resources
```
