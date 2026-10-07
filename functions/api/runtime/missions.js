const RUNTIME = "https://link-runtime.gonzalogaraymunoz.workers.dev";

export async function onRequestPost(context) {
  const body = await context.request.text();
  const response = await fetch(RUNTIME + "/missions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body
  });
  return new Response(response.body, {
    status: response.status,
    headers: { "content-type": "application/json" }
  });
}
