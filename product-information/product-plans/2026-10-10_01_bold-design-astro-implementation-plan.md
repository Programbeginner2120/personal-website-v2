# Plan 01: Build the "Bold" design in Astro + TypeScript

| | |
|---|---|
| **Date** | 2026-10-10 |
| **Plan #** | 01 |
| **Status** | Proposed |
| **Owner** | Matthew Killeen |
| **Source design** | [`prototypes/bold-template.html`](../../prototypes/bold-template.html) |
| **Stack** | Astro 7.3.8 · TypeScript (strict) · Motion 14.1.0 |
| **Hosting** | Netlify (static), replacing v1 at https://matthewrkilleen.com |
| **Revisions** | 2026-10-10: added goal 5 and Phase 10 (Netlify deploy and v1 cutover) |

---

## 0. Goals and decisions at a glance

The five goals for this plan:

1. **Style guide.** Turn the prototype's CSS into reusable design tokens, base styles and utility classes, plus a living `/styleguide` page that shows them.
2. **Abstractions.** Model the site's data with TypeScript interfaces and build the UI from small, typed `.astro` components.
3. **TypeScript only.** No `.js`/`.mjs` source files. Config, data, helpers and client scripts are all `.ts` or TypeScript inside `.astro`.
4. **Personal data.** Decide between hardcoding it in markup and keeping it outside the markup, as v1 did.
5. **Replace v1 in production.** v2 takes over https://matthewrkilleen.com on Netlify with no broken links and a quick way to roll back.

The decisions this plan recommends:

| Question | Decision | Section |
|---|---|---|
| Where does CSS live? | `src/styles/tokens.css` + `src/styles/global.css` (in cascade layers) for shared styles; each component's own CSS goes in its scoped `<style>` | §3 |
| How are fonts loaded? | Astro's built-in **Fonts API** (self-hosted, preloaded), which replaces the Google Fonts `<link>` | §3.4 |
| Where does personal data live? | **Outside the markup, in typed TypeScript modules in `src/data/`**, checked against interfaces in `src/types/`. It is imported at build time, not fetched at runtime like v1 | §5 |
| How do components get data? | The page (`index.astro`) imports the data and passes it down as **props**. Section components never import data themselves | §6, §8 |
| Animations? | CSS keyframes do the animating. A TypeScript `<script>` with `motion` only decides **when** they start | §9 |
| How does v2 replace v1? | A **new GitHub repo and a new Netlify site** for v2 (static build, no adapter). Check it on its `*.netlify.app` URL, then **move the custom domain** from the v1 site to the v2 site. v1 stays intact as the rollback | §12 |

---

## 1. Astro primer for an Angular developer

You already know component-based UI from v1, so here is how Angular concepts map onto Astro.

| Angular (v1) | Astro (v2) | Notes |
|---|---|---|
| `@Component` class + template + styles | One `.astro` file | The frontmatter (between `---` fences) is TypeScript that runs **on the server at build time**. Everything below it is the template. |
| `@Input() foo` | `interface Props { foo: string }` + `const { foo } = Astro.props` | Astro reads the `Props` interface automatically, so the editor and `astro check` type-check every usage. |
| `<ng-content>` / named `select=` | `<slot />` / `<slot name="x" />` | |
| `*ngFor` / `@for` | `{items.map((item) => <li>{item}</li>)}` | It's JSX-like syntax, but the output is plain HTML. |
| `*ngIf` / `@if` | `{cond && <p>…</p>}` or `{cond ? <a/> : <b/>}` | |
| `[ngClass]` | `class:list={['a', cond && 'b', { c: cond2 }]}` | |
| `ViewEncapsulation.Emulated` | `<style>` in a component is **scoped by default** | Astro adds `data-astro-cid-xxxx` attributes. Use `:global(...)` to opt out for a selector. |
| `styles.scss` | A CSS file imported once in the layout | |
| Services + `HttpClient` fetching `/assets/*.json` | `import { jobs } from '@/data/jobs'` in frontmatter | It runs at **build time**, so the data ends up in the HTML with no request, loading state or `toSignal`. |
| Lifecycle hooks / zone.js | Nothing. Components render once to HTML | Use a `<script>` tag for browser behaviour (§9). |
| `src/assets/` (copied as-is) | `public/` = copied as-is; `src/assets/` = **processed** (images optimised, hashed) | Personal photos go in `src/assets/`. `resume.pdf` and the favicon go in `public/`. |

> **Mental model:** Astro is a **build-time HTML generator**. By default it sends **zero JavaScript** to the browser. The only JS that ships is what you put in `<script>` tags (here, the Motion code).

---

## 2. Target folder structure

```
personal-website-v2/
├─ astro.config.ts                 ← renamed from .mjs (TypeScript)
├─ tsconfig.json                   ← + "@/*" path alias
├─ netlify.toml                    ← build settings, v1→v2 redirects, cache headers (§12)
├─ public/
│  ├─ favicon.svg
│  ├─ robots.txt                   ← points crawlers at the sitemap (§12.4)
│  └─ resume.pdf                   ← copied from v1 (§11)
├─ prototypes/bold-template.html   ← kept as the visual reference
├─ product-information/product-plans/
└─ src/
   ├─ assets/photos/               ← me.jpg, cooper.jpg, guitar.jpg, pool.jpg
   ├─ styles/
   │  ├─ tokens.css                ← colours, spacing, radii, type scale, themes
   │  └─ global.css                ← layers: reset → base → utilities
   ├─ types/
   │  └─ site.ts                   ← all shared interfaces & types
   ├─ data/
   │  ├─ site.ts                   ← meta, nav, theme
   │  ├─ profile.ts                ← hero, about, skills, ticker
   │  ├─ experience.ts             ← jobs
   │  ├─ life.ts                   ← "off the clock" copy + photos
   │  └─ contact.ts                ← contact links
   ├─ lib/
   │  └─ format.ts                 ← small pure helpers (e.g. formatYears)
   ├─ components/
   │  ├─ ui/                       ← generic, design-system level
   │  │  ├─ Button.astro
   │  │  ├─ ChipList.astro
   │  │  ├─ Placeholder.astro
   │  │  └─ Section.astro
   │  └─ sections/                 ← one per page section, site specific
   │     ├─ SiteHeader.astro
   │     ├─ Hero.astro
   │     ├─ Orbit.astro
   │     ├─ Ticker.astro
   │     ├─ About.astro
   │     ├─ Experience.astro
   │     ├─ JobCard.astro
   │     ├─ OffTheClock.astro
   │     ├─ PoolTable.astro
   │     ├─ PhotoCard.astro
   │     ├─ Contact.astro
   │     └─ SiteFooter.astro
   ├─ layouts/
   │  └─ BaseLayout.astro          ← <html>, <head>, fonts, global CSS
   └─ pages/
      ├─ index.astro               ← composes the page
      ├─ 404.astro                 ← Netlify serves dist/404.html for unknown URLs (§12.4)
      └─ styleguide.astro          ← living style guide (noindex)
```

**Rule of thumb for `ui/` vs `sections/`:** a `ui/` component knows nothing about you and could go on any site. A `sections/` component knows the layout of *this* page.

---

## 3. Phase 1: Style guide (reusable CSS)

### 3.1 Patterns in the prototype

Reading the prototype's CSS turns up these repeated patterns. Each one becomes a token or a utility:

| Pattern in the prototype | Where it appears | Becomes |
|---|---|---|
| 8 colour variables × 2 themes | `:root`, `[data-theme]` | **Colour tokens** (`tokens.css`) |
| `clamp(...)` font sizes | hero name, h2, contact title, job org, lead, intro | **Type-scale tokens** `--fs-*` |
| `max-width:1240px; padding-inline: var(--gutter)` | `.wrap` | **Utility** `.wrap` |
| Mono, 700 weight, 12–15px, often uppercase | header, ticker, chips, job years, badge, footer | **Utility** `.label` (+ `.label--caps`) |
| `display:flex; flex-direction:column; gap:N` | hero text, about body, job body, life, contact card, experience | **Utility** `.stack` with `--stack-gap` |
| `display:flex; flex-wrap:wrap; gap:N` | hero actions, contact links, chips, nav | **Utility** `.cluster` with `--cluster-gap` |
| Big uppercase condensed headline | `.display`, `.h2` | **Utilities** `.display`, `.h2` |
| Pill buttons | `.btn`, `.btn--primary`, `.btn--solid` | **`<Button>` component** backed by global `.btn` classes |

### 3.2 `src/styles/tokens.css`

Tokens are **values only**. They contain no selectors that style elements.

```css
/* src/styles/tokens.css
 * Design tokens for the Bold design. Change values here, never inline.
 * Font-family tokens (--font-display/body/mono) are generated by the
 * Astro Fonts API (astro.config.ts), so they are NOT declared here.
 */

/* ---------- Theme-independent tokens ---------- */
:root {
  /* Layout */
  --max-width: 1240px;
  --gutter: clamp(20px, 5vw, 56px);
  --section-gap: clamp(72px, 9vw, 120px);

  /* Radii */
  --radius-sm: 8px;
  --radius-md: 22px;
  --radius-lg: 28px;
  --radius-pill: 999px;

  /* Borders */
  --border-width: 2px;

  /* Type scale */
  --fs-base: 18px;
  --fs-label-sm: 12px;
  --fs-label: 14px;
  --fs-label-lg: 15px;
  --fs-intro: clamp(19px, 2vw, 22px);
  --fs-lead: clamp(22px, 2.6vw, 30px);
  --fs-job-org: clamp(34px, 4vw, 48px);
  --fs-h2: clamp(56px, 8vw, 104px);
  --fs-contact: clamp(64px, 12vw, 168px);
  --fs-hero: clamp(80px, 15vw, 210px);

  /* Motion */
  --ease-out-strong: cubic-bezier(.2, .9, .2, 1);
}

/* ---------- Themes ---------- */
/* Green is the default: it applies with or without data-theme="green". */
:root,
[data-theme="green"] {
  --bg: #070A08;
  --surface: #111A14;
  --fg: #ECF7EF;
  --muted: #A3B8A9;
  --accent: #3DF58C;
  --line: #2A3A30;
  --felt: #0E5A34;
  --rail: #1A130D;
}

[data-theme="blue"] {
  --bg: #0A1C42;
  --surface: #132A5C;
  --fg: #F2F5FF;
  --muted: #B0C0E8;
  --accent: #FF7A1A;
  --line: #2E4580;
  --felt: #1450B8;
  --rail: #050D20;
}
```

### 3.3 `src/styles/global.css` (in cascade layers)

**Why use `@layer`?** Styles in a layer always lose to styles **not** in a layer, whatever their specificity. Astro's scoped component `<style>` blocks are unlayered. Putting all global CSS in layers therefore guarantees that **a component's own styles always beat the global defaults**, so you never need `!important` or selector tricks.

```css
/* src/styles/global.css */
@import './tokens.css';

/* Order matters: later layers win over earlier ones. */
@layer reset, base, utilities;

/* ---------- reset ---------- */
@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
  img, svg { display: block; max-width: 100%; }
  /* The spinning orbit pokes past the edge on phones; clip it instead of scrolling */
  html, body { overflow-x: clip; }
}

/* ---------- base (element defaults) ---------- */
@layer base {
  body {
    margin: 0;
    background: var(--bg);
    color: var(--fg);
    font-family: var(--font-body);
    font-size: var(--fs-base);
    line-height: 1.6;
  }
  a { color: inherit; }
  a:hover { opacity: .8; }

  /* Respect visitors who ask for less motion */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation: none !important; }
  }
}

/* ---------- utilities (reusable classes) ---------- */
@layer utilities {
  /* Layout */
  .wrap    { max-width: var(--max-width); margin-inline: auto; padding-inline: var(--gutter); }
  .section { padding-top: var(--section-gap); }
  .stack   { display: flex; flex-direction: column; gap: var(--stack-gap, 24px); }
  .cluster { display: flex; flex-wrap: wrap; gap: var(--cluster-gap, 12px); }

  /* Typography */
  .display {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 900;
    text-transform: uppercase;
    line-height: .85;
  }
  .h2    { font-size: var(--fs-h2); }
  .muted { color: var(--muted); }
  .label {
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: var(--fs-label);
  }
  .label--caps { text-transform: uppercase; letter-spacing: .06em; }

  /* Buttons. Colours come from custom properties so a parent can
     re-theme every button inside it (see Contact, §8.8). */
  .btn {
    display: inline-block;
    padding: 14px 26px;
    border-radius: var(--radius-pill);
    font-weight: 700;
    text-decoration: none;
    overflow-wrap: anywhere;
    color: var(--btn-fg, inherit);
    background: var(--btn-bg, transparent);
    border: var(--border-width) solid var(--btn-border, var(--fg));
  }
  .btn--primary { --btn-bg: var(--accent); --btn-fg: var(--bg); --btn-border: var(--accent); }
  .btn--solid   { --btn-bg: var(--bg);     --btn-fg: var(--fg); --btn-border: var(--bg); }

  /* Placeholder boxes while photos are missing */
  .placeholder {
    display: flex; align-items: center; justify-content: center;
    color: var(--muted); font-size: 15px;
    border: var(--border-width) dashed var(--line);
  }
}
```

> **Naming convention:** keep the prototype's **BEM** names (`block__element--modifier`). Global utilities use short names (`.wrap`, `.stack`). Component-specific classes use the component's name as the block (`.hero__name`, `.job__badge`). You can tell at a glance whether a class is global or local.

### 3.4 Fonts via the Astro Fonts API

The Fonts API (stable since Astro 6) downloads the fonts at build time, **self-hosts** them, generates optimised fallback fonts to reduce layout shift, and exposes each font as a CSS variable. Replace the Google Fonts `<link>` tags with this.

First, rename `astro.config.mjs` → **`astro.config.ts`** (goal 3: TypeScript only):

```ts
// astro.config.ts
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // The production domain. Used for canonical URLs and the sitemap (§12.4).
  site: 'https://matthewrkilleen.com',
  integrations: [
    // Generates /sitemap-index.xml at build time. The style guide is left out.
    sitemap({ filter: (page) => !page.includes('/styleguide') }),
  ],
  fonts: [
    {
      provider: fontProviders.google(),
      // Google merged "Big Shoulders Display" into "Big Shoulders" (optical-size axis).
      // The old name fails in Astro's provider (found during implementation).
      name: 'Big Shoulders',
      cssVariable: '--font-display',
      weights: [700, 900],
      styles: ['normal'],
      fallbacks: ['sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Manrope',
      cssVariable: '--font-body',
      weights: [400, 500, 700],
      styles: ['normal'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      weights: [500, 700],
      styles: ['normal'],
      fallbacks: ['monospace'],
    },
  ],
});
```

Then add one `<Font />` per family in the layout's `<head>` (§7). `preload` is worth it for the body font and the display font used by the hero.

### 3.5 Living style guide page: `src/pages/styleguide.astro`

A page that renders every token and primitive lets you see the design system and catch regressions when tokens change. It is built like any other page, but is excluded from search engines.

```astro
---
// src/pages/styleguide.astro
import BaseLayout from '@/layouts/BaseLayout.astro';
import Button from '@/components/ui/Button.astro';
import ChipList from '@/components/ui/ChipList.astro';
import Placeholder from '@/components/ui/Placeholder.astro';

const colours = ['bg', 'surface', 'fg', 'muted', 'accent', 'line', 'felt', 'rail'] as const;
const typeScale = ['fs-hero', 'fs-contact', 'fs-h2', 'fs-job-org', 'fs-lead', 'fs-intro', 'fs-base'] as const;
---
<BaseLayout title="Style guide" noindex>
  <main class="wrap stack" style={{ '--stack-gap': '64px', paddingBlock: '64px' }}>
    <h1 class="display h2">Style guide</h1>

    <section class="stack">
      <h2 class="label label--caps">Colour tokens</h2>
      <ul class="swatches">
        {colours.map((name) => (
          <li class="swatch">
            <span class="swatch__chip" style={{ background: `var(--${name})` }}></span>
            <code>--{name}</code>
          </li>
        ))}
      </ul>
    </section>

    <section class="stack">
      <h2 class="label label--caps">Type scale</h2>
      {typeScale.map((token) => (
        <p class="display" style={{ fontSize: `var(--${token})` }}>{token}</p>
      ))}
      <p>Body: Manrope 18 / 1.6. The quick brown fox jumps over the lazy dog.</p>
      <p class="label">Label: JetBrains Mono 14 / 700</p>
    </section>

    <section class="stack">
      <h2 class="label label--caps">Buttons</h2>
      <div class="cluster">
        <Button href="#">Default</Button>
        <Button href="#" variant="primary">Primary</Button>
        <Button href="#" variant="solid">Solid</Button>
      </div>
    </section>

    <section class="stack">
      <h2 class="label label--caps">Chips & placeholder</h2>
      <ChipList items={['Java', 'TypeScript', 'AWS']} />
      <Placeholder style={{ height: '160px' }}>Photo: example</Placeholder>
    </section>
  </main>
</BaseLayout>

<style>
  .swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px; list-style: none; padding: 0; margin: 0; }
  .swatch { display: flex; flex-direction: column; gap: 8px; }
  .swatch__chip { aspect-ratio: 3 / 2; border-radius: var(--radius-sm); border: 1px solid var(--line); }
  p { margin: 0; }
</style>
```

> Note the `style={{ ... }}` objects: Astro converts camelCase keys to kebab-case (`paddingBlock` → `padding-block`) and passes `--custom-properties` through unchanged.

**Phase 1 done when:** `/styleguide` renders correctly in both themes. Test by temporarily setting `theme: 'blue'` in `src/data/site.ts`.

---

## 4. Phase 2: TypeScript types (`src/types/site.ts`)

Keep **all shared shapes in one file** to start with. Split it later if it grows past ~150 lines.

```ts
// src/types/site.ts
import type { ImageMetadata } from 'astro';

/** Colour palettes defined in tokens.css. Add one here AND there. */
export type Theme = 'green' | 'blue';

/** Any labelled link. */
export interface Link {
  label: string;
  href: string;
}

export interface NavLink extends Link {
  /** Highlight as a call-to-action (accent colour). */
  cta?: boolean;
}

export type ButtonVariant = 'default' | 'primary' | 'solid';

export interface ButtonLink extends Link {
  variant?: ButtonVariant;
}

export interface SiteMeta {
  title: string;
  description: string;
  domain: string;
  theme: Theme;
  nav: NavLink[];
}

export interface HeroContent {
  /** Each entry is one line of the giant name; the last is accent-coloured. */
  nameLines: [string, string];
  intro: string;
  actions: ButtonLink[];
  portrait: Photo;
}

export interface AboutContent {
  lead: string;
  body: string;
  skills: string[];
}

/** A year (2024) or a placeholder you haven't filled in yet ('[Year]'). */
export type YearValue = number | string;

export interface Job {
  org: string;
  role: string;
  start: YearValue;
  /** Omit for a current position: it renders as "Present". */
  end?: YearValue;
  blurb: string;
}

export interface Photo {
  /** An imported image, or null to show a placeholder. */
  image: ImageMetadata | null;
  alt: string;
  caption: string;
}

export interface LifeContent {
  heading: string;
  intro: string;
  photos: Photo[];
}

export interface ContactContent {
  heading: string;
  links: ButtonLink[];
}
```

Things worth noticing:

- `import type` makes sure the import disappears from the compiled output. Use it for anything that is only a type.
- `nameLines: [string, string]` is a **tuple** type, so the compiler rejects anything other than exactly two lines, which is what the design needs.
- Making `end` optional, rather than adding a separate `current: boolean`, makes the "current job" state **derived** and stops the two from disagreeing (§6.2).

---

## 5. Phase 3: Where personal data lives (decision for goal 4)

### 5.1 The options

| | **A. Hardcode in `.astro` markup** | **B. Typed TS modules in `src/data/`** ✅ | **C. JSON + content collections** | **D. Runtime fetch from `public/` (v1 style)** |
|---|---|---|---|---|
| Example | `<h3>LBi Software</h3>` in `Experience.astro` | `export const jobs = [...] satisfies Job[]` | `src/data/jobs.json` + Zod schema in `src/content.config.ts` | `fetch('/data/jobs.json')` in a `<script>` |
| Type safety | Only what's in the markup | ✅ Full: compile-time, editor autocomplete | ✅ Runtime validation (Zod) + generated types | ❌ None without extra work |
| Edit content without touching UI | ❌ | ✅ | ✅ | ✅ |
| Reuse the same data in two places (page + style guide, future `/resume` page, meta tags) | ❌ copy-paste | ✅ | ✅ | ⚠️ |
| Reference optimised images | ⚠️ | ✅ `import cooper from '…jpg'` | ✅ via `image()` schema helper | ❌ |
| Ships extra JS / network requests | No | No | No | **Yes**, and content is missing from the initial HTML (worse SEO, layout pop-in) |
| Extra concepts to learn | none | `satisfies` | collections, loaders, Zod, `getCollection` | – |

### 5.2 Recommendation: **B. Typed TypeScript modules**

- It **keeps v1's good idea** (content separate from presentation) and **drops the bad part** (runtime HTTP). In Astro the import happens at build time and the values are written into the HTML.
- It directly serves goals 2 and 3. Your interfaces become the schema, and a typo such as `blrb:` is a red squiggle, not a silent blank on the page.
- It handles **images** properly. A data file can `import` a photo, and `<Image>` then resizes it and serves modern formats.
- It is the smallest step up from hardcoding. If you later add a blog or many project write-ups, move those to **content collections (option C)**. That's what they're designed for, and the TypeScript interfaces carry over almost one-to-one into Zod schemas (§5.4).

**Not recommended:** option D. It turns Astro's main strength (static HTML) back into an SPA-style loading pattern.

### 5.3 What the data files look like

`satisfies` checks the value against the type **without widening it**. You get errors for wrong or missing fields while keeping exact literal types.

```ts
// src/data/site.ts
import type { SiteMeta } from '@/types/site';

export const site = {
  title: 'Matthew Killeen',
  description: "Software engineer at JPMorgan Chase. Guitarist, pool player and Cooper's favourite person.",
  domain: 'matthewrkilleen.com',
  theme: 'green',
  nav: [
    { label: 'About', href: '#about' },
    { label: 'Experience', href: '#experience' },
    { label: 'Off the clock', href: '#life' },
    { label: 'Contact →', href: '#contact', cta: true },
  ],
} satisfies SiteMeta;
```

```ts
// src/data/experience.ts
import type { Job } from '@/types/site';

/** Most recent first. A job with no `end` is the current one. */
export const jobs = [
  {
    org: 'JPMorgan Chase',
    role: '[Your title]',
    start: '[Year]',
    blurb: '[One or two lines on what you build in wealth management.]',
  },
  {
    org: 'LBi Software',
    role: 'Software Engineer',
    start: 2024,
    end: '[Year]',
    blurb: 'Built and maintained web and mobile applications spanning multiple sports leagues and enterprises.',
  },
  {
    org: 'Infosys Limited',
    role: 'Software Engineer',
    start: 2022,
    end: 2023,
    blurb: 'Built web applications for clients alongside a team of software engineers.',
  },
  {
    org: 'University at Albany, SUNY',
    role: 'Undergraduate Researcher',
    start: 2021,
    end: 2022,
    blurb: 'Generated ideal forms of nano-clusters with machine learning in the Data Mining and Management Lab.',
  },
] satisfies Job[];
```

```ts
// src/data/life.ts
import type { LifeContent } from '@/types/site';
// Uncomment as real photos land in src/assets/photos/:
// import cooper from '@/assets/photos/cooper.jpg';

export const life = {
  heading: 'Off the clock',
  intro: "When I'm not programming, I'm at the pool table, playing guitar or hanging out with my dog Cooper.",
  photos: [
    { image: null /* cooper */, alt: 'Cooper the dog', caption: 'Cooper' },
    { image: null, alt: 'My guitar', caption: 'Guitar' },
    { image: null, alt: 'The pool table', caption: 'The table' },
  ],
} satisfies LifeContent;
```

`profile.ts` (hero, about, ticker) and `contact.ts` follow the same pattern, using `HeroContent`, `AboutContent`, `string[]` and `ContactContent`.

> **Content vs presentation:** the pool-ball positions are **not** personal data. They are part of the drawing, so they stay inside `PoolTable.astro` (§8.6). Put something in `src/data/` only if you'd want to change it without thinking about design.

### 5.4 For later: what option C looks like

This is here so you can recognise it later. **Don't build it now.**

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

const jobs = defineCollection({
  loader: file('src/data/jobs.json'),   // an array of objects, each with an "id"
  schema: z.object({
    org: z.string(),
    role: z.string(),
    start: z.union([z.number(), z.string()]),
    end: z.union([z.number(), z.string()]).optional(),
    blurb: z.string(),
  }),
});

export const collections = { jobs };
```

```astro
---
import { getCollection } from 'astro:content';
const jobs = await getCollection('jobs');   // entries look like { id, data: { org, role, ... } }
---
{jobs.map((job) => <h3>{job.data.org}</h3>)}
```

---

## 6. Phase 4: Primitives and helpers

### 6.1 Path alias (`tsconfig.json`)

This replaces `../../../` chains with `@/…`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"],
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### 6.2 Pure helpers: `src/lib/format.ts`

```ts
// src/lib/format.ts
import type { Job } from '@/types/site';

/** A job without an end year is the current one. */
export const isCurrent = (job: Job): boolean => job.end === undefined;

/** "2022 — 2023" or "2024 — Present". */
export function formatYears(job: Job): string {
  return `${job.start} — ${job.end ?? 'Present'}`;
}
```

Keep logic like this out of templates. It's easy to read, and easy to unit-test later with Vitest if you want.

### 6.3 Key Astro pattern: passing `class` and other attributes through

Astro's scoped styles work by stamping a `data-astro-cid-…` attribute on elements. When a **parent** puts a class on a **child component** (`<Button class="foo">`) and styles `.foo` in its own `<style>`, Astro passes the parent's scope attribute to the child **as a prop**. It only reaches the HTML if the child **spreads the remaining props** onto its root element. (Verified on Astro 7.3.8 with the default `scopedStyleStrategy: 'attribute'`.)

So every `ui/` component follows this template:

```astro
---
import type { HTMLAttributes } from 'astro/types';

// 1. Extend the native element's attributes: aria-*, id, style, data-*, etc. all type-check.
interface Props extends HTMLAttributes<'div'> {}

// 2. Pull out `class` (a reserved word, so rename it) and keep the rest.
const { class: className, ...rest } = Astro.props;
---
<!-- 3. Merge classes with class:list and SPREAD the rest (this carries the parent's scope). -->
<div class:list={['my-block', className]} {...rest}>
  <slot />
</div>
```

### 6.4 `Button.astro`

Every button in the design is a link, so this renders an `<a>`.

```astro
---
// src/components/ui/Button.astro
import type { HTMLAttributes } from 'astro/types';
import type { ButtonVariant } from '@/types/site';

interface Props extends HTMLAttributes<'a'> {
  href: string;
  variant?: ButtonVariant;
}

const { variant = 'default', class: className, ...rest } = Astro.props;
---
<a
  class:list={['btn', { [`btn--${variant}`]: variant !== 'default' }, className]}
  {...rest}
><slot /></a>
```

Usage: `<Button href="/resume.pdf">Résumé</Button>` or `<Button href="#experience" variant="primary">See my work</Button>`.

Button styles live in `global.css` (§3.3), not in a scoped `<style>` here. Buttons are a **design-system** primitive whose colours parents need to override via `--btn-*` custom properties. Custom properties inherit through component boundaries; scoped selectors do not.

### 6.5 `ChipList.astro`

```astro
---
// src/components/ui/ChipList.astro
import type { HTMLAttributes } from 'astro/types';

interface Props extends HTMLAttributes<'ul'> {
  items: string[];
}

const { items, class: className, ...rest } = Astro.props;
---
<ul class:list={['chips', 'cluster', className]} {...rest}>
  {items.map((item) => <li class="label">{item}</li>)}
</ul>

<style>
  .chips { --cluster-gap: 8px; list-style: none; margin: 0; padding: 8px 0 0; }
  li {
    border: var(--border-width) solid var(--line);
    border-radius: var(--radius-sm);
    padding: 6px 12px;
  }
</style>
```

Plain `li` is safe here because scoping means it only matches `<li>`s **this** component renders.

### 6.6 `Placeholder.astro`

```astro
---
// src/components/ui/Placeholder.astro
import type { HTMLAttributes } from 'astro/types';

interface Props extends HTMLAttributes<'div'> {}

const { class: className, ...rest } = Astro.props;
---
<div class:list={['placeholder', className]} {...rest}><slot /></div>
```

### 6.7 `Section.astro`

This wraps the repeated `<section id="…" class="wrap section">` shell. The caller supplies the inner layout through the slot.

```astro
---
// src/components/ui/Section.astro
import type { HTMLAttributes } from 'astro/types';

interface Props extends HTMLAttributes<'section'> {
  id: string;   // required: every section is a nav target
}

const { class: className, ...rest } = Astro.props;
---
<section class:list={['wrap', 'section', className]} {...rest}>
  <slot />
</section>
```

> **Slotted content keeps the caller's scope.** Markup you put *between* `<Section>` tags is compiled as part of the **calling** component, so the caller's scoped styles apply to it as usual. That's why section components can style their own inner layout while still using `<Section>`.

> **Not everything needs a component.** A headline is just `<h2 class="display h2">`. Utility classes are the abstraction for single-element patterns. Make a component when there's **structure** (several elements) or **logic**.

---

## 7. Phase 5: Layout (`src/layouts/BaseLayout.astro`)

This replaces the starter `Layout.astro`.

```astro
---
// src/layouts/BaseLayout.astro
import { Font } from 'astro:assets';
import '@/styles/global.css';            // imported once; Astro bundles & injects it
import { site } from '@/data/site';
import type { Theme } from '@/types/site';

interface Props {
  title?: string;
  description?: string;
  theme?: Theme;
  /** Hide from search engines (e.g. the style guide). */
  noindex?: boolean;
}

const {
  title,
  description = site.description,
  theme = site.theme,
  noindex = false,
} = Astro.props;

const fullTitle = title ? `${title} · ${site.title}` : site.title;
const canonical = new URL(Astro.url.pathname, Astro.site);
---
<!doctype html>
<html lang="en" data-theme={theme}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{fullTitle}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    {noindex && <meta name="robots" content="noindex" />}
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="generator" content={Astro.generator} />

    <Font cssVariable="--font-display" preload />
    <Font cssVariable="--font-body" preload />
    <Font cssVariable="--font-mono" />
  </head>
  <body>
    <slot />
  </body>
</html>
```

`Astro.site` comes from `site:` in `astro.config.ts` (§3.4).

---

## 8. Phase 6: Section components

Every section takes its content as **typed props**. The page passes the data in. This is Angular's "presentational component" pattern: the components stay reusable (the style guide can render `<JobCard>` with fake data) and `index.astro` is the only place that knows where the data comes from.

### 8.1 `SiteHeader.astro`

```astro
---
// src/components/sections/SiteHeader.astro
import type { NavLink } from '@/types/site';

interface Props {
  domain: string;
  nav: NavLink[];
}

const { domain, nav } = Astro.props;
---
<header class="wrap header label">
  <div class="header__brand"><span class="header__dot" aria-hidden="true"></span>{domain}</div>
  <nav aria-label="Primary">
    {nav.map(({ label, href, cta }) => (
      <a href={href} class:list={{ cta }}>{label}</a>
    ))}
  </nav>
</header>

<style>
  .header {
    display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center;
    gap: 12px; padding-block: 22px;
  }
  .header__brand { display: flex; align-items: center; gap: 10px; }
  .header__dot {
    width: 8px; height: 8px; border-radius: 50%; background: var(--accent);
    animation: blink 1.1s step-end infinite;
  }
  nav { display: flex; flex-wrap: wrap; gap: 4px 28px; }
  nav a { text-decoration: none; padding: 12px 0; }
  nav a.cta { color: var(--accent); }
  @keyframes blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: .25; } }
</style>
```

### 8.2 `Hero.astro` + `Orbit.astro`

```astro
---
// src/components/sections/Hero.astro
import Button from '@/components/ui/Button.astro';
import Orbit from './Orbit.astro';
import type { HeroContent } from '@/types/site';

interface Props {
  content: HeroContent;
}

const { nameLines, intro, actions, portrait } = Astro.props.content;
---
<section class="wrap hero">
  <div class="hero__text stack" style={{ '--stack-gap': '28px' }}>
    <h1 class="display hero__name">
      {nameLines.map((line, i) => (
        <span class:list={['hero__line', { 'hero__line--accent': i === nameLines.length - 1 }]}>
          <span>{line}</span>
        </span>
      ))}
    </h1>
    <p class="hero__intro muted" data-reveal>{intro}</p>
    <div class="cluster" data-reveal>
      {actions.map(({ label, href, variant }) => <Button href={href} variant={variant}>{label}</Button>)}
    </div>
  </div>
  <Orbit portrait={portrait} />
</section>

<style>
  .hero {
    display: flex; flex-wrap: wrap; align-items: center; gap: 40px;
    padding-block: clamp(24px, 5vw, 56px) clamp(56px, 8vw, 96px);
  }
  .hero__text { flex: 3 1 560px; min-width: 0; }
  .hero__name { font-size: var(--fs-hero); letter-spacing: -.01em; }
  .hero__line { display: block; overflow: hidden; }
  .hero__line > span { display: inline-block; }
  .hero__line--accent > span { color: var(--accent); }
  .hero__intro { margin: 0; max-width: 580px; font-size: var(--fs-intro); }
</style>

<script>
  // See §9 for the full explanation of client scripts.
  import { animate, stagger } from 'motion';

  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    animate('.hero__line > span', { y: ['105%', '0%'] }, { duration: 1, delay: stagger(0.12), ease: [0.2, 0.9, 0.2, 1] });
    animate('[data-reveal]', { opacity: [0, 1], y: [20, 0] }, { duration: 0.9, delay: stagger(0.12, { startDelay: 0.3 }) });
  }
</script>
```

`Orbit.astro` holds the ring, portrait and rocket SVG, with the `.orbit*` CSS and the `spin`/`flicker` keyframes copied from the prototype. Its only prop is `portrait: Photo`. Show `<Image>` when `portrait.image` is set and `<Placeholder>` otherwise; this is the same pattern as `PhotoCard` in §8.7.

### 8.3 `Ticker.astro`: a generic, reusable marquee

```astro
---
// src/components/sections/Ticker.astro
interface Props {
  items: string[];
  separator?: string;
  /** Seconds for one full loop. */
  duration?: number;
}

const { items, separator = '///', duration = 30 } = Astro.props;

// The track is rendered twice and slides by -50%, so the loop is seamless.
const track = [...items, ...items];
---
<div class="ticker label label--caps" aria-hidden="true">
  <div class="ticker__track" style={{ '--duration': `${duration}s` }}>
    {track.map((item) => (
      <span>{item} <span class="ticker__sep">{separator}</span></span>
    ))}
  </div>
</div>

<style>
  .ticker {
    border-block: var(--border-width) solid var(--fg);
    overflow: hidden; white-space: nowrap; padding: 14px 0;
    font-size: var(--fs-label-lg);
  }
  .ticker__track {
    display: inline-flex; gap: 40px; padding-right: 40px;
    animation: marquee var(--duration) linear infinite;
  }
  .ticker__sep { color: var(--accent); }
  @keyframes marquee { to { transform: translateX(-50%); } }
</style>
```

Passing values from TypeScript into CSS through a custom property (`--duration`) is the idiomatic Astro approach. `define:vars` exists too, but inline custom properties are easier to follow.

### 8.4 `About.astro`

```astro
---
// src/components/sections/About.astro
import Section from '@/components/ui/Section.astro';
import ChipList from '@/components/ui/ChipList.astro';
import type { AboutContent } from '@/types/site';

interface Props {
  content: AboutContent;
}

const { lead, body, skills } = Astro.props.content;
---
<Section id="about">
  <div class="about">
    <h2 class="display h2">About</h2>
    <div class="about__body stack" style={{ '--stack-gap': '20px' }}>
      <p class="about__lead">{lead}</p>
      <p class="muted">{body}</p>
      <ChipList items={skills} />
    </div>
  </div>
</Section>

<style>
  .about { display: flex; flex-wrap: wrap; gap: 40px 72px; }
  .about > h2 { flex: 1 1 260px; }
  .about__body { flex: 2 1 480px; min-width: 0; }
  .about__body p { margin: 0; }
  .about__lead { font-size: var(--fs-lead); line-height: 1.35; font-weight: 500; }
</style>
```

### 8.5 `Experience.astro` + `JobCard.astro`

```astro
---
// src/components/sections/JobCard.astro
import { formatYears, isCurrent } from '@/lib/format';
import type { Job } from '@/types/site';

interface Props {
  job: Job;
}

const { job } = Astro.props;
---
<article class="job">
  <div class="job__years label muted">{formatYears(job)}</div>
  <div class="job__body stack" style={{ '--stack-gap': '6px' }}>
    <div class="job__title">
      <h3 class="display job__org">{job.org}</h3>
      {isCurrent(job) && <span class="job__badge label label--caps">Now</span>}
    </div>
    <div class="job__role">{job.role}</div>
    <p class="job__blurb muted">{job.blurb}</p>
  </div>
</article>

<style>
  .job {
    display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px 40px;
    padding: 28px 0; border-top: var(--border-width) solid var(--line);
  }
  .job__years { flex: 0 0 170px; }
  .job__body { flex: 1 1 420px; min-width: 0; }
  .job__title { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
  .job__org { font-size: var(--fs-job-org); line-height: 1; }
  .job__badge {
    font-size: var(--fs-label-sm); letter-spacing: .1em;
    padding: 4px 10px; border-radius: 6px;
    background: var(--accent); color: var(--bg);
  }
  .job__role { font-weight: 700; }
  .job__blurb { margin: 0; max-width: 660px; }
</style>
```

```astro
---
// src/components/sections/Experience.astro
import Section from '@/components/ui/Section.astro';
import JobCard from './JobCard.astro';
import type { Job } from '@/types/site';

interface Props {
  jobs: Job[];
}

const { jobs } = Astro.props;
---
<Section id="experience" class="stack">
  <h2 class="display h2">Experience</h2>
  {jobs.map((job) => <JobCard job={job} />)}
</Section>
```

Note the "Now" badge is **derived** (`isCurrent(job)`), not stored, so it can never disagree with "Present".

### 8.6 `PoolTable.astro`: data-driven drawing

The ball positions and colours move from repeated inline `style` attributes into a typed array. That array is **local to the component** because it is presentation, not content.

```astro
---
// src/components/sections/PoolTable.astro
interface Ball {
  /** Matches the .ball--{id} animation class. */
  id: 'cue' | '1' | '2' | '3' | '4' | 'eight' | '6';
  left: string;   // % of the felt
  top: string;
  colour?: string; // the eight ball is drawn by CSS instead
}

// The rack apex sits at 62% across.
const balls: Ball[] = [
  { id: 'cue',   left: '22.75%', top: '45.5%', colour: '#F6F4EE' },
  { id: '1',     left: '59.75%', top: '45.5%', colour: '#F4C542' },
  { id: '2',     left: '63.65%', top: '41%',   colour: '#2F5BEA' },
  { id: '3',     left: '63.65%', top: '50%',   colour: '#E5484D' },
  { id: '4',     left: '67.55%', top: '36.5%', colour: '#7E4FD0' },
  { id: 'eight', left: '67.55%', top: '45.5%' },
  { id: '6',     left: '67.55%', top: '54.5%', colour: '#FF7A1A' },
];

const pockets = [
  { left: '0',    top: '0' },    { left: '50%', top: '-1%' },  { left: '100%', top: '0' },
  { left: '0',    top: '100%' }, { left: '50%', top: '101%' }, { left: '100%', top: '100%' },
];
---
<div class="pool" data-pool aria-hidden="true">
  <div class="pool__felt">
    {pockets.map((p) => <span class="pool__pocket" style={p}></span>)}
    <span class="pool__headstring"></span>
    <span class="pool__cue"></span>
    {balls.map(({ id, left, top, colour }) => (
      <span class={`ball ball--${id}`} style={{ left, top, '--c': colour }}></span>
    ))}
  </div>
</div>

<style>
  /* Copy the .pool*, .ball* rules and the pb-* keyframes from the prototype unchanged. */
</style>

<script>
  import { inView } from 'motion';

  const pool = document.querySelector<HTMLElement>('[data-pool]');

  if (pool) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pool.classList.add('is-playing'); // CSS turns the animation off anyway
    } else {
      // Play the break shot only while at least half the table is on screen.
      inView(pool, () => {
        pool.classList.add('is-playing');
        return () => pool.classList.remove('is-playing');
      }, { amount: 0.5 });
    }
  }
</script>
```

`'--c': undefined` for the eight ball is fine: Astro drops empty and undefined style values.

### 8.7 `OffTheClock.astro` + `PhotoCard.astro`

```astro
---
// src/components/sections/PhotoCard.astro
import { Image } from 'astro:assets';
import Placeholder from '@/components/ui/Placeholder.astro';
import type { Photo } from '@/types/site';

interface Props {
  photo: Photo;
}

const { photo } = Astro.props;
---
<figure class="photo">
  {photo.image ? (
    <Image
      class="photo__img"
      src={photo.image}
      alt={photo.alt}
      widths={[400, 800, 1200]}
      sizes="(min-width: 900px) 33vw, 100vw"
    />
  ) : (
    <Placeholder class="photo__img">Photo: {photo.caption}</Placeholder>
  )}
  <figcaption class="display">{photo.caption}</figcaption>
</figure>

<style>
  .photo { flex: 1 1 280px; min-width: 0; margin: 0; background: var(--surface); border-radius: var(--radius-md); overflow: hidden; }
  .photo__img { width: 100%; height: auto; aspect-ratio: 4 / 3; object-fit: cover; border-bottom: var(--border-width) dashed var(--line); }
  figcaption { padding: 18px 22px; font-size: 28px; line-height: 1; }
</style>
```

Both `<Image>` and our `<Placeholder>` spread their remaining props, so `.photo__img` (scoped to `PhotoCard`) styles them correctly (§6.3).

`OffTheClock.astro` takes `content: LifeContent` and renders a `<Section id="life" class="stack">` containing the heading row, `<PoolTable />`, and a `.photos` flex row of `<PhotoCard>`s.

### 8.8 `Contact.astro` + `SiteFooter.astro`

This shows a parent re-theming child components **through custom properties**:

```astro
---
// src/components/sections/Contact.astro
import Section from '@/components/ui/Section.astro';
import Button from '@/components/ui/Button.astro';
import SiteFooter from './SiteFooter.astro';
import type { ContactContent } from '@/types/site';

interface Props {
  content: ContactContent;
  domain: string;
}

const { content, domain } = Astro.props;
---
<Section id="contact" class="contact">
  <div class="contact__card stack" style={{ '--stack-gap': '28px' }}>
    <h2 class="display contact__title">{content.heading}</h2>
    <div class="cluster">
      {content.links.map(({ label, href, variant }) => <Button href={href} variant={variant}>{label}</Button>)}
    </div>
  </div>
  <SiteFooter domain={domain} />
</Section>

<style>
  .contact { padding-bottom: 48px; }
  .contact__card {
    /* Every outline button inside the card gets a dark border. This inherits into Button. */
    --btn-border: var(--bg);
    background: var(--accent); color: var(--bg);
    border-radius: var(--radius-lg);
    padding: clamp(32px, 6vw, 72px);
  }
  .contact__title { font-size: var(--fs-contact); }
</style>
```

```astro
---
// src/components/sections/SiteFooter.astro
interface Props {
  domain: string;
}

const { domain } = Astro.props;
const year = new Date().getFullYear(); // evaluated at BUILD time, so rebuild yearly
---
<footer class="footer label muted">
  <span>© {year} Matthew Killeen</span>
  <span>{domain}</span>
</footer>

<style>
  .footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; padding-top: 28px; font-size: 13px; }
</style>
```

---

## 9. Phase 7: Client-side TypeScript (Motion)

How `<script>` works in Astro:

- A plain `<script>` in an `.astro` file is **processed**: TypeScript is compiled, `import`s from npm (`motion`) are bundled, and the output is a `type="module"` file. **TypeScript works directly; no `.js` needed.**
- It runs **once per page**, even if the component appears several times. Use `querySelectorAll` if a component can repeat.
- **Co-locate** the script with the component it animates (Hero's script in `Hero.astro`, the pool's in `PoolTable.astro`), so deleting a component deletes its behaviour.
- `<script is:inline>` skips processing. Avoid it except for tiny snippets that must run before paint.
- Use typed queries: `document.querySelector<HTMLElement>(...)` returns `HTMLElement | null`, and strict mode makes you handle `null`.

**Optional polish (after launch):** the hero name can briefly flash at its final position before Motion moves it. If you notice this, hide the hero lines with CSS only when JS is running, e.g. by adding `document.documentElement.classList.add('js')` in a small `<script is:inline>` in `<head>`, and gating the start state on `.js .hero__line > span`.

---

## 10. Phase 8: Compose the page (`src/pages/index.astro`)

```astro
---
// src/pages/index.astro
import BaseLayout from '@/layouts/BaseLayout.astro';
import SiteHeader from '@/components/sections/SiteHeader.astro';
import Hero from '@/components/sections/Hero.astro';
import Ticker from '@/components/sections/Ticker.astro';
import About from '@/components/sections/About.astro';
import Experience from '@/components/sections/Experience.astro';
import OffTheClock from '@/components/sections/OffTheClock.astro';
import Contact from '@/components/sections/Contact.astro';

import { site } from '@/data/site';
import { hero, about, ticker } from '@/data/profile';
import { jobs } from '@/data/experience';
import { life } from '@/data/life';
import { contact } from '@/data/contact';
---
<BaseLayout>
  <SiteHeader domain={site.domain} nav={site.nav} />
  <main>
    <Hero content={hero} />
    <Ticker items={ticker} />
    <About content={about} />
    <Experience jobs={jobs} />
    <OffTheClock content={life} />
    <Contact content={contact} domain={site.domain} />
  </main>
</BaseLayout>
```

The whole page reads like a table of contents. Reordering sections means moving one line.

---

## 11. Phase 9: Images and static files

| File | Goes in | Why |
|---|---|---|
| Portrait, Cooper, guitar, pool photos | `src/assets/photos/` | Imported, so Astro resizes them and outputs WebP/AVIF with width/height (no layout shift) |
| `resume.pdf` | `public/resume.pdf` | Must keep a stable URL (`/resume.pdf`). Copy it from v1's `src/assets/current-resume-matthew-killeen.pdf`. The old URL is redirected in §12.3 |
| `favicon.svg` | `public/` (already there) | Stable URL |

Delete the starter's `src/assets/astro.svg` and `src/assets/background.svg`.

---

## 12. Phase 10: Deploy to Netlify and replace v1

### 12.1 How v1 is set up today (checked 2026-10-10)

| What | Finding | What it means for v2 |
|---|---|---|
| Host | Netlify (`Server: Netlify`), deployed from `github.com/Programbeginner2120/personal-website` (`main`) | v2 also deploys from GitHub to Netlify |
| Build | Angular 20 with SSR/prerender through `@netlify/angular-runtime`. **No `netlify.toml`**, so build settings live in the Netlify UI | v2 is a different kind of build. Give it its own site and keep its settings in a `netlify.toml` checked into the repo |
| DNS | **Netlify DNS** (nameservers `dns1–4.p03.nsone.net`) | The domain can be moved between Netlify sites without touching a registrar |
| DNS records to keep | TXT `v=spf1 include:amazonses.com ~all` (Amazon SES email). No MX records | This record must **survive the cutover** (§12.5, steps 7 and 11) |
| Canonical host | `www.` and `http://` both **301 → `https://matthewrkilleen.com/`**. HSTS is on | Same in v2. Netlify does this automatically when `www` is an alias of the primary domain |
| URLs that exist today | `/`, `/main-page/`, `/photos/`, `/assets/current-resume-matthew-killeen.pdf`, `/favicon.ico`, plus `/assets/website-data/*.json` (v1's runtime data) | The first four may be linked from your résumé, LinkedIn or search results, so **redirect** them (§12.3). The JSON files can simply 404 |
| SEO basics | `<title>PersonalWebsite</title>`, no meta description, no `robots.txt`, no `sitemap.xml` | v2 improves all of these (§7, §12.4) |

### 12.2 Strategy: new site, then move the domain

**Recommended: create a new Netlify site for v2 and move the custom domain to it once v2 is ready.**

```
 today                        build & review                    cutover (≈5–15 min)
 ─────                        ──────────────                    ───────────────────
 matthewrkilleen.com ─► v1    v2 repo ─► v2 site                matthewrkilleen.com ─► v2
                              (mrk-v2.netlify.app, private      v1 site still exists at its
                               to you until cutover)            *.netlify.app URL = rollback
```

Why this approach:

- **v1 keeps running untouched** while you build v2, and remains a working rollback for as long as you keep the old site.
- **Clean build settings.** The v1 site is set up for the Angular SSR runtime (plugin, server functions, UI build command). Reusing that site for a static Astro build means removing all of it by hand, and anything you miss can break the build.
- **Every push to v2 gets a real URL.** `main` deploys to the v2 site's `*.netlify.app` address, and pull requests get Deploy Previews, all before anyone visiting the domain sees v2.

*Alternative considered:* re-link the existing v1 site to the new repo. It avoids the few minutes of HTTPS re-provisioning, but you would have to strip the Angular runtime settings, and rolling back means re-publishing an old Angular deploy. It's not worth it for a personal site.

**No adapter is needed.** Astro builds a fully static site by default (`dist/`). The `@astrojs/netlify` adapter only matters for server-rendered (on-demand) pages, which this site doesn't have.

### 12.3 `netlify.toml`

Commit this at the repo root. Settings in this file **override** the Netlify UI, so the repo is the single source of truth.

```toml
# netlify.toml

[build]
  command = "npm run build"   # = astro check && astro build (§13, task 2)
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"         # package.json requires node >= 22.12.0

# ---------- Keep v1 URLs working (301 = permanent, tells Google to update) ----------

[[redirects]]
  from = "/main-page"
  to = "/"
  status = 301

[[redirects]]
  from = "/main-page/*"
  to = "/"
  status = 301

[[redirects]]
  from = "/photos"
  to = "/#life"
  status = 301

[[redirects]]
  from = "/photos/*"
  to = "/#life"
  status = 301

[[redirects]]
  from = "/assets/current-resume-matthew-killeen.pdf"
  to = "/resume.pdf"
  status = 301

# ---------- Caching ----------
# Astro puts hashed, never-changing files (JS, CSS, fonts, optimised images) in /_astro/.
# The file name changes whenever the content changes, so browsers can cache them forever.
[[headers]]
  for = "/_astro/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

You don't need redirects for `www` or `http`. Netlify handles both once the domain is attached (§12.5).

### 12.4 Files that matter once v2 replaces a live site

**`src/pages/404.astro`.** Netlify automatically serves `dist/404.html`, with a real 404 status, for any URL that doesn't exist.

```astro
---
// src/pages/404.astro
import BaseLayout from '@/layouts/BaseLayout.astro';
import Button from '@/components/ui/Button.astro';
---
<BaseLayout title="Not found" noindex>
  <main class="wrap section stack">
    <h1 class="display h2">Scratch.</h1>
    <p class="muted">That page isn't on the table any more.</p>
    <div class="cluster">
      <Button href="/" variant="primary">Back to the homepage</Button>
    </div>
  </main>
</BaseLayout>
```

**Sitemap.** Run `npx astro add sitemap`. It installs `@astrojs/sitemap` and asks before editing the config; compare the result with §3.4. The sitemap uses `site` to build absolute URLs, which is why `site` must be the production domain.

**`public/robots.txt`:**

```
User-agent: *
Allow: /

Sitemap: https://matthewrkilleen.com/sitemap-index.xml
```

### 12.5 Cutover runbook

> **Superseded by [Plan 02: Host v2 on Netlify](./2026-10-10_02_netlify-hosting-plan.md)**, which has the up-to-date, step-by-step version. It reflects the résumé rename, the generated icons, and tested check scripts. This section is kept for history.

**A. Set up the v2 repo and site (any time, no impact on v1)**

1. On GitHub, create an **empty** repo `Programbeginner2120/personal-website-v2`, with no README, so the first push doesn't conflict.
2. Push v2:
   ```powershell
   git remote add origin git@github.com:Programbeginner2120/personal-website-v2.git
   git push -u origin main
   ```
3. In Netlify: **Add new project → Import an existing project → GitHub → `personal-website-v2`.** (Netlify now calls sites "projects" in its UI.) Netlify reads `netlify.toml`, so leave the build fields at their detected values. Rename the project to something recognisable, e.g. `mrk-v2` → `https://mrk-v2.netlify.app`.
4. Work on branches and open PRs. Each PR gets a **Deploy Preview** URL to review before merging.

**B. Pre-cutover checks (on the `*.netlify.app` URL)**

5. Run every item in Phase 9 of the checklist (§13) against the Netlify URL, not just `localhost`.
6. Check the redirects on the v2 URL (use `curl.exe` in PowerShell, because plain `curl` is an alias for `Invoke-WebRequest` in Windows PowerShell 5.1):
   ```powershell
   $v2 = 'https://mrk-v2.netlify.app'
   foreach ($p in '/main-page', '/main-page/', '/photos/', '/assets/current-resume-matthew-killeen.pdf', '/nope') {
     "== $p"; curl.exe -sI "$v2$p" | Select-String '^(HTTP|Location|location)'
   }
   ```
   Expect a `301` with the right `Location` for the first four, and a `404` for `/nope`.

**C. Cutover (pick a quiet time; expect 5–15 minutes of possible HTTPS warnings)**

7. In the **v1** project, under **Domain management**, write down (or screenshot) the **DNS records** for `matthewrkilleen.com`, especially the Amazon SES SPF TXT record.
8. Still in v1's **Domain management**, **remove** `matthewrkilleen.com` and `www.matthewrkilleen.com`. Netlify won't attach a domain to two projects at once.
9. In the **v2** project, under **Domain management → Add a domain**, add `matthewrkilleen.com` and set it as the **primary domain**. Because the DNS zone already lives in Netlify DNS, Netlify points the records at v2 itself and adds `www` as an alias.
10. Wait for **HTTPS** to show an active Let's Encrypt certificate. If it hasn't appeared after ~15 minutes, use **Verify DNS configuration / Provision certificate** on the HTTPS panel.
11. Check the DNS records match step 7, especially the SPF TXT record. Re-add anything missing.

**D. Post-cutover verification**

12. Run the same checks against production:
    ```powershell
    $prod = 'https://matthewrkilleen.com'
    foreach ($u in "$prod/", 'https://www.matthewrkilleen.com/', 'http://matthewrkilleen.com/',
                   "$prod/main-page/", "$prod/photos/", "$prod/assets/current-resume-matthew-killeen.pdf",
                   "$prod/resume.pdf", "$prod/sitemap-index.xml", "$prod/robots.txt", "$prod/nope") {
      "== $u"; curl.exe -sI $u | Select-String '^(HTTP|Location|location|Server)'
    }
    ```
    Expect `200` on `/`, `/resume.pdf`, the sitemap and `robots.txt`; `301 → https://matthewrkilleen.com/` for `www` and `http`; `301`s to the new URLs for the v1 paths; and `404` for `/nope`.
13. Open the site on your phone over mobile data, not Wi-Fi, to rule out a locally cached DNS answer.
14. *(Optional)* If the domain is verified in Google Search Console, submit `sitemap-index.xml` there.

**E. Rollback (if something is badly wrong)**

15. Remove the domain from v2 and re-add it to v1 (steps 8–9 in reverse). v1's last production deploy serves again once its certificate is reissued. No code changes are needed.

**F. Decommission v1 (2–4 weeks after a clean cutover)**

16. In the v1 project, **stop builds** so a stray push can't redeploy it. Delete the project once you're sure you won't roll back.
17. On GitHub, **archive** `personal-website` (read-only, still viewable) and update its README to point at v2.

---

## 13. Enumerated task checklist

### Phase 0: Setup
1. [x] `npm install -D @astrojs/check typescript`
2. [x] Add scripts to `package.json`: `"check": "astro check"` and change `"build"` to `"astro check && astro build"`, so type errors fail the build.
3. [x] Rename `astro.config.mjs` → `astro.config.ts`; add `site` (§3.4).
4. [x] `npx astro add sitemap`, then add the `/styleguide` filter (§3.4, §12.4).
5. [x] Add the `@/*` path alias to `tsconfig.json` (§6.1).
6. [x] Delete `src/components/Welcome.astro`, `src/layouts/Layout.astro`, `src/assets/astro.svg`, `src/assets/background.svg`.
7. [ ] Create the empty GitHub repo `personal-website-v2`, push, and import it as a new Netlify project (§12.5 A, steps 1–3). From here on, every push deploys to the `*.netlify.app` URL.
8. [ ] Commit `netlify.toml` (§12.3).

### Phase 1: Style guide
9. [x] Create `src/styles/tokens.css` (§3.2).
10. [x] Create `src/styles/global.css` with layers and utilities (§3.3).
11. [x] Configure the three fonts in `astro.config.ts` (§3.4).

### Phase 2–3: Types and data
12. [x] Create `src/types/site.ts` (§4).
13. [x] Create `src/data/site.ts`, `profile.ts`, `experience.ts`, `life.ts`, `contact.ts` (§5.3).
14. [ ] Fill in the `[Year]` / `[Your title]` placeholders for JPMorgan Chase.

### Phase 4: Primitives
15. [x] `src/lib/format.ts` (§6.2)
16. [x] `Button`, `ChipList`, `Placeholder`, `Section` in `src/components/ui/` (§6.4–6.7)

### Phase 5: Layout
17. [x] `src/layouts/BaseLayout.astro` (§7)
18. [x] `src/pages/styleguide.astro` (§3.5). Check it in both themes.

### Phase 6–7: Sections and motion
19. [x] `SiteHeader` (§8.1)
20. [x] `Hero` + `Orbit` (§8.2), including the hero Motion script
21. [x] `Ticker` (§8.3)
22. [x] `About` (§8.4)
23. [x] `JobCard` + `Experience` (§8.5)
24. [x] `PoolTable` (§8.6), including the `inView` script
25. [x] `PhotoCard` + `OffTheClock` (§8.7)
26. [x] `Contact` + `SiteFooter` (§8.8)

### Phase 8: Pages and static files
27. [x] Rewrite `src/pages/index.astro` (§10).
28. [x] Create `src/pages/404.astro` and `public/robots.txt` (§12.4).
29. [ ] Add real photos, and copy v1's résumé to `public/resume.pdf` (§11).

### Phase 9: Verify
30. [x] `astro dev --background`, then compare the page side by side with `prototypes/bold-template.html` at 375px, 768px and 1440px widths. (Stop the server with `astro dev stop`.)
31. [x] `npm run check` reports **0 errors, 0 warnings**.
32. [ ] `npm run build && npm run preview`. The production build matches dev.
33. [x] With **reduced motion** turned on in the OS, nothing animates and all content is visible.
34. [x] No horizontal scroll at 320px width (the orbit is clipped).
35. [ ] Keyboard: Tab through the nav and buttons, and focus is visible on every link.
36. [ ] Lighthouse run on the **`*.netlify.app` deploy**: aim for ≥ 95 on Performance, Accessibility, Best Practices and SEO.
37. [x] Check the built HTML (`dist/index.html`): all personal content is present as text, and the only JS is the Motion bundle.
38. [ ] The redirect checks pass on the `*.netlify.app` URL (§12.5 B, step 6).

### Phase 10: Go live
39. [ ] Save a copy of the DNS records, then move the domain from the v1 project to the v2 project (§12.5 C, steps 7–11).
40. [ ] The production checks pass (§12.5 D, steps 12–13).
41. [ ] 2–4 weeks later: stop builds on v1, delete the v1 project, and archive the v1 repo (§12.5 F).

---

## 14. Gotchas for Astro newcomers

1. **The frontmatter runs at build time, not in the browser.** `window` and `document` don't exist there. Browser code goes in `<script>`.
2. **Scoped styles don't reach into child components** unless the child spreads `...rest` (§6.3). For one-off cases use `:global(.child-class)` inside a parent selector, e.g. `.about :global(.chips)`.
3. **`class` is a reserved word**, so destructure it as `class: className`.
4. **`{items.map(...)}` needs no `key`**, unlike React. The output is static HTML.
5. **`public/` files aren't processed or type-checked.** Don't put data there to `fetch` (that's the v1 pattern; see §5.2).
6. **`@keyframes` names are global** even inside a scoped `<style>`, so keep them unique (`pb-cue`, `marquee`, `blink`…).
7. **Restart the dev server after editing `astro.config.ts`**, e.g. after adding fonts. Component and CSS edits hot-reload.
8. **Run `astro check`, not just `tsc`.** `tsc` can't read `.astro` files.

---

## 15. Out of scope (candidates for later plans)

- Theme switcher UI (green/blue toggle stored in `localStorage`). The token structure already supports it.
- Projects section or blog, which is the point to adopt **content collections** (§5.4).
- `/resume` HTML page generated from the same `src/data/experience.ts`.
- Open Graph image and social meta tags.
- Separate CI beyond Netlify's own build (e.g. GitHub Actions running `npm run check` on every PR). Netlify's build already fails on type errors, because `build` runs `astro check` first.
- Netlify extras: analytics, form handling, and security headers (CSP, etc.).
- Unit tests for `src/lib/` with Vitest.
