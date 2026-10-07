import { runtimeRequest } from "../../../../lib/runtime-server";

export async function POST(request) {
  try {
    const body = await request.json();
    const data = await runtimeRequest("/missions", {
      method: "POST",
      body: JSON.stringify(body)
    });
    return Response.json(data, { status: 201 });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: error.status || 500 });
  }
}
