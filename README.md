# jeanmachine.dev

This is a repository for my [personal website](https://jeanmachine.dev), and it is powered by Svelte. To be able to run this project, or to make a Svelte project of your own, check out [`sv`](https://github.com/sveltejs/cli).

## Developing

This project uses bun as a JS/TS runtime, which you can install by running `npm install -g bun`.

Once you've created a project and installed dependencies with `bun install`, start a development server:

```bash
bun run dev

# or start the server and open the app in a new browser tab
bun run dev --open
```

## External video

External videos share the blog's translucent card frame and stay click-to-load:
no provider iframe, thumbnail, API or script is requested before consent. Only
exact HTTPS YouTube privacy-enhanced and Vimeo player URLs are embedded. Loading
shares your IP and site origin (not the article path/query), allows provider
storage, and grants only scripts, same-origin execution and presentation inside
the sandbox. No autoplay is added. YouTube uses responsive 16:9 sizing with a
200px minimum height; Vimeo retains authored heights within responsive limits.
A watch link remains available without JavaScript or if playback fails.
`/blog/example` includes Rick Astley's “Never Gonna Give You Up” official video.

## Building

To create a production version of this app:

```bash
bun run build
```

You can preview the production build with `bun preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
