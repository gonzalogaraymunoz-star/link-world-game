import { runtimeRequest } from "../../../../../../lib/runtime-server";

export async function POST(_request, context) {
  try {
    const { missionCode } = await context.params;
    const data = await runtimeRequest(
      "/missions/" + encodeURIComponent(missionCode) + "/events",
      {
        method: "POST",
        body: JSON.stringify({
          type: "approval",
          payload: { approved: true, by: "link-world" }
        })
      }
    );
    return Response.json(data);
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: error.status || 500 });
  }
}
