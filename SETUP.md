# PCSHomes Admin — Setup

- **Phase 1** added the JSON content layer and the password gate.
- **Phase 2** added Partner CRUD with GitHub commit via the Contents API.
- **Phase 3** added Vendor CRUD, Category management, and server-side Mapbox geocoding.
- **Phase 4** adds image upload for partner logos and photos. Admin selects a file, the browser resizes it (≤1200px longest edge) and re-encodes JPEGs at 0.85 quality, then a server function commits the image to `images/partners/` (or `images/vendors/`) via the GitHub Contents API. Filename collisions with different bytes get a content-hash suffix; identical re-uploads no-op.

## Required environment variables

Set these in the **Netlify dashboard** at:

> **Site → Site configuration → Environment variables → Add a variable**

(Or, via the new UI, **Project configuration → Environment variables**.)

| Name | Purpose | How to generate |
| --- | --- | --- |
| `ADMIN_PASSWORD` | Plaintext password compared (constant-time) to the value submitted at `/admin`. | Pick a strong passphrase, 24+ chars. Store in your password manager. |
| `ADMIN_JWT_SECRET` | HMAC-SHA256 secret used to sign and verify admin session tokens. | `openssl rand -base64 48` (or any cryptographically random 32+ char string). |
| `GITHUB_TOKEN` | Fine-grained PAT used by `save-partners` to commit edits to this repo. **Required for Phase 2.** | github.com → Settings → Developer settings → Personal access tokens → Fine-grained tokens. Repository access: only `aryenwood/PCSHomesearch`. Repository permissions: **Contents: Read and write** — nothing else. Set an expiry of 90–365 days and rotate. |
| `GITHUB_REPO` | Target repo for commits, `owner/repo` format. | e.g. `aryenwood/PCSHomesearch`. |
| `GITHUB_BRANCH` | Branch to commit to. **Optional** — defaults to `main`. | Set this to a sandbox branch (e.g. `admin-test`) if you want to test admin saves without affecting production. |
| `MAPBOX_TOKEN` | **Required for Phase 3.** Used **server-side only** by `geocode.js` to forward-geocode vendor addresses. Never sent to the browser. | mapbox.com → Account → Tokens. Create a token with the **Geocoding API: Search & Geocoding (Forward)** scope enabled. A secret token (`sk.*`) is fine since it stays on the server; a public token (`pk.*`) also works. |
| `MAPBOX_PUBLIC_TOKEN` | **Required for Phase 3.** Used **client-side** by the admin dashboard to render the Mapbox GL JS map preview in the vendor form. Must be a public token (`pk.*`) — Mapbox URL-restricted. | mapbox.com → Account → Tokens. Public token, scope **Maps: Maps API (read)**. Restrict to your Netlify domain in the Mapbox token settings. May be the same value as `MAPBOX_TOKEN` if and only if `MAPBOX_TOKEN` is a `pk.*` token; otherwise create a separate public token. |

After adding/changing any variable, trigger a redeploy: **Deploys → Trigger deploy → Deploy site**.

## Verifying the admin login

1. Deploy the site (or run `netlify dev` locally with the env vars exported).
2. Visit `/admin/`.
3. Enter the wrong password 1–4 times → expect "Invalid password".
4. Enter the wrong password 6 times within an hour → expect "Too many attempts" (HTTP 429).
5. Enter the correct password → redirected to `/admin/dashboard.html` showing "Logged in — Phase 2 coming".
6. Sign out → token cleared, redirected back to `/admin/`.

The session JWT lives in `localStorage` under `pcshomes_admin_token` and expires after 24 hours.

## File layout

```
admin/
  index.html                # Password gate
  dashboard.html            # Admin shell (tabs: Partners, Vendors)
  dashboard-shell.js        # Tab switching + shared toast/confirm helpers
  dashboard.js              # Phase 2 partner CRUD module
  dashboard-vendors.js      # Phase 3 vendor CRUD + category-management module
  image-upload.js           # Phase 4 reusable image uploader (canvas resize + commit)
  admin-auth.js             # localStorage / JWT helpers (client-side)
data/
  partners.json             # Network page partner cards
  vendors.json              # Discover map pins
  categories.json           # Map pin categories + colors
images/
  partners/                 # Uploaded partner logos and photos (Phase 4)
    .gitkeep                # ensures the directory exists before first upload
  vendors/                  # Reserved for Phase 4+ — currently unused by UI
    .gitkeep
netlify/
  functions/
    admin-login.js          # POST { password } → { token }
    admin-config.js         # Auth-gated runtime config (Mapbox public token)
    save-partners.js        # POST { partners, commitMessage } → commit
    save-vendors.js         # POST { vendors, commitMessage } → commit
    save-categories.js      # POST { categories, commitMessage } → commit
    geocode.js              # POST { address } → top 3 Mapbox matches
    upload-image.js         # POST { filename, contentBase64, contentType, targetDir } → commit + URL
    _lib/
      auth.js               # Shared sign / verify / requireAdmin
      github.js             # Shared GitHub Contents API helpers (JSON + binary)
SETUP.md                    # This file
```

## Phase 2 testing

If you want to validate the full add/edit/delete flow before pointing it at the live `main` branch:

1. **Use a sandbox branch.** Set `GITHUB_BRANCH=admin-test` in Netlify and create that branch on GitHub (`git checkout -b admin-test && git push -u origin admin-test`). All admin commits will land there. Switch back to `main` once you trust it.
2. **Optional: use a sandbox repo.** Create a private fork (e.g. `aryenwood/PCSHomesearch-sandbox`), set `GITHUB_REPO` to that fork, and exercise the full flow against it. Note: sandbox saves won't appear on the live site because the live site builds from the production repo.
3. **Local development.** With the Netlify CLI: `netlify dev` will run functions locally. Export the env vars in your shell first (`export ADMIN_PASSWORD=… ADMIN_JWT_SECRET=… GITHUB_TOKEN=… GITHUB_REPO=… GITHUB_BRANCH=admin-test`). Visit `http://localhost:8888/admin/`.
4. **Inspect commit history.** Every save creates a single commit with a structured message: `Add partner: …`, `Update partner: …`, `Remove partner: …`, `Activate …`, `Deactivate …`, `Reorder partners: moved … up/down`.

### Commit message conventions (your audit log)

| Resource | Action | Commit message |
| --- | --- | --- |
| Partners | Add | `Add partner: <name>` |
| Partners | Edit | `Update partner: <name>` |
| Partners | Delete | `Remove partner: <name>` |
| Partners | Toggle active | `Activate <name>` / `Deactivate <name>` |
| Partners | Reorder | `Reorder partners: moved <name> up` / `… down` |
| Vendors | Add | `Add vendor: <name>` |
| Vendors | Edit | `Update vendor: <name>` |
| Vendors | Delete | `Remove vendor: <name>` |
| Vendors | Toggle active | `Activate <name>` / `Deactivate <name>` |
| Categories | Add | `Add category: <label>` |
| Categories | Edit | `Update category: <label>` |
| Categories | Delete | `Remove category: <label>` |
| Categories | Toggle active | `Activate category: <label>` / `Deactivate category: <label>` |
| Images | Upload | `Upload image: <filename>` |

## Notes

- `requireAdmin(event)` in `netlify/functions/_lib/auth.js` is the reusable JWT-verification helper. Used by every admin function.
- `_lib/github.js` is the shared atomic-commit helper used by `save-vendors.js` and `save-categories.js`. (`save-partners.js` predates the helper and uses an inline copy of the same logic — semantically identical.)
- All save functions are **atomic** — a single GitHub `PUT` per save. Either the commit happened or it didn't. On any failure, the dashboard re-fetches the relevant `/data/*.json` to recover ground truth.
- The rate limiter in `admin-login.js` uses an in-process `Map`. Soft throttle only.
- The fine-grained PAT must have **Contents: Read and write** on this single repo. Any broader scope is a bigger blast radius than necessary; tighten if it drifts.
- **Geocoding** uses Mapbox v6 Forward Geocoding, biased toward Watertown NY (`proximity=-75.9094,43.9748`), country-restricted to US, top-3 matches returned. The geocode function is JWT-gated — no anonymous geocoding.
- **Category referential integrity**: `save-categories.js` re-fetches `vendors.json` from GitHub on every save and rejects any category deletion or id-change that would orphan vendors (HTTP 409, response includes the blocking vendor names). This guards against an admin removing a category in one tab while another vendor still uses it.
- **Image upload (Phase 4)** flow:
  1. Admin selects a file (≤10 MB raw — anything larger is rejected client-side as a likely accidental video pick).
  2. Browser resizes raster images so the longest edge is ≤1200 px (preserving aspect ratio) and re-encodes as JPEG at 0.85 quality. PNGs with non-trivial alpha stay as PNG; PNGs without transparency become JPEGs. SVGs pass through unchanged.
  3. Filename is slugified (a-z, 0-9, dashes only). Server validates the slug, MIME (`image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`), and the target directory (`images/partners` or `images/vendors` — strict whitelist, no traversal).
  4. Decoded payload size is capped at **5 MB** server-side as a safety ceiling.
  5. If a file with the same path already exists with **identical bytes**, the upload no-ops and reuses the existing URL. If the bytes differ, the server appends a 6-char content-hash suffix (e.g. `logo-acme.jpg` → `logo-acme-a1b2c3.jpg`) so nothing is silently overwritten.
  6. The server commits the image with `Upload image: <finalFilename>`. A separate `Update partner: <name>` commit happens when the admin clicks **Save Partner** afterward.
- **Removing an image from a partner does NOT delete the file from the repo.** Orphan images in `images/partners/` are tolerated; cleanup is manual (`git rm` from a local clone). This avoids destructive operations from the dashboard and keeps the audit trail intact.
- The Save button is disabled while any image upload is in flight (`onBusyChange` callback wired through the partner form). Hitting Enter mid-upload also short-circuits with a clear inline error.
- The **Discover page legend** (the 4 cards under the map: Grocery / Medical / Food & Dining / Storage) is hardcoded marketing copy, not data-driven. The map **pins** themselves are fully data-driven and reflect `categories.json` colors and active flags. Editing categories.json updates the pins on rebuild but does not change the legend cards. If you want the legend cards to be data-driven, add a `description` field to `categories.json` and refactor — out of Phase 3 scope.
- Several optional fields in `partners.json` (`badgeKind`, `iconKind`, `iconAccent`, `subtitle`, `reviews`, `reviewsUrl`, `websiteUrl`, `ctaLabel`, `ctaHref`, `isPlaceholder`, `trustedLabel`, `badgeLabel`) extend the base schema. The Partners dashboard exposes all of them in the **Advanced** section.
- Map pin colors in `categories.json` use the current rendered values rather than the slightly different shades quoted in the original Phase 1 spec. Edit them in **Manage Categories** in the dashboard.
