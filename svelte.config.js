import adapter from "@sveltejs/adapter-cloudflare";

export default {
  kit: {
    adapter: adapter({
      // See below for an explanation of these options
      config: "./wrangler.toml",
      platformProxy: {
        configPath: undefined,
        environment: undefined,
        persist: undefined,
      },
      fallback: "plaintext",
      routes: {
        include: ["/*"],
        exclude: ["<all>"],
      },
    }),
  },
};
