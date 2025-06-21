const api_url = "https://public.api.bsky.app/xrpc";

export async function get_profile(did: String) {
  const request_url = `${api_url}/app.bsky.actor.getProfile?actor=${did}`;
  const response = await fetch(request_url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  return data;
}
