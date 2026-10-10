# Plan 02: Host v2 on Netlify and replace v1

| | |
|---|---|
| **Date** | 2026-10-10 |
| **Plan #** | 02 |
| **Status** | Proposed |
| **Owner** | Matthew Killeen |
| **Depends on** | [Plan 01](./2026-10-10_01_bold-design-astro-implementation-plan.md) (site built, `netlify.toml` committed) |
| **Supersedes** | Plan 01 §12.5 (cutover runbook). Plan 01 §12.1–12.4 remain the background. |
| **Goal** | `https://matthewrkilleen.com` serves the Astro v2 site from Netlify, with old URLs still working and a tested way back to v1 |

---

## 0. Summary

1. **Pre-flight (local, ~15 min):** prove the site builds the way Netlify will build it.
2. **Create a new Netlify project** for `personal-website-v2` (~10 min). v1 is untouched.
3. **Verify on the free `*.netlify.app` URL** (~20 min).
4. **Switch to the new day-to-day workflow:** branch → pull request → Deploy Preview → merge → live.
5. **Cut over the domain** from the v1 project to the v2 project (~15 min, at a quiet time).
6. **Verify production**, keep v1 as a rollback for 2–4 weeks, then retire it.

Nothing in steps 1–4 can affect the live site. Only step 5 changes what visitors see, and it can be reversed in minutes.

---

## 1. Where things stand (checked 2026-10-10)

### 1.1 v2 (this repo)

| Item | State |
|---|---|
| Repo | `github.com/Programbeginner2120/personal-website-v2`, `main` at `b4fb36c` (PR #1 merged) |
| Workflow | Feature branches + pull requests into `main` |
| Build | `npm run build` = `astro check && astro build` → static files in `dist/` (no server, no Netlify adapter needed) |
| `netlify.toml` | Build command, `publish = "dist"`, `NODE_VERSION = "22"`, v1 → v2 redirects, `/favicon.ico` redirect, long-term caching for `/_astro/*` |
| Generated at build | `/favicon.png`, `/apple-touch-icon.png` (cropped from `src/assets/Portrait.jpg` with `sharp`), `/sitemap-index.xml`, `/404.html` |
| Static files | `public/Matthew_Killeen_Resume.pdf`, `public/robots.txt` |
| Native dependency | `sharp`. Its Linux binaries (`@img/sharp-linux-x64`, `@img/sharp-libvips-linux-x64`) are in `package-lock.json`, which Netlify's Linux build needs |
| Build-time network use | The Fonts API downloads the three Google fonts during the build |

### 1.2 v1 (what's live today)

| Item | State |
|---|---|
| Netlify project | Deploys `github.com/Programbeginner2120/personal-website` (Angular 20 SSR). Build settings live in the Netlify UI; there's no `netlify.toml` |
| Domain | `matthewrkilleen.com` (primary). `www` and `http://` both 301 to `https://matthewrkilleen.com/` |
| DNS | **Netlify DNS** (`dns1–4.p03.nsone.net`). The domain can move between projects without touching the registrar |
| DNS record to protect | TXT `v=spf1 include:amazonses.com ~all` (Amazon SES email). No MX records |
| URLs that must keep working | `/main-page/`, `/photos/`, `/assets/current-resume-matthew-killeen.pdf`, `/favicon.ico`. These are covered by the redirects in `netlify.toml` |

---

## 2. Netlify vocabulary

Netlify renamed "sites" to **projects** in 2025. Older docs and blog posts say "site".

| Term | Meaning here |
|---|---|
| **Project** | One website on Netlify, connected to one GitHub repo. You'll have two for a while: v1 and v2. |
| **Production branch** | The branch whose commits go live: `main`. |
| **Deploy** | One build of one commit. Every deploy is kept and has its own permanent URL, so any deploy can be re-published. |
| **Deploy Preview** | A deploy built from a pull request, at a URL like `deploy-preview-3--<project>.netlify.app`. It never touches production. |
| **Build log** | The terminal output of a deploy. It's the first place to look when something fails. |
| **`<project>.netlify.app`** | The free URL every project gets. It's where you test v2 before the domain moves. |
| **Custom domain / primary domain** | `matthewrkilleen.com`. It can be attached to only **one** project at a time. |
| **Domain alias** | Extra hostnames for a project (`www.matthewrkilleen.com`). Netlify redirects them to the primary domain. |
| **Netlify DNS** | Netlify hosts your domain's DNS records. They belong to the **team**, not to a project, so they survive moving the domain. |
| **HTTPS certificate** | Issued free by Let's Encrypt when a domain is attached. It takes seconds to a few minutes. |

> Menu names below are accurate for the Netlify UI as of late 2026, but Netlify moves things around. If a label doesn't match exactly, look for the closest equivalent in the same area.

---

## 3. Phase A: Local pre-flight

The aim is to catch, on your machine, anything that would fail on Netlify's Linux build servers.

**A1. Start from an up-to-date `main`.**

```powershell
git switch main
git pull
git status   # should say "nothing to commit, working tree clean"
```

**A2. Do a clean install exactly like Netlify does.** `npm ci` installs strictly from `package-lock.json` and fails if it's out of sync with `package.json`, which is the same check Netlify runs.

```powershell
npm ci
```

**A3. Build exactly like Netlify does.**

```powershell
npm run build
```

Expect `0 errors, 0 warnings`, and pages including `/index.html`, `/404.html`, `/styleguide/index.html`, `/favicon.png` and `/apple-touch-icon.png`.

**A4. Check filename case.** Windows treats `Portrait.jpg` and `portrait.jpg` as the same file; Netlify's Linux servers don't. This script compares every asset path in the code against the real filenames, case-sensitively:

```powershell
$root  = (Resolve-Path src).Path
$files = Get-ChildItem src/assets -Recurse -File |
  ForEach-Object { $_.FullName.Substring($root.Length + 1).Replace('\', '/') }
Get-ChildItem src -Recurse -File -Include *.ts, *.astro |
  Select-String -Pattern "(?:@|src)/(assets/[^'`"\s]+)" -AllMatches |
  ForEach-Object { $_.Matches } | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique |
  ForEach-Object { if ($files -cnotcontains $_) { "PROBLEM (missing or wrong case): $_" } else { "ok: $_" } }
```

Every line should start with `ok:`. Do the same check by eye for links to `public/` files. The résumé link must be exactly `/Matthew_Killeen_Resume.pdf`.

**A5. Check that redirect targets exist in the build.** Each redirect in `netlify.toml` must point at a real file:

```powershell
foreach ($f in 'Matthew_Killeen_Resume.pdf', 'favicon.png', 'index.html', '404.html', 'sitemap-index.xml', 'robots.txt') {
  '{0,-28} {1}' -f $f, (Test-Path "dist/$f")
}
```

All should be `True`.

**A6. Preview the production build.** `astro preview` serves `dist/` the way a static host does. It doesn't apply `netlify.toml` redirects; those are tested on Netlify in Phase C.

```powershell
npm run preview
```

Open http://localhost:4321, click through every nav link and button, then stop it with Ctrl+C.

**A7. Make sure the working tree is still clean.** Run `git status`. If anything changed, e.g. `package-lock.json`, commit it on a branch and merge it via a PR before continuing, so Netlify builds exactly what you tested.

---

## 4. Phase B: Create the Netlify project for v2

**B1. Sign in to https://app.netlify.com** with the **same account and team that owns the v1 project.** Moving the domain within one team is a few clicks; across teams it's much more work.

**B2. Start the import.** Choose **Add new project → Import an existing project → GitHub**.

**B3. Authorise GitHub access.** If this is the first time, GitHub asks you to install the **Netlify app**:
- Choose **Only select repositories** and pick `personal-website-v2`. Add `personal-website` too if it isn't already there, because v1 must keep deploying until cutover.
- If the repo doesn't appear in Netlify's list, open **Configure the Netlify app on GitHub** from the same screen and grant access there.

**B4. Pick `personal-website-v2`.**

**B5. Review the build settings.** Netlify reads `netlify.toml`, so the form should already show:

| Field | Expected value |
|---|---|
| Branch to deploy | `main` |
| Base directory | *(empty)* |
| Build command | `npm run build` (marked as set by `netlify.toml`) |
| Publish directory | `dist` |

Leave them as they are. Values in `netlify.toml` win over the UI, and keeping them in the repo means they're versioned with the code. Don't add environment variables; the site needs none (`NODE_VERSION` comes from `netlify.toml`).

**B6. Deploy.** Click **Deploy personal-website-v2**. The first build takes about 1–3 minutes, because it installs dependencies and downloads fonts. Later builds are faster thanks to Netlify's cache.

**B7. Rename the project.** By default Netlify gives it a random name such as `jolly-panda-123abc`. Go to **Project configuration → General → Project details → Change project name** and choose something recognisable, e.g. `matthewrkilleen-v2`. The free URL becomes `https://matthewrkilleen-v2.netlify.app`. The plan below calls this `$v2`.

---

## 5. Phase C: First deploy and verification on `*.netlify.app`

### C1. Read the build log

Open **Deploys → (the latest deploy) → Deploy log**. A healthy log contains, in order:

1. `Now using node v22.x` (from `NODE_VERSION`)
2. `npm ci` (or `npm install`) finishing without errors
3. `astro check` → `0 errors`
4. `astro build` → `[assets] Copying fonts`, the generated routes, and `sitemap-index.xml created`
5. `Deploy site` → **Published**

If it fails, see the troubleshooting table (§10). Fix on a branch, open a PR, merge, and Netlify rebuilds automatically.

### C2. Check every URL, including the redirects

```powershell
$v2 = 'https://matthewrkilleen-v2.netlify.app'   # your project's URL
$checks = [ordered]@{
  '/'                                          = '200'
  '/styleguide/'                               = '200'
  '/Matthew_Killeen_Resume.pdf'                = '200'
  '/favicon.png'                               = '200'
  '/apple-touch-icon.png'                      = '200'
  '/sitemap-index.xml'                         = '200'
  '/robots.txt'                                = '200'
  '/favicon.ico'                               = '301 -> /favicon.png'
  '/main-page'                                 = '301 -> /'
  '/main-page/'                                = '301 -> /'
  '/photos/'                                   = '301 -> /#life'
  '/assets/current-resume-matthew-killeen.pdf' = '301 -> /Matthew_Killeen_Resume.pdf'
  '/this-does-not-exist'                       = '404'
}
foreach ($path in $checks.Keys) {
  $head   = curl.exe -sI "$v2$path"
  $status = $head | Select-String '^HTTP/\S+ (\d+)' | ForEach-Object { $_.Matches[0].Groups[1].Value }
  $loc    = $head | Select-String '^(?i)location: (.+)$' | ForEach-Object { $_.Matches[0].Groups[1].Value.Trim() }
  '{0,-46} got {1} {2}   (want {3})' -f $path, $status, $loc, $checks[$path]
}
```

Use `curl.exe`, not `curl`. In Windows PowerShell 5.1, `curl` is an alias for `Invoke-WebRequest`.

### C3. Check it in real browsers

| Check | How |
|---|---|
| Desktop | Chrome and Edge at full width, then resize down to phone width. No horizontal scrollbar at any width. |
| Phone | Open `$v2` on your phone **over mobile data** (not Wi-Fi). Check the hero animation, the photo column, the pool table animating when scrolled into view, and that the buttons are easy to tap. |
| Tablet | Chrome DevTools → device toolbar → iPad. The photos should be two by two. |
| Icon | The tab shows your round portrait. On iPhone, Share → Add to Home Screen shows the square one. |
| Keyboard | Press Tab from the top of the page. "Skip to content" appears first, and every link shows a green focus outline. |
| Reduced motion | Windows Settings → Accessibility → Visual effects → Animation effects **off**, then reload. Nothing animates, and all text is visible. |
| Lighthouse | https://pagespeed.web.dev/ → enter `$v2`. Aim for ≥ 95 on Performance, Accessibility, Best Practices and SEO, on both Mobile and Desktop. |
| Link previews | Paste `$v2` into a Slack or Teams message to yourself. The title and description should appear. |

> The `/styleguide/` page carries `noindex`, so it won't appear in Google even though it's public.

---

## 6. Phase D: The day-to-day workflow from now on

This is how every future change reaches the site:

```
feature branch ──push──► GitHub PR ──► Netlify Deploy Preview (own URL, comment posted on the PR)
                                             │  review on phone + desktop
                                             ▼
                                  merge PR into main ──► Netlify production deploy (~1 min)
```

**D1. Deploy Previews are on by default.** Open a small test PR, e.g. a one-word change in `src/data/profile.ts`. Netlify posts a comment and a check on the PR with the preview URL. Close the PR without merging once you've seen it.

**D2. A failed build never replaces the live site.** If a deploy fails, the last good deploy stays published. Because `build` runs `astro check` first, type errors also fail the build safely.

**D3. Rolling back a bad (but successful) deploy.** Go to **Deploys**, click an older deploy, then **Publish deploy**. It's live instantly with no rebuild. This pauses auto-publishing; re-enable it with **Start auto publishing** once `main` is fixed.

**D4. Optional: deploy notifications.** Go to **Project configuration → Notifications → Emails** and add an alert for "Deploy failed".

---

## 7. Phase E: Move `matthewrkilleen.com` from v1 to v2

Pick a quiet time. The site may show certificate warnings or be unreachable for a few minutes, typically 2–15.

### E1. Before you start (no impact)

1. Every check in Phase C passes on the **latest** `main` deploy.
2. In Netlify, open **Domains** (team level, left sidebar) → `matthewrkilleen.com` → **DNS records**. **Screenshot** the full list. Note especially the TXT `v=spf1 include:amazonses.com ~all` record and anything else you don't recognise.
3. Note the v1 project's name and its `*.netlify.app` URL. That URL keeps serving v1 throughout and is your rollback.
4. Have the v2 project's **Domain management** page open in a second tab.

### E2. Detach the domain from v1

5. Open the **v1 project → Domain management**.
6. Next to `matthewrkilleen.com`, open **Options → Remove domain** and confirm. Do the same for `www.matthewrkilleen.com` if it's listed separately.
7. From now until step 9 completes, visitors may see an error page. Move straight on.

### E3. Attach the domain to v2

8. In the **v2 project → Domain management**, choose **Add a domain** (it may be under **Add a domain you already own**). Enter `matthewrkilleen.com` and confirm.
9. Because the DNS zone already lives in Netlify DNS in the same team, Netlify **updates the records itself** and points them at v2. Accept its prompts to:
   - make `matthewrkilleen.com` the **primary domain**,
   - add `www.matthewrkilleen.com` as a **domain alias** (it then redirects to the apex, as v1 did).

### E4. HTTPS

10. Scroll to the **HTTPS** section of Domain management. Wait until it shows a Let's Encrypt certificate covering **both** `matthewrkilleen.com` and `www.matthewrkilleen.com`. Refresh occasionally.
11. If nothing has appeared after ~15 minutes, click **Verify DNS configuration**, then **Provision certificate** (or **Renew certificate**).
12. Confirm **Force HTTPS** is enabled. It's on by default.

### E5. Check DNS survived

13. Compare **Domains → matthewrkilleen.com → DNS records** with your screenshot from step 2. The SPF TXT record must still be there. Netlify may have changed the A/ALIAS and `www` records to point at v2, which is expected. Re-add anything else that's missing.
14. From PowerShell:

```powershell
Resolve-DnsName matthewrkilleen.com -Type TXT | Select-Object -ExpandProperty Strings   # expect the SPF record
Resolve-DnsName matthewrkilleen.com -Type A   | Select-Object -ExpandProperty IPAddress
```

---

## 8. Phase F: Verify production

**F1. Run the Phase C2 script against production,** changing only the first line:

```powershell
$v2 = 'https://matthewrkilleen.com'
```

**F2. Check the hostname and protocol redirects:**

```powershell
foreach ($u in 'https://www.matthewrkilleen.com/', 'http://matthewrkilleen.com/', 'http://www.matthewrkilleen.com/') {
  "== $u"; curl.exe -sI $u | Select-String '^(HTTP|(?i)location|(?i)server)'
}
```

Each should be a `301` to `https://matthewrkilleen.com/`, from `Server: Netlify`.

**F3. Confirm it's really v2.** Run `curl.exe -s https://matthewrkilleen.com/ | Select-String 'generator'`. It should show `Astro v7…`, whereas v1 served Angular bundles.

**F4. Check on your phone over mobile data,** which avoids a cached DNS answer on your home network.

**F5. Repeat the Lighthouse run** (§5 C3) against `https://matthewrkilleen.com`.

**F6. Optional (SEO).** If you have Google Search Console, add or verify the domain property and submit `https://matthewrkilleen.com/sitemap-index.xml`. Then use URL Inspection → Request indexing on the homepage, so Google picks up the new title and description sooner. v1's title was literally "PersonalWebsite".

---

## 9. Phase G: Rollback, and retiring v1

### G1. Rollback (if production is badly broken after cutover)

1. **v2 project → Domain management:** remove `matthewrkilleen.com` and `www.matthewrkilleen.com`.
2. **v1 project → Domain management:** add `matthewrkilleen.com` back as the primary domain, with `www` as an alias, and wait for HTTPS as in E4.
3. Re-check the DNS records against your screenshot (E5).

v1's last production deploy is untouched, so it serves again as soon as the certificate is issued. For a problem in a *new* v2 deploy (rather than the cutover itself), use **Publish deploy** on an older v2 deploy instead (§6 D3). It's faster and keeps the domain where it is.

### G2. Retire v1 (2–4 weeks after a clean cutover)

1. **v1 project → Project configuration → Build & deploy → Continuous deployment → Stop builds.** Stray pushes to the v1 repo can no longer deploy.
2. Once you're confident you won't roll back, **v1 project → Project configuration → General → Danger zone → Delete project.** This also frees the v1 `*.netlify.app` name.
3. On GitHub, add a README line to `personal-website` pointing at v2, then **Settings → Archive this repository.** It becomes read-only but stays viewable.

---

## 10. Troubleshooting

| Symptom (build log or browser) | Likely cause | Fix |
|---|---|---|
| `npm ci` fails: *lock file is out of sync* | `package.json` changed without updating `package-lock.json` | Run `npm install` locally, commit the lockfile via a PR |
| `astro check` reports errors | A type error, often a typo in `src/data/*.ts` | Run `npm run check` locally, fix, PR |
| `Could not resolve "…/assets/portrait.jpg"` (or similar) | Filename case mismatch (fine on Windows, fails on Linux) | Run the A4 script; match the import to the real filename exactly |
| `Could not load the "sharp" module` | Linux binary missing from the lockfile | `npm install --os=linux --cpu=x64 sharp` locally, then commit `package-lock.json` |
| Font warning: *No data found for font family …* | A font name in `astro.config.ts` that Google no longer recognises | Check the exact family name on fonts.google.com (e.g. "Big Shoulders", not "Big Shoulders Display") |
| Build fails fetching fonts | Temporary network issue reaching Google Fonts | **Deploys → Trigger deploy → Deploy project** to retry |
| Node version error | `NODE_VERSION` missing or overridden | Ensure `netlify.toml` has `NODE_VERSION = "22"` and the UI has no conflicting Node setting |
| A redirect doesn't fire | A real file exists at the `from` path (Netlify serves files before non-forced redirects), or a typo | Check `dist/` for that path; compare the rule with §1.1 |
| Résumé button 404s | PDF missing from `public/` or the filename's case differs from the link | Must be exactly `public/Matthew_Killeen_Resume.pdf` |
| Old Angular site still showing after cutover | Browser cache, or your network still has the old DNS answer cached | Hard-refresh (Ctrl+Shift+R) or try a private window and your phone on mobile data |
| "Domain already in use" when adding to v2 | Still attached to v1 | Finish E2 first |
| Certificate stuck on "waiting" | DNS not yet pointing at v2 | **Verify DNS configuration**, wait a few minutes, then **Provision certificate** |
| Old icon still shown | Browsers cache favicons hard | Private window; it updates on its own within days |

---

## 11. Enumerated checklist

### Phase A: Local pre-flight
1. [ ] `main` up to date and clean (A1)
2. [ ] `npm ci` succeeds (A2)
3. [ ] `npm run build`: 0 errors, all expected routes (A3)
4. [ ] Case-sensitivity script prints only `ok:` lines (A4)
5. [ ] Redirect targets exist in `dist/` (A5)
6. [ ] `npm run preview` click-through (A6)

### Phase B: Netlify project
7. [ ] Signed in with the team that owns v1 (B1)
8. [ ] Netlify GitHub app has access to `personal-website-v2` (B3)
9. [ ] Project imported; build settings come from `netlify.toml` (B4–B5)
10. [ ] First deploy **Published** (B6)
11. [ ] Project renamed; `$v2` URL noted (B7)

### Phase C: Verify on `*.netlify.app`
12. [ ] Build log healthy (C1)
13. [ ] URL and redirect script all as expected (C2)
14. [ ] Desktop, phone (mobile data), tablet checks (C3)
15. [ ] Keyboard and reduced-motion checks (C3)
16. [ ] Lighthouse ≥ 95 ×4, mobile and desktop (C3)

### Phase D: Workflow
17. [ ] Test PR shows a Deploy Preview link (D1)
18. [ ] *(Optional)* "Deploy failed" email notification (D4)

### Phase E: Cutover
19. [ ] DNS records screenshotted, v1 `*.netlify.app` URL noted (E1)
20. [ ] Domain + `www` removed from v1 (E2)
21. [ ] Domain added to v2 as primary, `www` as alias (E3)
22. [ ] HTTPS certificate active for both hostnames; Force HTTPS on (E4)
23. [ ] SPF TXT record still present (E5)

### Phase F: Production
24. [ ] C2 script passes against `https://matthewrkilleen.com` (F1)
25. [ ] `www` / `http` redirects correct (F2)
26. [ ] Generator meta shows Astro (F3)
27. [ ] Phone over mobile data (F4)
28. [ ] Lighthouse on production (F5)
29. [ ] *(Optional)* Sitemap submitted to Search Console (F6)

### Phase G: Retire v1 (after 2–4 weeks)
30. [ ] Builds stopped on v1 (G2.1)
31. [ ] v1 project deleted (G2.2)
32. [ ] v1 repo README updated and archived (G2.3)

---

## 12. Out of scope

- Separate CI (e.g. GitHub Actions running `npm run check` on every PR). Netlify's Deploy Preview build already runs it.
- Security headers (Content-Security-Policy etc.) in `netlify.toml`.
- Netlify Analytics, forms or edge functions.
- An Open Graph share image (`og:image`) for richer link previews.
