// AT Protocol / PDS Configuration
export const PDS_URL = 'https://pds.jeanmachine.dev';
export const BSKY_API = 'https://public.api.bsky.app';
export const USER_DID = 'did:plc:6vxtya3serxcwvcdk5e7psvv';
export const HANDLE = 'jeanmachine.dev';
export const PUBLICATION = '3lwddhdcemk2l';

// Collection Identifiers
export const COLLECTIONS = {
  LEAFLET_DOCUMENT: 'pub.leaflet.document',
  WHTWND_BLOG_ENTRY: 'com.whtwnd.blog.entry',
} as const;

// Personal Information
export const PERSONAL = {
  NAME: 'Eric Hamilton',
  TITLE: 'Software Engineer, Caffeine Addict, Transit Enthusiast.',
  LOCATION: 'Seattle, WA',
  EMAIL: 'mailto:etj2206@rit.edu',
  GITHUB_USERNAME: 'ETJeanMachine',
} as const;

// Social Media Links
export const SOCIAL_LINKS = {
  GITHUB: 'https://github.com/ETJeanMachine',
  LINKEDIN: 'https://linkedin.com/in/etjhamilton',
  BLUESKY: 'https://bsky.app/profile/jeanmachine.dev',
  EMAIL: 'mailto:etj2206@rit.edu',
  SIGNAL:
    'https://signal.me/#eu/NRi1kt98GTlPfIyn2DP4faTgyElC3ufIcTcdK0fLLttDMBFxJANNhoD-Ksn30G8O',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  ATPROTO_REPO_GET_RECORD: '/xrpc/com.atproto.repo.getRecord',
  ATPROTO_REPO_LIST_RECORDS: '/xrpc/com.atproto.repo.listRecords',
  ATPROTO_SYNC_GET_BLOB: '/xrpc/com.atproto.sync.getBlob',
  ATPROTO_IDENTITY_RESOLVE_HANDLE: '/xrpc/com.atproto.identity.resolveHandle',
} as const;
