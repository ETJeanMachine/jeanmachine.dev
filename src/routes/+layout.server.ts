import { PUBLICATION } from '$lib/constants';
import type { PubLeafletPublication } from '@atcute/leaflet';

export const load = async ({ fetch }) => {
  const params = new URLSearchParams();
  params.append('collection', 'pub.leaflet.publication');
  params.append('rkey', PUBLICATION);

  const response = await fetch(`/api/atproto/record?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const publication: PubLeafletPublication.Main = (await response.json()).value;

  return { publication };
};
