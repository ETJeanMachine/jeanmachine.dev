# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal website built with **SvelteKit 5**, deployed to **Cloudflare Workers** via `@sveltejs/adapter-cloudflare`. Integrates with **AT Protocol** (Bluesky) to display profile info, pinned posts, and blog content from a Personal Data Server (PDS).

## Runtime & Package Manager

- **Runtime**: Bun (not Node.js) — always use `bun` instead of `npm`/`yarn`

## Development Commands

```bash
bun install       # Install dependencies
bun dev           # Start dev server
bun check         # Type check
bun build         # Production build
bun preview       # Preview production build
```

## Architecture

### Theming

Colors come from **Catppuccin** (Latte for light, Frappe for dark) defined as CSS custom properties in `src/index.css` using `light-dark()`. Available variables: `--base`, `--mantle`, `--crust`, `--surface`, `--overlay`, `--subtext`, `--text`, `--sapphire`, `--sky`. Do not use hardcoded colors — always use these variables. The background GIF is set as a fixed pseudo-element on `html::before`.

### AT Protocol Integration

All AT Protocol requests proxy through SvelteKit API routes to avoid CORS:

- **`/api/atproto/record`** — `com.atproto.repo.getRecord` (collection + rkey params). `no-store` cache (records change).
- **`/api/atproto/blob`** — `com.atproto.sync.getBlob` (cid + mimetype params). 1-hour cache (blobs are content-addressed/immutable).
- **`/api/atproto/listRecords`** — lists records for a collection.
- **`/api/atproto/postview`** — fetches engagement counts for a post URI.
- **`/api/meta-image`** — returns the publication icon as the OG meta image.

Configuration in `src/lib/constants.ts`: PDS URL, DID, handle, `PUB_RKEY`, social links, personal info.

### Publication System (`site.standard` lexicon)

`loadPublication()` in `src/lib/index.ts` fetches a `site.standard.publication` record. The publication object is set via `setContext('publication', ...)` in the root layout and consumed with `getContext` in components. Key fields used: `publication.icon` (avatar blob), `publication.url` (base URL for blog links). Blog documents use the `site.standard.document` collection; document links are constructed as `publication.url + doc.path`.

Types come from `@atcute/standard-site` (`SiteStandardPublication`, `SiteStandardDocument`). Blob URLs are built with `blobUri()` from `src/lib/index.ts`.

### Svelte 5 Runes

Use runes throughout — no legacy reactivity:
- `$state`, `$derived`, `$effect`, `$props()`
- Context getters: `setContext('key', { get value() { return reactiveVar } })`

### Responsive Layout

- **Desktop** (≥1100px on homepage, ≥769px elsewhere): two-column layout, top nav bar
- **Mobile** (<1100px on homepage): single column, fixed bottom nav
- Homepage uses separate `<div class="desktop-layout">` / `<div class="mobile-layout">` divs toggled via media query — not a single conditional render
- `Profile` component takes a `mobile` prop to switch between avatar placements
- The profile card uses `container-type: inline-size; container-name: profile-card` — Profile.svelte uses `@container profile-card (max-width: 28rem)` to switch to a compact inline avatar

### Async Data Pattern

All AT Protocol data is fetched client-side in `onMount`. Always guard renders with `{#if data}`.

## Deployment

- **Platform**: Cloudflare Workers
- **Config**: `wrangler.toml`
- **Build output**: `.svelte-kit/cloudflare/`
