const RUNTIME = "https://link-runtime.gonzalogaraymunoz.workers.dev";

export async function onRequest(context) {
  const raw = Array.isArray(context.params.path)
    ? context.params.path.join("/")
    : String(context.params.path || "");
  const parts = raw.split("/").filter(Boolean);

  let target = "/" + raw;
  let body = null;

  if (
    context.request.method === "POST" &&
    parts.length === 3 &&
    parts[0] === "missions" &&
    parts[2] === "approve"
  ) {
    target = "/missions/" + encodeURIComponent(parts[1]) + "/events";
    body = JSON.stringify({
      type: "approval",
      payload: { approved: true, by: "link-world" }
    });
  } else if (context.request.method !== "GET") {
    body = await context.request.text();
  }

  const response = await fetch(RUNTIME + target, {
    method: context.request.method,
    headers: { "content-type": "application/json" },
    body
  });

  return new Response(response.body, {
    status: response.status,
    headers: { "content-type": "application/json" }
  });
}
