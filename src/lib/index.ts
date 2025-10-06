// place files you want to import through the `$lib` alias in this folder.
import { BSKY_API, PDS_URL, PUBLICATION } from '$lib/constants';

// helper function for figuring out if the PDS set is actually available
// or if it's firewalled (which mine often is :/)
export async function selectApiEndpoint() {
  try {
    await fetch(`${PDS_URL}/xrpc/_health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    return PDS_URL;
  } catch {
    return BSKY_API;
  }
}

function colorToCSS(color: any): string {
  if (!color) return '';
  if (color.a !== undefined) {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 100})`;
  }
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export async function loadPublication() {
  const params = new URLSearchParams('');
  params.append('collection', 'pub.leaflet.publication');
  params.append('rkey', PUBLICATION);
  const response = await fetch(`/api/atproto/record?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const publication = (await response.json()).value;
  const theme = publication.theme;

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
