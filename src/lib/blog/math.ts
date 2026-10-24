import katex from 'katex';

/** Only this function's output may be passed to {@html}. Never trust TeX HTML extensions. */
export function renderMath(tex: string): string | null {
  if (tex.length > 20_000) return null;
  try {
    return katex.renderToString(tex, {
      displayMode: true,
      output: 'mathml',
      trust: false,
      strict: 'error',
      throwOnError: true,
      maxExpand: 500,
      maxSize: 20,
    });
  } catch {
    return null;
  }
}
