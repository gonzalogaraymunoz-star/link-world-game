import { runtimeRequest } from "../../../../../lib/runtime-server";

export async function GET(_request, context) {
  try {
    const { missionCode } = await context.params;
    const data = await runtimeRequest("/missions/" + encodeURIComponent(missionCode), {
      method: "GET"
    });
    return Response.json(data);
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: error.status || 500 });
  }
}
