// src/routes/backgrounds/[filename]/+server.ts
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, platform }) => {
  const object = await platform?.BACKGROUNDS?.get(`${params.filename}`);

  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "public, max-age=31536000"); // Cache for 1 year

  return new Response(object.body, { headers });
};
