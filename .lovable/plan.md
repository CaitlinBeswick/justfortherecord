
# Plan: 7-Point Feature Update

## Summary of All Requests

1. **Wuthering Heights missing from Charli xcx discography** — root cause investigation
2. **Why Arctic Monkeys & Two Door Cinema Club need "Add Studio Albums"** — explain the `includePending=false` bug
3. **Search engine / browser icon** — replace with the white-vinyl-on-red icon from the uploaded screenshot
4. **All-time diary view** — add an "All Years" option to the year selector
5. **Email notification redesign** — white/red theme (matching weekly digest), DD/MM/YYYY dates, album cover art
6. **Release type filter on Discovery > New Releases** — add a "Manage" UI matching the artist page, defaulting to "Studio Albums" only (no Singles filter)
7. **Native app (Capacitor)** — note that `despia-native` doesn't exist; Capacitor is already installed in this project, advise the proper setup steps

---

## Issue 1 & 2: Wuthering Heights + "Add Studio Albums" Root Cause

### What's happening

In `src/pages/ArtistDetail.tsx` line 363, `useOfficialReleaseFilter` is called with `includePending=false`:

```
useOfficialReleaseFilter(releases, true, false)
```

With `includePending=false`, the hook's logic in `useOfficialReleaseFilter.tsx` (line 143–144) **hides any release whose status is not yet confirmed in the local React state**, even if it's already `is_official: true` in the database.

The problem is timing: on first page load, `statusCache` is an empty object `{}`. The hook fires an async Supabase query to fetch cached statuses. During the **brief gap** before that async query resolves, every release has status `undefined` in `statusCache`, and since `includePending=false`, they all get filtered out. The discography appears empty or shows "No releases". As the DB results trickle in one artist at a time (they're processed in an effect), releases appear slowly.

**Why Wuthering Heights is consistently missing:** The hook's `useEffect` only re-runs when the `releases` array reference changes. If the parent's `allReleases` query resolves before the official-cache Supabase fetch completes, all releases start as `pending` in the hook and show the skeleton. But if the page navigates away or the component remounts partway through the rate-limited queue (1.1 s/request), the `abortRef.current = true` cleanup kills the queue, and only the already-resolved DB cache entries appear. Wuthering Heights (Feb 2026) would only be visible once its ID is confirmed in the `statusCache`. Since `BRAT`, `BRAT and it's completely different`, and other albums appear, it means their cache entries were fetched in the initial DB batch, but **Wuthering Heights (released Feb 13, 2026) may not have been in the first cache lookup batch** if it was added after the others — though the DB confirms it IS `is_official: true`.

**The real fix:** The hook should **optimistically show releases that are in the DB cache as `is_official: true`** — which they already are. The bug is that `setStatusCache` is only called after the full Supabase query resolves. Instead, we should:
- Load DB cache results first and set them in state **immediately** (before starting the MusicBrainz queue)
- Use the DB cache as the initial state, not an empty object

The skeleton state already exists, so the UX is correct; the logic just needs to use DB-cached results sooner.

### Fix for the hook

Update `useOfficialReleaseFilter` to use DB cache as **initial synchronous state** and not hide DB-confirmed releases:
- When `includePending=false`, still show releases that are DB-confirmed as `is_official: true`
- Only hide releases that are `is_official: false` or genuinely unchecked (not in DB)

---

## Issue 3: Search Engine / Browser Icon (favicon)

The uploaded screenshot shows a rounded-square red background (`#C0392B` / `#dc2626` style) with a white vinyl record icon — this is the iOS/Android app icon format.

**Changes needed:**
- Copy the uploaded image to `public/favicon.png` (replacing existing)
- Update `index.html` to reference it with a new cache-busting version `?v=5`
- Copy the same image to `public/apple-touch-icon.png` for iOS bookmarks

The user also references this for point 7 (app stores), so this icon will serve double duty.

---

## Issue 4: All-time Diary View

Currently `DiaryContent.tsx` initialises `selectedYear` to `new Date().getFullYear()` and the year selector only shows years from diary entries. The `yearFilteredEntries` filter always applies `=== selectedYear`.

**Changes needed in `src/components/profile/DiaryContent.tsx`:**
- Add a special `"all"` value to the year selector (displayed as "All Years")
- Change `selectedYear` state type to `number | 'all'`  
- Update `yearFilteredEntries` filter to skip the year filter when `selectedYear === 'all'`
- Update the diary header to show total count when "All Years" selected
- Update the goal display to only show when a specific year is selected

---

## Issue 5: Email Notification Redesign

The current `new_release` email template in `supabase/functions/send-notification-email/index.ts` uses a dark background `#0a0a0a`. The weekly digest uses a red header + white card.

**Changes needed:**
- Match the red/white theme from `send-weekly-digest` (red `#dc2626` wrapper, white `#ffffff` card)
- Change date format to DD/MM/YYYY (e.g. `13/02/2026` instead of `2026-02-13`)
- Add album cover art from Cover Art Archive using the `release_group_id` in `data`: `https://coverartarchive.org/release-group/{id}/front-500`
- Apply the same styling fixes to the friend request/accepted emails for consistency

---

## Issue 6: Release Type Filter on Discovery > New Releases

The artist page has a "Manage Releases" button (from `ReleaseManager.tsx`) that includes a "Visible Release Types" checkbox section. We need the same concept on `src/pages/discovery/NewReleases.tsx`.

**Approach:** Since the New Releases page doesn't have per-artist context, we need a **page-level type filter** (not DB-persisted per artist, just local state or a user preference).

**Changes needed in `src/pages/discovery/NewReleases.tsx`:**
- Add a release type toggle UI (similar to the checkboxes in `ReleaseManager`) with options: Studio Albums, EPs, Live Albums, Compilations
- Default: only `Album` type checked (Studio Albums only), matching the user's stated default
- The existing filter already excludes Singles and Compilations; we need to be more granular
- Add the type filtering to the `useMemo` that builds `filteredReleases`
- Persist the preference in `localStorage` so it survives navigation (optional but nice)

The current filter at line 135–144 of `NewReleases.tsx` already handles Singles/Compilations/Live exclusion. We need to expand it to allow user-controlled type selection.

---

## Issue 7: Native App via Capacitor

The `despia-native` package does not exist on npm — this was a typo/hallucination. This project **already has Capacitor installed** (`@capacitor/core ^8.0.1`, `@capacitor/ios`, `@capacitor/android` etc.) and a `capacitor.config.ts` already exists.

No code changes needed for this — the user just needs to export to GitHub and follow the mobile deployment steps.

---

## Technical Implementation Plan

### Files to modify:

**1. `src/hooks/useOfficialReleaseFilter.tsx`**
- Remove the "pending = hidden" behavior for releases that are already in the DB cache as `is_official: true`
- Change logic: on initial load, fetch DB cache → set it as state immediately → only hide releases confirmed as `false` or those with no entry at all while `isChecking=true`
- This fixes Wuthering Heights and the Arctic Monkeys "Add Studio Albums" issue

**2. `src/pages/discovery/NewReleases.tsx`**  
- Add `selectedTypes` state, defaulting to `['Album']` (Studio Albums only)
- Add a filter UI row with checkboxes for Album, EP, Live, Compilation  
- Update the `filteredReleases` useMemo to also filter by `selectedTypes`
- Persist in `localStorage` under key `'new-releases-type-filter'`

**3. `src/components/profile/DiaryContent.tsx`**
- Change `selectedYear` type from `number` to `number | 'all'`
- Add "All Years" as first option in the year selector
- Update `yearFilteredEntries` to show all entries when `selectedYear === 'all'`
- Update counts/goal display for the "all" case

**4. `supabase/functions/send-notification-email/index.ts`**
- Redesign HTML for `new_release` email:
  - Red `#dc2626` outer background
  - White `#ffffff` content card (centred with `<table>`)
  - Album cover art as `<img>` from Cover Art Archive
  - DD/MM/YYYY date format
  - Red CTA button
- Apply consistent white card styling to friend_request and friend_accepted templates too

**5. `public/favicon.png`** (and update `index.html`)
- Copy uploaded image to `public/favicon.png`
- Update `index.html` `?v=5` cache-busting
- Also save as `public/apple-touch-icon.png`

### No new DB migrations needed for any of these changes.

### Regarding Capacitor / "despia-native"
The `despia-native` package does not exist — Capacitor is already set up. To build for the App Store, the user needs to:
1. Export to GitHub (Settings → GitHub)
2. `git clone` the repo locally
3. `npm install`
4. `npx cap add ios` and/or `npx cap add android`
5. `npm run build && npx cap sync`
6. Open in Xcode / Android Studio to submit to stores
