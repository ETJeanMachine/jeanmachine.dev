import adapter from '@sveltejs/adapter-cloudflare-workers';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      // See below for an explanation of these options
      config: './wrangler.toml',
    }),
  },
};

export default config;
