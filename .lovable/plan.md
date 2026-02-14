

# Implementation Plan: 10 Feature Updates

## 1. Quick Follow Artists in Explore/Discovery Page
**Status**: Already implemented (lines 289-307 in Explore.tsx). The `UserPlus` button and `handleFollowArtist` logic exist. Will verify the button is visible and functioning -- no code changes needed unless there's a bug.

**Investigation needed**: Check if the opacity-0 hover state is the issue on mobile. Will add `opacity-100` on mobile so the button is always visible on touch devices.

## 2. Quick Add Albums on Artist Discography Page
**Current state**: AlbumCard on ArtistDetail.tsx (lines 841-851) has no quick-add button. Need to add a "+" button overlay on each album card in the discography grid.

**Changes**:
- `src/pages/ArtistDetail.tsx`: Add a `Plus` button overlay on each album card in the discography grid (similar to the Explore page pattern), allowing users to add albums to their Queue directly. Will use `useListeningStatus` hook's `toggleStatus` to set `is_to_listen`.

## 3. Expandable Artist Bio on Artist Pages
**Current state**: MusicBrainz API provides `disambiguation` field but no full bio. MusicBrainz does not serve artist bios directly -- Wikipedia/Wikidata integration would be needed.

**Approach**: Use the MusicBrainz `relations` data (already fetched via `get-artist-relations` action) to find a Wikipedia/Wikidata URL, then fetch a summary from the Wikipedia API. Display it as a collapsible section below the artist info.

**Changes**:
- `src/services/musicbrainz.ts`: Add a `getArtistBio` function that fetches artist relations, finds Wikipedia URL, and calls the Wikipedia REST API for an extract.
- `src/pages/ArtistDetail.tsx`: Add an expandable bio section below genres/active-since info, using a `line-clamp` approach with a "Read more" toggle.

## 4. Remove Down-Facing Arrow from Stream Button
**Current state**: `StreamingLinks.tsx` line 75 renders `<ChevronDown className="h-3 w-3 opacity-60" />`.

**Changes**:
- `src/components/StreamingLinks.tsx`: Remove the `ChevronDown` icon from the button.

## 5. Speed Up Explore Page Loading
**Current state**: The Explore page calls `ai-recommendations` edge function, then sequentially enriches each album and artist with MusicBrainz lookups (lines 454-482). This creates many sequential API calls.

**Optimisations**:
- Add `staleTime` and `gcTime` to avoid re-fetching on revisits.
- Use `Promise.allSettled` with a timeout wrapper so one slow lookup doesn't block everything.
- Show recommendations immediately as they come in (display text-only cards while images load).
- Cache MusicBrainz search results more aggressively in the edge function.

**Changes**:
- `src/pages/discovery/Explore.tsx`: Show partial results immediately; enrich in background. Add longer `gcTime` to persist data during session.

## 6. Improve Similar Artists Accuracy
**Current state**: Similar artists are found by searching MusicBrainz for artists with matching genre tags. This is imprecise because MusicBrainz genre tags are inconsistent and sparse.

**Improvements**:
- Use MusicBrainz artist `relations` (member-of, collaboration) to find directly connected artists first.
- Weight results by the number of matching genres, not just any genre match.
- Filter out artists with very low relevance scores.

**Changes**:
- `src/services/musicbrainz.ts`: Refactor `getSimilarArtists` to score candidates by genre overlap count, prioritise artists from direct relations, and filter low-score results.

## 7. Fix Explore Replenishment (Auto-Filtering)
**Current state**: `RecommendationsDisplay` filters out albums where `isToListen` is true and artists where `followedArtistIds` has the ID. However, the `allStatuses` and `followedArtistIds` may not update reactively after mutations because `queryClient.invalidateQueries` is async.

**Fix**:
- Ensure `toggleStatus` and `followArtistMutation` properly invalidate the relevant queries and that the component re-renders with updated data.
- Add `onSuccess` callbacks that also update local state optimistically so the UI updates instantly without waiting for refetch.

**Changes**:
- `src/pages/discovery/Explore.tsx`: Add optimistic local state tracking for recently-queued album IDs and recently-followed artist IDs, so filtering works immediately without waiting for query invalidation.

## 8. Zoom Out Published Website by 10%
**Current state**: No CSS zoom is applied.

**Changes**:
- `src/index.css`: Add `zoom: 0.9` (or `transform: scale(0.9)` with `transform-origin: top left`) to the root/body. The `zoom` CSS property is simpler and well-supported.

## 9. Remove "History" from Explore
**Current state**: Lines 683-691 in Explore.tsx show a "History" button with `History` icon. Lines 698-742 show the history panel.

**Changes**:
- `src/pages/discovery/Explore.tsx`: Remove the History button and the History panel section entirely. Keep the `saveHistoryMutation` so data is still saved (in case the feature is re-enabled later).

## 10. Shuffle Function in Queue
**Current state**: Queue page (`src/pages/profile/ToListen.tsx`) shows albums with sorting but no shuffle feature.

**Changes**:
- `src/pages/profile/ToListen.tsx`: Add a "Shuffle" button that randomly picks one album from the queue and presents it prominently (e.g., a highlighted card or dialog saying "Your next listen:"). Include a "Shuffle again" option.

---

## Technical Summary of File Changes

| File | Changes |
|------|---------|
| `src/pages/discovery/Explore.tsx` | Remove History button/panel; add optimistic local tracking for replenishment; ensure quick-follow visible on mobile |
| `src/pages/ArtistDetail.tsx` | Add quick-add Queue button on discography cards; add expandable bio section |
| `src/components/StreamingLinks.tsx` | Remove ChevronDown arrow |
| `src/services/musicbrainz.ts` | Add `getArtistBio` function; improve `getSimilarArtists` scoring |
| `src/pages/profile/ToListen.tsx` | Add shuffle feature |
| `src/index.css` | Add `zoom: 0.9` to body |

No database changes required.

