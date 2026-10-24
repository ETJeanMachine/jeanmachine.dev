import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DID, PUB_RKEY } from '$lib/constants';
import { pdsBlob, pdsJson } from '$lib/server/pds';
import { SiteStandardPublication } from '@atcute/standard-site';
import { is } from '@atcute/lexicons';
import { isBlob, isLegacyBlob } from '@atcute/lexicons/interfaces';

export const GET: RequestHandler = async () => {
  const { value: data } = await pdsJson(
    'com.atproto.repo.getRecord',
    { repo: DID, collection: 'site.standard.publication', rkey: PUB_RKEY },
    'Failed to fetch record',
  );
  if (!is(SiteStandardPublication.mainSchema, data)) {
    throw error(502, 'Invalid site.standard.publication record');
  }

  if (!data.icon) {
    throw error(404, 'Icon not found');
  }

  const mimeType = data.icon.mimeType;
  let cid: string;
  if (isBlob(data.icon)) {
    cid = data.icon.ref.$link;
  } else if (isLegacyBlob(data.icon)) {
    cid = data.icon.cid;
  } else {
    throw error(400, 'Blob error');
  }

  return pdsBlob(cid, mimeType);
};
