# Noto Color Emoji

`Noto-COLRv1.b8e25ea6.ttf` is the unmodified official Google Noto Color Emoji
COLRv1 font, self-hosted under the SIL Open Font License 1.1. The embedded
copyright is **Copyright 2022 Google Inc.**; `LICENSE.txt` is the unmodified
upstream license.

- Source: [googlefonts/noto-emoji, `2D/fonts/Noto-COLRv1.ttf`](https://github.com/googlefonts/noto-emoji/blob/1ffdd21391dd1f25c081fa93a9dea0c7c029442b/2D/fonts/Noto-COLRv1.ttf)
- Upstream commit: `1ffdd21391dd1f25c081fa93a9dea0c7c029442b`
- Font version: `2.057` (Emoji 18)
- SHA-256: `b8e25ea68db82f9e4d0aee921f4420be2be39887bd5c893a2ad98710531f9d0c`
- Size: 5,038,236 bytes
- License source: [`2D/fonts/LICENSE` at the same commit](https://github.com/googlefonts/noto-emoji/blob/1ffdd21391dd1f25c081fa93a9dea0c7c029442b/2D/fonts/LICENSE)

## Why the upstream TTF

Fontsource Noto Color Emoji 5.3.2's WOFF2 subsets loaded and were reported as
selected by Chromium, but painted no pixels in headful macOS Helium 155 and
Chrome 156. Disabling the GPU did not resolve this. The package's WOFF fallback
and this upstream TTF both painted correctly; the exact WOFF2 conversion or
renderer incompatibility was not isolated.

The TTF passed screenshot-pixel checks at 16px for 🦋 ❤️ ☕️ 🏳️‍⚧️ 🇺🇸 👩🏽‍💻 1️⃣ ©️ ↔️
in regular, bold, italic, and dynamically inserted text, in light and dark
schemes. Keep Maple Mono first and `font-variant-emoji: normal` so ordinary
letters, digits, and punctuation retain the text font. Explicit selectors and
sequences remain native Unicode. CSS declares `tech(color-COLRv1)` so browsers
without that technology can skip this font and use platform fallback.

When updating, verify actual colored glyph painting, not just successful font
loads or DevTools font names. Update the hash-bearing filename, CSS reference,
and integrity test together; retain the corresponding upstream license.
