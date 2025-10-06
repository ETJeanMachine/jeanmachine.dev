// place files you want to import through the `$lib` alias in this folder.
import { PUBLICATION } from '$lib/constants';
import type { Publication } from './types/publication';

import type { Colour } from './types/publication';

function colorToCSS(color: Colour | undefined): string {
  if (!color) return '';
  if ('a' in color) {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 100})`;
  }
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export async function loadPublication(): Promise<Publication> {
  const params = new URLSearchParams('');
  params.append('collection', 'pub.leaflet.publication');
  params.append('rkey', PUBLICATION);
  const response = await fetch(`/api/atproto/record?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const publication: Publication = (await response.json()).value;
  const theme = publication.theme ?? {};

  // Set background color
  if (theme.backgroundColor) {
    document.documentElement.style.setProperty(
      '--background-color',
      colorToCSS(theme.backgroundColor),
    );
  }

  // Set background image
  if (theme.backgroundImage?.image) {
    document.documentElement.style.setProperty(
      '--background-image',
      `url(${theme.backgroundImage.image})`,
    );
  }

  // Set CSS variables for theme colors
  if (theme.primary) {
    document.documentElement.style.setProperty(
      '--primary',
      colorToCSS(theme.primary),
    );
  }
  if (theme.pageBackground) {
    document.documentElement.style.setProperty(
      '--page-background',
      colorToCSS(theme.pageBackground),
    );
  }
  if (theme.accentBackground) {
    document.documentElement.style.setProperty(
      '--accent-background',
      colorToCSS(theme.accentBackground),
    );
  }
  if (theme.accentText) {
    document.documentElement.style.setProperty(
      '--accent-text',
      colorToCSS(theme.accentText),
    );
  }
  return publication;
}
