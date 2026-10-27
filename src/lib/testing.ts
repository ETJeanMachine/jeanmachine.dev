// Test-only helpers; deliberately not exported from the runtime barrel.
// @ts-ignore Bun supplies test/runtime modules without app-wide ambient types.
import { afterEach, spyOn } from 'bun:test';
// @ts-ignore Bun provides its build/file APIs for isolated module compilation.
import { build, file, resolveSync } from 'bun';
import type { TestBuildHooks } from './blog/testing';

interface IsolatedModuleOptions {
  virtual: Record<string, string>;
  define?: Record<string, string>;
  transform?: (source: string) => string;
  plugins?: { name: string; setup(hooks: TestBuildHooks): void }[];
}

// Virtual modules belong to this build, never Bun's global mock.module registry.
export async function isolatedModule(
  entrypoint: URL,
  { virtual, define, transform, plugins = [] }: IsolatedModuleOptions,
) {
  const result = await build({
    entrypoints: [entrypoint.pathname],
    target: 'bun',
    external: ['svelte', 'svelte/*', '@sveltejs/kit'],
    minify: { syntax: true },
    define,
    plugins: [
      {
        name: 'isolated-test-modules',
        setup(hooks: TestBuildHooks) {
          hooks.onResolve({ filter: /.*/ }, ({ path }) => {
            if (Object.hasOwn(virtual, path))
              return { path, namespace: 'test-virtual' };
            if (path === '$lib' || path.startsWith('$lib/'))
              return {
                path: resolveSync(
                  `./${path === '$lib' ? 'index' : path.slice(5)}`,
                  new URL('.', import.meta.url).pathname,
                ),
              };
          });
          hooks.onLoad(
            { filter: /.*/, namespace: 'test-virtual' },
            ({ path }) => ({ contents: virtual[path], loader: 'js' }),
          );
          if (transform)
            hooks.onLoad(
              {
                filter: new RegExp(
                  `^${entrypoint.pathname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
                ),
              },
              async ({ path }) => ({
                contents: transform(await file(path).text()),
                loader: 'ts',
              }),
            );
        },
      },
      ...plugins,
    ],
  });
  if (!result.success) throw new Error(String(result.logs));
  const code = (await result.outputs[0].text()).replace(
    /(['"])(svelte(?:\/[^'"]*)?|@sveltejs\/kit)\1/g,
    (_match: string, _quote: string, specifier: string) =>
      JSON.stringify(import.meta.resolve(specifier)),
  );
  const url = URL.createObjectURL(
    new Blob([code], { type: 'text/javascript' }),
  );
  try {
    return { code, module: await import(url) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Register cleanup in the calling suite, and restore before replacing a spy in loops.
export function useFetchMock() {
  let restore = () => {};
  afterEach(() => restore());
  return (
    respond: (url: string, init?: RequestInit) => Response | Promise<Response>,
  ) => {
    restore();
    const mock = spyOn(globalThis, 'fetch').mockImplementation(
      async (input: string | URL | Request, init?: RequestInit) =>
        respond(input instanceof Request ? input.url : String(input), init),
    );
    restore = () => mock.mockRestore();
    return mock;
  };
}
