# OpenSiri Sparkle Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the OpenSiri bubble/waveform identity with approved color and monochrome five-point sparkle assets and apply the new Siri-inspired spectrum across the website.

**Architecture:** Keep the logo as two deterministic SVG assets sharing one silhouette. The website uses the color SVG directly for portable/static contexts and a CSS mask of the same silhouette for the animated header mark; `currentColor` makes the monochrome asset reusable on either contrast surface. Existing React structure remains intact, with focused changes to branding references, design tokens, and tests.

**Tech Stack:** SVG, React 19, Next.js-compatible metadata, CSS, Node test runner, Sharp for deterministic social-card rendering.

## Global Constraints

- Preserve all unrelated staged and unstaged work.
- Do not stage, commit, or push without explicit user authorization.
- The symbol is one rounded five-point sparkle with no circle, speech bubble,
  waveform, letter, notch, internal subpath, secondary sparkle, or additional
  path.
- Color palette: cyan, electric blue, indigo, violet, magenta, coral, and restrained warm orange.
- Monochrome output uses only `currentColor` with no gradient, glow, or gray.
- Motion must be disabled under `prefers-reduced-motion: reduce`.

---

### Task 1: Lock the branding contract with tests

**Files:**
- Modify: `website/tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: server-rendered homepage HTML and files in `website/public/`
- Produces: assertions for `opensiri-logo-color.svg`, `opensiri-logo-mono.svg`, updated favicon metadata, and removal of `opensiri-logo.png` references

- [x] **Step 1: Replace old raster assertions with the new asset contract**

  Read both SVGs as UTF-8 and assert that they contain `viewBox="0 0 64 64"`.
  Assert that the color SVG contains a gradient and the monochrome SVG contains
  `currentColor` but no `Gradient` element.

- [x] **Step 2: Assert the rendered page and metadata use the new assets**

  Match `/opensiri-logo-color.svg` and `/favicon.svg` in rendered output, and add
  a negative assertion for `/opensiri-logo.png`.

- [x] **Step 3: Run the focused test and confirm the contract fails**

  Run: `cd website && node --test tests/rendered-html.test.mjs`

  Expected: FAIL because the new assets and references do not exist yet.

### Task 2: Create deterministic color and monochrome sparkle assets

**Files:**
- Create: `website/public/opensiri-logo-color.svg`
- Create: `website/public/opensiri-logo-mono.svg`
- Modify: `website/public/favicon.svg`

**Interfaces:**
- Consumes: approved `0 0 64 64` rounded five-point sparkle silhouette
- Produces: portable color logo, `currentColor` monochrome logo, and color favicon

- [x] **Step 1: Define the shared silhouette**

  Use the same single closed path in both logo SVGs. Keep the upper point
  longest, side points balanced, bottom points modest, and all joins rounded by
  Bézier geometry rather than stroke-line joins.

- [x] **Step 2: Add the static Siri-spectrum color treatment**

  Use a polished diagonal multi-stop gradient across the full Siri spectrum.
  Keep the SVG self-contained and omit filters that create fuzzy edges at 16 px.

- [x] **Step 3: Add the monochrome treatment**

  Fill the shared silhouette with `currentColor`; do not add `defs`, filters,
  opacity, or gradients.

- [x] **Step 4: Make the favicon use the color asset geometry**

  Keep the favicon self-contained so browsers do not depend on nested external
  SVG references.

- [x] **Step 5: Re-run the focused test**

  Run: `cd website && node --test tests/rendered-html.test.mjs`

  Expected: asset-shape assertions pass; page-reference assertions still fail.

### Task 3: Integrate the sparkle identity into the website

**Files:**
- Modify: `website/app/page.tsx`
- Modify: `website/app/layout.tsx`
- Modify: `website/app/globals.css`

**Interfaces:**
- Consumes: `/opensiri-logo-color.svg` and `/opensiri-logo-mono.svg`
- Produces: accessible header/privacy/footer marks, animated masked header mark, and new identity tokens

- [x] **Step 1: Replace image references in React and metadata**

  Change header and privacy references to the color SVG, dark-surface references
  to the monochrome SVG, and metadata icons to `/favicon.svg`.

- [x] **Step 2: Add a semantic logo wrapper**

  Use `.brand-mark` for the animated mask and preserve an empty alt string on
  decorative duplicate marks. Keep the visible `OPENSIRI` wordmark as text.

- [x] **Step 3: Replace flat identity tokens**

  Introduce readable indigo, violet, pink, cyan, and warm tokens plus one shared
  `--siri-gradient`. Replace flat-blue headings and states deliberately; keep
  body text and contrast-critical borders neutral.

- [x] **Step 4: Add subtle motion and reduced-motion behavior**

  Animate background position over 8–12 seconds with easing. Under
  `prefers-reduced-motion: reduce`, set animation to `none`.

- [x] **Step 5: Run lint and branding tests**

  Run: `cd website && npm run lint && npm run test`

  Expected: both commands exit 0.

### Task 4: Regenerate the social card and visually verify

**Files:**
- Modify: `website/public/og.png`

**Interfaces:**
- Consumes: the new color SVG and existing 1200 × 630 Open Graph composition
- Produces: a 1200 × 630 PNG without the superseded bubble/waveform mark

- [x] **Step 1: Render the updated card deterministically**

  Use the installed `sharp` package to composite the new color mark into the
  existing OpenSiri card layout and save the result at exactly 1200 × 630.

- [ ] **Step 2: Verify desktop rendering**

  Reload the local website and inspect the header, hero, privacy section, footer,
  and the gradient animation. Confirm there are no broken image requests or
  console errors.

  Status: attempted; the browser rejected the local preview URL under its
  security policy. Do not bypass the policy.

- [ ] **Step 3: Verify mobile rendering**

  Test a 390 px-wide viewport. Confirm the mark is crisp, the wordmark remains
  aligned, and no animated gradient causes overflow.

  Status: not runnable after the same local-URL browser policy rejection.

- [x] **Step 4: Run final verification**

  Run: `cd website && npm run lint && npm run test`

  Expected: both commands exit 0 and the branding test reports the color,
  monochrome, favicon, and social-card assets present.
