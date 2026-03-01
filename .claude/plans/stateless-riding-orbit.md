# Members Section — Directory & Profiles

## Context

The BSFS Internal app needs a Members section so members can discover each other, view profiles (name, email, LinkedIn, photo, CV), and see each other's stock theses. Younger members should be able to view older members' CVs for career help.

## Schema Change — `convex/schema.ts`

Add 3 optional fields to the `profiles` table:

```ts
linkedIn: v.optional(v.string()),
photoStorageId: v.optional(v.id("_storage")),
cvStorageId: v.optional(v.id("_storage")),
```

No new tables needed. No index changes.

## Backend Changes — `convex/profiles.ts`

### New: `updateProfile` mutation
- Auth required (own profile only)
- Args: `displayName` (string), `linkedIn` (optional string), `photoStorageId` (optional id), `cvStorageId` (optional id)
- Patches the calling user's profile doc

### New: `getProfileByUserId` query
- Args: `userId: v.id("users")`
- Returns profile + email + resolved `photoUrl` / `cvUrl` via `ctx.storage.getUrl()`
- Returns null if no profile exists

### New: `generateUploadUrl` mutation
- Auth required
- Calls `ctx.storage.generateUploadUrl()` and returns URL
- Follows the same pattern used in `applications.ts` for CV uploads

### Modify: `getMyProfile`
- Resolve `photoUrl` and `cvUrl` from storage IDs before returning

### Modify: `listProfiles`
- Resolve `photoUrl` for each profile (for member card avatars)
- Include `linkedIn` in the returned data

## New: `convex/memberTheses.ts` query

### `getThesesByUserId` query
- Args: `userId: v.id("users")`
- Query `stockTheses` by `by_user` index for this userId
- Join each thesis with its stock record (ticker, name)
- Return theses sorted by most recently updated
- Used on the member profile page to show their stock theses

## Install shadcn Avatar

```bash
npx shadcn@latest add avatar
```

Creates `src/components/ui/avatar.tsx` — used in member cards and profile pages.

## New Pages & Components (3 files)

### 1. `src/pages/members/MembersPage.tsx`
- Header: "Members" title with search input (filters by displayName/email)
- Grid of member cards (responsive: 1→2→3 cols)
- Each card: Avatar (photo or initials fallback), displayName, role badge, email
- Click card → navigate to `/members/{userId}`
- Uses `useQuery(api.profiles.listProfiles)`

### 2. `src/pages/members/MemberProfilePage.tsx`
- URL param: `:userId`
- Back button → `/members`
- Header: Large avatar + displayName + role badge
- Contact section: email (mailto link), LinkedIn (external link with icon)
- CV: Download button if CV is uploaded
- "Edit Profile" button shown only when viewing own profile → opens EditProfileDialog
- Stock Theses section: uses `useQuery(api.memberTheses.getThesesByUserId)` to list their theses with rating badges, sentiment, links to `/stocks/{ticker}`
- "No theses yet" empty state when no theses exist

### 3. `src/pages/members/components/EditProfileDialog.tsx`
- Dialog form with fields: Display Name (text input), LinkedIn URL (url input), Photo (file input, image/*), CV (file input, application/pdf)
- File upload flow: call `generateUploadUrl` mutation → `fetch(url, { method: "POST", body: file })` → extract `storageId` from response → pass to `updateProfile`
- Shows current photo preview if exists
- Pre-fills all fields from current profile data
- Toast on success/error

## Route Changes — `src/router.tsx`

Add 2 new routes + imports:
```
{ path: "members", element: <MembersPage /> },
{ path: "members/:userId", element: <MemberProfilePage /> },
```

## Sidebar Change — `src/components/app-sidebar.tsx`

Add "Members" nav item between Calendar and Stocks:
- Icon: `Users` from lucide-react
- Path: `/members`
- Simple item (not collapsible, no sub-items)

## Implementation Order

1. Schema change (add 3 fields to profiles table)
2. Install shadcn Avatar component
3. Backend: `updateProfile`, `getProfileByUserId`, `generateUploadUrl` in profiles.ts
4. Backend: `memberTheses.ts` with `getThesesByUserId`
5. Modify `getMyProfile` and `listProfiles` to resolve URLs
6. Create `MembersPage.tsx`
7. Create `EditProfileDialog.tsx`
8. Create `MemberProfilePage.tsx`
9. Update `router.tsx` with member routes
10. Update `app-sidebar.tsx` with Members nav item

## Verification

1. `npx tsc --noEmit` — zero errors
2. `npx vite build` — succeeds
3. `/members` — shows all members as cards with avatars, search filters them
4. Click a member card → `/members/{userId}` — shows profile with contact info
5. On own profile: click "Edit Profile" → update name, upload photo, upload CV → saves correctly
6. On another member's profile: see their photo, download their CV, view their stock theses
7. Stock theses on profile link to correct `/stocks/{ticker}` pages
