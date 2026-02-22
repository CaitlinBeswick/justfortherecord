

# Plan: 4 Fixes

## 1. Remove Cookie Consent / Tracking Code

This website does not track users, so the cookie consent banner is unnecessary.

**Changes:**
- Delete `src/components/CookieConsent.tsx`
- Remove the `<CookieConsent />` usage and import from `src/App.tsx`

## 2. Move Digest Send History into the Weekly Digest Section as a Dropdown

Currently `DigestEmailHistory` is a standalone card below the digest preview. It should be collapsed inside the `DigestEmailPreview` card as a collapsible/dropdown section.

**Changes in `src/pages/Admin.tsx`:**
- Remove the standalone `<DigestEmailHistory />` block (lines 333-336)
- Remove the `DigestEmailHistory` import

**Changes in `src/components/admin/DigestEmailPreview.tsx`:**
- Import `DigestEmailHistory` and add it inside the card as a collapsible section (using the existing `Collapsible` component) with a "Send History" toggle button
- Place it after the existing preview/edit content, inside the same card

## 3. Replace All `justfortherecord.lovable.app` Links with `justfortherecord.app`

The notification email footer currently links to `justfortherecord.lovable.app`. All email links across edge functions need updating.

**Changes in `supabase/functions/send-notification-email/index.ts`:**
- Line 46: Update logo image URL to `https://justfortherecord.app/email-logo.png`
- Line 62: Update settings link to `https://justfortherecord.app/profile/settings`
- Line 64: Update display link to `justfortherecord.app` with href `https://justfortherecord.app`
- Line 198: Update `baseUrl` to `https://justfortherecord.app`

**Changes in `supabase/functions/digest-reminder/index.ts`:**
- Line 65: Update from address domain
- Line 72: Update admin dashboard link

**Changes in other edge functions** (send-weekly-digest, send-contact-notification, customer-portal, etc.):
- Update all `justfortherecord.lovable.app` references to `justfortherecord.app`

## 4. Fix Album Cover Art Loading in Notification Emails

The current cover art URL uses `https://coverartarchive.org/release-group/{id}/front-250` which performs a 307 redirect. Most email clients follow redirects for images, so this should work. However, the `onerror` JavaScript fallback is stripped by email clients.

**Fix:** Replace the `onerror` attribute with a proper HTML fallback approach -- use an `alt` text styled visually. The image URL itself is correct and should load. No structural change needed beyond removing the non-functional `onerror`.

## 5. Fix "BRAT" All-Caps Search Not Finding Charli xcx's Album

The client-side `callMusicBrainz` function already lowercases the query (line 79 of `musicbrainz.ts`). However, in the edge function (`musicbrainz/index.ts` line 207), the fuzzy query logic applies `~` to words longer than 3 characters. "brat" is exactly 4 characters, so it becomes `brat~` which triggers fuzzy matching and may dilute results.

The root cause is likely the **edge function's in-memory cache**. If "BRAT" was previously searched before the lowercasing fix was deployed, a stale cache entry for the uppercase query may still exist in the edge function instance. Since the client now sends "brat" (lowercase), it should hit a different/fresh cache key.

**Fix in `supabase/functions/musicbrainz/index.ts`:**
- Normalize the `query` parameter to lowercase in the edge function as well (belt-and-suspenders), ensuring cache keys are always lowercase regardless of what the client sends
- This ensures even direct API calls or older client versions produce consistent results

---

## Technical Summary

| File | Action |
|------|--------|
| `src/components/CookieConsent.tsx` | Delete |
| `src/App.tsx` | Remove CookieConsent import and usage |
| `src/pages/Admin.tsx` | Remove standalone DigestEmailHistory block |
| `src/components/admin/DigestEmailPreview.tsx` | Add collapsible DigestEmailHistory section |
| `supabase/functions/send-notification-email/index.ts` | Update all URLs to justfortherecord.app, fix onerror |
| `supabase/functions/digest-reminder/index.ts` | Update URLs |
| `supabase/functions/send-weekly-digest/index.ts` | Update URLs |
| `supabase/functions/send-contact-notification/index.ts` | Update URLs |
| `supabase/functions/customer-portal/index.ts` | Update URLs |
| `supabase/functions/prewarm-artist-images/index.ts` | Update URLs |
| `supabase/functions/send-push-notification/index.ts` | Update URLs |
| `supabase/functions/musicbrainz/index.ts` | Normalize query to lowercase for consistent caching |

