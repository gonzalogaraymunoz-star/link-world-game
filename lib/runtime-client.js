const base = "https://link-runtime.gonzalogaraymunoz.workers.dev";

export async function startRuntimeMission(payload) {
  const response = await fetch(base + "/missions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "No se pudo activar LINK Runtime.");
  return data;
}

export async function approveRuntimeMission(missionCode) {
  const response = await fetch(base + "/missions/" + encodeURIComponent(missionCode) + "/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "approval",
      payload: { approved: true, by: "link-world" }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "No se pudo aprobar LINK Runtime.");
  return data;
}
