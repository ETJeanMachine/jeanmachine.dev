// Test-only Bun loader; deliberately not exported from the runtime barrel.
// @ts-ignore Bun provides its file API without app-wide ambient types.
import { file } from 'bun';
import { compile } from 'svelte/compiler';

export interface TestBuildHooks {
  onResolve(
    options: { filter: RegExp },
    callback: (args: {
      path: string;
    }) => { path: string; namespace?: string } | undefined,
  ): void;
  onLoad(
    options: { filter: RegExp; namespace?: string },
    callback: (args: {
      path: string;
    }) =>
      | Promise<{ contents: string; loader: string }>
      | { contents: string; loader: string },
  ): void;
}

export function svelteSSR(filter = /\.(svelte|css)$/) {
  return {
    name: 'blog-ssr-tests',
    setup(hooks: Pick<TestBuildHooks, 'onLoad'>) {
      hooks.onLoad({ filter }, async ({ path }) => ({
        contents: path.endsWith('.css')
          ? ''
          : compile(await file(path).text(), {
              filename: path,
              generate: 'server',
            }).js.code,
        loader: 'js',
      }));
    },
  };
}
