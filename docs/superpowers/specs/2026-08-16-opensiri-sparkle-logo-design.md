# OpenSiri Sparkle Logo Design

## Goal

Replace the existing speech-bubble and waveform mark with a simpler five-point
sparkle that remains recognizable in the website header, favicon, presentation,
and social card.

## Approved Direction

- Use one rounded, vertically biased five-point sparkle as the only symbol.
- Do not use a containing circle, speech bubble, waveform, letter, notch,
  internal subpath, or secondary sparkle.
- Keep `OpenSiri` as a separate typographic wordmark rather than baking text into
  the symbol.
- Preserve generous negative space so the mark remains legible at 16–24 px.

## Color Version

The color version uses an Apple Intelligence and classic Siri-inspired spectrum:
cyan, electric blue, indigo, violet, magenta, coral, and a restrained warm-orange
highlight. It must not reuse the current flat blue and mint accent pairing.

The standalone SVG has a polished static multi-stop gradient. On the website the
same shape is used as a mask over a larger animated gradient field, producing a
slow, premium color drift rather than a fast rainbow spin. Animation must stop
under `prefers-reduced-motion: reduce`.

## Monochrome Version

The monochrome SVG contains only the sparkle geometry and uses `currentColor`.
It must work as pure black on light backgrounds and pure white on dark
backgrounds without gray, transparency, glow, or gradient effects.

## Website Integration

- Use the color mark in the header and favicon metadata.
- Use the monochrome mark in the dark footer/open-source surface and wherever
  color would reduce contrast.
- Replace the old logo in the privacy illustration.
- Replace the current flat blue/mint identity accents with a controlled Siri
  spectrum: indigo remains the primary readable accent, while cyan, magenta, and
  orange are reserved for gradients and small status details.
- Update the Open Graph card so it does not retain the superseded bubble logo.

## Deliverables

- `website/public/opensiri-logo-color.svg`
- `website/public/opensiri-logo-mono.svg`
- `website/public/opensiri-logo-color-v2.png`
- `website/public/opensiri-logo-monochrome-v2.png`
- `website/public/favicon.svg`
- `website/public/og.png`
- Updated website references, styles, and branding tests

## Acceptance Criteria

1. Both SVGs share the same sparkle silhouette and a `0 0 64 64` view box.
2. The color asset contains the approved Siri spectrum and no flat blue/mint
   identity pairing.
3. The monochrome asset uses `currentColor` and contains no gradient.
4. No page or metadata reference still points to `opensiri-logo.png`.
5. Logo motion is subtle and disabled for reduced-motion users.
6. `npm run lint`, `npm run test`, raster asset inspection, and Open Graph card
   inspection pass. A desktop/mobile browser spot check is attempted; an
   environment-level local-URL policy blocker is recorded rather than bypassed.
