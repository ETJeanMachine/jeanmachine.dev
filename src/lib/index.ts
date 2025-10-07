// place files you want to import through the `$lib` alias in this folder.
import { PUBLICATION } from '$lib/constants';
import { PubLeafletPublication, PubLeafletThemeColor } from '@atcute/leaflet';
import { is, type Blob, type LegacyBlob } from '@atcute/lexicons';

import { isBlob, isLegacyBlob } from '@atcute/lexicons/interfaces';

type Color = PubLeafletThemeColor.Rgb | PubLeafletThemeColor.Rgba;

function colorToCSS(color: Color | undefined): string {
  if (!color) return '';
  if ('a' in color) {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 100})`;
  }
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export async function loadPublication(): Promise<PubLeafletPublication.Main> {
  const params = new URLSearchParams('');
  params.append('collection', 'pub.leaflet.publication');
  params.append('rkey', PUBLICATION);
  const response = await fetch(`/api/atproto/record?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const publication: PubLeafletPublication.Main = (await response.json()).value;
  console.log(publication);
  if (!is(PubLeafletPublication.mainSchema, publication)) {
    console.error('Invalid publication schema');
  }

  const theme = publication.theme ?? {};

  // Only set CSS variables if we're in the browser (not SSR)
  if (typeof document !== 'undefined') {
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
        `url(${blobUri(theme.backgroundImage.image)})`,
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
  }
  return publication;
}

export function blobUri(
  blob: Blob<string> | LegacyBlob<string> | undefined,
): string {
  if (isBlob(blob)) {
    return `/api/atproto/blob?cid=${blob.ref.$link}&mimetype=${blob.mimeType}`;
  } else if (isLegacyBlob(blob)) {
    return `/api/atproto/blob?cid=${blob.cid}&mimetype=${blob.mimeType}`;
  } else {
    throw new Error('Invalid blob: blob is undefined or has invalid format');
  }
}
