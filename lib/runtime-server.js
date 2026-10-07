const LINK_RUNTIME_URL = process.env.LINK_RUNTIME_URL || "https://link-runtime.gonzalogaraymunoz.workers.dev";

export async function runtimeRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("content-type", "application/json");

  const response = await fetch(LINK_RUNTIME_URL + path, {
    ...options,
    headers,
    cache: "no-store"
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!response.ok) {
    const error = new Error(data?.error || data?.message || `LINK Runtime respondió ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
